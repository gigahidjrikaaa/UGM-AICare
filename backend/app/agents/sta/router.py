from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.sta.schemas import STAClassifyRequest, STAClassifyResponse
from app.agents.sta.service import SafetyTriageService

router = APIRouter(prefix="/api/agents/sta", tags=["agents:sta"])


@router.post("/classify", response_model=STAClassifyResponse)
async def classify(
    payload: STAClassifyRequest,
    service: SafetyTriageService = Depends(SafetyTriageService),
) -> STAClassifyResponse:
    """Classify a single utterance for risk and intent (STA stub)."""

    return await service.classify(payload)
