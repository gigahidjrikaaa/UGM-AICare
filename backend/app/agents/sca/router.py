from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.sca.schemas import (
    SCAFollowUpRequest,
    SCAFollowUpResponse,
    SCAInterveneRequest,
    SCAInterveneResponse,
)
from app.agents.sca.service import SupportCoachService

router = APIRouter(prefix="/api/agents/sca", tags=["agents:sca"])


@router.post("/intervene", response_model=SCAInterveneResponse)
async def intervene(
    payload: SCAInterveneRequest,
    service: SupportCoachService = Depends(SupportCoachService),
) -> SCAInterveneResponse:
    return await service.intervene(payload)


@router.post("/followup", response_model=SCAFollowUpResponse)
async def followup(
    payload: SCAFollowUpRequest,
    service: SupportCoachService = Depends(SupportCoachService),
) -> SCAFollowUpResponse:
    return await service.followup(payload)
