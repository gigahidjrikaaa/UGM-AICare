from __future__ import annotations

from fastapi import Depends

from app.agents.sca.resources import get_default_resources
from app.agents.sca.schemas import (
    PlanStep,
    ResourceCard,
    SCAFollowUpRequest,
    SCAFollowUpResponse,
    SCAInterveneRequest,
    SCAInterveneResponse,
)


class SupportCoachService:
    """Placeholder service for SCA orchestration."""

    async def intervene(self, payload: SCAInterveneRequest) -> SCAInterveneResponse:
        # TODO: orchestrate CBT/ACT modules, manage resource personalization, emit events
        raise NotImplementedError("SupportCoachService.intervene is not implemented yet")

    async def followup(self, payload: SCAFollowUpRequest) -> SCAFollowUpResponse:
        # TODO: persist follow-up notes and enforce cooldown windows
        raise NotImplementedError("SupportCoachService.followup is not implemented yet")
