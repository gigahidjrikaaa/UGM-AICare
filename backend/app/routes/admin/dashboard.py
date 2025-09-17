"""Dashboard and summary endpoints for the admin panel."""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import Appointment, User
from app.routes.admin.utils import get_user_stats
from app.schemas.admin.dashboard import AppointmentSummary, FeedbackSummary

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin - Dashboard"])


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Get overall system statistics."""
    logger.info("Admin %s requesting system stats", admin_user.id)

    try:
        return await get_user_stats(db)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Error fetching admin stats: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system statistics",
        ) from exc


@router.get("/appointments/summary", response_model=AppointmentSummary)
async def get_appointments_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> AppointmentSummary:
    """Lightweight summary for appointments to power the dashboard."""

    logger.info(
        "Admin %s requesting appointments summary (from=%s, to=%s)",
        admin_user.id,
        date_from,
        date_to,
    )

    try:
        today = datetime.now().date()
        if not date_from or not date_to:
            first_day = today.replace(day=1)
            if today.month == 12:
                next_month = today.replace(year=today.year + 1, month=1, day=1)
            else:
                next_month = today.replace(month=today.month + 1, day=1)
            last_day = next_month - timedelta(days=1)
            date_from = date_from or first_day
            date_to = date_to or last_day

        base = select(Appointment).filter(
            func.date(Appointment.appointment_datetime) >= date_from,
            func.date(Appointment.appointment_datetime) <= date_to,
        )

        total = (
            await db.execute(select(func.count()).select_from(base.subquery()))
        ).scalar() or 0
        completed = (
            await db.execute(
                select(func.count(Appointment.id)).filter(
                    Appointment.status == "completed",
                    func.date(Appointment.appointment_datetime) >= date_from,
                    func.date(Appointment.appointment_datetime) <= date_to,
                )
            )
        ).scalar() or 0
        cancelled = (
            await db.execute(
                select(func.count(Appointment.id)).filter(
                    Appointment.status == "cancelled",
                    func.date(Appointment.appointment_datetime) >= date_from,
                    func.date(Appointment.appointment_datetime) <= date_to,
                )
            )
        ).scalar() or 0
        today_total = (
            await db.execute(
                select(func.count(Appointment.id)).filter(
                    func.date(Appointment.appointment_datetime) == today
                )
            )
        ).scalar() or 0

        return AppointmentSummary(
            date_from=date_from,
            date_to=date_to,
            total=int(total),
            completed=int(completed),
            cancelled=int(cancelled),
            today_total=int(today_total),
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Error generating appointment summary: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch appointment summary") from exc


@router.get("/feedback/summary", response_model=FeedbackSummary)
async def get_feedback_summary(
    window_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> FeedbackSummary:
    """Compute simple feedback KPIs (NPS, felt understood) for the last N days."""

    logger.info(
        "Admin %s requesting feedback summary (window_days=%s)",
        admin_user.id,
        window_days,
    )

    try:
        from app.models import Feedback  # Local import to avoid circular dependencies

        cutoff = datetime.now() - timedelta(days=window_days)
        base = select(Feedback).filter(Feedback.timestamp >= cutoff)
        count = (
            await db.execute(select(func.count()).select_from(base.subquery()))
        ).scalar() or 0

        avg_nps = (
            await db.execute(
                select(func.avg(Feedback.nps_rating)).filter(Feedback.timestamp >= cutoff)
            )
        ).scalar()
        avg_felt = (
            await db.execute(
                select(func.avg(Feedback.felt_understood_rating)).filter(
                    Feedback.timestamp >= cutoff
                )
            )
        ).scalar()

        return FeedbackSummary(
            window_days=window_days,
            count=int(count),
            avg_nps=float(avg_nps) if avg_nps is not None else None,
            avg_felt_understood=float(avg_felt) if avg_felt is not None else None,
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Error generating feedback summary: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch feedback summary") from exc
