"""User-facing screening endpoints.

- ``GET  /api/v1/screening/samples``     — the user's own screening time series
- ``POST /api/v1/screening/self-report`` — opt-in weekly micro-check (PHQ-2/GAD-2)

Both are part of the JITAI loop (Phase 1). The write path is gated by
``JITAI_ENABLED``; the read path simply returns whatever samples exist.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.mental_health.models import ScreeningDimensionSample
from app.models import User
from app.services.self_report_service import record_self_report

router = APIRouter(prefix="/api/v1/screening", tags=["Screening"])


class DimensionSampleOut(BaseModel):
    dimension: str
    current_score: float
    protective_score: float
    net_score: float
    instrument: Optional[str] = None
    normalized_score: float
    source: str
    created_at: datetime


class SelfReportRequest(BaseModel):
    phq2: Optional[List[int]] = Field(None, description="Two PHQ-2 items, each 0-3")
    gad2: Optional[List[int]] = Field(None, description="Two GAD-2 items, each 0-3")


class SelfReportResponse(BaseModel):
    recorded: bool
    result: dict


class ConsentRequest(BaseModel):
    granted: bool


class ConsentResponse(BaseModel):
    consent_self_report: bool


@router.get("/samples", response_model=List[DimensionSampleOut])
async def get_my_screening_samples(
    dimension: Optional[str] = Query(None, description="Filter to a single dimension"),
    days: int = Query(90, ge=1, le=365, description="Trailing window in days"),
    limit: int = Query(500, ge=1, le=2000),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> List[DimensionSampleOut]:
    """Return the authenticated user's longitudinal screening samples."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(ScreeningDimensionSample)
        .where(ScreeningDimensionSample.user_id == current_user.id)
        .where(ScreeningDimensionSample.created_at >= since)
        .order_by(ScreeningDimensionSample.created_at.desc())
        .limit(limit)
    )
    if dimension:
        stmt = stmt.where(ScreeningDimensionSample.dimension == dimension)

    rows = (await db.execute(stmt)).scalars().all()
    return [
        DimensionSampleOut(
            dimension=row.dimension,
            current_score=row.current_score,
            protective_score=row.protective_score,
            net_score=row.net_score,
            instrument=row.instrument,
            normalized_score=row.normalized_score,
            source=row.source,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.post("/self-report", response_model=SelfReportResponse)
async def submit_self_report(
    payload: SelfReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> SelfReportResponse:
    """Record an opt-in PHQ-2 / GAD-2 self-report as screening samples."""
    if not settings.jitai_enabled:
        raise HTTPException(status_code=404, detail="Self-report is not enabled")

    try:
        result = await record_self_report(
            db, user_id=current_user.id, phq2=payload.phq2, gad2=payload.gad2
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    await db.commit()
    return SelfReportResponse(recorded=True, result=result)


@router.put("/self-report/consent", response_model=ConsentResponse)
async def set_self_report_consent(
    payload: ConsentRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> ConsentResponse:
    """Grant/withdraw opt-in consent for the weekly self-report prompt."""
    if not settings.jitai_enabled:
        raise HTTPException(status_code=404, detail="Self-report is not enabled")

    from app.models import UserConsentLedger

    current_user.consent_self_report = payload.granted
    db.add(
        UserConsentLedger(
            user_id=current_user.id,
            consent_type="self_report",
            granted=payload.granted,
            consent_version="v1.0",
            consent_language="id",
            consent_method="screening_settings",
            timestamp=datetime.utcnow(),
        )
    )
    await db.commit()
    return ConsentResponse(consent_self_report=payload.granted)
