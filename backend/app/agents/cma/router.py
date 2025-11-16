from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.cma.schemas import (
    SDAAssignRequest,
    SDAAssignResponse,
    SDACloseRequest,
    SDACloseResponse,
    SDAListCasesResponse,
)
from app.agents.cma.service import CaseManagementService, get_case_management_service

router = APIRouter(prefix="/api/agents/sda", tags=["agents:sda"])


@router.get("/cases", response_model=SDAListCasesResponse)
async def list_cases(
    status: str | None = None,
    service: CaseManagementService = Depends(get_case_management_service),
) -> SDAListCasesResponse:
    return await service.list_cases(status_filter=status)


@router.post("/cases/assign", response_model=SDAAssignResponse)
async def assign_case(
    payload: SDAAssignRequest,
    service: CaseManagementService = Depends(get_case_management_service),
) -> SDAAssignResponse:
    return await service.assign_case(payload)


@router.post("/cases/close", response_model=SDACloseResponse)
async def close_case(
    payload: SDACloseRequest,
    service: CaseManagementService = Depends(get_case_management_service),
) -> SDACloseResponse:
    return await service.close_case(payload)
