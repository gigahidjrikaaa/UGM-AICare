"""LangGraph orchestration for the intervention agent."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence, TypedDict

import httpx
from langchain_core.messages import HumanMessage, SystemMessage # type: ignore
from langchain_google_genai import ChatGoogleGenerativeAI # type: ignore
from langgraph.graph import END, StateGraph # type: ignore
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    CampaignExecution,
    InterventionAgentSettings,
    InterventionCampaign,
    TriageAssessment,
)

logger = logging.getLogger(__name__)

_llm: ChatGoogleGenerativeAI | None = None


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is not None:
        return _llm
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_GENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing Google Generative AI credentials")
    _llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.15,
        google_api_key=api_key,
    )
    return _llm


class InterventionInsight(BaseModel):
    title: str
    description: str
    severity: str
    data: Dict[str, Any] = Field(default_factory=dict)


class StrategyPlan(BaseModel):
    campaign_type: str
    priority: str
    requires_human_review: bool
    summary: str
    recommended_channel: str
    target_window_days: int
    severity_filter: List[str] = Field(default_factory=list)


class TargetCandidate(BaseModel):
    user_id: int
    risk_score: Optional[float] = None
    severity_level: Optional[str] = None
    recommended_action: Optional[str] = None
    last_assessed_at: Optional[datetime] = None


class CampaignDraft(BaseModel):
    title: str
    description: str
    content: Dict[str, Any]


class InterventionResult(BaseModel):
    campaign_id: Optional[int]
    campaign_status: Optional[str]
    target_count: int
    requires_review: bool
    dispatch_status: str
    message: str


class InterventionState(TypedDict, total=False):
    insight: InterventionInsight
    settings: InterventionAgentSettings
    risk_score: float
    risk_level: str
    strategy: StrategyPlan
    targeting: Dict[str, Any]
    audience: List[TargetCandidate]
    campaign_draft: CampaignDraft
    campaign: InterventionCampaign
    executions: List[CampaignExecution]
    dispatch_result: Dict[str, Any]


class InterventionAgent:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._graph = self._build_graph()
        self._n8n_url = os.getenv("N8N_INTERVENTION_WEBHOOK_URL") or os.getenv(
            "N8N_WEBHOOK_URL"
        )
        self._n8n_api_key = os.getenv("N8N_API_KEY")

    def _build_graph(self):
        graph = StateGraph(InterventionState)
        graph.add_node("prepare_context", self._prepare_context)
        graph.add_node("score_insight", self._score_insight)
        graph.add_node("choose_strategy", self._choose_strategy)
        graph.add_node("select_audience", self._select_audience)
        graph.add_node("compose_messaging", self._compose_messaging)
        graph.add_node("persist_campaign", self._persist_campaign)
        graph.add_node("dispatch_campaign", self._dispatch_campaign)

        graph.set_entry_point("prepare_context")
        graph.add_edge("prepare_context", "score_insight")
        graph.add_edge("score_insight", "choose_strategy")
        graph.add_edge("choose_strategy", "select_audience")
        graph.add_edge("select_audience", "compose_messaging")
        graph.add_edge("compose_messaging", "persist_campaign")
        graph.add_edge("persist_campaign", "dispatch_campaign")
        graph.add_edge("dispatch_campaign", END)

        return graph.compile()

    async def execute_intervention(
        self, insight: InterventionInsight | Dict[str, Any]
    ) -> InterventionResult:
        # Convert insight to InterventionInsight if it's a dict
        if isinstance(insight, dict):
            insight_obj = InterventionInsight.model_validate(insight)
        else:
            insight_obj = insight

        initial_state: InterventionState = {"insight": insight_obj}
        final_state = await self._graph.ainvoke(initial_state)
        campaign = final_state.get("campaign")
        strategy = final_state.get("strategy")
        audience = final_state.get("audience", [])
        dispatch_result = final_state.get("dispatch_result", {}) or {}
        message = (
            dispatch_result.get("message")
            if isinstance(dispatch_result, dict)
            else None
        )
        dispatch_status = (
            dispatch_result.get("status")
            if isinstance(dispatch_result, dict)
            else "unknown"
        )

        return InterventionResult(
            campaign_id=getattr(campaign, "id", None),
            campaign_status=getattr(campaign, "status", None),
            target_count=len(audience),
            requires_review=strategy.requires_human_review if strategy else True,
            dispatch_status=dispatch_status or "unknown",
            message=message or "Intervention pipeline completed.",
        )

    async def _prepare_context(self, state: InterventionState) -> InterventionState:
        raw_insight = state.get("insight")
        if raw_insight is None:
            raise ValueError("Intervention agent requires an analytics insight payload")
        insight = (
            raw_insight
            if isinstance(raw_insight, InterventionInsight)
            else InterventionInsight.model_validate(raw_insight)
        )
        settings = await self._load_settings()
        return {"insight": insight, "settings": settings}

    async def _score_insight(self, state: InterventionState) -> InterventionState:
        insight = state.get("insight")
        if insight is None:
            raise ValueError("Insight is required for scoring")
        base = {"high": 0.88, "medium": 0.65, "low": 0.35}.get(
            insight.severity.lower(), 0.5
        )
        data = insight.data or {}
        spike = self._safe_float(
            data.get("spike_percent") or data.get("spike") or data.get("change"), 0.0
        )
        risk_score = base + min(spike / 100.0, 0.1)
        if data.get("crisis_mentions") or "crisis" in insight.title.lower():
            risk_score = max(risk_score, 0.95)
        risk_score = min(round(risk_score, 2), 0.99)
        risk_level = (
            "critical" if risk_score >= 0.85 else "elevated" if risk_score >= 0.6 else "watch"
        )
        return {"risk_score": risk_score, "risk_level": risk_level}

    async def _choose_strategy(self, state: InterventionState) -> InterventionState:
        insight = state.get("insight")
        settings = state.get("settings")
        risk_score = state.get("risk_score", 0.5)
        risk_level = state.get("risk_level", "watch")

        if insight is None:
            raise ValueError("Insight is required for strategy selection")
        if settings is None:
            raise ValueError("Settings are required for strategy selection")

        severity = insight.severity.lower()
        title_lower = insight.title.lower()
        if risk_level == "critical" or "self-harm" in title_lower or "crisis" in title_lower:
            campaign_type = "crisis_prevention"
            priority = "high"
            severity_filter = ["high"]
            window = 7
        elif risk_level == "elevated":
            campaign_type = "targeted_support"
            priority = "high" if severity in {"high", "medium"} else "medium"
            severity_filter = ["medium", "high"]
            window = 14
        else:
            campaign_type = "preventive_education"
            priority = "medium"
            severity_filter = ["low", "medium"]
            window = 30

        summary = (
            f"{campaign_type.replace('_', ' ').title()} responding to {insight.title.lower()}."
        )
        channel = (settings.channels_enabled or ["email"])[0]
        requires_review = settings.human_review_required or campaign_type == "crisis_prevention"

        strategy = StrategyPlan(
            campaign_type=campaign_type,
            priority=priority,
            requires_human_review=requires_review,
            summary=summary,
            recommended_channel=channel,
            target_window_days=window,
            severity_filter=severity_filter,
        )

        min_risk = round(max(settings.risk_score_threshold, risk_score - 0.05), 2)
        targeting = {
            "severity_levels": severity_filter,
            "lookback_days": window,
            "minimum_risk_score": min_risk,
            "insight_theme": insight.title,
        }
        return {"strategy": strategy, "targeting": targeting}

    async def _select_audience(self, state: InterventionState) -> InterventionState:
        targeting = state.get("targeting")
        settings = state.get("settings")

        if targeting is None:
            raise ValueError("Targeting criteria are required for audience selection")
        if settings is None:
            raise ValueError("Settings are required for audience selection")

        lookback_days = int(targeting.get("lookback_days", 21))
        min_risk = self._safe_float(
            targeting.get("minimum_risk_score"), settings.risk_score_threshold
        )
        severity_levels = targeting.get("severity_levels") or []
        limit = max(settings.daily_send_limit or 1, 1)
        since = datetime.utcnow() - timedelta(days=lookback_days)

        stmt = (
            select(
                TriageAssessment.user_id,
                TriageAssessment.risk_score,
                TriageAssessment.severity_level,
                TriageAssessment.recommended_action,
                TriageAssessment.created_at,
            )
            .where(TriageAssessment.user_id.isnot(None))
            .where(TriageAssessment.created_at >= since)
            .where(TriageAssessment.risk_score >= min_risk)
            .order_by(desc(TriageAssessment.created_at))
        )
        if severity_levels:
            stmt = stmt.filter(TriageAssessment.severity_level.in_(severity_levels))

        result = await self.db.execute(stmt.limit(limit * 3))
        candidates: List[TargetCandidate] = []
        seen: set[int] = set()
        for user_id, risk_score, severity, action, created_at in result.all():
            if user_id is None or user_id in seen:
                continue
            seen.add(user_id)
            candidates.append(
                TargetCandidate(
                    user_id=user_id,
                    risk_score=risk_score,
                    severity_level=severity,
                    recommended_action=action,
                    last_assessed_at=created_at,
                )
            )
            if len(candidates) >= limit:
                break

        if not candidates:
            fallback_stmt = (
                select(
                    TriageAssessment.user_id,
                    TriageAssessment.risk_score,
                    TriageAssessment.severity_level,
                    TriageAssessment.recommended_action,
                    TriageAssessment.created_at,
                )
                .where(TriageAssessment.user_id.isnot(None))
                .order_by(desc(TriageAssessment.created_at))
                .limit(limit)
            )
            if severity_levels:
                fallback_stmt = fallback_stmt.filter(
                    TriageAssessment.severity_level.in_(severity_levels)
                )
            fallback_result = await self.db.execute(fallback_stmt)
            for user_id, risk_score, severity, action, created_at in fallback_result.all():
                if user_id is None or user_id in seen:
                    continue
                seen.add(user_id)
                candidates.append(
                    TargetCandidate(
                        user_id=user_id,
                        risk_score=risk_score,
                        severity_level=severity,
                        recommended_action=action,
                        last_assessed_at=created_at,
                    )
                )

        return {"audience": candidates}

    async def _compose_messaging(self, state: InterventionState) -> InterventionState:
        insight = state.get("insight")
        strategy = state.get("strategy")
        audience = state.get("audience", [])
        risk_score = state.get("risk_score", 0.5)
        settings = state.get("settings")

        if insight is None:
            raise ValueError("Insight is required for message composition")
        if strategy is None:
            raise ValueError("Strategy is required for message composition")
        if settings is None:
            raise ValueError("Settings are required for message composition")

        channels = settings.channels_enabled or ["email"]
        base_subject = f"{insight.title} - Support from AICare"
        base_body = self._build_heuristic_body(insight, audience, risk_score, channels)
        cta_text = "Schedule a counselling session"
        cta_url = self._default_cta_url()
        tone = "supportive"

        llm = None
        try:
            llm = _get_llm()
        except RuntimeError:
            llm = None

        if llm:
            try:
                payload = {
                    "insight": insight.model_dump(),
                    "strategy": strategy.model_dump(),
                    "target_count": len(audience),
                    "risk_score": risk_score,
                }
                messages = [
                    SystemMessage(
                        content=(
                            "You craft short, supportive outreach messages for university wellbeing teams. "
                            "Be empathetic, clear, and include a single actionable next step."
                        )
                    ),
                    HumanMessage(
                        content=(
                            "Respond in JSON with keys 'subject', 'body', 'cta_text', 'cta_url', 'tone'. "
                            "Keep body under 180 words. Context:\n" + json.dumps(payload)
                        )
                    ),
                ]
                response = await llm.ainvoke(messages)
                data = json.loads(response.content)
                base_subject = data.get("subject") or base_subject
                base_body = data.get("body") or base_body
                cta_text = data.get("cta_text") or cta_text
                cta_url = data.get("cta_url") or cta_url
                tone = data.get("tone") or tone
            except Exception as exc:  # pragma: no cover - external service
                logger.warning("Falling back to heuristic intervention message: %s", exc)

        content = {
            "subject": base_subject,
            "body": base_body,
            "cta": {"label": cta_text, "url": cta_url},
            "channels": channels,
            "tone": tone,
            "insight_summary": {
                "title": insight.title,
                "severity": insight.severity,
                "risk_score": risk_score,
                "description": insight.description,
            },
        }

        draft = CampaignDraft(
            title=f"{insight.title} Outreach",
            description=strategy.summary,
            content=content,
        )
        return {"campaign_draft": draft}

    async def _persist_campaign(self, state: InterventionState) -> InterventionState:
        draft = state.get("campaign_draft")
        strategy = state.get("strategy")
        targeting = state.get("targeting", {})
        audience = state.get("audience", [])
        settings = state.get("settings")

        if draft is None:
            raise ValueError("Campaign draft is required for persistence")
        if strategy is None:
            raise ValueError("Strategy is required for persistence")
        if settings is None:
            raise ValueError("Settings are required for persistence")

        status = "draft"
        if audience:
            status = "pending_review" if strategy.requires_human_review else "scheduled"

        campaign = InterventionCampaign(
            campaign_type=strategy.campaign_type,
            title=draft.title,
            description=draft.description,
            priority=strategy.priority,
            status=status,
            content=draft.content,
            target_criteria=targeting,
            start_date=datetime.utcnow(),
            target_audience_size=len(audience),
        )
        self.db.add(campaign)
        await self.db.flush()

        executions: List[CampaignExecution] = []
        if audience:
            execution_status = "pending_review" if strategy.requires_human_review else "scheduled"
            channel = strategy.recommended_channel or (settings.channels_enabled or ["email"])[0]
            scheduled_at = datetime.utcnow()
            for candidate in audience:
                execution = CampaignExecution(
                    campaign_id=campaign.id,
                    user_id=candidate.user_id,
                    status=execution_status,
                    scheduled_at=scheduled_at,
                    delivery_method=channel,
                    trigger_data={
                        "risk_score": candidate.risk_score,
                        "severity": candidate.severity_level,
                        "recommended_action": candidate.recommended_action,
                        "assessed_at": candidate.last_assessed_at.isoformat()
                        if candidate.last_assessed_at
                        else None,
                        "insight_title": (state.get("insight") or InterventionInsight(title="Unknown Insight", description="", severity="low", data={})).title,
                    },
                )
                self.db.add(execution)
                executions.append(execution)

        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(campaign)

        return {"campaign": campaign, "executions": executions}

    async def _dispatch_campaign(self, state: InterventionState) -> InterventionState:
        campaign = state.get("campaign")
        strategy = state.get("strategy")
        draft = state.get("campaign_draft")
        settings = state.get("settings")
        audience = state.get("audience", [])

        if not campaign or draft is None:
            return {
                "dispatch_result": {
                    "status": "failed",
                    "message": "Campaign record was not created.",
                }
            }

        if not audience:
            return {
                "dispatch_result": {
                    "status": "skipped",
                    "message": "No eligible recipients were identified.",
                    "campaign_id": campaign.id,
                }
            }

        if strategy is None or strategy.requires_human_review:
            return {
                "dispatch_result": {
                    "status": "pending_review",
                    "message": "Awaiting human approval before dispatch.",
                    "campaign_id": campaign.id,
                }
            }

        if settings is None or not settings.auto_mode_enabled:
            return {
                "dispatch_result": {
                    "status": "skipped",
                    "message": "Auto mode disabled; campaign queued in admin panel.",
                    "campaign_id": campaign.id,
                }
            }

        if not self._n8n_url:
            return {
                "dispatch_result": {
                    "status": "skipped",
                    "message": "N8N webhook URL not configured.",
                    "campaign_id": campaign.id,
                }
            }

        payload = {
            "campaign_id": campaign.id,
            "campaign_type": strategy.campaign_type if strategy else "unknown",
            "priority": strategy.priority if strategy else "medium",
            "content": draft.content,
            "target_criteria": state.get("targeting", {}),
            "targets": [candidate.model_dump(mode="json") for candidate in audience],
            "insight": (state.get("insight") or InterventionInsight(title="Unknown Insight", description="", severity="low", data={})).model_dump(),
        }
        headers = {"Content-Type": "application/json"}
        if self._n8n_api_key:
            headers["Authorization"] = f"Bearer {self._n8n_api_key}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self._n8n_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
            result = {
                "status": "dispatched",
                "message": "Campaign handed off to n8n workflow.",
                "campaign_id": campaign.id,
                "response": data,
            }
        except httpx.HTTPError as exc:  # pragma: no cover - network interaction
            logger.warning(
                "Failed to dispatch intervention campaign %s: %s", campaign.id, exc
            )
            result = {
                "status": "failed",
                "message": f"Dispatch failed: {exc}",
                "campaign_id": campaign.id,
            }

        return {"dispatch_result": result}

    async def _load_settings(self) -> InterventionAgentSettings:
        result = await self.db.execute(select(InterventionAgentSettings).limit(1))
        settings = result.scalar_one_or_none()
        if settings is None:
            settings = InterventionAgentSettings(
                auto_mode_enabled=True,
                human_review_required=True,
                channels_enabled=["email"],
            )
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        elif not settings.channels_enabled:
            settings.channels_enabled = ["email"]
        return settings

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _build_heuristic_body(
        self,
        insight: InterventionInsight,
        audience: Sequence[TargetCandidate],
        risk_score: float,
        channels: Sequence[str],
    ) -> str:
        intro = insight.description.rstrip(".")
        lines = [
            "Hi there,",
            "",
            f"Our wellbeing team noticed {intro.lower()} and wants to make sure you have the right support.",
        ]
        if risk_score >= 0.85:
            lines.append(
                "This note is part of a high-priority outreach to students who recently signaled they might be struggling."
            )
        elif audience:
            lines.append(
                "We're reaching out to a small group of students who recently checked in about similar feelings."
            )
        else:
            lines.append(
                "We're sharing a quick reminder that you have access to tailored support whenever you need it."
            )
        lines.append("")
        lines.append("Here are a few options you can explore today:")
        resources = (
            insight.data.get("recommended_resources")
            if isinstance(insight.data, dict)
            else None
        )
        if isinstance(resources, list) and resources:
            for resource in resources[:3]:
                title = resource.get("title") if isinstance(resource, dict) else str(resource)
                url = resource.get("url") if isinstance(resource, dict) else None
                if url:
                    lines.append(f"- {title} - {url}")
                else:
                    lines.append(f"- {title}")
        else:
            lines.extend(
                [
                    "- Book a confidential session with the UGM counselling team.",
                    "- Browse coping strategies in the AICare resource hub.",
                    "- Reach out to a friend, mentor, or lecturer you trust.",
                ]
            )
        lines.append("")
        lines.append(
            "If you're in immediate danger or need urgent help, please contact UGM's emergency line at (0274) 123-456 or local emergency services right away."
        )
        lines.append("")
        preferred_channel = channels[0] if channels else "email"
        if preferred_channel == "email":
            closing = "Warmly,\nUGM AICare Wellbeing Team"
        else:
            closing = "We're here for you,\nUGM AICare Wellbeing Team"
        lines.append(closing)
        return "\n".join(lines)

    @staticmethod
    def _default_cta_url() -> str:
        return os.getenv(
            "INTERVENTION_DEFAULT_CTA_URL", "https://aicare.ugm.ac.id/appointments"
        )


INTERVENTION_GRAPH_SPEC = {
    "id": "intervention",
    "name": "Intervention Agent",
    "nodes": [
        {
            "id": "prepare_context",
            "label": "Prepare Context",
            "description": "Validate the incoming insight and load agent settings.",
            "column": 0,
            "row": 0,
        },
        {
            "id": "score_insight",
            "label": "Score Insight",
            "description": "Estimate intervention risk level from the analytics insight.",
            "column": 1,
            "row": 0,
        },
        {
            "id": "choose_strategy",
            "label": "Choose Strategy",
            "description": "Select campaign type, priority, and targeting heuristics.",
            "column": 2,
            "row": 0,
        },
        {
            "id": "select_audience",
            "label": "Select Audience",
            "description": "Query recent triage assessments to build a recipient list.",
            "column": 3,
            "row": 0,
        },
        {
            "id": "compose_messaging",
            "label": "Compose Messaging",
            "description": "Draft outreach content with Gemini (fallback to heuristics).",
            "column": 4,
            "row": 0,
        },
        {
            "id": "persist_campaign",
            "label": "Persist Campaign",
            "description": "Store campaign details and schedule executions in the database.",
            "column": 5,
            "row": 0,
        },
        {
            "id": "dispatch_campaign",
            "label": "Dispatch Campaign",
            "description": "Hand off to n8n when auto mode is enabled and review is not required.",
            "column": 6,
            "row": 0,
        },
    ],
    "edges": [
        {"source": "prepare_context", "target": "score_insight"},
        {"source": "score_insight", "target": "choose_strategy"},
        {"source": "choose_strategy", "target": "select_audience"},
        {"source": "select_audience", "target": "compose_messaging"},
        {"source": "compose_messaging", "target": "persist_campaign"},
        {"source": "persist_campaign", "target": "dispatch_campaign"},
    ],
}
