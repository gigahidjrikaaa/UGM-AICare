"""User management endpoints for admin panel."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import Appointment, Conversation, JournalEntry, User, UserBadge
from app.schemas.admin import UserDetailResponse, UserListItem, UsersResponse
from .utils import decrypt_user_email, get_user_stats

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin - Users"])


@router.get("/users", response_model=UsersResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email or google_sub"),
    sort_by: str = Query("id", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    active_only: bool = Query(False, description="Show only active users"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Get paginated list of users with statistics."""
    logger.info(
        "Admin %s requesting users list (page %s, limit %s)", admin_user.id, page, limit
    )
    try:
        base_query = (
            select(
                User,
                func.count(JournalEntry.id).label("journal_count"),
                func.count(Conversation.id).label("conversation_count"),
                func.count(UserBadge.id).label("badge_count"),
                func.count(Appointment.id).label("appointment_count"),
            )
            .outerjoin(JournalEntry, User.id == JournalEntry.user_id)
            .outerjoin(Conversation, User.id == Conversation.user_id)
            .outerjoin(UserBadge, User.id == UserBadge.user_id)
            .outerjoin(Appointment, User.id == Appointment.user_id)
            .group_by(User.id)
        )

        if search:
            pattern = f"%{search}%"
            base_query = base_query.filter(
                or_(User.email.ilike(pattern), User.google_sub.ilike(pattern))
            )

        if active_only:
            from datetime import timedelta

            thirty_days_ago = datetime.now().date() - timedelta(days=30)
            base_query = base_query.filter(User.last_activity_date >= thirty_days_ago)

        count_query = select(func.count()).select_from(base_query.subquery())
        total_count = (await db.execute(count_query)).scalar() or 0

        sort_column = getattr(User, sort_by, User.id)
        ordered_query = base_query.order_by(desc(sort_column) if sort_order.lower() == "desc" else asc(sort_column))
        offset = (page - 1) * limit
        results = (await db.execute(ordered_query.offset(offset).limit(limit))).all()

        users: List[UserListItem] = []
        for user_obj, journal_count, conversation_count, badge_count, appointment_count in results:
            users.append(
                UserListItem(
                    id=user_obj.id,
                    email=decrypt_user_email(user_obj.email),
                    google_sub=user_obj.google_sub,
                    wallet_address=user_obj.wallet_address,
                    sentiment_score=user_obj.sentiment_score,
                    current_streak=user_obj.current_streak,
                    longest_streak=user_obj.longest_streak,
                    last_activity_date=user_obj.last_activity_date,
                    allow_email_checkins=user_obj.allow_email_checkins,
                    role=getattr(user_obj, "role", "user"),
                    is_active=user_obj.is_active,
                    created_at=user_obj.created_at,
                    total_journal_entries=journal_count or 0,
                    total_conversations=conversation_count or 0,
                    total_badges=badge_count or 0,
                    total_appointments=appointment_count or 0,
                    last_login=user_obj.last_login,
                )
            )

        stats = await get_user_stats(db)
        return UsersResponse(users=users, total_count=total_count, stats=stats)
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.error("Error fetching users list: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users",
        ) from exc


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Retrieve full details for a single user."""
    logger.info("Admin %s requesting user detail %s", admin_user.id, user_id)
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    journals = await db.execute(
        select(JournalEntry).filter(JournalEntry.user_id == user_id).order_by(desc(JournalEntry.created_at)).limit(10)
    )
    conversations = await db.execute(
        select(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(desc(Conversation.timestamp))
        .limit(10)
    )
    badges = await db.execute(select(UserBadge).filter(UserBadge.user_id == user_id))
    appointments = await db.execute(select(Appointment).filter(Appointment.user_id == user_id))

    return UserDetailResponse(
        id=user.id,
        email=decrypt_user_email(user.email),
        google_sub=user.google_sub,
        wallet_address=user.wallet_address,
        sentiment_score=user.sentiment_score,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        last_activity_date=user.last_activity_date,
        allow_email_checkins=user.allow_email_checkins,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        journal_entries=[j.__dict__ for j in journals.scalars().all()],
        recent_conversations=[c.__dict__ for c in conversations.scalars().all()],
        badges=[b.__dict__ for b in badges.scalars().all()],
        appointments=[a.__dict__ for a in appointments.scalars().all()],
    )


@router.put("/users/{user_id}/email-checkins")
async def update_user_email_checkins(
    user_id: int,
    allow_email_checkins: bool,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update the email check-in preference for a user."""
    logger.info("Admin %s updating email check-ins for user %s", admin_user.id, user_id)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.allow_email_checkins = allow_email_checkins
    await db.commit()
    await db.refresh(user)
    return {"user_id": user_id, "allow_email_checkins": allow_email_checkins}


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    is_active: bool,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Activate or deactivate a user account."""
    logger.info("Admin %s updating status for user %s", admin_user.id, user_id)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return {"user_id": user_id, "is_active": is_active}


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update a user's role."""
    logger.info("Admin %s updating role for user %s", admin_user.id, user_id)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = role
    await db.commit()
    await db.refresh(user)
    return {"user_id": user_id, "role": role}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Delete a user and related data."""
    logger.info("Admin %s deleting user %s", admin_user.id, user_id)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"message": f"User {user_id} deleted"}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Generate a password reset token for a user."""
    logger.info("Admin %s requesting password reset for user %s", admin_user.id, user_id)
    admin_role = getattr(admin_user, "role", None)
    if admin_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can reset passwords",
        )

    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_email = decrypt_user_email(getattr(user, "email", None))
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an email address",
        )

    import secrets

    reset_token = secrets.token_urlsafe(32)
    logger.info("Password reset token generated for user %s", user_id)
    return {
        "message": f"Password reset token generated for user {user_id}",
        "user_id": user_id,
        "email": user_email,
        "reset_token": reset_token,
        "note": "In production, this token would be sent via email",
    }
