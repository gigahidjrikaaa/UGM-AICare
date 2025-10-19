from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta
from typing import Any, Optional, Dict
import logging

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

logger = logging.getLogger(__name__)


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

    async def intervene(
        self, 
        payload: SCAInterveneRequest,
        use_gemini_plan: bool = False,
        plan_type: Optional[str] = None,
        user_message: Optional[str] = None,
        sta_context: Optional[Dict[str, Any]] = None
    ) -> SCAInterveneResponse:
        """Generate intervention plan - uses Gemini AI if requested, otherwise static plans.
        
        Args:
            payload: Standard SCA intervention request
            use_gemini_plan: If True, generate personalized plan with Gemini AI
            plan_type: Type of plan ("calm_down", "break_down_problem", "general_coping")
            user_message: Original user message for context (required if use_gemini_plan=True)
            sta_context: Additional context from STA (risk_level, etc.)
        
        Returns:
            SCAInterveneResponse with plan steps and resources
        """
        intent_key = payload.intent.strip().lower()
        
        # Use Gemini-powered plan generation if requested
        if use_gemini_plan and plan_type and user_message:
            try:
                logger.info(f"Generating Gemini-powered {plan_type} plan for intent: {intent_key}")
                
                from app.agents.sca.gemini_plan_generator import generate_personalized_plan
                
                # Build context for Gemini
                gemini_context = {}
                if sta_context:
                    gemini_context.update(sta_context)
                
                # Add any additional context from payload options
                if isinstance(payload.options, dict):
                    if "risk_level" in payload.options:
                        gemini_context["risk_level"] = payload.options["risk_level"]
                    if "demographics" in payload.options:
                        gemini_context["demographics"] = payload.options["demographics"]
                    if "previous_sessions" in payload.options:
                        gemini_context["previous_sessions"] = payload.options["previous_sessions"]
                
                # Generate personalized plan
                plan_data = await generate_personalized_plan(
                    user_message=user_message,
                    intent=intent_key,
                    plan_type=plan_type,
                    context=gemini_context if gemini_context else None
                )
                
                # Convert to PlanStep and ResourceCard objects
                plan_steps = [
                    PlanStep(
                        id=step.get("id", f"step_{i}"),
                        label=step.get("label", ""),
                        duration_min=step.get("duration_min")
                    )
                    for i, step in enumerate(plan_data.get("plan_steps", []))
                ]
                
                resources = [
                    ResourceCard(
                        resource_id=card.get("resource_id", f"resource_{i}"),
                        title=card.get("title", ""),
                        summary=card.get("summary", ""),
                        url=card.get("url")
                    )
                    for i, card in enumerate(plan_data.get("resource_cards", []))
                ]
                
                logger.info(f"Gemini plan generated: {len(plan_steps)} steps, {len(resources)} resources")
                
            except Exception as e:
                logger.error(f"Gemini plan generation failed, falling back to static: {e}", exc_info=True)
                # Fallback to static plans
                plan_steps = list(_DEFAULT_PLAN_STEPS.get(intent_key, _FALLBACK_PLAN))
                resources = list(self._coerce_resources(intent_key))
        else:
            # Use static plans (original behavior)
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
                    "used_gemini": use_gemini_plan,
                    "plan_type": plan_type if use_gemini_plan else "static",
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


