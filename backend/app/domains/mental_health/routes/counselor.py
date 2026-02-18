"""Counselor routes for self-management."""

import hashlib
from datetime import datetime, timedelta
from typing import Any, List, Optional

from uuid import UUID as PyUUID

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.blockchain.attestation.chain_registry import get_attestation_chain_config
from app.domains.blockchain.nft.chain_registry import get_chain_config
from app.domains.mental_health.models.autopilot_actions import (
    AutopilotAction,
    AutopilotActionType,
    AutopilotPolicyDecision,
)
from app.domains.mental_health.models import (
    Psychologist as CounselorProfile,
    Appointment,
    Case,
    CaseNote,
    CaseSeverityEnum,
    CaseStatusEnum,
    Conversation,
)
from app.domains.mental_health.models.quests import AttestationRecord, AttestationStatusEnum
from app.domains.mental_health.models.interventions import InterventionPlanRecord
from app.domains.mental_health.models.assessments import UserScreeningProfile, TriageAssessment
from app.domains.mental_health.services.autopilot_action_service import (
    build_idempotency_key,
    enqueue_action,
    hash_payload,
)
from app.models.user import User
from app.models.alerts import Alert
from app.domains.mental_health.schemas.appointments import AppointmentWithUser
from app.agents.cma.schemas import SDACase, SDAListCasesResponse
from app.core.redaction import prelog_redact
from app.services.compliance_service import record_audit_event
from app.schemas.counselor import (
    CounselorAvailabilityToggle,
    CounselorDashboardStats,
    CounselorResponse,
    CounselorUpdate,
)

router = APIRouter(prefix="/counselor", tags=["Counselor"])


class CounselorAgentDecisionItem(BaseModel):
    id: int
    action_type: str
    policy_decision: str
    risk_level: str
    status: str
    created_at: datetime
    executed_at: Optional[datetime] = None

    user_id: Optional[int] = None
    session_id: Optional[str] = None
    intent: Optional[str] = None
    next_step: Optional[str] = None
    agent_reasoning: Optional[str] = None

    requires_human_review: bool
    approved_by: Optional[int] = None
    approval_notes: Optional[str] = None

    chain_id: Optional[int] = None
    tx_hash: Optional[str] = None
    explorer_tx_url: Optional[str] = None

    attestation_record_id: Optional[int] = None
    attestation_status: Optional[str] = None
    attestation_last_error: Optional[str] = None
    attestation_tx_hash: Optional[str] = None
    attestation_schema: Optional[str] = None
    attestation_type: Optional[str] = None
    attestation_decision: Optional[str] = None
    attestation_feedback_redacted: Optional[str] = None


class CounselorAgentDecisionListResponse(BaseModel):
    items: list[CounselorAgentDecisionItem]
    total: int


class CounselorCaseAttestationResponse(BaseModel):
    found: bool
    record_id: Optional[int] = None
    status: Optional[str] = None
    schema: Optional[str] = None
    attestation_type: Optional[str] = None
    decision: Optional[str] = None
    feedback_redacted: Optional[str] = None
    tx_hash: Optional[str] = None
    chain_id: Optional[int] = None
    autopilot_action_id: Optional[int] = None
    created_at: Optional[str] = None
    processed_at: Optional[str] = None


