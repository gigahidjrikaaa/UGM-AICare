"""Counselor routes for self-management."""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.mental_health.models import Psychologist as CounselorProfile, Appointment
from app.models.user import User
from app.domains.mental_health.schemas.appointments import AppointmentWithUser
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
        .options(joinedload(Appointment.user), joinedload(Appointment.psychologist))
        .filter(Appointment.psychologist_id == profile.id)
    )

    if status:
        query = query.filter(Appointment.status == status)
    if start_date:
        query = query.filter(Appointment.scheduled_time >= start_date)
    if end_date:
        query = query.filter(Appointment.scheduled_time <= end_date)

    query = query.order_by(Appointment.scheduled_time.desc())
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
        .options(joinedload(Appointment.user), joinedload(Appointment.psychologist))
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
        Appointment.scheduled_time >= week_start,
        Appointment.scheduled_time < week_end,
    )
    this_week_appointments = await db.scalar(this_week_query) or 0

    upcoming_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == profile.id,
        Appointment.status == "scheduled",
        Appointment.scheduled_time >= today,
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
        .options(joinedload(Appointment.user), joinedload(Appointment.psychologist))
        .filter(
            Appointment.psychologist_id == profile.id,
            Appointment.status == "scheduled",
            Appointment.scheduled_time >= datetime.combine(today, datetime.min.time()),
            Appointment.scheduled_time < datetime.combine(tomorrow, datetime.min.time()),
        )
        .order_by(Appointment.scheduled_time)
    )

    result = await db.execute(query)
    appointments = result.scalars().all()

    return [AppointmentWithUser.model_validate(apt) for apt in appointments]
