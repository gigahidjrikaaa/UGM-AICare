"""Weekly opt-in self-report prompt delivery (JITAI Phase 1b).

Enqueues a ``ProactiveMessage`` (+ SSE broadcast) inviting consenting users to
complete the 4-item PHQ-2/GAD-2 check-in. Guardrails mirror
``plan_followup_service``:

- consent:   ``users.consent_self_report`` must be True (opt-in)
- frequency: at most one self-report prompt per user per 7 days
- recency:   skip users who already self-reported within the window

The weekly cadence itself is enforced by the APScheduler cron job; this module
is the pure delivery logic so it can be tested and (later) reused.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import ScreeningDimensionSample
from app.models import (
    ProactiveMessage,
    ProactiveMessageSource,
    ProactiveMessageStatus,
    User,
)

logger = logging.getLogger(__name__)

WEEKLY_WINDOW = timedelta(days=7)

_CHECKIN_TEXT = (
    "Hai! Waktunya check-in mingguan singkat (4 pertanyaan, ~30 detik). "
    "Jawabanmu membantu Aika memahami perasaanmu dan menyesuaikan dukungan. "
    "Mau isi sekarang?"
)


def build_checkin_message() -> str:
    """The user-facing prompt text."""
    return _CHECKIN_TEXT


def should_send_checkin(
    *,
    consent: bool,
    is_active: bool,
    has_recent_prompt: bool,
    has_recent_self_report: bool,
) -> bool:
    """Pure eligibility predicate (unit-testable)."""
    return bool(
        consent
        and is_active
        and not has_recent_prompt
        and not has_recent_self_report
    )


async def _has_recent_prompt(db: AsyncSession, user_id: int, cutoff: datetime) -> bool:
    row = (
        await db.execute(
            select(ProactiveMessage.id)
            .where(
                ProactiveMessage.user_id == user_id,
                ProactiveMessage.source == ProactiveMessageSource.self_report_checkin,
                ProactiveMessage.created_at >= cutoff,
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    return row is not None


async def _has_recent_self_report(db: AsyncSession, user_id: int, cutoff: datetime) -> bool:
    row = (
        await db.execute(
            select(ScreeningDimensionSample.id)
            .where(
                ScreeningDimensionSample.user_id == user_id,
                ScreeningDimensionSample.source == "self_report",
                ScreeningDimensionSample.created_at >= cutoff,
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    return row is not None


async def run_weekly_self_report_checkins(
    db: AsyncSession,
    *,
    now: datetime | None = None,
) -> Dict[str, Any]:
    """Send this week's prompts to every eligible consenting user.

    Returns a summary dict. Commits once at the end.
    """
    now = now or datetime.now(timezone.utc)
    cutoff = now - WEEKLY_WINDOW

    users: List[User] = (
        await db.execute(
            select(User).where(
                User.consent_self_report == True,  # noqa: E712
                User.is_active == True,  # noqa: E712
            )
        )
    ).scalars().all()

    sent = 0
    skipped = 0

    for user in users:
        has_recent_prompt = await _has_recent_prompt(db, user.id, cutoff)
        has_recent_self_report = await _has_recent_self_report(db, user.id, cutoff)

        if not should_send_checkin(
            consent=True,
            is_active=True,
            has_recent_prompt=has_recent_prompt,
            has_recent_self_report=has_recent_self_report,
        ):
            skipped += 1
            continue

        message = ProactiveMessage(
            id=str(uuid4()),
            user_id=user.id,
            source=ProactiveMessageSource.self_report_checkin,
            source_entity_id=None,
            session_id=f"selfreport-{user.id}",
            content_redacted=build_checkin_message(),
            status=ProactiveMessageStatus.pending,
            due_at=now,
            delivered_at=now,
        )
        db.add(message)

        try:
            from app.services.sse_broadcaster import get_broadcaster

            await get_broadcaster().broadcast(
                "proactive_message",
                {
                    "id": message.id,
                    "session_id": message.session_id,
                    "content": message.content_redacted,
                    "source": ProactiveMessageSource.self_report_checkin.value,
                    "source_entity_id": None,
                },
                user_id=user.id,
            )
        except Exception as exc:  # SSE must never block delivery
            logger.warning("Self-report SSE broadcast failed (message still queued): %s", exc)

        sent += 1

    await db.commit()
    logger.info(
        "Weekly self-report check-ins: eligible=%s sent=%s skipped=%s",
        len(users),
        sent,
        skipped,
    )
    return {"eligible": len(users), "sent": sent, "skipped": skipped}
