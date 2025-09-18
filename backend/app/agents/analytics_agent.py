import json
import logging
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Annotated, Any, Dict, List, Optional, Sequence, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AnalyticsReport as AnalyticsReportModel,
    Conversation,
    JournalEntry,
    TriageAssessment,
    User,
)

logger = logging.getLogger(__name__)

TOPIC_KEYWORDS: Dict[str, List[str]] = {
    "Anxiety": ["anxiety", "anxious", "panic", "worried", "nervous", "uneasy"],
    "Burnout": ["burnout", "exhausted", "drained", "can't cope", "burned out"],
    "Motivation": ["motivated", "motivation", "drive", "focus", "productive"],
    "Stress": ["stress", "stressed", "pressure", "overwhelmed", "cramming"],
    "Sleep": ["sleep", "insomnia", "tired", "restless", "can't sleep"],
    "Relationships": ["relationship", "friends", "alone", "lonely", "support"],
}

POSITIVE_TERMS = ["better", "grateful", "improved", "hopeful", "progress", "excited"]
NEGATIVE_TERMS = [
    "worse",
    "overwhelmed",
    "stressed",
    "anxious",
    "panic",
    "scared",
    "depressed",
    "hopeless",
]

TIME_BUCKETS = [
    (0, 6, "00:00-05:59"),
    (6, 12, "06:00-11:59"),
    (12, 18, "12:00-17:59"),
    (18, 24, "18:00-23:59"),
]
DAYS_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]
DEFAULT_TOPIC = "General wellbeing"


class MessageRecord(TypedDict):
    text: str
    timestamp: datetime
    user_id: Optional[int]
    source: str


class Insight(BaseModel):
    title: str
    description: str
    severity: str
    data: Dict[str, Any]


class Pattern(BaseModel):
    name: str
    description: str
    count: int


class TopicBreakdown(BaseModel):
    topic: str
    total_mentions: int
    sentiment_scores: Dict[str, int]


class ThemeTrendPoint(BaseModel):
    date: str
    count: int
    rolling_average: float


class ThemeTrend(BaseModel):
    topic: str
    data: List[ThemeTrendPoint]


class HeatmapCell(BaseModel):
    day: str
    block: str
    count: int


class SegmentImpact(BaseModel):
    segment: str
    group: str
    metric: int
    percentage: float


class HighRiskUser(BaseModel):
    user_id: int
    name: Optional[str]
    email: Optional[str]
    recent_assessments: int
    last_severity: str
    last_assessed_at: datetime
    triage_link: str


class AnalyticsReport(BaseModel):
    report_period: str
    insights: List[Insight]
    patterns: List[Pattern]
    recommendations: List[str]
    metrics: Dict[str, Any] | None = None
    topic_breakdown: List[TopicBreakdown] = Field(default_factory=list)
    theme_trends: List[ThemeTrend] = Field(default_factory=list)
    distress_heatmap: List[HeatmapCell] = Field(default_factory=list)
    segment_alerts: List[SegmentImpact] = Field(default_factory=list)
    high_risk_users: List[HighRiskUser] = Field(default_factory=list)


class AnalyticsState(TypedDict, total=False):
    timeframe_days: int
    start_date: datetime
    end_date: datetime
    metrics: Dict[str, Any]
    raw_texts: List[str]
    message_records: List[MessageRecord]
    patterns: List[Pattern]
    insights: List[Insight]
    recommendations: List[str]
    topic_breakdown: List[TopicBreakdown]
    theme_trends: List[ThemeTrend]
    distress_heatmap: List[HeatmapCell]
    segment_alerts: List[SegmentImpact]
    high_risk_users: List[HighRiskUser]
    report: AnalyticsReport


_llm_instance: ChatGoogleGenerativeAI | None = None


