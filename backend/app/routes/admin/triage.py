"""Admin Safety Triage management endpoints."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.sta.schemas import STAClassifyRequest
from app.agents.sta.service import SafetyTriageService, get_safety_triage_service
from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import Conversation, TriageAssessment, User
from app.schemas.admin import (
    ProcessingMetrics,
    SeverityBreakdown,
    TriageAssessmentItem,
    TriageAssessmentListResponse,
    TriageCasePreview,
    TriageOverview,
    TriageTestRequest,
    TriageTestResponse,
)
from app.services.triage_metrics import compute_triage_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/safety-triage", tags=["Admin - Safety Triage"])

def _coerce_risk_factors(raw: object) -> list[str] | None:
    if raw is None:
        return None
    if isinstance(raw, list):
        return [str(item) for item in raw]
    if isinstance(raw, dict):
        return [f"{key}: {value}" for key, value in raw.items()]
    return [str(raw)]


def _message_excerpt(conversation: Conversation | None, limit: int = 160) -> str | None:
    if not conversation or not conversation.message:
        return None
    text = conversation.message.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + '...'


@router.get("/overview", response_model=TriageOverview)
async def get_triage_overview(
    timeframe_days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> TriageOverview:
    """Return aggregated triage metrics for the requested timeframe."""

    logger.info("Admin %s requesting triage overview", admin_user.id)
    reference_date = datetime.utcnow().date()
    since = datetime.combine(reference_date, datetime.min.time()) - timedelta(days=timeframe_days - 1)

    total_stmt = select(func.count()).select_from(TriageAssessment).where(TriageAssessment.created_at >= since)
    total = int(await db.scalar(total_stmt) or 0)

    severity_stmt = (
        select(TriageAssessment.severity_level, func.count())
        .where(TriageAssessment.created_at >= since)
        .group_by(TriageAssessment.severity_level)
    )
    severity_result = await db.execute(severity_stmt)
    severity_breakdown = [
        SeverityBreakdown(severity=severity, count=count)
        for severity, count in severity_result.all()
    ]

    avg_risk = await db.scalar(
        select(func.avg(TriageAssessment.risk_score)).where(TriageAssessment.created_at >= since)
    )

    high_levels = ("high", "critical")
    high_count_stmt = (
        select(func.count())
        .select_from(TriageAssessment)
        .where(TriageAssessment.created_at >= since)
        .where(
            (TriageAssessment.severity_level.in_(high_levels))
            | (TriageAssessment.risk_score >= 0.8)
        )
    )
    high_count = int(await db.scalar(high_count_stmt) or 0)

    latest_at = await db.scalar(
        select(func.max(TriageAssessment.created_at)).where(TriageAssessment.created_at >= since)
    )

    processing_row = await db.execute(
        select(
            func.avg(TriageAssessment.processing_time_ms),
            func.max(TriageAssessment.processing_time_ms),
        )
        .where(TriageAssessment.created_at >= since)
        .where(TriageAssessment.processing_time_ms.isnot(None))
    )
    avg_ms, max_ms = processing_row.one_or_none() or (None, None)
    processing = None
    if avg_ms is not None or max_ms is not None:
        processing = ProcessingMetrics(
            average_ms=float(avg_ms) if avg_ms is not None else None,
            max_ms=int(max_ms) if max_ms is not None else None,
        )

    metrics_summary = await compute_triage_metrics(
        db,
        timeframe_days=timeframe_days,
        since=since,
        reference_date=reference_date,
    )

    high_risk_stmt = (
        select(TriageAssessment, User)
        .join(User, TriageAssessment.user_id == User.id, isouter=True)
        .where(TriageAssessment.created_at >= since)
        .where(
            (TriageAssessment.severity_level.in_(high_levels))
            | (TriageAssessment.risk_score >= 0.8)
        )
        .order_by(desc(TriageAssessment.risk_score), desc(TriageAssessment.created_at))
        .limit(6)
    )
    high_risk_rows = await db.execute(high_risk_stmt)
    recent_high_risk: list[TriageCasePreview] = []
    for assessment, user in high_risk_rows.all():
        recent_high_risk.append(
            TriageCasePreview(
                id=assessment.id,
                user_id=assessment.user_id,
                user_name=getattr(user, "name", None),
                email=getattr(user, "email", None),
                risk_score=assessment.risk_score,
                severity_level=assessment.severity_level,
                recommended_action=assessment.recommended_action,
                created_at=assessment.created_at,
            )
        )

    return TriageOverview(
        timeframe_days=timeframe_days,
        total_assessments=total,
        severity_breakdown=severity_breakdown,
        average_risk_score=float(avg_risk) if avg_risk is not None else None,
        high_severity_count=high_count,
        last_assessment_at=latest_at,
        processing=processing,
        risk_trend=metrics_summary.risk_trend,
        sla_metrics=metrics_summary.sla_metrics,
        recent_high_risk=recent_high_risk,
    )

@router.get("/assessments", response_model=TriageAssessmentListResponse)
async def list_triage_assessments(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    severity: str | None = Query(None, description="Filter by severity level"),
    timeframe_days: int | None = Query(None, ge=1, le=90),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> TriageAssessmentListResponse:
    """Return recent triage assessments with optional filtering."""

    logger.info(
        "Admin %s listing triage assessments (severity=%s, timeframe=%s)",
        admin_user.id,
        severity,
        timeframe_days,
    )

    query = (
        select(TriageAssessment, User, Conversation)
        .join(User, TriageAssessment.user_id == User.id, isouter=True)
        .join(Conversation, TriageAssessment.conversation_id == Conversation.id, isouter=True)
    )
    count_query = select(func.count()).select_from(TriageAssessment)

    if severity:
        query = query.where(TriageAssessment.severity_level == severity)
        count_query = count_query.where(TriageAssessment.severity_level == severity)

    if timeframe_days is not None:
        since = datetime.utcnow() - timedelta(days=timeframe_days)
        query = query.where(TriageAssessment.created_at >= since)
        count_query = count_query.where(TriageAssessment.created_at >= since)

    query = query.order_by(desc(TriageAssessment.created_at)).offset(offset).limit(limit)

    total = int(await db.scalar(count_query) or 0)
    rows = await db.execute(query)

    items: list[TriageAssessmentItem] = []
    for assessment, user, conversation in rows.all():
        items.append(
            TriageAssessmentItem(
                id=assessment.id,
                user_id=assessment.user_id,
                user_name=getattr(user, "name", None),
                email=getattr(user, "email", None),
                severity_level=assessment.severity_level,
                risk_score=assessment.risk_score,
                confidence_score=assessment.confidence_score,
                recommended_action=assessment.recommended_action,
                risk_factors=_coerce_risk_factors(assessment.risk_factors),
                created_at=assessment.created_at,
                processing_time_ms=assessment.processing_time_ms,
                conversation_id=assessment.conversation_id,
                message_excerpt=_message_excerpt(conversation),
            )
        )

    return TriageAssessmentListResponse(items=items, total=total)


@router.post("/classify", response_model=TriageTestResponse)
async def classify_test_message(
    payload: TriageTestRequest,
    db: AsyncSession = Depends(get_async_db),  # Ensures session lifecycle parity
    admin_user: User = Depends(get_admin_user),
    service: SafetyTriageService = Depends(get_safety_triage_service),
) -> TriageTestResponse:
    """Run an ad-hoc triage classification for an admin-supplied message."""

    logger.info("Admin %s running manual triage classification", admin_user.id)

    try:
        _ = db  # ensure dependency is retained for session lifecycle parity
        sta_request = STAClassifyRequest(
            session_id=f"admin-test-{admin_user.id}",
            text=payload.message,
            meta={"source": "admin-test"},
        )
        result = await service.classify(sta_request)
    except NotImplementedError as exc:
        logger.error("Safety Triage classifier not ready: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Safety Triage service is not yet available",
        ) from exc
    except Exception as exc:  # pragma: no cover - safety net for external calls
        logger.error("Safety Triage classify failure: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to classify message",
        ) from exc

    if result.risk_level >= 2:
        recommendation = {
            "title": "Escalate to human counselor",
            "description": "Route the case to the Safety Desk team for manual follow-up.",
            "next_step": result.next_step,
            "handoff": result.handoff,
            "risk_level": result.risk_level,
        }
    elif result.next_step == "sca":
        recommendation = {
            "title": "Create Safety Campaign follow-up",
            "description": "Schedule supportive outreach with Action Cards aligned to the detected intent.",
            "next_step": result.next_step,
            "handoff": result.handoff,
            "risk_level": result.risk_level,
        }
    else:
        recommendation = {
            "title": "Offer self-help resources",
            "description": "Send the user curated coping strategies and campus resources.",
            "next_step": result.next_step,
            "handoff": result.handoff,
            "risk_level": result.risk_level,
        }

    if result.diagnostic_notes:
        recommendation["notes"] = result.diagnostic_notes

    return TriageTestResponse(
        classification=result.intent,
        recommended_resources=[recommendation],
    )
