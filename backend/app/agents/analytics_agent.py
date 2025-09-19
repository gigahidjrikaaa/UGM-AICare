def get_state_value(state, key, default=None):
    # Safely get a value from a TypedDict or dict, with default fallback
    try:
        return state[key]
    except (KeyError, TypeError):
        return default
import json
import logging
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Annotated, Any, Dict, List, Optional, Sequence, Tuple, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AnalyticsReport as AnalyticsReportModel,
    Appointment,
    CampaignExecution,
    Conversation,
    JournalEntry,
    SurveyResponse,
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


class TopicExcerptSample(BaseModel):
    excerpt: str
    source: str
    date: str


class TopicExcerpt(BaseModel):
    topic: str
    samples: List[TopicExcerptSample]


class PredictiveSignal(BaseModel):
    metric: str
    topic: Optional[str] = None
    current_value: float
    moving_average: float
    forecast: float
    direction: str
    confidence: float
    window: str


class ThresholdAlert(BaseModel):
    name: str
    metric: str
    value: float
    threshold: float
    status: str
    severity: str
    description: str


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
    period_start: datetime | None = None
    period_end: datetime | None = None
    insights: List[Insight]
    patterns: List[Pattern]
    recommendations: List[str]
    metrics: Dict[str, Any] = Field(default_factory=dict)
    topic_breakdown: List[TopicBreakdown] = Field(default_factory=list)
    theme_trends: List[ThemeTrend] = Field(default_factory=list)
    distress_heatmap: List[HeatmapCell] = Field(default_factory=list)
    segment_alerts: List[SegmentImpact] = Field(default_factory=list)
    high_risk_users: List[HighRiskUser] = Field(default_factory=list)
    resource_engagement: List[Dict[str, Any]] = Field(default_factory=list)
    intervention_outcomes: List[Dict[str, Any]] = Field(default_factory=list)
    topic_excerpts: List[TopicExcerpt] = Field(default_factory=list)
    predictive_signals: List[PredictiveSignal] = Field(default_factory=list)
    threshold_alerts: List[ThresholdAlert] = Field(default_factory=list)
    comparison_snapshot: Dict[str, Any] | None = None


