from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.sda.schemas import (
    SDAAssignRequest,
    SDAAssignResponse,
    SDACloseRequest,
    SDACloseResponse,
    SDAListCasesResponse,
)
from app.agents.sda.service import SafetyDeskService

router = APIRouter(prefix="/api/agents/sda", tags=["agents:sda"])


@router.get("/cases", response_model=SDAListCasesResponse)
async def list_cases(
    status: str | None = None,
    service: SafetyDeskService = Depends(SafetyDeskService),
) -> SDAListCasesResponse:
    return await service.list_cases(status=status)


@router.post("/cases/assign", response_model=SDAAssignResponse)
async def assign_case(
    payload: SDAAssignRequest,
    service: SafetyDeskService = Depends(SafetyDeskService),
) -> SDAAssignResponse:
    return await service.assign_case(payload)


@router.post("/cases/close", response_model=SDACloseResponse)
async def close_case(
    payload: SDACloseRequest,
    service: SafetyDeskService = Depends(SafetyDeskService),
) -> SDACloseResponse:
    return await service.close_case(payload)
