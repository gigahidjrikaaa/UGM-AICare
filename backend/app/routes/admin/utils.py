"""Shared helpers for admin routes."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Appointment, Conversation, JournalEntry, User, UserBadge
from app.schemas.admin import UserStats
from app.utils.security_utils import decrypt_data

logger = logging.getLogger(__name__)


def decrypt_user_field(encrypted_value: Optional[str]) -> Optional[str]:
    if not encrypted_value:
        return None
    try:
        return decrypt_data(encrypted_value)
    except Exception as exc:
        logger.warning("Failed to decrypt field: %s", exc)
        return encrypted_value


def decrypt_user_email(encrypted_email: Optional[str]) -> Optional[str]:
    """Safely decrypt an email address, returning a placeholder on failure."""
    if not encrypted_email:
        return None
    try:
        return decrypt_data(encrypted_email)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Failed to decrypt email: %s", exc)
        return "[Encrypted]"


def hash_user_id(user_id: int) -> str:
    """Return a deterministic but anonymous hash for user identifiers."""
    return hashlib.md5(f"user_{user_id}_salt".encode()).hexdigest()[:8]


def build_avatar_url(email: Optional[str], user_id: int, size: int = 128) -> str:
    """Construct a deterministic avatar URL for a user."""
    if email:
        normalized = email.strip().lower()
        if normalized:
            email_hash = hashlib.md5(normalized.encode("utf-8")).hexdigest()
            return f"https://www.gravatar.com/avatar/{email_hash}?s={size}&d=identicon"

    seed = hash_user_id(user_id)
    return f"https://api.dicebear.com/7.x/identicon/svg?seed={seed}&size={size}"


async def get_user_stats(db: AsyncSession) -> UserStats:
    """Calculate dashboard-level user statistics."""
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_30d = (
        await db.execute(select(func.count(User.id)).filter(User.last_activity_date >= month_ago))
    ).scalar() or 0
    active_7d = (
        await db.execute(select(func.count(User.id)).filter(User.last_activity_date >= week_ago))
    ).scalar() or 0
    new_today = (
        await db.execute(select(func.count(User.id)).filter(func.date(User.created_at) == today))
    ).scalar() or 0
    avg_sentiment = (
        await db.execute(select(func.avg(User.sentiment_score)))
    ).scalar() or 0
    total_journals = (
        await db.execute(select(func.count(JournalEntry.id)))
    ).scalar() or 0
    total_conversations = (
        await db.execute(select(func.count(Conversation.id)))
    ).scalar() or 0
    total_badges = (
        await db.execute(select(func.count(UserBadge.id)))
    ).scalar() or 0

    return UserStats(
        total_users=total_users,
        active_users_30d=active_30d,
        active_users_7d=active_7d,
        new_users_today=new_today,
        avg_sentiment_score=float(avg_sentiment),
        total_journal_entries=total_journals,
        total_conversations=total_conversations,
        total_badges_awarded=total_badges,
    )