class AnalyticsState(TypedDict, total=False):
    timeframe_days: int
    start_date: datetime
    end_date: datetime
    period_start: datetime
    period_end: datetime
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
    resource_engagement: List[Dict[str, Any]]
    intervention_outcomes: List[Dict[str, Any]]
    topic_excerpts: List[TopicExcerpt]
    predictive_signals: List[PredictiveSignal]
    threshold_alerts: List[ThresholdAlert]
    comparison_snapshot: Dict[str, Any]
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
        start_date = get_state_value(state, "start_date")
        end_date = get_state_value(state, "end_date")
        # Ensure start_date and end_date are not None
        if not start_date or not end_date:
            logger.warning("Missing start_date or end_date in state, skipping activity collection.")
            return {"metrics": {}, "raw_texts": [], "message_records": []}

        conversations = await self._get_conversations(start_date, end_date)
        journal_entries = await self._get_journal_entries(start_date, end_date)

        conversation_users = {c.user_id for c in conversations if c.user_id}
        journal_users = {j.user_id for j in journal_entries if j.user_id}

        total_messages = len(conversations)
        total_journals = len(journal_entries)
        unique_users = conversation_users.union(journal_users)

        timeframe_days = get_state_value(state, "timeframe_days", 0)
        metrics = {
            "conversation_count": total_messages,
            "journal_count": total_journals,
            "unique_users": len(unique_users),
            "timeframe_days": timeframe_days,
        }

        if timeframe_days and timeframe_days > 0:
            metrics["avg_daily_conversations"] = round(total_messages / timeframe_days, 2)
            metrics["avg_daily_journals"] = round(total_journals / timeframe_days, 2)

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
            "positive": int(sentiment_counter.get("positive", 0)),
            "negative": int(sentiment_counter.get("negative", 0)),
        }

        logger.debug("Identified %s patterns for analytics", len(patterns))
        return {"patterns": patterns, "metrics": metrics}

    async def _compute_enriched_metrics(self, state: AnalyticsState) -> AnalyticsState:
        period_start = get_state_value(state, "period_start", get_state_value(state, "start_date"))
        period_end = get_state_value(state, "period_end", get_state_value(state, "end_date"))
        timeframe_days = int(get_state_value(state, "timeframe_days", 0) or 0)

        resource_engagement = await self._build_resource_engagement(period_start, period_end, timeframe_days)
        intervention_outcomes = await self._build_intervention_outcomes(period_start, period_end, timeframe_days)
        high_risk_users = await self._fetch_high_risk_users(timeframe_days or 7)

        records = state.get("message_records", [])
        topic_excerpt_map: Dict[str, List[Dict[str, str]]] = defaultdict(list)

        if not records:
            metrics = dict(state.get("metrics", {}))
            if resource_engagement:
                metrics["resource_engagement_summary"] = resource_engagement
            if intervention_outcomes:
                metrics["intervention_summary"] = intervention_outcomes
            return {
                "topic_breakdown": [],
                "theme_trends": [],
                "distress_heatmap": [],
                "topic_excerpts": [],
                "predictive_signals": [],
                "threshold_alerts": [],
                "segment_alerts": [],
                "high_risk_users": high_risk_users,
                "resource_engagement": resource_engagement,
                "intervention_outcomes": intervention_outcomes,
                "metrics": metrics,
            }

        topic_stats: Dict[str, Dict[str, Any]] = {}
        heatmap_counter: Dict[tuple[str, str], int] = defaultdict(int)
        negative_records: List[MessageRecord] = []

        for record in records:
            text_value = record["text"]
            if not text_value:
                continue
            timestamp = record["timestamp"]
            lowered = text_value.lower()
            topics_hit = {
                topic
                for topic, keywords in TOPIC_KEYWORDS.items()
                if any(keyword in lowered for keyword in keywords)
            }
            if not topics_hit:
                topics_hit = {DEFAULT_TOPIC}

            sentiment_label = self._classify_sentiment(lowered)
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

            sanitized_excerpt = self._sanitize_excerpt(text_value)
            if sanitized_excerpt:
                sample_payload = {
                    "excerpt": sanitized_excerpt,
                    "source": record.get("source", "unknown"),
                    "date": date_key,
                }
                for topic in topics_hit:
                    samples = topic_excerpt_map.setdefault(topic, [])
                    if len(samples) >= 5:
                        continue
                    if all(existing["excerpt"] != sanitized_excerpt for existing in samples):
                        samples.append(sample_payload.copy())

            day_name = timestamp.strftime("%A")
            bucket_label = self._time_bucket(timestamp.hour)
            heatmap_counter[(day_name, bucket_label)] += 1

            if sentiment_label == "negative" and record.get("user_id"):
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

        topic_excerpts: List[TopicExcerpt] = []
        if topic_excerpt_map:
            topic_ranks = {tb.topic: idx for idx, tb in enumerate(topic_breakdown)}
            for topic, samples in topic_excerpt_map.items():
                trimmed = samples[:5]
                topic_excerpts.append(
                    TopicExcerpt(
                        topic=topic,
                        samples=[TopicExcerptSample(**sample) for sample in trimmed],
                    )
                )
            topic_excerpts.sort(key=lambda item: topic_ranks.get(item.topic, len(topic_ranks)))

        metrics = dict(state.get("metrics", {}))
        if topic_breakdown:
            metrics["top_topics"] = [tb.topic for tb in topic_breakdown[:3]]
        if segment_alerts:
            metrics["leading_segments"] = [seg.model_dump() for seg in segment_alerts[:5]]
        if resource_engagement:
            metrics["resource_engagement_summary"] = resource_engagement
        if intervention_outcomes:
            metrics["intervention_summary"] = intervention_outcomes

        predictive_signals = self._build_predictive_signals(theme_trends, timeframe_days)
        if predictive_signals:
            metrics["predictive_topics"] = [
                {"topic": signal.topic, "direction": signal.direction, "forecast": signal.forecast}
                for signal in predictive_signals
                if signal.topic
            ][:3]

        threshold_alerts = self._build_threshold_alerts(
            metrics=metrics,
            high_risk_users=high_risk_users,
            intervention_outcomes=intervention_outcomes,
            timeframe_days=timeframe_days,
        )
        if threshold_alerts:
            metrics["alert_count"] = len(threshold_alerts)
            metrics["alert_peak_severity"] = threshold_alerts[0].severity

        return {
            "topic_breakdown": topic_breakdown,
            "theme_trends": theme_trends,
            "distress_heatmap": heatmap_cells,
            "topic_excerpts": topic_excerpts,
            "predictive_signals": predictive_signals,
            "threshold_alerts": threshold_alerts,
            "segment_alerts": segment_alerts,
            "high_risk_users": high_risk_users,
            "resource_engagement": resource_engagement,
            "intervention_outcomes": intervention_outcomes,
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
            report_period=f"{get_state_value(state, 'timeframe_days', 0)} days",
            period_start=state.get("period_start"),
            period_end=state.get("period_end"),
            insights=state.get("insights", []),
            patterns=state.get("patterns", []),
            recommendations=state.get("recommendations", []),
            metrics=state.get("metrics", {}),
            topic_breakdown=state.get("topic_breakdown", []),
            theme_trends=state.get("theme_trends", []),
            distress_heatmap=state.get("distress_heatmap", []),
            segment_alerts=state.get("segment_alerts", []),
            high_risk_users=state.get("high_risk_users", []),
            resource_engagement=state.get("resource_engagement", []),
            intervention_outcomes=state.get("intervention_outcomes", []),
            topic_excerpts=state.get("topic_excerpts", []),
            predictive_signals=state.get("predictive_signals", []),
            threshold_alerts=state.get("threshold_alerts", []),
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
        latest_stmt = select(AnalyticsReportModel).order_by(desc(AnalyticsReportModel.generated_at)).limit(1)
        previous_model = (await self.db.execute(latest_stmt)).scalars().first()
        baseline_stmt = select(AnalyticsReportModel).order_by(AnalyticsReportModel.generated_at).limit(1)
        baseline_model = (await self.db.execute(baseline_stmt)).scalars().first()
        comparison_snapshot = await self._build_comparison_snapshot(previous_model, baseline_model, report)
        report.comparison_snapshot = comparison_snapshot

        report_model = AnalyticsReportModel(
            window_start=report.period_start,
            window_end=report.period_end,
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
                "predictive_signals": [signal.model_dump() for signal in report.predictive_signals],
                "threshold_alerts": [alert.model_dump() for alert in report.threshold_alerts],
            },
            baseline_snapshot=comparison_snapshot,
            resource_engagement={"timeframe": report.report_period, "items": report.resource_engagement},
            intervention_outcomes={"timeframe": report.report_period, "items": report.intervention_outcomes},
            topic_excerpts=[excerpt.model_dump() for excerpt in report.topic_excerpts],
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

    def _sanitize_excerpt(self, text: str) -> str:
        if not text:
            return ""
        sanitized = re.sub(r"\b[\w\.-]+@[\w\.-]+\.\w+\b", "[email]", text)
        sanitized = re.sub(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b", "[phone]", sanitized)
        sanitized = re.sub(r"@[A-Za-z0-9_]+", "@user", sanitized)
        sanitized = re.sub(r"\s+", " ", sanitized).strip()
        if len(sanitized) > 220:
            snippet = sanitized[:220]
            if " " in snippet:
                snippet = snippet[: snippet.rfind(" ")]
            sanitized = snippet.rstrip() + " ..."
        return sanitized

    def _time_bucket(self, hour: int) -> str:
        for start, end, label in TIME_BUCKETS:
            if start <= hour < end:
                return label
        return TIME_BUCKETS[-1][2]

    async def _count_in_range(self, column, start: datetime | None, end: datetime | None):
        if not start or not end:
            return 0
        stmt = select(func.count()).where(column.between(start, end))
        result = await self.db.execute(stmt)
        return int(result.scalar() or 0)

    async def _count_total_and_unique(
        self, time_column, user_column, start: datetime | None, end: datetime | None
    ) -> tuple[int, int]:
        if not start or not end:
            return 0, 0
        total_stmt = select(func.count()).where(time_column.between(start, end))
        total = int((await self.db.execute(total_stmt)).scalar() or 0)
        if user_column is None:
            return total, 0
        unique_stmt = (
            select(func.count(func.distinct(user_column)))
            .where(time_column.between(start, end))
            .where(user_column.isnot(None))
        )
        unique = int((await self.db.execute(unique_stmt)).scalar() or 0)
        return total, unique

    async def _build_resource_engagement(self, start: datetime | None, end: datetime | None, timeframe_days: int) -> List[Dict[str, Any]]:
        if not start or not end:
            return []

        window_label = f"last {timeframe_days} days" if timeframe_days else "selected window"
        journal_total, journal_unique = await self._count_total_and_unique(JournalEntry.created_at, JournalEntry.user_id, start, end)
        survey_total, survey_unique = await self._count_total_and_unique(SurveyResponse.created_at, SurveyResponse.user_id, start, end)
        appointment_total, appointment_unique = await self._count_total_and_unique(Appointment.created_at, Appointment.user_id, start, end)

        def _average(total: int, unique: int) -> float | None:
            if not unique:
                return None
            return round(total / unique, 2)

        return [
            {
                "category": "journaling",
                "label": "Journal entries",
                "total": journal_total,
                "unique_users": journal_unique,
                "avg_per_user": _average(journal_total, journal_unique),
                "timeframe": window_label,
            },
            {
                "category": "survey",
                "label": "Survey responses",
                "total": survey_total,
                "unique_users": survey_unique,
                "avg_per_user": _average(survey_total, survey_unique),
                "timeframe": window_label,
            },
            {
                "category": "appointments",
                "label": "Appointments booked",
                "total": appointment_total,
                "unique_users": appointment_unique,
                "avg_per_user": _average(appointment_total, appointment_unique),
                "timeframe": window_label,
            },
        ]

    async def _build_intervention_outcomes(self, start: datetime | None, end: datetime | None, timeframe_days: int) -> List[Dict[str, Any]]:
        if not start or not end:
            return []

        window_label = f"last {timeframe_days} days" if timeframe_days else "selected window"
        stmt = (
            select(CampaignExecution.status, func.count())
            .where(CampaignExecution.scheduled_at.between(start, end))
            .group_by(CampaignExecution.status)
        )
        rows = await self.db.execute(stmt)
        totals = [(status or "unknown", int(count or 0)) for status, count in rows.all()]
        total_count = sum(count for _, count in totals)
        results: List[Dict[str, Any]] = []
        for status, count in sorted(totals, key=lambda item: item[1], reverse=True):
            percentage = round((count / total_count) * 100, 1) if total_count else 0.0
            results.append(
                {
                    "status": status,
                    "count": count,
                    "percentage": percentage,
                    "timeframe": window_label,
                }
            )
        return results

    async def _build_comparison_snapshot(
        self,
        previous: AnalyticsReportModel | None,
        baseline: AnalyticsReportModel | None,
        current: AnalyticsReport,
    ) -> Dict[str, Any] | None:
        def to_float(value: Any) -> float:
            if isinstance(value, (int, float)):
                return float(value)
            if value is None:
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        def render_value(value: float) -> int | float:
            return int(value) if float(value).is_integer() else round(value, 2)

        def compare_numeric(current_value: Any, reference_value: Any) -> Dict[str, Any]:
            current_number = to_float(current_value)
            reference_number = to_float(reference_value)
            delta = current_number - reference_number
            delta_pct = (delta / reference_number * 100) if reference_number else None
            return {
                "current": render_value(current_number),
                "reference": render_value(reference_number),
                "delta": render_value(delta),
                "delta_pct": round(delta_pct, 2) if delta_pct is not None else None,
            }

        def extract_items(value: Any) -> List[Dict[str, Any]]:
            if isinstance(value, dict):
                return [item for item in value.get("items", []) if isinstance(item, dict)]
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
            return []

        current_metrics = current.metrics or {}
        current_topics = current.topic_breakdown or []
        current_resource_items = [item for item in current.resource_engagement if isinstance(item, dict)]
        current_intervention_items = [item for item in current.intervention_outcomes if isinstance(item, dict)]

        current_resource_map = {
            (item.get("label") or item.get("category")): item for item in current_resource_items if item.get("label") or item.get("category")
        }
        current_intervention_map = {
            item.get("status"): item for item in current_intervention_items if item.get("status")
        }

        def build_metric_slice(reference_metrics: Dict[str, Any]) -> Dict[str, Any]:
            metrics_snapshot: Dict[str, Any] = {}
            metric_keys = {
                "conversation_count",
                "journal_count",
                "unique_users",
                "avg_daily_conversations",
                "avg_daily_journals",
            }
            for key in metric_keys:
                if key in current_metrics or key in reference_metrics:
                    metrics_snapshot[key] = compare_numeric(current_metrics.get(key, 0), reference_metrics.get(key, 0))

            sentiment_current = current_metrics.get("sentiment_proxy", {}) or {}
            sentiment_reference = reference_metrics.get("sentiment_proxy", {}) or {}
            if sentiment_current or sentiment_reference:
                sentiment_comparison: Dict[str, Any] = {}
                for sentiment_key in {"positive", "negative", "neutral"}:
                    if sentiment_key in sentiment_current or sentiment_key in sentiment_reference:
                        sentiment_comparison[sentiment_key] = compare_numeric(
                            sentiment_current.get(sentiment_key, 0),
                            sentiment_reference.get(sentiment_key, 0),
                        )
                if sentiment_comparison:
                    metrics_snapshot["sentiment_proxy"] = sentiment_comparison
            return metrics_snapshot

        def build_topic_slice(reference_topics: Sequence[Any]) -> List[Dict[str, Any]]:
            reference_map = {}
            for item in reference_topics:
                if isinstance(item, dict):
                    topic_name = item.get("topic")
                    if topic_name:
                        reference_map[topic_name] = item.get("total_mentions", item.get("count", 0))
            rows: List[Dict[str, Any]] = []
            for entry in current_topics:
                data = compare_numeric(entry.total_mentions, reference_map.get(entry.topic, 0))
                payload = {"topic": entry.topic}
                payload.update(data)
                rows.append(payload)
            rows.sort(key=lambda row: abs(row["delta"]), reverse=True)
            return rows[:5]

        def build_resource_slice(reference_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            reference_map = {
                (item.get("label") or item.get("category")): item
                for item in reference_items
                if item.get("label") or item.get("category")
            }
            keys = set(reference_map.keys()).union(current_resource_map.keys())
            rows: List[Dict[str, Any]] = []
            for key in sorted(filter(None, keys)):
                current_entry = current_resource_map.get(key, {})
                reference_entry = reference_map.get(key, {})
                row = {
                    "label": key,
                    "category": current_entry.get("category") or reference_entry.get("category"),
                    "totals": compare_numeric(
                        current_entry.get("total", current_entry.get("count", 0)),
                        reference_entry.get("total", reference_entry.get("count", 0)),
                    ),
                }
                for field in ("unique_users", "avg_per_user"):
                    if current_entry.get(field) is not None or reference_entry.get(field) is not None:
                        row[field] = compare_numeric(
                            current_entry.get(field, 0),
                            reference_entry.get(field, 0),
                        )
                rows.append(row)
            rows.sort(key=lambda row: abs(row["totals"]["delta"]), reverse=True)
            return rows

        def build_intervention_slice(reference_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            reference_map = {item.get("status"): item for item in reference_items if item.get("status")}
            keys = set(reference_map.keys()).union(current_intervention_map.keys())
            rows: List[Dict[str, Any]] = []
            for key in sorted(filter(None, keys)):
                current_entry = current_intervention_map.get(key, {})
                reference_entry = reference_map.get(key, {})
                row: Dict[str, Any] = {
                    "status": key,
                    "counts": compare_numeric(current_entry.get("count", 0), reference_entry.get("count", 0)),
                }
                if current_entry.get("percentage") is not None or reference_entry.get("percentage") is not None:
                    row["percentage"] = compare_numeric(
                        current_entry.get("percentage", 0.0),
                        reference_entry.get("percentage", 0.0),
                    )
                rows.append(row)
            rows.sort(key=lambda row: abs(row["counts"]["delta"]), reverse=True)
            return rows

        def build_slice(reference_model: AnalyticsReportModel, label: str) -> Dict[str, Any]:
            reference_trends = reference_model.trends or {}
            reference_metrics = reference_trends.get("metrics", {}) or {}
            reference_topics = reference_trends.get("topic_breakdown", []) or []
            resource_items = extract_items(reference_model.resource_engagement)
            intervention_items = extract_items(reference_model.intervention_outcomes)
            window_payload = {
                "start": reference_model.window_start.isoformat() if reference_model.window_start else None,
                "end": reference_model.window_end.isoformat() if reference_model.window_end else None,
                "report_period": reference_model.report_period,
            }
            return {
                "label": label,
                "reference_report_id": reference_model.id,
                "generated_at": reference_model.generated_at.isoformat() if reference_model.generated_at else None,
                "window": window_payload,
                "metrics": build_metric_slice(reference_metrics),
                "topics": build_topic_slice(reference_topics),
                "resource_engagement": build_resource_slice(resource_items),
                "interventions": build_intervention_slice(intervention_items),
            }

        comparisons: Dict[str, Any] = {}
        if previous:
            comparisons["previous"] = build_slice(previous, "previous")
        if baseline and (not previous or baseline.id != previous.id):
            comparisons["baseline"] = build_slice(baseline, "baseline")

        return comparisons or None

    def _build_predictive_signals(self, theme_trends: List[ThemeTrend], timeframe_days: int) -> List[PredictiveSignal]:
        if not theme_trends:
            return []

        window_label = f"{timeframe_days} days" if timeframe_days else "selected window"
        signals: List[PredictiveSignal] = []
        for trend in theme_trends:
            data = trend.data
            if len(data) < 2:
                continue
            last_point = data[-1]
            prev_point = data[-2]
            delta = last_point.count - prev_point.count
            moving_average = last_point.rolling_average
            direction = "up" if delta > 0 else "down" if delta < 0 else "flat"
            forecast = max(last_point.count + delta, 0)
            volatility = abs(delta) / max(1.0, moving_average or 1.0)
            base_confidence = 0.5 + min(0.35, volatility * 0.25)
            if direction == "flat":
                base_confidence = max(0.4, base_confidence - 0.15)
            confidence = round(min(0.95, max(0.35, base_confidence)), 2)
            signals.append(
                PredictiveSignal(
                    metric="topic_mentions",
                    topic=trend.topic,
                    current_value=float(last_point.count),
                    moving_average=float(moving_average),
                    forecast=float(round(forecast, 2)),
                    direction=direction,
                    confidence=confidence,
                    window=window_label,
                )
            )

        signals.sort(key=lambda item: abs(item.forecast - item.current_value), reverse=True)
        return signals[:6]

    def _build_threshold_alerts(
        self,
        metrics: Dict[str, Any],
        high_risk_users: Sequence[HighRiskUser],
        intervention_outcomes: List[Dict[str, Any]],
        timeframe_days: int,
    ) -> List[ThresholdAlert]:
        alerts: List[ThresholdAlert] = []
        severity_rank = {"High": 0, "Medium": 1, "Low": 2}

        sentiment = metrics.get("sentiment_proxy", {}) or {}
        total_sentiment = float(sentiment.get("positive", 0) + sentiment.get("negative", 0) + sentiment.get("neutral", 0))
        if total_sentiment:
            negative_ratio = float(sentiment.get("negative", 0)) / total_sentiment
            if negative_ratio >= 0.6:
                alerts.append(
                    ThresholdAlert(
                        name="Negative sentiment spike",
                        metric="sentiment_ratio",
                        value=round(negative_ratio, 3),
                        threshold=0.6,
                        status="breached",
                        severity="High",
                        description="Negative sentiment exceeds 60% of tracked messages.",
                    )
                )
            elif negative_ratio >= 0.5:
                alerts.append(
                    ThresholdAlert(
                        name="Elevated negative sentiment",
                        metric="sentiment_ratio",
                        value=round(negative_ratio, 3),
                        threshold=0.5,
                        status="watch",
                        severity="Medium",
                        description="Negative sentiment is trending above half of recent messages.",
                    )
                )

        high_risk_count = len(high_risk_users)
        if high_risk_count >= 5:
            alerts.append(
                ThresholdAlert(
                    name="High-risk student volume",
                    metric="high_risk_users",
                    value=float(high_risk_count),
                    threshold=5.0,
                    status="breached",
                    severity="High",
                    description="Five or more students flagged for repeated high triage scores this window.",
                )
            )
        elif high_risk_count >= 3:
            alerts.append(
                ThresholdAlert(
                    name="Monitor triage follow-ups",
                    metric="high_risk_users",
                    value=float(high_risk_count),
                    threshold=3.0,
                    status="watch",
                    severity="Medium",
                    description="Multiple students exceeded triage severity thresholds recently.",
                )
            )

        total_interventions = sum(int(item.get("count", 0)) for item in intervention_outcomes)
        if total_interventions:
            failure_statuses = {"failed", "error", "cancelled"}
            failure_count = sum(
                int(item.get("count", 0))
                for item in intervention_outcomes
                if str(item.get("status", "")).lower() in failure_statuses
            )
            if failure_count:
                failure_ratio = failure_count / total_interventions
                if failure_ratio >= 0.25:
                    alerts.append(
                        ThresholdAlert(
                            name="Intervention failure rate",
                            metric="intervention_failure_ratio",
                            value=round(failure_ratio, 3),
                            threshold=0.25,
                            status="breached",
                            severity="High",
                            description="More than a quarter of interventions failed or errored this window.",
                        )
                    )
                elif failure_ratio >= 0.15:
                    alerts.append(
                        ThresholdAlert(
                            name="Intervention delivery risk",
                            metric="intervention_failure_ratio",
                            value=round(failure_ratio, 3),
                            threshold=0.15,
                            status="watch",
                            severity="Medium",
                            description="Intervention errors exceed 15% of attempts; review delivery settings.",
                        )
                    )

        alerts.sort(key=lambda alert: severity_rank.get(alert.severity, 3))
        return alerts[:5]

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




