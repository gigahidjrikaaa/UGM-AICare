"""Closed-loop intervention plans: scheduled follow-up chats.

When Aika creates an intervention plan, the plan promises a follow-up
(``plan_data.next_check_in = {"timeframe": "3 hari", "method": "chat"}``) —
historically that promise was stored and never kept. This module closes the
loop:

    schedule_plan_followup()   at plan creation → enqueues an autopilot
                               ``plan_followup`` action with
                               ``next_retry_at = due datetime``
    deliver_plan_followup()    worker, when due → guardrail checks, then
                               inserts a ProactiveMessage + SSE broadcast

Guardrails (checked at creation AND delivery — defense in depth):
- consent:        ``users.consent_proactive_chat`` must be True (opt-in)
- recency:        skip when the user chatted or viewed the plan in the last
                  24h (a proactive nudge must never nag an engaged user)
- frequency cap:  at most one proactive contact per 48h (counts proactive
                  messages AND email check-ins)
- quiet hours:    honored at scheduling time via
                  ``UserPreferences.notification_quiet_hours_start/end`` in
                  the user's ``preferred_timezone`` — a due time landing in
                  the window is pushed to the window's end

Skip semantics: every guardrail skip returns normally (worker marks the
action confirmed) — a skipped nudge must never retry-storm the user.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, time, timezone
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import (
    Conversation,
    InterventionPlanRecord,
)
from app.domains.mental_health.models.autopilot_actions import (
    AutopilotAction,
    AutopilotActionStatus,
    AutopilotActionType,
)
from app.domains.mental_health.services.autopilot_action_service import (
    build_idempotency_key,
    enqueue_action,
)
from app.models import ProactiveMessage, ProactiveMessageSource, ProactiveMessageStatus
from app.models.user import User
from app.models.user_preferences import UserPreferences

logger = logging.getLogger(__name__)

RECENT_ACTIVITY_WINDOW = timedelta(hours=24)
FREQUENCY_CAP_WINDOW = timedelta(hours=48)
DEFAULT_TIMEFRAME = timedelta(days=3)
MAX_TIMEFRAME = timedelta(days=30)

# Asia/Jakarta has no DST, so a fixed offset is exact; other zones use
# zoneinfo when the IANA database is available (tzdata installed).
_DEFAULT_TZ_NAME = "Asia/Jakarta"


def _user_timezone(tz_name: str | None):
    name = (tz_name or _DEFAULT_TZ_NAME).strip() or _DEFAULT_TZ_NAME
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        if name == _DEFAULT_TZ_NAME:
            return timezone(timedelta(hours=7))  # WIB, no DST
        return timezone.utc


# ---------------------------------------------------------------------------
# Timeframe parsing ("3 hari", "1 minggu", "besok", "2 jam", ...)
# ---------------------------------------------------------------------------
_UNIT_SECONDS: dict[str, int] = {
    "detik": 1,
    "menit": 60,
    "jam": 3600,
    "hari": 86400,
    "minggu": 604800,
    "bulan": 2592000,  # 30 days; plans never promise more
}

_TIMEFRAME_RE = re.compile(r"(\d+)\s*(detik|menit|jam|hari|minggu|bulan)", re.IGNORECASE)


def parse_timeframe_id(timeframe: str | None) -> timedelta:
    """Parse an Indonesian human timeframe into a timedelta.

    Understands "N <unit>" ("3 hari", "1 minggu", "2 jam"), the standalone
    words "besok"/"lusa", and colloquial forms ("besok pagi"). Anything
    unparseable falls back to 3 days; anything above 30 days is clamped —
    a follow-up further out than a month is a prompt-engineering artifact,
    not a clinical intent.

    >>> parse_timeframe_id("3 hari")
    datetime.timedelta(days=3)
    >>> parse_timeframe_id("1 minggu")
    datetime.timedelta(days=7)
    >>> parse_timeframe_id("2 jam")
    datetime.timedelta(seconds=7200)
    >>> parse_timeframe_id("besok")
    datetime.timedelta(days=1)
    >>> parse_timeframe_id("kapan saja")
    datetime.timedelta(days=3)
    """
    if not timeframe:
        return DEFAULT_TIMEFRAME
    text = str(timeframe).strip().lower()
    if not text:
        return DEFAULT_TIMEFRAME

    if text.startswith("lusa"):
        return timedelta(days=2)
    if "besok" in text:
        return timedelta(days=1)
    if "nanti" in text and "jam" not in text:
        # "nanti" / "nanti malam" without a number: treat as later today
        return timedelta(hours=4)

    match = _TIMEFRAME_RE.search(text)
    if not match:
        return DEFAULT_TIMEFRAME
    value = int(match.group(1))
    unit = match.group(2).lower()
    delta = timedelta(seconds=value * _UNIT_SECONDS[unit])
    return min(delta, MAX_TIMEFRAME)


# ---------------------------------------------------------------------------
# Quiet hours (enforced at scheduling time)
# ---------------------------------------------------------------------------
def _in_quiet_hours(now_local: datetime, start: time, end: time) -> bool:
    """True when *now_local*'s time-of-day is inside [start, end).

    Handles overnight windows (start > end, e.g. 22:00–06:00)."""
    if start == end:
        return False
    if start < end:
        return start <= now_local.time() < end
    return now_local.time() >= start or now_local.time() < end


def adjust_for_quiet_hours(
    due_at: datetime,
    *,
    quiet_start: Any | None,
    quiet_end: Any | None,
    tz_name: str | None = None,
) -> datetime:
    """Push *due_at* (tz-aware) out of the quiet-hours window.

    A due time inside quiet hours moves to the window's END of that local
    day (e.g. due 02:00 with 22:00–06:00 window → 06:00 same local day;
    due 23:30 → next-day 06:00). No window configured → unchanged.
    """
    if quiet_start is None or quiet_end is None:
        return due_at
    # UserPreferences columns are sqlalchemy Time → datetime.time values.
    if not isinstance(quiet_start, time) or not isinstance(quiet_end, time):
        return due_at
    start, end = quiet_start, quiet_end

    tz = _user_timezone(tz_name)
    local = due_at.astimezone(tz)
    if not _in_quiet_hours(local, start, end):
        return due_at

    if start < end:
        # Intra-day window: jump to end of the same local day.
        candidate = local.replace(
            hour=end.hour, minute=end.minute, second=0, microsecond=0
        )
        if candidate <= local:
            candidate += timedelta(days=1)
    else:
        # Overnight window: due after midnight → today at end; due before
        # midnight (e.g. 23:30 with 22:00–06:00) → tomorrow at end.
        candidate = local.replace(
            hour=end.hour, minute=end.minute, second=0, microsecond=0
        )
        if candidate <= local:
            candidate += timedelta(days=1)
    return candidate.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# Scheduling (called at plan creation)
# ---------------------------------------------------------------------------
def _next_unfinished_step(plan: InterventionPlanRecord) -> str | None:
    """Best-effort title of the first unfinished step, or None."""
    plan_data = plan.plan_data or {}
    steps = plan_data.get("plan_steps") or []
    tracking = plan.completion_tracking or {}
    completed = tracking.get("completed_steps") or []
    completed_indices = {
        item if isinstance(item, int) else idx
        for idx, item in enumerate(completed)
    }
    for idx, step in enumerate(steps):
        if idx not in completed_indices and isinstance(step, dict):
            title = step.get("title")
            if title:
                return str(title)
    if steps and isinstance(steps[0], dict):
        return str(steps[0].get("title") or "langkah pertama")
    return None


def _build_followup_text(plan: InterventionPlanRecord) -> str:
    total = int(plan.total_steps or 0)
    done = int(plan.completed_steps or 0)
    title = (plan.plan_title or "rencana kamu").strip()
    if done >= total > 0:
        return (
            f"Hai! Rencana '{title}' kamu udah selesai semua ({done}/{total} langkah). "
            "Keren banget! Mau cerita gimana rasanya setelah menyelesaikannya?"
        )
    if total > 0:
        next_step = _next_unfinished_step(plan)
        if next_step:
            return (
                f"Hai! Beberapa hari lalu kita bikin rencana '{title}'. "
                f"Kamu udah selesai {done}/{total} langkah — langkah berikutnya: '{next_step}'. "
                "Mau lanjut bareng sekarang?"
            )
        return (
            f"Hai! Beberapa hari lalu kita bikin rencana '{title}' "
            f"({done}/{total} langkah selesai). Mau lanjut bareng sekarang?"
        )
    return (
        f"Hai! Beberapa hari lalu kita bikin rencana '{title}'. "
        "Gimana progressnya sejauh ini? Mau lanjut bareng sekarang?"
    )


async def schedule_plan_followup(
    db: AsyncSession,
    plan: InterventionPlanRecord,
    *,
    commit: bool = True,
) -> AutopilotAction | None:
    """Enqueue the follow-up autopilot action for a freshly created plan.

    Idempotent: the idempotency key is derived from (user, plan), so
    re-invocation returns the existing action. ``commit=False`` lets the
    caller own the transaction boundary (e.g. TCA inside parallel crisis).
    """
    timeframe = ""
    try:
        timeframe = str((plan.plan_data or {}).get("next_check_in", {}).get("timeframe") or "")
    except AttributeError:
        timeframe = ""
    delta = parse_timeframe_id(timeframe)
    due_at = datetime.now(timezone.utc) + delta

    # Quiet hours: nudge etiquette is decided once, at scheduling time.
    prefs = (
        await db.execute(
            select(UserPreferences).where(UserPreferences.user_id == plan.user_id)
        )
    ).scalar_one_or_none()
    if prefs is not None:
        due_at = adjust_for_quiet_hours(
            due_at,
            quiet_start=prefs.notification_quiet_hours_start,
            quiet_end=prefs.notification_quiet_hours_end,
            tz_name=getattr(prefs, "preferred_timezone", None),
        )

    session_id = f"proactive-{plan.id}"
    result = await enqueue_action(
        db,
        action_type=AutopilotActionType.plan_followup,
        risk_level="low",
        idempotency_key=build_idempotency_key(
            f"plan_followup:{plan.user_id}:{plan.id}"
        ),
        payload_json={
            "user_id": plan.user_id,
            "plan_id": plan.id,
            "session_id": session_id,
            "due_at": due_at.isoformat(),
        },
        commit=False,
    )
    result.next_retry_at = due_at
    if commit:
        await db.commit()
    logger.info(
        "Plan follow-up scheduled: plan_id=%s, user_id=%s, due_at=%s (from timeframe %r)",
        plan.id,
        plan.user_id,
        due_at.isoformat(),
        timeframe or "<none>",
    )
    return result


# ---------------------------------------------------------------------------
# Delivery (called by the autopilot worker when the action is due)
# ---------------------------------------------------------------------------
async def deliver_plan_followup(db: AsyncSession, action: AutopilotAction) -> dict[str, Any]:
    """Deliver the plan follow-up as a ProactiveMessage + SSE event.

    Any guardrail skip returns ``{"skipped": <reason>}`` — the worker marks
    the action confirmed, no retries.
    """
    payload = action.payload_json or {}
    user_id = payload.get("user_id")
    plan_id = payload.get("plan_id")
    session_id = str(payload.get("session_id") or f"proactive-{plan_id}")

    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if user is None:
        return {"skipped": "user_not_found"}
    if not bool(user.consent_proactive_chat):
        return {"skipped": "consent_not_granted"}

    plan = (
        await db.execute(
            select(InterventionPlanRecord).where(InterventionPlanRecord.id == plan_id)
        )
    ).scalar_one_or_none()
    if plan is None or plan.status != "active" or not plan.is_active:
        return {"skipped": "plan_inactive"}

    total = int(plan.total_steps or 0)
    done = int(plan.completed_steps or 0)
    if total > 0 and done >= total:
        return {"skipped": "plan_completed"}

    # Recency: an engaged user must not be nudged.
    now = datetime.now(timezone.utc)
    recent_cutoff = now - RECENT_ACTIVITY_WINDOW
    last_conversation = (
        await db.execute(
            select(func.max(Conversation.timestamp)).where(
                Conversation.user_id == user_id
            )
        )
    ).scalar()
    if last_conversation and last_conversation >= recent_cutoff:
        return {"skipped": "user_recently_active"}
    if plan.last_viewed_at and plan.last_viewed_at >= recent_cutoff:
        return {"skipped": "user_recently_active"}

    # Frequency cap: one proactive contact per window (in-app + email).
    cap_cutoff = now - FREQUENCY_CAP_WINDOW
    recent_proactive = (
        await db.execute(
            select(ProactiveMessage.id)
            .where(
                ProactiveMessage.user_id == user_id,
                ProactiveMessage.created_at >= cap_cutoff,
                ProactiveMessage.status.in_(
                    [ProactiveMessageStatus.pending, ProactiveMessageStatus.read]
                ),
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if recent_proactive is not None:
        return {"skipped": "frequency_cap_proactive"}
    if user.last_checkin_sent_at and user.last_checkin_sent_at >= cap_cutoff:
        return {"skipped": "frequency_cap_checkin"}

    message = ProactiveMessage(
        id=str(uuid4()),
        user_id=user_id,
        source=ProactiveMessageSource.plan_followup,
        source_entity_id=plan.id,
        session_id=session_id,
        content_redacted=_build_followup_text(plan),
        status=ProactiveMessageStatus.pending,
        due_at=action.next_retry_at,
        delivered_at=now,
    )
    db.add(message)

    try:
        from app.services.sse_broadcaster import get_broadcaster

        await get_broadcaster().broadcast(
            "proactive_message",
            {
                "id": message.id,
                "session_id": session_id,
                "content": message.content_redacted,
                "source": ProactiveMessageSource.plan_followup.value,
                "source_entity_id": plan.id,
            },
            user_id=user_id,
        )
    except Exception as exc:  # SSE must never block delivery
        logger.warning("Proactive SSE broadcast failed (message still queued): %s", exc)

    try:
        from app.core.metrics import proactive_messages_delivered_total

        proactive_messages_delivered_total.labels(
            source=ProactiveMessageSource.plan_followup.value
        ).inc()
    except Exception:
        pass
    logger.info(
        "Plan follow-up delivered: plan_id=%s, user_id=%s, message_id=%s",
        plan.id,
        user_id,
        message.id,
    )
    return {
        "delivered": True,
        "proactive_message_id": message.id,
        "session_id": session_id,
        "plan_id": plan.id,
        "status": AutopilotActionStatus.confirmed.value,
    }