def _get_llm() -> ChatGoogleGenerativeAI:
    """Lazily instantiate Gemini with explicit API key detection."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_GENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing Google Generative AI credentials")

    _llm_instance = ChatGoogleGenerativeAI(
        model="gemini-pro",
        temperature=0.2,
        google_api_key=api_key,
    )
    return _llm_instance


class AnalyticsAgent:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._graph = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(AnalyticsState)
        graph.add_node("collect_activity", self._collect_activity)
        graph.add_node("analyze_patterns", self._analyze_patterns)
        graph.add_node("compute_metrics", self._compute_enriched_metrics)
        graph.add_node("generate_insights", self._generate_insights_node)
        graph.add_node("prepare_report", self._prepare_report)

        graph.set_entry_point("collect_activity")
        graph.add_edge("collect_activity", "analyze_patterns")
        graph.add_edge("analyze_patterns", "compute_metrics")
        graph.add_edge("compute_metrics", "generate_insights")
        graph.add_edge("generate_insights", "prepare_report")
        graph.add_edge("prepare_report", END)
        return graph.compile()

    async def analyze_trends(self, timeframe_days: int) -> AnalyticsReport:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=timeframe_days)

        initial_state: AnalyticsState = {
            "timeframe_days": timeframe_days,
            "start_date": start_date,
            "end_date": end_date,
        }

        logger.info(
            "Running analytics LangGraph pipeline for the past %s days", timeframe_days
        )

        result_state = await self._graph.ainvoke(initial_state)
        report = result_state["report"]
        await self._store_report(report)
        return report

    async def _collect_activity(self, state: AnalyticsState) -> AnalyticsState:
        start_date = state["start_date"]
        end_date = state["end_date"]

        conversations = await self._get_conversations(start_date, end_date)
        journal_entries = await self._get_journal_entries(start_date, end_date)

        conversation_users = {c.user_id for c in conversations if c.user_id}
        journal_users = {j.user_id for j in journal_entries if j.user_id}

        total_messages = len(conversations)
        total_journals = len(journal_entries)
        unique_users = conversation_users.union(journal_users)

        metrics = {
            "conversation_count": total_messages,
            "journal_count": total_journals,
            "unique_users": len(unique_users),
            "timeframe_days": state["timeframe_days"],
        }

        if state["timeframe_days"] > 0:
            metrics["avg_daily_conversations"] = round(
                total_messages / state["timeframe_days"], 2
            )
            metrics["avg_daily_journals"] = round(
                total_journals / state["timeframe_days"], 2
            )

        records: List[MessageRecord] = []
        texts: List[str] = []

        for conversation in conversations:
            if conversation.message:
                texts.append(conversation.message)
                records.append(
                    MessageRecord(
                        text=conversation.message,
                        timestamp=conversation.timestamp,
                        user_id=conversation.user_id,
                        source="conversation",
                    )
                )

        for entry in journal_entries:
            if entry.content:
                texts.append(entry.content)
                records.append(
                    MessageRecord(
                        text=entry.content,
                        timestamp=entry.created_at,
                        user_id=entry.user_id,
                        source="journal",
                    )
                )

        logger.debug(
            "Collected %s conversations and %s journals for analytics",
            total_messages,
            total_journals,
        )

        return {"metrics": metrics, "raw_texts": texts, "message_records": records}

    async def _analyze_patterns(self, state: AnalyticsState) -> AnalyticsState:
        texts = state.get("raw_texts", [])
        patterns = self._identify_patterns(texts)

        sentiment_counter = Counter()
        for text in texts:
            lowered = text.lower()
            sentiment_counter["positive"] += sum(lowered.count(term) for term in POSITIVE_TERMS)
            sentiment_counter["negative"] += sum(lowered.count(term) for term in NEGATIVE_TERMS)

        metrics = dict(state.get("metrics", {}))
        metrics["sentiment_proxy"] = {
            "positive": sentiment_counter.get("positive", 0),
            "negative": sentiment_counter.get("negative", 0),
        }

        logger.debug("Identified %s patterns for analytics", len(patterns))
        return {"patterns": patterns, "metrics": metrics}

    async def _compute_enriched_metrics(self, state: AnalyticsState) -> AnalyticsState:
        records = state.get("message_records", [])
        if not records:
            return {
                "topic_breakdown": [],
                "theme_trends": [],
                "distress_heatmap": [],
                "segment_alerts": [],
                "high_risk_users": await self._fetch_high_risk_users(state["timeframe_days"]),
            }

        topic_stats: Dict[str, Dict[str, Any]] = {}
        heatmap_counter: Dict[tuple[str, str], int] = defaultdict(int)
        negative_records: List[MessageRecord] = []

        for record in records:
            text = record["text"].lower()
            timestamp = record["timestamp"]
            topics_hit = {
                topic
                for topic, keywords in TOPIC_KEYWORDS.items()
                if any(keyword in text for keyword in keywords)
            }
            if not topics_hit:
                topics_hit = {DEFAULT_TOPIC}

            sentiment_label = self._classify_sentiment(text)
            date_key = timestamp.date().isoformat()

            for topic in topics_hit:
                stats = topic_stats.setdefault(
                    topic,
                    {
                        "total": 0,
                        "sentiment": Counter(),
                        "daily": defaultdict(int),
                    },
                )
                stats["total"] += 1
                stats["sentiment"][sentiment_label] += 1
                stats["daily"][date_key] += 1

            day_name = timestamp.strftime("%A")
            bucket_label = self._time_bucket(timestamp.hour)
            heatmap_counter[(day_name, bucket_label)] += 1

            if sentiment_label == "negative" and record["user_id"]:
                negative_records.append(record)

        topic_breakdown = [
            TopicBreakdown(
                topic=topic,
                total_mentions=stats["total"],
                sentiment_scores={
                    "positive": stats["sentiment"].get("positive", 0),
                    "negative": stats["sentiment"].get("negative", 0),
                    "neutral": stats["sentiment"].get("neutral", 0),
                },
            )
            for topic, stats in sorted(
                topic_stats.items(), key=lambda item: item[1]["total"], reverse=True
            )
        ]

        theme_trends: List[ThemeTrend] = []
        for topic, stats in topic_stats.items():
            daily_points = []
            rolling_window: List[int] = []
            for date_key, count in sorted(stats["daily"].items()):
                rolling_window.append(count)
                if len(rolling_window) > 3:
                    rolling_window.pop(0)
                average = sum(rolling_window) / len(rolling_window)
                daily_points.append(
                    ThemeTrendPoint(
                        date=date_key,
                        count=count,
                        rolling_average=round(average, 2),
                    )
                )
            theme_trends.append(ThemeTrend(topic=topic, data=daily_points))

        heatmap_cells = [
            HeatmapCell(
                day=day,
                block=label,
                count=heatmap_counter.get((day, label), 0),
            )
            for day in DAYS_ORDER
            for _, _, label in TIME_BUCKETS
        ]

        segment_alerts = await self._build_segment_alerts(negative_records)
        high_risk_users = await self._fetch_high_risk_users(state["timeframe_days"])

        metrics = dict(state.get("metrics", {}))
        if topic_breakdown:
            metrics["top_topics"] = [tb.topic for tb in topic_breakdown[:3]]
        if segment_alerts:
            metrics["leading_segments"] = [seg.model_dump() for seg in segment_alerts[:5]]

        return {
            "topic_breakdown": topic_breakdown,
            "theme_trends": theme_trends,
            "distress_heatmap": heatmap_cells,
            "segment_alerts": segment_alerts,
            "high_risk_users": high_risk_users,
            "metrics": metrics,
        }

    async def _generate_insights_node(self, state: AnalyticsState) -> AnalyticsState:
        patterns = state.get("patterns", [])
        metrics = state.get("metrics", {})

        try:
            insights, recommendations = await self._llm_generate_insights(patterns, metrics)
        except Exception as exc:  # pragma: no cover - depends on external service
            logger.warning("Falling back to heuristic analytics insights: %s", exc)
            insights = self._heuristic_insights(patterns)
            recommendations = self._heuristic_recommendations(insights, metrics)

        return {"insights": insights, "recommendations": recommendations}

    async def _prepare_report(self, state: AnalyticsState) -> AnalyticsState:
        report = AnalyticsReport(
            report_period=f"{state['timeframe_days']} days",
            insights=state.get("insights", []),
            patterns=state.get("patterns", []),
            recommendations=state.get("recommendations", []),
            metrics=state.get("metrics"),
            topic_breakdown=state.get("topic_breakdown", []),
            theme_trends=state.get("theme_trends", []),
            distress_heatmap=state.get("distress_heatmap", []),
            segment_alerts=state.get("segment_alerts", []),
            high_risk_users=state.get("high_risk_users", []),
        )
        return {"report": report}

    async def _get_conversations(
        self, start_date: datetime, end_date: datetime
    ) -> List[Conversation]:
        stmt = select(Conversation).where(Conversation.timestamp.between(start_date, end_date))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _get_journal_entries(
        self, start_date: datetime, end_date: datetime
    ) -> List[JournalEntry]:
        stmt = select(JournalEntry).where(JournalEntry.created_at.between(start_date, end_date))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def _identify_patterns(self, texts: Sequence[str]) -> List[Pattern]:
        keyword_patterns = {
            "Anxiety": TOPIC_KEYWORDS["Anxiety"],
            "Depression": ["depressed", "sad", "empty", "hopeless"],
            "Stress": TOPIC_KEYWORDS["Stress"],
            "Sleep": TOPIC_KEYWORDS["Sleep"],
        }

        patterns: List[Pattern] = []
        for name, keywords in keyword_patterns.items():
            count = 0
            for text in texts:
                lowered = text.lower()
                count += sum(lowered.count(keyword) for keyword in keywords)
            if count:
                patterns.append(
                    Pattern(
                        name=name,
                        description=f"Mentions of {name.lower()} related keywords",
                        count=count,
                    )
                )

        patterns.sort(key=lambda p: p.count, reverse=True)
        return patterns

    async def _llm_generate_insights(
        self, patterns: Sequence[Pattern], metrics: Dict[str, Any]
    ) -> tuple[List[Insight], List[str]]:
        llm = _get_llm()
        payload = {
            "metrics": metrics,
            "patterns": [p.model_dump() for p in patterns],
        }

        messages = [
            SystemMessage(
                content=(
                    "You are an analytics assistant for a mental health platform. "
                    "Generate 2-3 concise insights and actionable recommendations in JSON. "
                    "Focus on safety, wellbeing trends, and operational follow-ups."
                )
            ),
            HumanMessage(
                content=(
                    "Use the following JSON data to produce a response with the schema\n"
                    "{\n  \"insights\": [{\n    \"title\": str,\n    \"description\": str,\n    \"severity\": one of ['Low','Medium','High'],\n    \"data\": object\n  }],\n  \"recommendations\": [str]\n}.\n"
                    "Respond with JSON only.\n"
                    f"Data: {json.dumps(payload)}"
                )
            ),
        ]

        response = await llm.ainvoke(messages)
        try:
            data = json.loads(response.content)
        except json.JSONDecodeError as exc:
            raise RuntimeError("LLM response was not valid JSON") from exc

        insights = [Insight(**item) for item in data.get("insights", [])]
        recommendations = [str(rec) for rec in data.get("recommendations", [])]

        if not insights:
            insights = self._heuristic_insights(patterns)
        if not recommendations:
            recommendations = self._heuristic_recommendations(insights, metrics)

        return insights, recommendations

    def _heuristic_insights(self, patterns: Sequence[Pattern]) -> List[Insight]:
        insights: List[Insight] = []
        for pattern in patterns:
            if pattern.count > 12:
                severity = "High"
            elif pattern.count > 6:
                severity = "Medium"
            else:
                severity = "Low"

            insights.append(
                Insight(
                    title=f"Elevated {pattern.name.lower()} themes",
                    description=(
                        f"Detected {pattern.count} mentions related to {pattern.name.lower()} "
                        "within the selected period."
                    ),
                    severity=severity,
                    data=pattern.model_dump(),
                )
            )

        if not insights:
            insights.append(
                Insight(
                    title="Stable wellbeing signals",
                    description="No significant spikes detected across tracked themes.",
                    severity="Low",
                    data={},
                )
            )

        return insights

    def _heuristic_recommendations(
        self, insights: Sequence[Insight], metrics: Dict[str, Any]
    ) -> List[str]:
        recommendations: List[str] = []
        for insight in insights:
            if insight.severity == "High":
                recommendations.append(
                    f"Escalate: coordinate a targeted intervention campaign for {insight.title.lower()}."
                )
            elif insight.severity == "Medium":
                recommendations.append(
                    f"Monitor closely: prepare educational content addressing {insight.title.lower()}."
                )

        if not recommendations:
            recommendations.append(
                "Maintain the current support cadence and continue monitoring weekly patterns."
            )

        sentiment = metrics.get("sentiment_proxy", {})
        if sentiment.get("negative", 0) > sentiment.get("positive", 0):
            recommendations.append(
                "Investigate recent negative sentiment drivers and reinforce crisis messaging."
            )

        return recommendations

    async def _store_report(self, report: AnalyticsReport):
        report_model = AnalyticsReportModel(
            report_period=report.report_period,
            insights=[insight.model_dump() for insight in report.insights],
            trends={
                "patterns": [pattern.model_dump() for pattern in report.patterns],
                "metrics": report.metrics or {},
                "topic_breakdown": [topic.model_dump() for topic in report.topic_breakdown],
                "theme_trends": [trend.model_dump() for trend in report.theme_trends],
                "distress_heatmap": [cell.model_dump() for cell in report.distress_heatmap],
                "segment_alerts": [segment.model_dump() for segment in report.segment_alerts],
                "high_risk_users": [user.model_dump() for user in report.high_risk_users],
            },
            recommendations=report.recommendations,
            intervention_triggers=[],
        )
        self.db.add(report_model)
        await self.db.commit()

    def _classify_sentiment(self, text: str) -> str:
        positive_hits = sum(1 for term in POSITIVE_TERMS if term in text)
        negative_hits = sum(1 for term in NEGATIVE_TERMS if term in text)
        if negative_hits > positive_hits:
            return "negative"
        if positive_hits > negative_hits:
            return "positive"
        return "neutral"

    def _time_bucket(self, hour: int) -> str:
        for start, end, label in TIME_BUCKETS:
            if start <= hour < end:
                return label
        return TIME_BUCKETS[-1][2]

    async def _build_segment_alerts(self, negative_records: List[MessageRecord]) -> List[SegmentImpact]:
        if not negative_records:
            return []

        user_ids = {record["user_id"] for record in negative_records if record["user_id"]}
        if not user_ids:
            return []

        users_result = await self.db.execute(select(User).where(User.id.in_(user_ids)))
        user_lookup: Dict[int, User] = {user.id: user for user in users_result.scalars().all()}

        segment_counters: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for record in negative_records:
            user_id = record["user_id"]
            if not user_id or user_id not in user_lookup:
                continue
            user = user_lookup[user_id]
            segments = [
                ("Year of study", user.year_of_study or "Unknown"),
                ("Faculty", user.major or "Unknown"),
                ("Gender", user.gender or "Unknown"),
            ]
            for label, value in segments:
                segment_counters[label][value] += 1

        total_negative = len(negative_records)
        impacts: List[SegmentImpact] = []
        for label, counts in segment_counters.items():
            for value, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:3]:
                percentage = round((count / total_negative) * 100, 1) if total_negative else 0.0
                impacts.append(
                    SegmentImpact(
                        segment=label,
                        group=value,
                        metric=count,
                        percentage=percentage,
                    )
                )

        impacts.sort(key=lambda item: item.metric, reverse=True)
        return impacts[:6]

    async def _fetch_high_risk_users(self, timeframe_days: int) -> List[HighRiskUser]:
        since = datetime.utcnow() - timedelta(days=timeframe_days)
        stmt = (
            select(TriageAssessment, User)
            .join(User, TriageAssessment.user_id == User.id)
            .where(TriageAssessment.user_id.isnot(None))
            .where(TriageAssessment.created_at >= since)
            .where(
                (TriageAssessment.severity_level.ilike("high"))
                | (TriageAssessment.severity_level.ilike("critical"))
                | (TriageAssessment.risk_score >= 0.85)
            )
            .order_by(desc(TriageAssessment.created_at))
        )

        rows = await self.db.execute(stmt)
        user_map: Dict[int, Dict[str, Any]] = {}
        for assessment, user in rows.all():
            if not user:
                continue
            payload = user_map.setdefault(
                user.id,
                {
                    "count": 0,
                    "last_assessment": assessment,
                    "user": user,
                },
            )
            payload["count"] += 1
            if assessment.created_at > payload["last_assessment"].created_at:
                payload["last_assessment"] = assessment

        flagged: List[HighRiskUser] = []
        for user_id, payload in user_map.items():
            if payload["count"] < 2:
                continue
            assessment = payload["last_assessment"]
            user = payload["user"]
            flagged.append(
                HighRiskUser(
                    user_id=user_id,
                    name=user.name,
                    email=user.email,
                    recent_assessments=payload["count"],
                    last_severity=assessment.severity_level,
                    last_assessed_at=assessment.created_at,
                    triage_link=f"/admin/triage?user_id={user_id}",
                )
            )

        flagged.sort(
            key=lambda item: (item.recent_assessments, item.last_assessed_at),
            reverse=True,
        )
        return flagged[:10]


ANALYTICS_GRAPH_SPEC = {
    "id": "analytics",
    "name": "Analytics Agent",
    "nodes": [
        {
            "id": "collect_activity",
            "label": "Collect Activity",
            "description": "Pull recent conversations and journal entries from the database.",
            "column": 0,
            "row": 0,
        },
        {
            "id": "analyze_patterns",
            "label": "Analyze Patterns",
            "description": "Extract recurring wellbeing themes and simple sentiment signals.",
            "column": 1,
            "row": 0,
        },
        {
            "id": "compute_metrics",
            "label": "Compute Metrics",
            "description": "Derive topic trends, heatmaps, and segment alerts for admins.",
            "column": 2,
            "row": 0,
        },
        {
            "id": "generate_insights",
            "label": "Generate Insights",
            "description": "Use Gemini (with fallback heuristics) to craft insights and recommendations.",
            "column": 3,
            "row": 0,
        },
        {
            "id": "prepare_report",
            "label": "Prepare Report",
            "description": "Assemble the final report payload for storage and delivery.",
            "column": 4,
            "row": 0,
        },
    ],
    "edges": [
        {"source": "collect_activity", "target": "analyze_patterns"},
        {"source": "analyze_patterns", "target": "compute_metrics"},
        {"source": "compute_metrics", "target": "generate_insights"},
        {"source": "generate_insights", "target": "prepare_report"},
    ],
}