class CounselorAlertSchema(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    link: Optional[str] = None
    created_at: str
    expires_at: Optional[str] = None
    is_seen: bool
    seen_at: Optional[str] = None


class CounselorAlertListResponse(BaseModel):
    alerts: list[CounselorAlertSchema]
    total: int
    unread_count: int
    limit: int
    offset: int


def _counselor_audience_filter(user_id: int):
    return and_(
        Alert.context_data["audience"].astext == "counselor",
        or_(
            Alert.context_data["recipient_user_ids"].is_(None),
            Alert.context_data["recipient_user_ids"].contains([user_id]),
        ),
    )


def _to_int(value: Any) -> Optional[int]:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(stripped)
        except ValueError:
            return None
    return None


def _to_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _build_explorer_url(chain_id: Optional[int], tx_hash: Optional[str]) -> Optional[str]:
    if chain_id is None or not tx_hash:
        return None

    nft_cfg = get_chain_config(int(chain_id))
    if nft_cfg is not None:
        return nft_cfg.explorer_tx_url(tx_hash)

    att_cfg = get_attestation_chain_config(int(chain_id))
    if att_cfg is not None:
        return att_cfg.explorer_tx_url(tx_hash)

    return None


async def require_counselor(current_user: User = Depends(get_current_active_user)) -> User:
    """Ensure the current user has counselor access."""
    if current_user.role not in {"counselor", "admin"}:
        raise HTTPException(status_code=403, detail="Counselor access required")
    return current_user


@router.get("/alerts", response_model=CounselorAlertListResponse)
async def list_counselor_alerts(
    is_seen: Optional[bool] = Query(None, description="Filter by seen status"),
    include_expired: bool = Query(False, description="Include expired alerts"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
) -> CounselorAlertListResponse:
    visibility_filter = _counselor_audience_filter(int(current_user.id))

    list_stmt = select(Alert).where(visibility_filter)
    if is_seen is not None:
        list_stmt = list_stmt.where(Alert.is_seen == is_seen)
    if not include_expired:
        list_stmt = list_stmt.where(
            or_(
                Alert.expires_at.is_(None),
                Alert.expires_at > datetime.utcnow(),
            )
        )

    list_stmt = list_stmt.order_by(Alert.created_at.desc()).offset(offset).limit(limit)
    alerts = (await db.execute(list_stmt)).scalars().all()

    total_stmt = select(func.count(Alert.id)).where(visibility_filter)
    if is_seen is not None:
        total_stmt = total_stmt.where(Alert.is_seen == is_seen)
    if not include_expired:
        total_stmt = total_stmt.where(
            or_(
                Alert.expires_at.is_(None),
                Alert.expires_at > datetime.utcnow(),
            )
        )
    total = int((await db.execute(total_stmt)).scalar() or 0)

    unread_stmt = select(func.count(Alert.id)).where(
        visibility_filter,
        Alert.is_seen.is_(False),
        or_(
            Alert.expires_at.is_(None),
            Alert.expires_at > datetime.utcnow(),
        ),
    )
    unread_count = int((await db.execute(unread_stmt)).scalar() or 0)

    return CounselorAlertListResponse(
        alerts=[
            CounselorAlertSchema(
                id=str(alert.id),
                alert_type=str(alert.alert_type),
                severity=str(alert.severity),
                title=alert.title,
                message=alert.message,
                link=alert.link,
                created_at=alert.created_at.isoformat(),
                expires_at=alert.expires_at.isoformat() if alert.expires_at else None,
                is_seen=bool(alert.is_seen),
                seen_at=alert.seen_at.isoformat() if alert.seen_at else None,
            )
            for alert in alerts
        ],
        total=total,
        unread_count=unread_count,
        limit=limit,
        offset=offset,
    )


@router.get("/alerts/stats/unread", response_model=dict)
async def get_counselor_unread_alert_stats(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
) -> dict:
    visibility_filter = _counselor_audience_filter(int(current_user.id))
    total_unread = int(
        (
            await db.execute(
                select(func.count(Alert.id)).where(
                    visibility_filter,
                    Alert.is_seen.is_(False),
                    or_(Alert.expires_at.is_(None), Alert.expires_at > datetime.utcnow()),
                )
            )
        ).scalar()
        or 0
    )

    critical_unread = int(
        (
            await db.execute(
                select(func.count(Alert.id)).where(
                    visibility_filter,
                    Alert.is_seen.is_(False),
                    Alert.severity == "critical",
                    or_(Alert.expires_at.is_(None), Alert.expires_at > datetime.utcnow()),
                )
            )
        ).scalar()
        or 0
    )
    high_unread = int(
        (
            await db.execute(
                select(func.count(Alert.id)).where(
                    visibility_filter,
                    Alert.is_seen.is_(False),
                    Alert.severity == "high",
                    or_(Alert.expires_at.is_(None), Alert.expires_at > datetime.utcnow()),
                )
            )
        ).scalar()
        or 0
    )

    return {
        "total_unread": total_unread,
        "critical_unread": critical_unread,
        "high_unread": high_unread,
        "requires_attention": critical_unread + high_unread,
    }


@router.put("/alerts/{alert_id}/seen", response_model=CounselorAlertSchema)
async def mark_counselor_alert_seen(
    alert_id: PyUUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
) -> CounselorAlertSchema:
    visibility_filter = _counselor_audience_filter(int(current_user.id))
    alert = (
        await db.execute(
            select(Alert).where(
                Alert.id == alert_id,
                visibility_filter,
            )
        )
    ).scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if not alert.is_seen:
        alert.is_seen = True
        alert.seen_at = datetime.utcnow()
        alert.seen_by = int(current_user.id)
        db.add(alert)
        await db.commit()
        await db.refresh(alert)

    return CounselorAlertSchema(
        id=str(alert.id),
        alert_type=str(alert.alert_type),
        severity=str(alert.severity),
        title=alert.title,
        message=alert.message,
        link=alert.link,
        created_at=alert.created_at.isoformat(),
        expires_at=alert.expires_at.isoformat() if alert.expires_at else None,
        is_seen=bool(alert.is_seen),
        seen_at=alert.seen_at.isoformat() if alert.seen_at else None,
    )


@router.get("/agent-decisions", response_model=CounselorAgentDecisionListResponse)
async def list_counselor_agent_decisions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
) -> CounselorAgentDecisionListResponse:
    role = (current_user.role or "").strip().lower()

    stmt = select(AutopilotAction)

    if role != "admin":
        profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
        profile = (await db.execute(profile_query)).scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=404, detail="Counselor profile not found")

        assigned_session_rows = (
            await db.execute(
                select(Case.session_id)
                .where(Case.assigned_to == str(profile.id), Case.session_id.is_not(None))
            )
        ).scalars().all()
        session_ids = [session_id for session_id in assigned_session_rows if session_id]

        assigned_user_ids: set[int] = set()
        if session_ids:
            user_rows = (
                await db.execute(
                    select(Conversation.user_id).where(Conversation.session_id.in_(session_ids))
                )
            ).scalars().all()
            assigned_user_ids = {int(user_id) for user_id in user_rows if user_id is not None}

        if not assigned_user_ids:
            return CounselorAgentDecisionListResponse(items=[], total=0)

        user_id_texts = [str(user_id) for user_id in sorted(assigned_user_ids)]
        stmt = stmt.where(AutopilotAction.payload_json.op("->>")("user_id").in_(user_id_texts))

    count_stmt = stmt

    rows = (
        await db.execute(
            stmt.order_by(AutopilotAction.created_at.desc()).offset(skip).limit(limit)
        )
    ).scalars().all()
    total = len((await db.execute(count_stmt)).scalars().all())

    attestation_ids: set[int] = set()
    for row in rows:
        payload = row.payload_json or {}
        attestation_record_id = _to_int(payload.get("attestation_record_id"))
        if attestation_record_id is not None:
            attestation_ids.add(attestation_record_id)

    attestation_map: dict[int, AttestationRecord] = {}
    if attestation_ids:
        attestation_rows = (
            await db.execute(select(AttestationRecord).where(AttestationRecord.id.in_(attestation_ids)))
        ).scalars().all()
        attestation_map = {int(record.id): record for record in attestation_rows}

    items: list[CounselorAgentDecisionItem] = []
    for row in rows:
        payload = row.payload_json or {}
        attestation_record_id = _to_int(payload.get("attestation_record_id"))
        attestation_record = attestation_map.get(attestation_record_id) if attestation_record_id is not None else None
        attestation_tx_hash = None
        attestation_schema = None
        attestation_type = None
        attestation_decision = None
        attestation_feedback_redacted = None
        if attestation_record is not None:
            attestation_extra = attestation_record.extra_data or {}
            attestation_tx_hash = _to_str(attestation_extra.get("tx_hash"))
            attestation_schema = _to_str(attestation_extra.get("schema"))
            attestation_type = _to_str(attestation_extra.get("attestation_type"))
            attestation_decision = _to_str(attestation_extra.get("decision"))
            attestation_feedback_redacted = _to_str(attestation_extra.get("feedback_redacted"))

        items.append(
            CounselorAgentDecisionItem(
                id=int(row.id),
                action_type=row.action_type.value,
                policy_decision=row.policy_decision.value,
                risk_level=row.risk_level,
                status=row.status.value,
                created_at=row.created_at,
                executed_at=row.executed_at,
                user_id=_to_int(payload.get("user_id")),
                session_id=_to_str(payload.get("session_id")),
                intent=_to_str(payload.get("intent")),
                next_step=_to_str(payload.get("next_step")),
                agent_reasoning=_to_str(payload.get("reasoning")),
                requires_human_review=bool(row.requires_human_review),
                approved_by=row.approved_by,
                approval_notes=row.approval_notes,
                chain_id=row.chain_id,
                tx_hash=row.tx_hash,
                explorer_tx_url=_build_explorer_url(row.chain_id, row.tx_hash),
                attestation_record_id=attestation_record_id,
                attestation_status=(attestation_record.status.value if attestation_record else None),
                attestation_last_error=(attestation_record.last_error if attestation_record else None),
                attestation_tx_hash=attestation_tx_hash,
                attestation_schema=attestation_schema,
                attestation_type=attestation_type,
                attestation_decision=attestation_decision,
                attestation_feedback_redacted=attestation_feedback_redacted,
            )
        )

    return CounselorAgentDecisionListResponse(items=items, total=total)


