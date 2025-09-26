from __future__ import annotations

from fastapi import Depends

from app.agents.sda.schemas import (
    SDAAssignRequest,
    SDAAssignResponse,
    SDACase,
    SDACloseRequest,
    SDACloseResponse,
    SDAListCasesResponse,
)


class SafetyDeskService:
    """Facade for SDA queue management (pending data layer hookup)."""

    async def list_cases(self, status: str | None = None) -> SDAListCasesResponse:
        raise NotImplementedError("SafetyDeskService.list_cases is not implemented yet")

    async def assign_case(self, payload: SDAAssignRequest) -> SDAAssignResponse:
        raise NotImplementedError("SafetyDeskService.assign_case is not implemented yet")

    async def close_case(self, payload: SDACloseRequest) -> SDACloseResponse:
        raise NotImplementedError("SafetyDeskService.close_case is not implemented yet")
