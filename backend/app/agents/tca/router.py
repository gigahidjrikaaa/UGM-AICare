from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.tca.schemas import (
    SCAFollowUpRequest,
    SCAFollowUpResponse,
    TCAInterveneRequest,
    TCAInterveneResponse,
)
from app.agents.tca.service import TherapeuticCoachService, get_therapeutic_coach_service

router = APIRouter(prefix="/api/agents/sca", tags=["agents:sca"])


@router.post("/intervene", response_model=TCAInterveneResponse)
async def intervene(
    payload: TCAInterveneRequest,
    service: TherapeuticCoachService = Depends(get_therapeutic_coach_service),
) -> TCAInterveneResponse:
    return await service.intervene(payload)


@router.post("/followup", response_model=SCAFollowUpResponse)
async def followup(
    payload: SCAFollowUpRequest,
    service: TherapeuticCoachService = Depends(get_therapeutic_coach_service),
) -> SCAFollowUpResponse:
    return await service.followup(payload)
