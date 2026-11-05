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


class InsightItem(BaseModel):
    intervention_key: str
    label: str
    n: int
    improved: int
    improvement_rate: float


class InsightsResponse(BaseModel):
    interventions: List[InsightItem]
    self_report_consent: bool
    personalization_consent: bool


class PersonalizationConsentRequest(BaseModel):
    granted: bool


class PersonalizationConsentResponse(BaseModel):
    consent_personalization: bool


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


@router.get("/insights", response_model=InsightsResponse)
async def get_my_insights(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> InsightsResponse:
    """"What works for you" — the user's own measured intervention outcomes."""
    from app.agents.tca.activities_catalog import get_activity_by_id
    from app.domains.mental_health.models import InterventionAssignment
    from app.services.adaptive_selection_service import activity_id_from_key
    from app.services.intervention_effectiveness_service import (
        AssignmentOutcome,
        build_user_insights,
    )

    rows = (
        await db.execute(
            select(InterventionAssignment).where(
                InterventionAssignment.user_id == current_user.id,
                InterventionAssignment.status == "measured",
            )
        )
    ).scalars().all()

    items = [
        AssignmentOutcome(row.intervention_key or "unknown", row.outcome_label, None)
        for row in rows
    ]

    enriched: List[InsightItem] = []
    for item in build_user_insights(items):
        activity_id = activity_id_from_key(item["intervention_key"])
        activity = get_activity_by_id(activity_id) if activity_id else None
        enriched.append(
            InsightItem(label=activity.name if activity else item["intervention_key"], **item)
        )

    return InsightsResponse(
        interventions=enriched,
        self_report_consent=bool(getattr(current_user, "consent_self_report", False)),
        personalization_consent=bool(getattr(current_user, "consent_personalization", False)),
    )


@router.put("/personalization/consent", response_model=PersonalizationConsentResponse)
async def set_personalization_consent(
    payload: PersonalizationConsentRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> PersonalizationConsentResponse:
    """Grant/withdraw opt-in consent for personalized (adaptive) interventions."""
    if not settings.jitai_enabled:
        raise HTTPException(status_code=404, detail="Personalization is not enabled")

    from app.models import UserConsentLedger

    current_user.consent_personalization = payload.granted
    db.add(
        UserConsentLedger(
            user_id=current_user.id,
            consent_type="personalization",
            granted=payload.granted,
            consent_version="v1.0",
            consent_language="id",
            consent_method="screening_settings",
            timestamp=datetime.utcnow(),
        )
    )
    await db.commit()
    return PersonalizationConsentResponse(consent_personalization=payload.granted)


# =============================================================================
# Formal instruments (PHQ-9 / GAD-7)
# =============================================================================

class InstrumentOptionOut(BaseModel):
    value: int
    label: str


class InstrumentItemOut(BaseModel):
    text: str
    is_crisis_item: bool


class InstrumentOut(BaseModel):
    code: str
    name: str
    dimension: str
    timeframe: str
    options: List[InstrumentOptionOut]
    items: List[InstrumentItemOut]
    disclaimer: str
    reference: str


class InstrumentListResponse(BaseModel):
    instruments: List[InstrumentOut]


class InstrumentSubmissionOut(BaseModel):
    id: int
    instrument: str
    total_score: int
    max_score: int
    normalized_score: float
    severity_band: str
    severity_label: str
    crisis_flag: bool
    created_at: datetime


class InstrumentHistoryResponse(BaseModel):
    submissions: List[InstrumentSubmissionOut]


class InstrumentSubmitRequest(BaseModel):
    responses: List[int] = Field(description="One 0-3 answer per instrument item")


class InstrumentSubmitResponse(BaseModel):
    recorded: bool
    result: dict


@router.get("/instruments", response_model=InstrumentListResponse)
async def list_formal_instruments(
    current_user: User = Depends(get_current_active_user),
) -> InstrumentListResponse:
    """Available formal instruments with their full item banks (self-screening)."""
    if not settings.formal_screening_enabled:
        raise HTTPException(status_code=404, detail="Formal screening is not enabled")

    from app.domains.mental_health.screening.formal_instruments import list_instruments

    return InstrumentListResponse(
        instruments=[
            InstrumentOut(
                code=instrument.code,
                name=instrument.name,
                dimension=instrument.dimension,
                timeframe=instrument.timeframe,
                options=[
                    InstrumentOptionOut(value=value, label=label)
                    for value, label in instrument.options
                ],
                items=[
                    InstrumentItemOut(text=item.text, is_crisis_item=item.is_crisis_item)
                    for item in instrument.items
                ],
                disclaimer=instrument.disclaimer,
                reference=instrument.reference,
            )
            for instrument in list_instruments()
        ]
    )


@router.get("/instruments/history", response_model=InstrumentHistoryResponse)
async def get_my_instrument_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> InstrumentHistoryResponse:
    """The user's own past formal screening submissions (newest first)."""
    from app.domains.mental_health.models import FormalScreeningSubmission

    rows = (
        await db.execute(
            select(FormalScreeningSubmission)
            .where(FormalScreeningSubmission.user_id == current_user.id)
            .order_by(FormalScreeningSubmission.created_at.desc())
            .limit(20)
        )
    ).scalars().all()

    return InstrumentHistoryResponse(
        submissions=[
            InstrumentSubmissionOut(
                id=row.id,
                instrument=row.instrument,
                total_score=row.total_score,
                max_score=row.max_score,
                normalized_score=row.normalized_score,
                severity_band=row.severity_band,
                severity_label=row.severity_label,
                crisis_flag=row.crisis_flag,
                created_at=row.created_at,
            )
            for row in rows
        ]
    )


@router.post(
    "/instruments/{instrument_code}/submit", response_model=InstrumentSubmitResponse
)
async def submit_formal_instrument(
    instrument_code: str,
    payload: InstrumentSubmitRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> InstrumentSubmitResponse:
    """Score and record a formal instrument submission (self-administered)."""
    if not settings.formal_screening_enabled:
        raise HTTPException(status_code=404, detail="Formal screening is not enabled")

    from app.services.formal_instrument_service import record_formal_instrument

    try:
        result = await record_formal_instrument(
            db,
            user_id=current_user.id,
            instrument_code=instrument_code,
            responses=payload.responses,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(
            status_code=429,
            detail=str(exc),
            headers={"Retry-After": str(24 * 3600)},
        )

    await db.commit()
    return InstrumentSubmitResponse(recorded=True, result=result)
