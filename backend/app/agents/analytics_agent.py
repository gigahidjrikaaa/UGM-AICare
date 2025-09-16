import json
import logging
import os
from collections import Counter
from datetime import datetime, timedelta
from typing import Annotated, Any, Dict, List, Sequence, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AnalyticsReport as AnalyticsReportModel,
    Conversation,
    JournalEntry,
)

logger = logging.getLogger(__name__)


class Insight(BaseModel):
    title: str
    description: str
    severity: str
    data: Dict[str, Any]


class Pattern(BaseModel):
    name: str
    description: str
    count: int


class AnalyticsReport(BaseModel):
    report_period: str
    insights: List[Insight]
    patterns: List[Pattern]
    recommendations: List[str]
    metrics: Dict[str, Any] | None = None


class AnalyticsState(TypedDict, total=False):
    timeframe_days: int
    start_date: datetime
    end_date: datetime
    metrics: Dict[str, Any]
    raw_texts: List[str]
    patterns: List[Pattern]
    insights: List[Insight]
    recommendations: List[str]
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
        graph.add_node("generate_insights", self._generate_insights_node)
        graph.add_node("prepare_report", self._prepare_report)

        graph.set_entry_point("collect_activity")
        graph.add_edge("collect_activity", "analyze_patterns")
        graph.add_edge("analyze_patterns", "generate_insights")
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

        texts: List[str] = [c.message for c in conversations if c.message]
        texts.extend(j.content for j in journal_entries if j.content)

        logger.debug(
            "Collected %s conversations and %s journals for analytics",
            total_messages,
            total_journals,
        )

        return {"metrics": metrics, "raw_texts": texts}

    async def _analyze_patterns(self, state: AnalyticsState) -> AnalyticsState:
        texts = state.get("raw_texts", [])
        patterns = self._identify_patterns(texts)

        # Compute simple sentiment proxy using keyword hits
        sentiment_counter = Counter()
        positive_terms = ["grateful", "better", "improved", "progress"]
        negative_terms = ["worse", "overwhelmed", "stressed", "anxious"]
        for text in texts:
            lowered = text.lower()
            sentiment_counter["positive"] += sum(lowered.count(term) for term in positive_terms)
            sentiment_counter["negative"] += sum(lowered.count(term) for term in negative_terms)

        metrics = dict(state.get("metrics", {}))
        metrics["sentiment_proxy"] = {
            "positive": sentiment_counter.get("positive", 0),
            "negative": sentiment_counter.get("negative", 0),
        }

        logger.debug("Identified %s patterns for analytics", len(patterns))
        return {"patterns": patterns, "metrics": metrics}

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
            "Anxiety": ["anxiety", "panic", "worried", "nervous"],
            "Depression": ["depressed", "sad", "empty", "hopeless"],
            "Stress": ["stress", "overwhelmed", "pressure"],
            "Sleep": ["sleep", "insomnia", "tired"],
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
            },
            recommendations=report.recommendations,
            intervention_triggers=[],
        )
        self.db.add(report_model)
        await self.db.commit()


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
            "id": "generate_insights",
            "label": "Generate Insights",
            "description": "Use Gemini (with fallback heuristics) to craft insights and recommendations.",
            "column": 2,
            "row": 0,
        },
        {
            "id": "prepare_report",
            "label": "Prepare Report",
            "description": "Assemble the final report payload for storage and delivery.",
            "column": 3,
            "row": 0,
        },
    ],
    "edges": [
        {"source": "collect_activity", "target": "analyze_patterns"},
        {"source": "analyze_patterns", "target": "generate_insights"},
        {"source": "generate_insights", "target": "prepare_report"},
    ],
}
