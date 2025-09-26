from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.ia.schemas import IAQueryRequest, IAQueryResponse
from app.agents.ia.service import InsightsAgentService

router = APIRouter(prefix="/api/agents/ia", tags=["agents:ia"])


@router.post("/query", response_model=IAQueryResponse)
async def query(
    payload: IAQueryRequest,
    service: InsightsAgentService = Depends(InsightsAgentService),
) -> IAQueryResponse:
    return await service.query(payload)
