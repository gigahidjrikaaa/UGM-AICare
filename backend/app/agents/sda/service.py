from __future__ import annotations

from __future__ import annotations

from datetime import datetime
from typing import cast
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.sda.schemas import (
    SDAAssignRequest,
    SDAAssignResponse,
    SDACase,
    SDACloseRequest,
    SDACloseResponse,
    SDAListCasesResponse,
)
from app.database import get_async_db
from app.models import Case, CaseSeverityEnum, CaseStatusEnum


class SafetyDeskService:
    """Queue management utilities for the Safety Desk Agent."""

    def __init__(self, session: AsyncSession = Depends(get_async_db)) -> None:
        self._session = session

    async def list_cases(self, status_filter: str | None = None) -> SDAListCasesResponse:
        query = select(Case).order_by(Case.created_at.desc())
        if status_filter:
            try:
                status_enum = CaseStatusEnum(status_filter)
            except ValueError as exc:  # pragma: no cover - validated upstream
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid case status") from exc
            query = query.where(Case.status == status_enum)

        result = await self._session.execute(query)
        cases = result.scalars().all()
        payload = [self._to_schema(case) for case in cases]
        return SDAListCasesResponse(cases=payload)

    async def assign_case(self, payload: SDAAssignRequest) -> SDAAssignResponse:
        case = await self._get_case_or_404(payload.case_id)
        case.assigned_to = payload.assignee_id  # type: ignore[assignment]
        if case.status in {CaseStatusEnum.new, CaseStatusEnum.waiting}:
            case.status = CaseStatusEnum.in_progress  # type: ignore[assignment]
        case.updated_at = datetime.utcnow()  # type: ignore[assignment]
        self._session.add(case)
        await self._session.commit()
        return SDAAssignResponse(case_id=str(case.id), assigned_to=payload.assignee_id)

    async def close_case(self, payload: SDACloseRequest) -> SDACloseResponse:
        case = await self._get_case_or_404(payload.case_id)
        case.status = CaseStatusEnum.closed  # type: ignore[assignment]
        case.closure_reason = payload.closure_reason  # type: ignore[assignment]
        case.updated_at = datetime.utcnow()  # type: ignore[assignment]
        self._session.add(case)
        await self._session.commit()
        status_value = case.status.value if isinstance(case.status, CaseStatusEnum) else CaseStatusEnum.new.value
        closed_at = cast(datetime, case.updated_at)
        return SDACloseResponse(case_id=str(case.id), status=status_value, closed_at=closed_at)

    async def _get_case_or_404(self, case_id: str) -> Case:
        try:
            uuid = UUID(case_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid case_id") from exc

        result = await self._session.execute(select(Case).where(Case.id == uuid))
        case = result.scalar_one_or_none()
        if case is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety case not found")
        return case

    @staticmethod
    def _to_schema(case: Case) -> SDACase:
        created_at = cast(datetime, case.created_at)
        updated_at = cast(datetime, case.updated_at)
        status_value = case.status.value if isinstance(case.status, CaseStatusEnum) else CaseStatusEnum.new.value
        severity_value = case.severity.value if isinstance(case.severity, CaseSeverityEnum) else CaseSeverityEnum.low.value
        assigned_to = cast(str | None, getattr(case, "assigned_to", None))
        user_hash = cast(str, getattr(case, "user_hash", ""))
        session_id = cast(str | None, getattr(case, "session_id", None))
        summary_redacted = cast(str | None, getattr(case, "summary_redacted", None))
        sla_breach_at = cast(datetime | None, getattr(case, "sla_breach_at", None))

        return SDACase(
            id=str(case.id),
            created_at=created_at,
            updated_at=updated_at,
            status=status_value,
            severity=severity_value,
            assigned_to=assigned_to,
            user_hash=user_hash,
            session_id=session_id,
            summary_redacted=summary_redacted,
            sla_breach_at=sla_breach_at,
        )
