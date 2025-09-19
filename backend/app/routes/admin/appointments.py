"""Appointment and therapist management endpoints for the admin panel."""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import (
    Appointment,
    Conversation,
    JournalEntry,
    Psychologist,
    TherapistSchedule,
    User,
    UserBadge,
)
from app.routes.admin.utils import decrypt_user_email
from app.schemas.admin import UserListItem
from app.schemas.admin.appointments import (
    AppointmentResponse,
    AppointmentUpdate,
    AppointmentUser,
    PsychologistResponse,
    TherapistScheduleCreate,
    TherapistScheduleResponse,
    TherapistScheduleUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin - Appointments"])


@router.get("/psychologists", response_model=List[UserListItem])
async def get_psychologists(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> List[UserListItem]:
    """Return therapist users enriched with engagement statistics."""

    logger.info("Admin %s requesting psychologist list", admin_user.id)

    journal_count_sq = (
        select(func.count(JournalEntry.id))
        .where(JournalEntry.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    conversation_count_sq = (
        select(func.count(Conversation.id))
        .where(Conversation.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    badge_count_sq = (
        select(func.count(UserBadge.id))
        .where(UserBadge.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    appointment_count_sq = (
        select(func.count(Appointment.id))
        .where(Appointment.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )

    base_query = (
        select(
            User,
            journal_count_sq.label("journal_count"),
            conversation_count_sq.label("conversation_count"),
            badge_count_sq.label("badge_count"),
            appointment_count_sq.label("appointment_count"),
        )
        .where(User.role == "therapist")
    )

    rows = await db.execute(base_query)

    users: List[UserListItem] = []
    for user, journal_count, conversation_count, badge_count, appointment_count in rows.all():
        users.append(
            UserListItem(
                id=user.id,
                email=decrypt_user_email(user.email),
                google_sub=user.google_sub,
                wallet_address=user.wallet_address,
                sentiment_score=user.sentiment_score,
                current_streak=user.current_streak,
                longest_streak=user.longest_streak,
                last_activity_date=user.last_activity_date,
                allow_email_checkins=user.allow_email_checkins,
                role=getattr(user, "role", "user"),
                is_active=getattr(user, "is_active", True),
                created_at=getattr(user, "created_at", None),
                total_journal_entries=int(journal_count or 0),
                total_conversations=int(conversation_count or 0),
                total_badges=int(badge_count or 0),
                total_appointments=int(appointment_count or 0),
                last_login=getattr(user, "last_login", None),
            )
        )
    return users


def _map_psychologist(psychologist: Psychologist) -> PsychologistResponse:
    return PsychologistResponse(
        id=psychologist.id,
        name=psychologist.name,
        specialization=psychologist.specialization,
        image_url=psychologist.image_url,
        is_available=psychologist.is_available,
    )


def _map_user(user: User) -> AppointmentUser:
    return AppointmentUser(
        id=user.id,
        email=decrypt_user_email(user.email),
    )


@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> List[AppointmentResponse]:
    """Return all appointments ordered by datetime desc."""

    logger.info("Admin %s requesting appointments list", admin_user.id)

    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.user),
            selectinload(Appointment.psychologist),
            selectinload(Appointment.appointment_type),
        )
        .order_by(desc(Appointment.appointment_datetime))
    )

    appointments = []
    for appointment in result.scalars().all():
        if not appointment.user or not appointment.psychologist:
            logger.warning("Appointment %s missing related user or psychologist", appointment.id)
            continue

        appointments.append(
            AppointmentResponse(
                id=appointment.id,
                user=_map_user(appointment.user),
                psychologist=_map_psychologist(appointment.psychologist),
                appointment_type=(
                    appointment.appointment_type.name if appointment.appointment_type else None
                ),
                appointment_datetime=appointment.appointment_datetime,
                notes=appointment.notes,
                status=appointment.status,
                created_at=appointment.created_at,
            )
        )

    return appointments


@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> AppointmentResponse:
    """Fetch a single appointment with relationships."""

    logger.info("Admin %s requesting appointment %s", admin_user.id, appointment_id)

    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.user),
            selectinload(Appointment.psychologist),
            selectinload(Appointment.appointment_type),
        )
        .filter(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment or not appointment.user or not appointment.psychologist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    return AppointmentResponse(
        id=appointment.id,
        user=_map_user(appointment.user),
        psychologist=_map_psychologist(appointment.psychologist),
        appointment_type=(appointment.appointment_type.name if appointment.appointment_type else None),
        appointment_datetime=appointment.appointment_datetime,
        notes=appointment.notes,
        status=appointment.status,
        created_at=appointment.created_at,
    )


@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> AppointmentResponse:
    """Update an appointment's status."""

    logger.info(
        "Admin %s updating appointment %s status to %s",
        admin_user.id,
        appointment_id,
        appointment_data.status,
    )

    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.user),
            selectinload(Appointment.psychologist),
            selectinload(Appointment.appointment_type),
        )
        .filter(Appointment.id == appointment_id)
    )
    db_appointment = result.scalar_one_or_none()
    if not db_appointment or not db_appointment.user or not db_appointment.psychologist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    db_appointment.status = appointment_data.status
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment)

    return AppointmentResponse(
        id=db_appointment.id,
        user=_map_user(db_appointment.user),
        psychologist=_map_psychologist(db_appointment.psychologist),
        appointment_type=(
            db_appointment.appointment_type.name if db_appointment.appointment_type else None
        ),
        appointment_datetime=db_appointment.appointment_datetime,
        notes=db_appointment.notes,
        status=db_appointment.status,
        created_at=db_appointment.created_at,
    )


@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_200_OK)
async def delete_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> dict[str, str]:
    """Delete an appointment."""

    logger.info("Admin %s deleting appointment %s", admin_user.id, appointment_id)

    result = await db.execute(select(Appointment).filter(Appointment.id == appointment_id))
    db_appointment = result.scalar_one_or_none()
    if not db_appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    await db.delete(db_appointment)
    await db.commit()
    return {"detail": "deleted"}


