from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.agents.cma.schemas import (
    CMAAssignRequest,
    CMAAssignResponse,
    CMACloseRequest,
    CMACloseResponse,
    CMAListCasesResponse,
)
from app.agents.cma.service import CaseManagementService, get_case_management_service
from app.core.role_utils import normalize_role
from app.core.auth import get_current_user as _get_current_user_core
from app.models.user import User


async def require_case_manager(current_user: User = Depends(_get_current_user_core)) -> User:
    """Case data carries victim contact details — counselors and admins only."""
    if normalize_role(current_user.role) not in {"admin", "counselor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Case management is restricted to counselors and admins.",
        )
    return current_user


router = APIRouter(
    prefix="/api/agents/sda",
    tags=["agents:sda"],
    dependencies=[Depends(require_case_manager)],
)


@router.get("/cases", response_model=CMAListCasesResponse)
async def list_cases(
    status: str | None = None,
    service: CaseManagementService = Depends(get_case_management_service),
) -> CMAListCasesResponse:
    return await service.list_cases(status_filter=status)


@router.post("/cases/assign", response_model=CMAAssignResponse)
async def assign_case(
    payload: CMAAssignRequest,
    service: CaseManagementService = Depends(get_case_management_service),
) -> CMAAssignResponse:
    return await service.assign_case(payload)


@router.post("/cases/close", response_model=CMACloseResponse)
async def close_case(
    payload: CMACloseRequest,
    service: CaseManagementService = Depends(get_case_management_service),
) -> CMACloseResponse:
    return await service.close_case(payload)
