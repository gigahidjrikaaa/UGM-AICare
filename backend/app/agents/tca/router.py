from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tca.schemas import (
    SCAFollowUpRequest,
    SCAFollowUpResponse,
    TCAInterveneRequest,
    TCAInterveneResponse,
)
from app.agents.tca.service import TherapeuticCoachService, get_therapeutic_coach_service
from app.core.auth import get_current_user
from app.models.user import User
from app.database import get_async_db

router = APIRouter(prefix="/api/agents/sca", tags=["agents:sca"])


@router.post("/intervene", response_model=TCAInterveneResponse)
async def intervene(
    payload: TCAInterveneRequest,
    service: TherapeuticCoachService = Depends(get_therapeutic_coach_service),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> TCAInterveneResponse:
    return await service.intervene(payload, user=current_user, db=db)


@router.post("/followup", response_model=SCAFollowUpResponse)
async def followup(
    payload: SCAFollowUpRequest,
    service: TherapeuticCoachService = Depends(get_therapeutic_coach_service),
) -> SCAFollowUpResponse:
    return await service.followup(payload)