@router.get("/therapists/{therapist_id}/schedule", response_model=List[TherapistScheduleResponse])
async def get_therapist_schedule(
    therapist_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> List[TherapistScheduleResponse]:
    """Return all schedule entries for a therapist."""

    logger.info(
        "Admin %s requesting schedule for therapist %s",
        admin_user.id,
        therapist_id,
    )

    result = await db.execute(
        select(TherapistSchedule).filter(TherapistSchedule.therapist_id == therapist_id)
    )
    schedules = [
        TherapistScheduleResponse.model_validate(entry) for entry in result.scalars().all()
    ]
    return schedules


@router.post(
    "/therapists/{therapist_id}/schedule",
    response_model=TherapistScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_therapist_schedule(
    therapist_id: int,
    schedule_data: TherapistScheduleCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> TherapistScheduleResponse:
    """Create a schedule entry for a therapist."""

    logger.info(
        "Admin %s creating schedule for therapist %s",
        admin_user.id,
        therapist_id,
    )

    db_schedule = TherapistSchedule(therapist_id=therapist_id, **schedule_data.model_dump())
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return TherapistScheduleResponse.model_validate(db_schedule)


@router.put(
    "/therapists/schedule/{schedule_id}",
    response_model=TherapistScheduleResponse,
)
async def update_therapist_schedule(
    schedule_id: int,
    schedule_data: TherapistScheduleUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> TherapistScheduleResponse:
    """Update an existing therapist schedule entry."""

    logger.info(
        "Admin %s updating schedule %s",
        admin_user.id,
        schedule_id,
    )

    result = await db.execute(
        select(TherapistSchedule).filter(TherapistSchedule.id == schedule_id)
    )
    db_schedule = result.scalar_one_or_none()
    if not db_schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    update_data = schedule_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_schedule, key, value)

    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return TherapistScheduleResponse.model_validate(db_schedule)


@router.delete("/therapists/schedule/{schedule_id}", status_code=status.HTTP_200_OK)
async def delete_therapist_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> dict[str, str]:
    """Delete a therapist schedule entry."""

    logger.info(
        "Admin %s deleting schedule %s",
        admin_user.id,
        schedule_id,
    )

    result = await db.execute(
        select(TherapistSchedule).filter(TherapistSchedule.id == schedule_id)
    )
    db_schedule = result.scalar_one_or_none()
    if not db_schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    await db.delete(db_schedule)
    await db.commit()
    return {"detail": "deleted"}





