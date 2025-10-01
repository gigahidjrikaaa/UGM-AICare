from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta
from typing import Any

from app.agents.sca.resources import get_default_resources
from app.agents.sca.schemas import (
    PlanStep,
    ResourceCard,
    SCAFollowUpRequest,
    SCAFollowUpResponse,
    SCAInterveneRequest,
    SCAInterveneResponse,
)
from app.core.events import AgentEvent, AgentNameEnum, emit_agent_event


PlanMatrix = dict[str, list[PlanStep]]

_DEFAULT_PLAN_STEPS: PlanMatrix = {
    "academic_stress": [
        PlanStep(id="grounding", label="Box breathing to reset focus", duration_min=4),
        PlanStep(id="plan", label="Break assignments into smaller actions", duration_min=6),
        PlanStep(id="support", label="Message a study buddy or mentor", duration_min=3),
    ],
    "acute_distress": [
        PlanStep(id="breathing", label="Guided 4-7-8 breathing", duration_min=5),
        PlanStep(id="body_scan", label="Progressive muscle relaxation", duration_min=7),
        PlanStep(id="safety_plan", label="Review personal safety plan", duration_min=5),
    ],
    "relationship_strain": [
        PlanStep(id="reflect", label="Name the need behind the feeling", duration_min=5),
        PlanStep(id="communicate", label="Draft an 'I feel / I need' message", duration_min=6),
        PlanStep(id="connect", label="Reach out to a trusted friend", duration_min=4),
    ],
    "financial_pressure": [
        PlanStep(id="budget", label="List fixed vs. flexible expenses", duration_min=8),
        PlanStep(id="relief", label="Explore campus aid and scholarships", duration_min=6),
        PlanStep(id="self_care", label="Schedule a restorative break", duration_min=4),
    ],
}

_FALLBACK_PLAN = [
    PlanStep(id="check_in", label="Pause and notice how your body feels", duration_min=3),
    PlanStep(id="cope", label="Use a favourite coping skill for 5 minutes", duration_min=5),
    PlanStep(id="reach_out", label="Share how you're feeling with someone you trust", duration_min=4),
]


class SupportCoachService:
    """Generates structured follow-up plans and emits Insights Agent telemetry."""

    def __init__(
        self,
        event_emitter: Callable[[AgentEvent], Awaitable[None]] = emit_agent_event,
    ) -> None:
        self._emit_event = event_emitter

    async def intervene(self, payload: SCAInterveneRequest) -> SCAInterveneResponse:
        intent_key = payload.intent.strip().lower()
        plan_steps = list(_DEFAULT_PLAN_STEPS.get(intent_key, _FALLBACK_PLAN))
        resources = list(self._coerce_resources(intent_key))

        check_in_hours = self._resolve_followup_window(payload, default_hours=24)
        next_check_in = (
            datetime.utcnow() + timedelta(hours=check_in_hours)
            if payload.consent_followup is not False
            else None
        )

        response = SCAInterveneResponse(
            plan_steps=plan_steps,
            resource_cards=resources,
            next_check_in=next_check_in,
        )

        await self._emit_event(
            AgentEvent(
                agent=AgentNameEnum.SCA,
                step="plan_generated",
                payload={
                    "session_id": payload.session_id,
                    "intent": intent_key,
                    "user_hash": payload.options.get("user_hash")
                    if isinstance(payload.options, dict)
                    else None,
                    "resource_count": len(resources),
                    "plan_length": len(plan_steps),
                },
                ts=datetime.utcnow(),
            )
        )

        return response

    async def followup(self, payload: SCAFollowUpRequest) -> SCAFollowUpResponse:
        sentiment = str(payload.check_in.get("mood", "")).lower()
        stress = str(payload.check_in.get("stress", "")).lower()

        if sentiment in {"worse", "bad"} or stress in {"high", "elevated"}:
            hours = 6
        elif sentiment in {"better", "good"}:
            hours = 48
        else:
            hours = 24

        next_check_in = datetime.utcnow() + timedelta(hours=hours)
        response = SCAFollowUpResponse(acknowledged=True, next_check_in=next_check_in)

        await self._emit_event(
            AgentEvent(
                agent=AgentNameEnum.SCA,
                step="followup_logged",
                payload={
                    "session_id": payload.session_id,
                    "plan_id": payload.last_plan_id,
                    "user_hash": payload.check_in.get("user_hash"),
                    "mood": sentiment or None,
                    "stress": stress or None,
                },
                ts=datetime.utcnow(),
            )
        )

        return response

    @staticmethod
    def _resolve_followup_window(payload: SCAInterveneRequest, default_hours: int) -> int:
        options = payload.options or {}
        window = options.get("check_in_hours")
        if isinstance(window, (int, float)) and window > 0:
            return int(window)
        if payload.intent.lower() in {"acute_distress", "crisis_support"}:
            return 6
        return default_hours

    @staticmethod
    def _coerce_resources(intent: str) -> list[ResourceCard]:
        resources = list(get_default_resources(intent))
        if resources:
            return resources
        return list(get_default_resources("general_support"))


def get_support_coach_service() -> "SupportCoachService":
    """FastAPI dependency factory for :class:`SupportCoachService`."""

    return SupportCoachService()