@router.get("/cases/{case_id}/assessments")
async def get_case_assessments(
    case_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Return risk assessment transparency for a counselor case.

    This endpoint is designed for explainability and review:
    - It returns risk score/level, factors, and redacted diagnostic notes.
    - It intentionally avoids returning raw conversation text.
    """
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Counselor profile not found")

    case = (await db.execute(select(Case).where(Case.id == case_id))).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.assigned_to != str(profile.id):
        raise HTTPException(status_code=403, detail="Not authorized for this case")

    user_id: int | None = None
    if case.session_id:
        user_id = (
            await db.execute(
                select(Conversation.user_id)
                .where(Conversation.session_id == case.session_id)
                .limit(1)
            )
        ).scalar_one_or_none()

    screening: dict | None = None
    triage_payload: list[dict] = []

    if user_id:
        screening_row = (
            await db.execute(select(UserScreeningProfile).where(UserScreeningProfile.user_id == user_id))
        ).scalar_one_or_none()
        if screening_row:
            screening = {
                "overall_risk": screening_row.overall_risk,
                "requires_attention": screening_row.requires_attention,
                "primary_concerns": (screening_row.profile_data or {}).get("primary_concerns", []),
                "protective_factors": (screening_row.profile_data or {}).get("protective_factors", []),
                "updated_at": screening_row.updated_at.isoformat() if screening_row.updated_at else None,
            }

        triage_rows = (
            await db.execute(
                select(TriageAssessment)
                .where(TriageAssessment.user_id == user_id)
                .order_by(TriageAssessment.created_at.desc())
                .limit(10)
            )
        ).scalars().all()
        for t in triage_rows:
            assessment_data = t.assessment_data or {}
            diagnostic_notes = assessment_data.get("diagnostic_notes")
            triage_payload.append(
                {
                    "id": t.id,
                    "risk_score": t.risk_score,
                    "confidence_score": t.confidence_score,
                    "severity_level": t.severity_level,
                    "recommended_action": t.recommended_action,
                    "intent": assessment_data.get("intent"),
                    "next_step": assessment_data.get("next_step"),
                    "risk_factors": t.risk_factors,
                    "diagnostic_notes_redacted": prelog_redact(str(diagnostic_notes)) if diagnostic_notes else None,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
            )

    return {
        "case_id": str(case.id),
        "session_id": case.session_id,
        "user_hash": case.user_hash,
        "screening_profile": screening,
        "triage_assessments": triage_payload,
    }


@router.get("/cases/{case_id}/latest-attestation", response_model=CounselorCaseAttestationResponse)
async def get_case_latest_attestation(
    case_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
) -> CounselorCaseAttestationResponse:
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Counselor profile not found")

    case = (await db.execute(select(Case).where(Case.id == case_id))).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.assigned_to != str(profile.id):
        raise HTTPException(status_code=403, detail="Not authorized for this case")

    record = (
        await db.execute(
            select(AttestationRecord)
            .where(AttestationRecord.extra_data.op("->>")("case_id") == str(case.id))
            .order_by(AttestationRecord.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if record is None:
        return CounselorCaseAttestationResponse(found=False)

    extra = record.extra_data or {}
    return CounselorCaseAttestationResponse(
        found=True,
        record_id=int(record.id),
        status=record.status.value if hasattr(record.status, "value") else str(record.status),
        schema=_to_str(extra.get("schema")),
        attestation_type=_to_str(extra.get("attestation_type")),
        decision=_to_str(extra.get("decision")),
        feedback_redacted=_to_str(extra.get("feedback_redacted")),
        tx_hash=_to_str(extra.get("tx_hash")),
        chain_id=_to_int(extra.get("chain_id")),
        autopilot_action_id=_to_int(extra.get("autopilot_action_id")),
        created_at=record.created_at.isoformat() if record.created_at else None,
        processed_at=record.processed_at.isoformat() if record.processed_at else None,
    )


async def get_counselor_profile(user: User, db: AsyncSession) -> CounselorProfile:
    """Fetch the counselor profile associated with the given user."""
    query = select(CounselorProfile).filter(CounselorProfile.user_id == user.id)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Counselor profile not found. Please contact an admin to create your profile.",
        )
    return profile


# ========================================
# Profile Management
# ========================================

@router.get("/profile", response_model=CounselorResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Return the authenticated counselor's profile."""
    query = (
        select(CounselorProfile)
        .options(joinedload(CounselorProfile.user))
        .filter(CounselorProfile.user_id == current_user.id)
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Please contact an admin to create your counselor profile.",
        )

    return CounselorResponse.model_validate(profile)


@router.put("/profile", response_model=CounselorResponse)
async def update_my_profile(
    profile_data: CounselorUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Update the counselor's own profile."""
    profile = await get_counselor_profile(current_user, db)

    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    await db.refresh(profile, ["user"])

    return CounselorResponse.model_validate(profile)


@router.patch("/profile/availability", response_model=CounselorResponse)
async def toggle_my_availability(
    availability: CounselorAvailabilityToggle,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Toggle the counselor's availability flag."""
    profile = await get_counselor_profile(current_user, db)
    profile.is_available = availability.is_available

    await db.commit()
    await db.refresh(profile)
    await db.refresh(profile, ["user"])

    return CounselorResponse.model_validate(profile)


# ========================================
# Appointments Management
# ========================================

@router.get("/appointments", response_model=List[AppointmentWithUser])
async def get_my_appointments(
    status: Optional[str] = Query(
        None, description="Filter by status: scheduled, completed, cancelled"
    ),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """
    Get all appointments for the current counselor.

    - **status**: Filter by appointment status
    - **start_date**: Filter appointments from this date
    - **end_date**: Filter appointments until this date
    - **page**: Page number
    - **page_size**: Number of appointments per page
    """
    profile = await get_counselor_profile(current_user, db)

    query = (
        select(Appointment)
        .options(
            joinedload(Appointment.user),
            joinedload(Appointment.psychologist),
            joinedload(Appointment.appointment_type),
        )
        .filter(Appointment.psychologist_id == profile.id)
    )

    if status:
        query = query.filter(Appointment.status == status)
    if start_date:
        query = query.filter(Appointment.appointment_datetime >= start_date)
    if end_date:
        query = query.filter(Appointment.appointment_datetime <= end_date)

    query = query.order_by(Appointment.appointment_datetime.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    appointments = result.scalars().all()

    return [AppointmentWithUser.model_validate(appointment) for appointment in appointments]


@router.get("/appointments/count", response_model=int)
async def get_my_appointment_count(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Return the number of appointments for the counselor, optionally filtered by status."""
    profile = await get_counselor_profile(current_user, db)

    query = select(func.count(Appointment.id)).filter(Appointment.psychologist_id == profile.id)

    if status:
        query = query.filter(Appointment.status == status)

    total = await db.scalar(query)
    return total or 0


@router.get("/appointments/{appointment_id}", response_model=AppointmentWithUser)
async def get_single_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Retrieve a single appointment ensuring the counselor owns it."""
    profile = await get_counselor_profile(current_user, db)

    query = (
        select(Appointment)
        .options(
            joinedload(Appointment.user),
            joinedload(Appointment.psychologist),
            joinedload(Appointment.appointment_type),
        )
        .filter(
            Appointment.id == appointment_id,
            Appointment.psychologist_id == profile.id,
        )
    )
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found or you don't have access to it",
        )

    return AppointmentWithUser.model_validate(appointment)


# ========================================
# Dashboard Statistics
# ========================================

@router.get("/stats", response_model=CounselorDashboardStats)
async def get_my_dashboard_stats(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Return dashboard statistics for the counselor."""
    profile = await get_counselor_profile(current_user, db)

    profile_fields = [
        profile.name,
        profile.specialization,
        profile.bio,
        profile.image_url,
        profile.years_of_experience,
        profile.education,
        profile.certifications,
        profile.languages,
        profile.consultation_fee,
        profile.availability_schedule,
    ]
    filled_fields = sum(1 for field in profile_fields if field)
    profile_completion = (filled_fields / len(profile_fields)) * 100

    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    this_week_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == profile.id,
        Appointment.appointment_datetime >= week_start,
        Appointment.appointment_datetime < week_end,
    )
    this_week_appointments = await db.scalar(this_week_query) or 0

    upcoming_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == profile.id,
        Appointment.status == "scheduled",
        Appointment.appointment_datetime >= today,
    )
    upcoming_appointments = await db.scalar(upcoming_query) or 0

    completed_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == profile.id,
        Appointment.status == "completed",
    )
    completed_appointments = await db.scalar(completed_query) or 0

    total_revenue = (
        completed_appointments * (profile.consultation_fee or 0.0)
        if profile.consultation_fee
        else 0.0
    )

    total_patients_query = select(func.count(func.distinct(Appointment.user_id))).filter(
        Appointment.psychologist_id == profile.id
    )
    total_patients = await db.scalar(total_patients_query) or 0

    return CounselorDashboardStats(
        profile_completion_percentage=round(profile_completion, 2),
        this_week_appointments=this_week_appointments,
        upcoming_appointments=upcoming_appointments,
        total_revenue=round(total_revenue, 2),
        average_rating=profile.rating or 0.0,
        total_reviews=profile.total_reviews or 0,
        total_patients=total_patients,
        total_completed_appointments=completed_appointments,
    )


# ========================================
# Case Management (Escalations)
# ========================================

@router.get("/cases", response_model=SDAListCasesResponse)
async def get_my_cases(
    status: Optional[str] = Query(
        None, description="Filter by status: new, in_progress, waiting, closed"
    ),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """
    Get all cases assigned to the current counselor.
    
    Cases are assigned via the CMA (Case Management Agent) auto-assignment
    algorithm based on counselor workload.
    """
    # Find the psychologist profile for this user
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile_result = await db.execute(profile_query)
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        # No psychologist profile means no cases can be assigned
        return SDAListCasesResponse(cases=[])
    
    # Query cases assigned to this counselor (assigned_to stores psychologist.id as string)
    psychologist_id_str = str(profile.id)
    query = select(Case).where(Case.assigned_to == psychologist_id_str).order_by(Case.created_at.desc())
    
    if status:
        try:
            status_enum = CaseStatusEnum(status)
            query = query.where(Case.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
    
    result = await db.execute(query)
    cases = result.scalars().all()

    # Preload user contact info for these cases.
    conversation_ids = {c.conversation_id for c in cases if getattr(c, "conversation_id", None)}
    session_ids = {c.session_id for c in cases if getattr(c, "session_id", None)}

    conversation_user_by_id: dict[int, int] = {}
    conversation_user_by_session: dict[str, int] = {}
    if conversation_ids or session_ids:
        conv_stmt = select(Conversation.id, Conversation.user_id, Conversation.session_id)
        filters = []
        if conversation_ids:
            filters.append(Conversation.id.in_(conversation_ids))
        if session_ids:
            filters.append(Conversation.session_id.in_(session_ids))
        conv_stmt = conv_stmt.where(or_(*filters))
        conv_rows = (await db.execute(conv_stmt)).all()
        for conv_id, user_id, sess_id in conv_rows:
            conversation_user_by_id[int(conv_id)] = int(user_id)
            if sess_id:
                conversation_user_by_session[str(sess_id)] = int(user_id)

    user_ids: set[int] = set(conversation_user_by_id.values()) | set(conversation_user_by_session.values())
    users_by_id: dict[int, User] = {}
    if user_ids:
        user_rows = (
            await db.execute(
                select(User)
                .options(joinedload(User.profile))
                .where(User.id.in_(user_ids))
            )
        ).scalars().all()
        users_by_id = {u.id: u for u in user_rows}
    
    # Convert to schema
    from typing import cast
    from app.domains.mental_health.models import CaseSeverityEnum
    
    payload: list[SDACase] = []
    for case in cases:
        created_at = cast(datetime, case.created_at)
        updated_at = cast(datetime, case.updated_at)
        status_val = case.status.value if isinstance(case.status, CaseStatusEnum) else "new"
        # Counselor UI currently models resolved cases as closed.
        if status_val == "resolved":
            status_val = "closed"
        severity_val = case.severity.value if isinstance(case.severity, CaseSeverityEnum) else "low"
        
        linked_user_id: int | None = None
        if case.conversation_id and int(case.conversation_id) in conversation_user_by_id:
            linked_user_id = conversation_user_by_id[int(case.conversation_id)]
        elif case.session_id and str(case.session_id) in conversation_user_by_session:
            linked_user_id = conversation_user_by_session[str(case.session_id)]

        user_obj: User | None = users_by_id.get(linked_user_id) if linked_user_id else None
        user_phone = None
        if user_obj:
            if user_obj.profile:
                user_phone = user_obj.profile.phone or user_obj.profile.alternate_phone
            else:
                user_phone = user_obj.phone or user_obj.alternate_phone

        payload.append(SDACase(
            id=str(case.id),
            created_at=created_at,
            updated_at=updated_at,
            status=status_val,  # type: ignore[arg-type]
            severity=severity_val,  # type: ignore[arg-type]
            assigned_to=str(case.assigned_to) if case.assigned_to else None,
            user_hash=str(case.user_hash) if case.user_hash else "",
            session_id=str(case.session_id) if case.session_id else None,
            summary_redacted=str(case.summary_redacted) if case.summary_redacted else None,
            sla_breach_at=cast(datetime | None, case.sla_breach_at),
            user_email=user_obj.email if user_obj else None,
            user_phone=user_phone,
            telegram_username=(user_obj.profile.telegram_username if (user_obj and user_obj.profile) else None),
        ))
    
    return SDAListCasesResponse(cases=payload)


@router.get("/cases/stats")
async def get_my_case_stats(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Get case statistics for the current counselor."""
    # Find the psychologist profile for this user
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile_result = await db.execute(profile_query)
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        return {
            "total_cases": 0,
            "open_cases": 0,
            "in_progress_cases": 0,
            "closed_cases": 0,
            "critical_cases": 0,
            "high_priority_cases": 0,
        }
    
    # Case.assigned_to stores psychologist.id as string
    psychologist_id_str = str(profile.id)
    
    # Total cases
    total_query = select(func.count(Case.id)).where(Case.assigned_to == psychologist_id_str)
    total = await db.scalar(total_query) or 0
    
    # Open cases (new status)
    open_query = select(func.count(Case.id)).where(
        Case.assigned_to == psychologist_id_str,
        Case.status == CaseStatusEnum.new
    )
    open_cases = await db.scalar(open_query) or 0
    
    # In progress cases
    in_progress_query = select(func.count(Case.id)).where(
        Case.assigned_to == psychologist_id_str,
        Case.status == CaseStatusEnum.in_progress
    )
    in_progress = await db.scalar(in_progress_query) or 0
    
    # Closed cases
    closed_query = select(func.count(Case.id)).where(
        Case.assigned_to == psychologist_id_str,
        Case.status.in_([CaseStatusEnum.closed, CaseStatusEnum.resolved])
    )
    closed = await db.scalar(closed_query) or 0
    
    # Critical severity
    from app.domains.mental_health.models import CaseSeverityEnum
    critical_query = select(func.count(Case.id)).where(
        Case.assigned_to == psychologist_id_str,
        Case.severity == CaseSeverityEnum.critical,
        Case.status != CaseStatusEnum.closed
    )
    critical = await db.scalar(critical_query) or 0
    
    # High priority (high severity)
    high_query = select(func.count(Case.id)).where(
        Case.assigned_to == psychologist_id_str,
        Case.severity == CaseSeverityEnum.high,
        Case.status != CaseStatusEnum.closed
    )
    high = await db.scalar(high_query) or 0
    
    return {
        "total_cases": total,
        "open_cases": open_cases,
        "in_progress_cases": in_progress,
        "closed_cases": closed,
        "critical_cases": critical,
        "high_priority_cases": high,
    }


class CounselorCaseStatusUpdate(BaseModel):
    """Request body for counselor case status update."""
    status: str = Field(..., description="New status: in_progress, resolved, closed")
    note: str | None = Field(None, description="Optional note explaining the change")


@router.put("/cases/{case_id}/status")
async def update_my_case_status(
    case_id: str,
    payload: CounselorCaseStatusUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Update the status of a case assigned to the current counselor.

    Counselors may only update cases assigned to them.
    Valid transitions:
    - new -> in_progress  (accept)
    - in_progress -> resolved
    - Any open status -> closed (emergency closure)
    """
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Counselor profile not found")

    case = (await db.execute(select(Case).where(Case.id == case_id))).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.assigned_to != str(profile.id):
        raise HTTPException(status_code=403, detail="Not authorized for this case")

    valid_statuses = ['in_progress', 'resolved', 'closed']
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    old_status = case.status.value if hasattr(case.status, 'value') else str(case.status)

    if old_status == 'closed':
        raise HTTPException(status_code=400, detail="Cannot change status of closed case")

    # Validate transitions (except emergency close)
    if payload.status != 'closed':
        valid_transitions: dict[str, list[str]] = {
            'new': ['in_progress'],
            'waiting': ['in_progress'],
            'in_progress': ['resolved'],
            'resolved': ['closed'],
        }
        if payload.status not in valid_transitions.get(old_status, []):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition from {old_status} to {payload.status}"
            )

    decision_event: str | None = None
    if old_status in {'new', 'waiting'} and payload.status == 'in_progress':
        decision_event = 'accepted'
    elif old_status in {'new', 'waiting'} and payload.status == 'closed':
        decision_event = 'rejected'

    if decision_event == 'rejected' and not (payload.note or '').strip():
        raise HTTPException(
            status_code=400,
            detail="Rejecting a newly assigned case requires justification note",
        )

    case.status = CaseStatusEnum[payload.status]  # type: ignore[assignment]

    if payload.note:
        note = CaseNote(
            case_id=case.id,
            note=f"Status changed to {payload.status}: {payload.note}",
            author_id=current_user.id,
        )
        db.add(note)

    critical_case_attestation: dict[str, Any] | None = None
    if case.severity == CaseSeverityEnum.critical and decision_event in {'accepted', 'rejected'}:
        linked_user_id: int | None = None
        if case.session_id:
            linked_user_id = (
                await db.execute(
                    select(Conversation.user_id)
                    .where(Conversation.session_id == case.session_id)
                    .limit(1)
                )
            ).scalar_one_or_none()

        note_text = (payload.note or "").strip()
        note_hash = hashlib.sha256(note_text.encode("utf-8")).hexdigest() if note_text else None
        feedback_redacted = prelog_redact(note_text) if note_text else None

        attestation_context = {
            "schema": "aicare.critical_case.decision.v1",
            "attestation_type": "critical_case_decision",
            "decision": decision_event,
            "case_id": str(case.id),
            "status_before": old_status,
            "status_after": payload.status,
            "severity": "critical",
            "session_id": case.session_id,
            "user_hash": case.user_hash,
            "user_id": linked_user_id,
            "counselor_id": current_user.id,
            "feedback_redacted": feedback_redacted,
            "feedback_hash": note_hash,
            "decision_at": datetime.utcnow().isoformat(),
        }

        payload_hash_hex = hash_payload(attestation_context)
        record = AttestationRecord(
            quest_instance_id=None,
            counselor_id=current_user.id,
            hashed_payload=payload_hash_hex,
            status=AttestationStatusEnum.PENDING,
            extra_data={
                **attestation_context,
                "autopilot_linked": True,
            },
        )
        db.add(record)
        await db.flush()

        action_payload = {
            "attestation_record_id": int(record.id),
            "schema": "aicare.critical_case.decision.v1",
            "payload_hash": f"0x{payload_hash_hex}",
            "metadata_uri": "",
            "case_id": str(case.id),
            "session_id": case.session_id,
            "user_hash": case.user_hash,
            "user_id": linked_user_id,
            "decision": decision_event,
            "anonymized_result": f"critical_case_{decision_event}",
            "feedback_redacted": feedback_redacted,
        }

        action = await enqueue_action(
            db,
            action_type=AutopilotActionType.publish_attestation,
            risk_level="critical",
            policy_decision=AutopilotPolicyDecision.allow,
            idempotency_key=build_idempotency_key(
                f"critical-case-attestation:{case.id}:{old_status}:{payload.status}:{record.id}"
            ),
            payload_json=action_payload,
            requires_human_review=False,
            commit=False,
        )

        extra = dict(record.extra_data or {})
        extra["autopilot_action_id"] = int(action.id)
        record.extra_data = extra

        await record_audit_event(
            db,
            actor_id=current_user.id,
            actor_role=current_user.role,
            action="autopilot.critical_case_attestation_queued",
            entity_type="case",
            entity_id=str(case.id),
            extra_data={
                "attestation_record_id": int(record.id),
                "autopilot_action_id": int(action.id),
                "decision": decision_event,
            },
        )

        critical_case_attestation = {
            "record_id": int(record.id),
            "autopilot_action_id": int(action.id),
            "schema": "aicare.critical_case.decision.v1",
            "decision": decision_event,
        }

    await db.commit()
    await db.refresh(case)

    response_payload = {
        "case_id": str(case.id),
        "status": case.status.value if hasattr(case.status, 'value') else str(case.status),
        "message": f"Status updated to {payload.status}",
    }
    if critical_case_attestation is not None:
        response_payload["critical_case_attestation"] = critical_case_attestation
    return response_payload


class CounselorNoteCreate(BaseModel):
    """Request body for creating a counselor case note."""
    note: str = Field(..., min_length=1, max_length=5000)


# ========================================
# Case Notes (per case)
# ========================================

@router.get("/cases/{case_id}/notes")
async def list_my_case_notes(
    case_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """List all notes for a case assigned to the current counselor."""
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Counselor profile not found")

    case = (await db.execute(select(Case).where(Case.id == PyUUID(case_id)))).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.assigned_to != str(profile.id):
        raise HTTPException(status_code=403, detail="Not authorized for this case")

    notes = (
        await db.execute(
            select(CaseNote).where(CaseNote.case_id == case.id).order_by(CaseNote.created_at.desc())
        )
    ).scalars().all()

    return {
        "items": [
            {
                "id": n.id,
                "case_id": str(n.case_id),
                "note": n.note,
                "author_id": n.author_id,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notes
        ]
    }


@router.post("/cases/{case_id}/notes")
async def add_my_case_note(
    case_id: str,
    payload: CounselorNoteCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Add a note to a case assigned to the current counselor."""
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Counselor profile not found")

    case = (await db.execute(select(Case).where(Case.id == PyUUID(case_id)))).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.assigned_to != str(profile.id):
        raise HTTPException(status_code=403, detail="Not authorized for this case")

    note = CaseNote(case_id=case.id, note=payload.note, author_id=current_user.id)
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return {
        "id": note.id,
        "case_id": str(note.case_id),
        "note": note.note,
        "author_id": note.author_id,
        "created_at": note.created_at.isoformat() if note.created_at else None,
    }


# ========================================
# All Notes (across all counselor's cases)
# ========================================

@router.get("/notes")
async def list_all_my_notes(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """List all notes across all cases assigned to the current counselor.

    This endpoint powers the counselor's 'Session Notes' page.
    """
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        return {"items": []}

    psychologist_id_str = str(profile.id)

    # Fetch all case IDs assigned to this counselor
    case_ids_query = select(Case.id, Case.user_hash).where(Case.assigned_to == psychologist_id_str)
    case_rows = (await db.execute(case_ids_query)).all()
    if not case_rows:
        return {"items": []}

    case_ids = [row[0] for row in case_rows]
    case_user_hash_map = {str(row[0]): row[1] for row in case_rows}

    # Fetch all notes for those cases
    notes = (
        await db.execute(
            select(CaseNote)
            .where(CaseNote.case_id.in_(case_ids))
            .order_by(CaseNote.created_at.desc())
        )
    ).scalars().all()

    return {
        "items": [
            {
                "id": n.id,
                "case_id": str(n.case_id),
                "user_hash": case_user_hash_map.get(str(n.case_id), ""),
                "note": n.note,
                "author_id": n.author_id,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notes
        ]
    }


# ========================================
# Treatment Plans (intervention plans for counselor's patients)
# ========================================

@router.get("/treatment-plans")
async def list_patient_treatment_plans(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """List all intervention plans for patients in the counselor's caseload.

    Derives patient user IDs from assigned cases, then queries their
    intervention plan records.
    """
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        return {"items": []}

    psychologist_id_str = str(profile.id)

    # Get cases assigned to this counselor
    cases_result = (
        await db.execute(
            select(Case).where(Case.assigned_to == psychologist_id_str)
        )
    ).scalars().all()

    if not cases_result:
        return {"items": []}

    # Resolve user IDs from conversations linked to cases
    conversation_ids = {c.conversation_id for c in cases_result if getattr(c, "conversation_id", None)}
    session_ids = {c.session_id for c in cases_result if getattr(c, "session_id", None)}

    user_ids: set[int] = set()
    if conversation_ids or session_ids:
        conv_stmt = select(Conversation.user_id, Conversation.id, Conversation.session_id)
        filters = []
        if conversation_ids:
            filters.append(Conversation.id.in_(conversation_ids))
        if session_ids:
            filters.append(Conversation.session_id.in_(session_ids))
        conv_stmt = conv_stmt.where(or_(*filters))
        conv_rows = (await db.execute(conv_stmt)).all()
        for user_id, _, _ in conv_rows:
            user_ids.add(int(user_id))

    if not user_ids:
        return {"items": []}

    # Fetch intervention plans for these users
    plans = (
        await db.execute(
            select(InterventionPlanRecord)
            .where(InterventionPlanRecord.user_id.in_(user_ids))
            .order_by(InterventionPlanRecord.created_at.desc())
        )
    ).scalars().all()

    # Fetch user info for display
    users_by_id: dict[int, User] = {}
    if user_ids:
        user_rows = (
            await db.execute(
                select(User).where(User.id.in_(user_ids))
            )
        ).scalars().all()
        users_by_id = {u.id: u for u in user_rows}

    items = []
    for plan in plans:
        user_obj = users_by_id.get(plan.user_id)
        plan_data = plan.plan_data or {}
        plan_steps = plan_data.get("plan_steps", [])
        resource_cards = plan_data.get("resource_cards", [])

        items.append({
            "id": plan.id,
            "user_id": plan.user_id,
            "user_email": user_obj.email if user_obj else None,
            "plan_title": plan.plan_title,
            "risk_level": plan.risk_level,
            "status": plan.status,
            "is_active": plan.is_active,
            "total_steps": plan.total_steps,
            "completed_steps": plan.completed_steps,
            "plan_steps": plan_steps,
            "resource_cards": resource_cards,
            "created_at": plan.created_at.isoformat() if plan.created_at else None,
            "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
        })

    return {"items": items}


# ========================================
# Progress Tracking (aggregated from case assessments)
# ========================================

@router.get("/progress")
async def get_patient_progress(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Aggregate progress data for all patients in the counselor's caseload.

    Derives data from triage assessments, screening profiles, and treatment
    plan completion rates. One entry per unique patient (user_hash).
    """
    profile_query = select(CounselorProfile).where(CounselorProfile.user_id == current_user.id)
    profile = (await db.execute(profile_query)).scalar_one_or_none()
    if not profile:
        return {"items": []}

    psychologist_id_str = str(profile.id)

    # Get all cases assigned to this counselor
    cases_result = (
        await db.execute(
            select(Case).where(Case.assigned_to == psychologist_id_str)
        )
    ).scalars().all()

    if not cases_result:
        return {"items": []}

    # Resolve user IDs from conversations
    conversation_ids = {c.conversation_id for c in cases_result if getattr(c, "conversation_id", None)}
    session_ids = {c.session_id for c in cases_result if getattr(c, "session_id", None)}

    conv_user_map: dict[str, int] = {}  # case_id -> user_id
    session_user_map: dict[str, int] = {}
    if conversation_ids or session_ids:
        conv_stmt = select(Conversation.user_id, Conversation.id, Conversation.session_id)
        filters = []
        if conversation_ids:
            filters.append(Conversation.id.in_(conversation_ids))
        if session_ids:
            filters.append(Conversation.session_id.in_(session_ids))
        conv_stmt = conv_stmt.where(or_(*filters))
        conv_rows = (await db.execute(conv_stmt)).all()
        for user_id, conv_id, sess_id in conv_rows:
            conv_user_map[str(conv_id)] = int(user_id)
            if sess_id:
                session_user_map[str(sess_id)] = int(user_id)

    # Build case->user_id mapping + group cases by user_hash
    user_hash_cases: dict[str, list] = {}
    user_hash_to_user_id: dict[str, int | None] = {}
    for case in cases_result:
        uh = str(case.user_hash) if case.user_hash else "unknown"
        if uh not in user_hash_cases:
            user_hash_cases[uh] = []
        user_hash_cases[uh].append(case)

        linked_user_id: int | None = None
        if case.conversation_id and str(case.conversation_id) in conv_user_map:
            linked_user_id = conv_user_map[str(case.conversation_id)]
        elif case.session_id and str(case.session_id) in session_user_map:
            linked_user_id = session_user_map[str(case.session_id)]
        if linked_user_id:
            user_hash_to_user_id[uh] = linked_user_id

    # Fetch triage assessments for known user IDs
    all_user_ids = set(v for v in user_hash_to_user_id.values() if v)
    user_triages: dict[int, list] = {}
    if all_user_ids:
        triage_rows = (
            await db.execute(
                select(TriageAssessment)
                .where(TriageAssessment.user_id.in_(all_user_ids))
                .order_by(TriageAssessment.created_at.asc())
            )
        ).scalars().all()
        for t in triage_rows:
            uid = int(t.user_id)
            if uid not in user_triages:
                user_triages[uid] = []
            user_triages[uid].append(t)

    # Fetch treatment plan progress for known user IDs
    user_plan_progress: dict[int, dict] = {}
    if all_user_ids:
        plan_rows = (
            await db.execute(
                select(InterventionPlanRecord)
                .where(
                    InterventionPlanRecord.user_id.in_(all_user_ids),
                    InterventionPlanRecord.is_active == True,  # noqa: E712
                )
            )
        ).scalars().all()
        for p in plan_rows:
            uid = int(p.user_id)
            if uid not in user_plan_progress:
                user_plan_progress[uid] = {"total_steps": 0, "completed_steps": 0}
            user_plan_progress[uid]["total_steps"] += p.total_steps
            user_plan_progress[uid]["completed_steps"] += p.completed_steps

    # Fetch user emails
    users_by_id: dict[int, User] = {}
    if all_user_ids:
        user_rows = (
            await db.execute(select(User).where(User.id.in_(all_user_ids)))
        ).scalars().all()
        users_by_id = {u.id: u for u in user_rows}

    items = []
    for user_hash, user_cases in user_hash_cases.items():
        uid = user_hash_to_user_id.get(user_hash)
        user_obj = users_by_id.get(uid) if uid else None
        triages = user_triages.get(uid, []) if uid else []
        plan_prog = user_plan_progress.get(uid) if uid else None

        # Compute risk scores over time (last 10)
        risk_scores = [t.risk_score for t in triages if t.risk_score is not None][-10:]

        # Determine trend from risk scores (lower = better)
        trend = "stable"
        if len(risk_scores) >= 3:
            first_half = sum(risk_scores[: len(risk_scores) // 2]) / max(len(risk_scores) // 2, 1)
            second_half = sum(risk_scores[len(risk_scores) // 2 :]) / max(
                len(risk_scores) - len(risk_scores) // 2, 1
            )
            if second_half < first_half - 0.3:
                trend = "improving"  # Risk going down = improving
            elif second_half > first_half + 0.3:
                trend = "declining"  # Risk going up = declining

        # Active cases count
        active_cases = sum(
            1
            for c in user_cases
            if (c.status.value if hasattr(c.status, "value") else str(c.status))
            in ("new", "in_progress", "waiting")
        )

        # Goal completion from treatment plans
        goal_completion = 0
        if plan_prog and plan_prog["total_steps"] > 0:
            goal_completion = round(
                (plan_prog["completed_steps"] / plan_prog["total_steps"]) * 100
            )

        # Last assessment date
        last_assessment = triages[-1].created_at.isoformat() if triages else None

        items.append(
            {
                "user_hash": user_hash,
                "user_email": user_obj.email if user_obj else None,
                "total_cases": len(user_cases),
                "active_cases": active_cases,
                "risk_scores": risk_scores,
                "trend": trend,
                "goal_completion": goal_completion,
                "last_assessment": last_assessment,
            }
        )

    # Sort: declining first, then by active cases descending
    trend_order = {"declining": 0, "stable": 1, "improving": 2}
    items.sort(key=lambda x: (trend_order.get(x["trend"], 1), -x["active_cases"]))

    return {"items": items}


# ========================================
# Quick Actions
# ========================================

@router.get("/upcoming-today", response_model=List[AppointmentWithUser])
async def get_today_appointments(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_counselor),
):
    """Return today's appointments for quick reference."""
    profile = await get_counselor_profile(current_user, db)

    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)

    query = (
        select(Appointment)
        .options(
            joinedload(Appointment.user),
            joinedload(Appointment.psychologist),
            joinedload(Appointment.appointment_type),
        )
        .filter(
            Appointment.psychologist_id == profile.id,
            Appointment.status == "scheduled",
            Appointment.appointment_datetime >= datetime.combine(today, datetime.min.time()),
            Appointment.appointment_datetime < datetime.combine(tomorrow, datetime.min.time()),
        )
        .order_by(Appointment.appointment_datetime)
    )

    result = await db.execute(query)
    appointments = result.scalars().all()

    return [AppointmentWithUser.model_validate(apt) for apt in appointments]
