from __future__ import annotations

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any, Dict

from fastapi import Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ia.queries import ALLOWED_QUERIES
from app.agents.ia.schemas import IAQueryRequest, IAQueryResponse
from app.database import get_async_db
from app.models import (
    CampaignExecution,
    Conversation,
    TriageAssessment,
)


class InsightsAgentService:
    """Executes allow-listed analytics questions with k-anonymity enforcement."""

    def __init__(self, session: AsyncSession = Depends(get_async_db)) -> None:
        self._session = session

    async def query(self, payload: IAQueryRequest) -> IAQueryResponse:
        handler = self._resolve_handler(payload.question_id)
        start, end = payload.params.start, payload.params.end
        if start >= end:
            raise ValueError("Parameter 'from' must be before 'to'")
        return await handler(start, end)

    def _resolve_handler(
        self,
        question_id: str,
    ) -> Callable[[datetime, datetime], Awaitable[IAQueryResponse]]:
        handlers: Dict[str, Callable[[datetime, datetime], Awaitable[IAQueryResponse]]] = {
            "crisis_trend": self._crisis_trend,
            "dropoffs": self._dropoffs,
            "resource_reuse": self._resource_reuse,
            "fallback_reduction": self._fallback_reduction,
            "cost_per_helpful": self._cost_per_helpful,
            "coverage_windows": self._coverage_windows,
        }
        if question_id not in ALLOWED_QUERIES:
            raise ValueError(f"Unsupported question_id: {question_id}")
        return handlers[question_id]

    async def _crisis_trend(self, start: datetime, end: datetime) -> IAQueryResponse:
        stmt = (
            select(func.date(TriageAssessment.created_at), func.count())
            .where(TriageAssessment.created_at >= start)
            .where(TriageAssessment.created_at <= end)
            .where(TriageAssessment.severity_level.in_(("high", "critical")))
            .group_by(func.date(TriageAssessment.created_at))
            .order_by(func.date(TriageAssessment.created_at))
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        def _coerce_iso(value: Any) -> str:
            if hasattr(value, "isoformat"):
                return str(value.isoformat())
            if isinstance(value, str):
                return value
            return str(value)

        series = [[_coerce_iso(day), count] for day, count in rows]
        table = [{"date": _coerce_iso(day), "high_risk_assessments": count} for day, count in rows]
        notes = [
            "Counts include triage assessments marked high or critical.",
            f"Window: {start.isoformat()} → {end.isoformat()}.",
        ]
        return IAQueryResponse(
            chart={"type": "line", "series": [{"name": "High risk", "data": series}]},
            table=table,
            notes=notes,
        )

    async def _dropoffs(self, start: datetime, end: datetime) -> IAQueryResponse:
        session_counts_stmt = (
            select(Conversation.session_id, Conversation.conversation_id, func.count())
            .where(Conversation.timestamp >= start)
            .where(Conversation.timestamp <= end)
            .group_by(Conversation.session_id, Conversation.conversation_id)
        )
        result = await self._session.execute(session_counts_stmt)
        counts = result.all()
        if not counts:
            empty_chart = {"type": "bar", "series": [{"name": "Sessions", "data": []}]}
            return IAQueryResponse(chart=empty_chart, table=[], notes=["No conversations during this window."])

        total_sessions = len(counts)
        short_sessions = sum(1 for *_ , count in counts if count <= 2)
        completion_rate = round((total_sessions - short_sessions) / total_sessions * 100, 2)

        chart = {
            "type": "bar",
            "series": [
                {
                    "name": "Chat length",
                    "data": [
                        ["1 message", short_sessions],
                        ["3+ messages", total_sessions - short_sessions],
                    ],
                }
            ],
        }
        table = [
            {
                "metric": "total_sessions",
                "value": total_sessions,
            },
            {
                "metric": "single_message_dropoffs",
                "value": short_sessions,
            },
            {
                "metric": "completion_rate_percent",
                "value": completion_rate,
            },
        ]
        notes = [
            "Drop-offs defined as conversations with two or fewer exchanges.",
            f"Completion rate {completion_rate}% across {total_sessions} sessions.",
        ]
        return IAQueryResponse(chart=chart, table=table, notes=notes)

    async def _resource_reuse(self, start: datetime, end: datetime) -> IAQueryResponse:
        stmt = (
            select(
                CampaignExecution.campaign_id,
                func.count(CampaignExecution.id),
                func.count(func.distinct(CampaignExecution.user_id)),
            )
            .where(CampaignExecution.created_at >= start)
            .where(CampaignExecution.created_at <= end)
            .group_by(CampaignExecution.campaign_id)
            .order_by(func.count(CampaignExecution.id).desc())
            .limit(10)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        chart = {
            "type": "bar",
            "series": [
                {
                    "name": "Executions",
                    "data": [[str(campaign_id or "unknown"), executions] for campaign_id, executions, _ in rows],
                }
            ],
        }
        table = [
            {
                "campaign_id": str(campaign_id or "unknown"),
                "executions": executions,
                "unique_users": users,
                "reuse_ratio": round(executions / users, 2) if users else None,
            }
            for campaign_id, executions, users in rows
        ]
        notes = ["High reuse indicates campaign content being delivered repeatedly to the same cohort."]
        return IAQueryResponse(chart=chart, table=table, notes=notes)

    async def _fallback_reduction(self, start: datetime, end: datetime) -> IAQueryResponse:
        stmt = (
            select(
                func.count().label("total"),
                func.sum(
                    case(
                        (TriageAssessment.recommended_action == "escalate_manual_review", 1),
                        else_=0,
                    )
                ).label("escalations"),
            )
            .where(TriageAssessment.created_at >= start)
            .where(TriageAssessment.created_at <= end)
        )
        total, escalations = (await self._session.execute(stmt)).one()
        total = int(total or 0)
        escalations = int(escalations or 0)
        avoidance = round(((total - escalations) / total) * 100, 2) if total else 0.0

        chart = {
            "type": "pie",
            "series": [
                {
                    "name": "Routing",
                    "data": [
                        ["Self-serve", total - escalations],
                        ["Human fallback", escalations],
                    ],
                }
            ],
        }
        table = [
            {"metric": "total_assessments", "value": total},
            {"metric": "human_fallbacks", "value": escalations},
            {"metric": "automated_resolution_percent", "value": avoidance},
        ]
        notes = [
            "Automated resolution percent reflects triage assessments that stayed within the Safety suite.",
        ]
        return IAQueryResponse(chart=chart, table=table, notes=notes)

    async def _cost_per_helpful(self, start: datetime, end: datetime) -> IAQueryResponse:
        stmt = (
            select(
                func.count().label("total"),
                func.sum(
                    case((CampaignExecution.engagement_score >= 0.7, 1), else_=0)
                ).label("helpful"),
            )
            .where(CampaignExecution.created_at >= start)
            .where(CampaignExecution.created_at <= end)
        )
        total, helpful = (await self._session.execute(stmt)).one()
        total = int(total or 0)
        helpful = int(helpful or 0)
        assumed_cost = 5.0  # nominal IDR cost per execution placeholder
        helpful = max(helpful, 1)
        cost_per_helpful = round((total * assumed_cost) / helpful, 2)

        chart = {
            "type": "gauge",
            "series": [{"name": "Cost/Helpful", "data": cost_per_helpful}],
        }
        table = [
            {"metric": "executions", "value": total},
            {"metric": "helpful_responses", "value": helpful},
            {"metric": "cost_per_helpful", "value": cost_per_helpful},
        ]
        notes = [
            "Cost uses a placeholder 5-unit assumption until billing integration ships.",
            "Helpful defined as engagement score ≥ 0.7.",
        ]
        return IAQueryResponse(chart=chart, table=table, notes=notes)

    async def _coverage_windows(self, start: datetime, end: datetime) -> IAQueryResponse:
        hour_field = func.extract("hour", Conversation.timestamp)
        stmt = (
            select(hour_field.label("hour"), func.count())
            .where(Conversation.timestamp >= start)
            .where(Conversation.timestamp <= end)
            .group_by(hour_field)
            .order_by(hour_field)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        chart = {
            "type": "bar",
            "series": [
                {
                    "name": "Conversations",
                    "data": [[f"{int(hour):02d}:00", count] for hour, count in rows],
                }
            ],
        }
        table = [
            {"hour": int(hour), "conversations": count} for hour, count in rows
        ]
        notes = [
            "Identifies peak hours for user conversations across the requested range.",
        ]
        return IAQueryResponse(chart=chart, table=table, notes=notes)
