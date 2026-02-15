"""Counselor routes for self-management."""

from datetime import datetime, timedelta
from typing import List, Optional

from uuid import UUID as PyUUID

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.mental_health.models import (
    Psychologist as CounselorProfile,
    Appointment,
    Case,
    CaseNote,
    CaseStatusEnum,
    Conversation,
)
from app.domains.mental_health.models.interventions import InterventionPlanRecord
from app.domains.mental_health.models.assessments import UserScreeningProfile, TriageAssessment
from app.models.user import User
from app.domains.mental_health.schemas.appointments import AppointmentWithUser
from app.agents.cma.schemas import SDACase, SDAListCasesResponse
from app.core.redaction import prelog_redact
from app.schemas.counselor import (
    CounselorAvailabilityToggle,
    CounselorDashboardStats,
    CounselorResponse,
    CounselorUpdate,
)

router = APIRouter(prefix="/counselor", tags=["Counselor"])


async def require_counselor(current_user: User = Depends(get_current_active_user)) -> User:
    """Ensure the current user has counselor access."""
    if current_user.role not in {"counselor", "admin"}:
        raise HTTPException(status_code=403, detail="Counselor access required")
    return current_user


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

    case.status = CaseStatusEnum[payload.status]  # type: ignore[assignment]

    if payload.note:
        note = CaseNote(
            case_id=case.id,
            note=f"Status changed to {payload.status}: {payload.note}",
            author_id=current_user.id,
        )
        db.add(note)

    await db.commit()
    await db.refresh(case)

    return {
        "case_id": str(case.id),
        "status": case.status.value if hasattr(case.status, 'value') else str(case.status),
        "message": f"Status updated to {payload.status}",
    }


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
