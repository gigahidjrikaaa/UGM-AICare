"""Cross-conversation risk-trajectory detection (early-warning loop).

Every conversation-end STA analysis appends a ``ConversationRiskAssessment``
row and every formal instrument appends a ``FormalScreeningSubmission``, but
until now nothing compared them *across time*: the scheduled trend job read a
``trend`` field that no production code ever wrote, so deteriorating students
generated no proactive signal.

This module makes the loop real:

1. Per user, collect risk points — STA conversation assessments (risk level
   mapped to 0–4) and formal instrument submissions (total/max scaled to 0–4).
2. Classify the trajectory over a trailing window (older-half vs newer-half
   mean delta plus a least-squares slope for robustness).
3. For meaningful deterioration:
   - persist the trajectory on the ``UserScreeningProfile`` (so counselors see
     ``risk_trajectory = worsening`` with its basis),
   - raise a counselor alert (assigned counselors first, all active counselors
     otherwise) — via ``create_user_risk_counselor_alert``,
   - send an in-app proactive check-in when the student allows proactive
     messages, honouring the same anti-spam caps as plan follow-ups.
4. Deduplicate: at most one alert/outreach cycle per user per
   ``ALERT_COOLDOWN_DAYS``, tracked on the profile's trend record.

Pure classification lives in :func:`compute_trajectory` (unit-testable);
database orchestration lives in :func:`detect_risk_trajectory_declines`.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import (
    ConversationRiskAssessment,
    FormalScreeningSubmission,
    UserScreeningProfile,
)

logger = logging.getLogger(__name__)

WINDOW_DAYS = 90
MIN_POINTS = 4
#: Newer-half mean minus older-half mean (on the 0–4 risk scale) that counts
#: as a meaningful deterioration.
DELTA_THRESHOLD = 0.5
#: Least-squares slope (risk levels per week) that counts as deterioration.
SLOPE_THRESHOLD_PER_WEEK = 0.35
ALERT_COOLDOWN_DAYS = 7
#: Same anti-spam cap as plan follow-ups: one proactive contact per window.
PROACTIVE_CAP_DAYS = 2

RISK_LEVEL_VALUES: Dict[str, float] = {
    "none": 0.0,
    "mild": 1.0,
    "moderate": 2.0,
    "severe": 3.0,
    "critical": 4.0,
}

TRAJECTORY_CHECKIN_TEXT = (
    "Hei, aku Aika 🌿\n\n"
    "Melihat pola beberapa percakapan terakhirmu, sepertinya bebannya lagi "
    "terasa lebih berat beberapa hari ini. Tidak apa-apa merasa seperti itu — "
    "dan kamu tidak sendiri.\n\n"
    "Kalau mau cerita, aku di sini. Kalau butuh dukungan manusia, kamu bisa "
    "menjadwalkan sesi dengan konselor kampus lewat menu Appointment.\n\n"
    "Kalau sedang darurat: SEJIWA 119 tekan 8 (gratis, 24 jam) atau Crisis "
    "Centre UGM 0851-0111-0800."
)


def compute_trajectory(points: Sequence[Tuple[datetime, float]]) -> Dict[str, Any]:
    """Classify a risk-point series; pure.

    ``points`` are ``(timestamp, risk_value)`` pairs on any scale (the app uses
    0–4), oldest → newest. Returns ``direction`` (``improving`` / ``stable`` /
    ``worsening``, or ``insufficient`` below ``MIN_POINTS``), plus the older-vs
    newer half-mean ``delta``, the least-squares ``slope_per_week``, and ``n``.
    """
    ordered = sorted(points, key=lambda p: p[0])
    n = len(ordered)
    if n < MIN_POINTS:
        return {"direction": "insufficient", "delta": 0.0, "slope_per_week": 0.0, "n": n}

    values = [value for _, value in ordered]
    times = [ts for ts, _ in ordered]
    half = n // 2
    older_mean = sum(values[:half]) / half
    newer_mean = sum(values[half:]) / (n - half)
    delta = newer_mean - older_mean

    # Least-squares slope in risk-levels per week (time in days / 7).
    t0 = times[0]
    xs = [max((ts - t0).total_seconds() / 86400.0, 0.0) / 7.0 for ts in times]
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    denominator = sum((x - mean_x) ** 2 for x in xs)
    slope = (
        sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values)) / denominator
        if denominator > 0
        else 0.0
    )

    if delta >= DELTA_THRESHOLD or slope >= SLOPE_THRESHOLD_PER_WEEK:
        direction = "worsening"
    elif delta <= -DELTA_THRESHOLD or slope <= -SLOPE_THRESHOLD_PER_WEEK:
        direction = "improving"
    else:
        direction = "stable"

    return {
        "direction": direction,
        "delta": round(delta, 3),
        "slope_per_week": round(slope, 3),
        "n": n,
    }


def _assessment_points(
    rows: Sequence[ConversationRiskAssessment],
) -> List[Tuple[datetime, float]]:
    points: List[Tuple[datetime, float]] = []
    for row in rows:
        value = RISK_LEVEL_VALUES.get((row.overall_risk_level or "").lower())
        if value is None:
            continue
        created = row.created_at
        if created is None:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        points.append((created, value))
    return points


def _submission_points(
    rows: Sequence[FormalScreeningSubmission],
) -> List[Tuple[datetime, float]]:
    points: List[Tuple[datetime, float]] = []
    for row in rows:
        if not row.max_score:
            continue
        created = row.created_at
        if created is None:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        # Scale total/max onto the same 0–4 ladder used for risk levels.
        points.append((created, 4.0 * (row.total_score / row.max_score)))
    return points


async def _collect_points(
    db: AsyncSession, user_id: int, since: datetime
) -> List[Tuple[datetime, float]]:
    assessments = (
        await db.execute(
            select(ConversationRiskAssessment)
            .where(
                ConversationRiskAssessment.user_id == user_id,
                ConversationRiskAssessment.created_at >= since,
            )
            .order_by(ConversationRiskAssessment.created_at.asc())
        )
    ).scalars().all()

    submissions = (
        await db.execute(
            select(FormalScreeningSubmission)
            .where(
                FormalScreeningSubmission.user_id == user_id,
                FormalScreeningSubmission.created_at >= since,
            )
        )
    ).scalars().all()

    points = _assessment_points(assessments) + _submission_points(submissions)
    points.sort(key=lambda p: p[0])
    return points


def _has_recent_alert(trend_record: Optional[Dict[str, Any]]) -> bool:
    if not trend_record:
        return False
    last_alerted = trend_record.get("last_alerted_at")
    if not last_alerted:
        return False
    try:
        alerted_at = datetime.fromisoformat(str(last_alerted))
    except ValueError:
        return False
    if alerted_at.tzinfo is None:
        alerted_at = alerted_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - alerted_at < timedelta(days=ALERT_COOLDOWN_DAYS)


async def _send_proactive_checkin(db: AsyncSession, user_id: int) -> bool:
    """Deliver the in-app early-warning check-in; respects consent + caps."""
    from app.models.proactive_message import (
        ProactiveMessage,
        ProactiveMessageSource,
        ProactiveMessageStatus,
    )
    from app.models.user import User

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or not bool(user.consent_proactive_chat):
        return False

    cap_cutoff = datetime.now(timezone.utc) - timedelta(days=PROACTIVE_CAP_DAYS)
    recent = (
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
    if recent is not None:
        return False

    message = ProactiveMessage(
        id=str(uuid4()),
        user_id=user_id,
        source=ProactiveMessageSource.trajectory_checkin,
        source_entity_id=None,
        session_id=f"proactive-trajectory-{user_id}",
        content_redacted=TRAJECTORY_CHECKIN_TEXT,
        status=ProactiveMessageStatus.pending,
        due_at=datetime.now(timezone.utc),
        delivered_at=datetime.now(timezone.utc),
    )
    db.add(message)
    await db.flush()

    try:
        from app.services.sse_broadcaster import get_broadcaster

        await get_broadcaster().broadcast(
            "proactive_message",
            {
                "id": message.id,
                "session_id": message.session_id,
                "content": message.content_redacted,
                "source": ProactiveMessageSource.trajectory_checkin.value,
                "source_entity_id": None,
                "created_at": message.created_at.isoformat()
                if message.created_at
                else None,
            },
            user_id=user_id,
        )
    except Exception as exc:
        logger.warning(
            "trajectory_checkin SSE broadcast failed for user %s (row persisted): %s",
            user_id,
            exc,
        )
    return True


async def detect_risk_trajectory_declines(
    db: AsyncSession,
    *,
    window_days: int = WINDOW_DAYS,
    alert: bool = True,
) -> Dict[str, Any]:
    """Run the early-warning pass over all active users; returns a summary.

    For every user whose combined risk-point trajectory is ``worsening``:
    persist the trajectory, mark the profile as requiring attention, raise a
    counselor alert, and (consent-gated) deliver an in-app check-in. Alerts are
    deduplicated per ``ALERT_COOLDOWN_DAYS`` via the profile's trend record.
    """
    from app.models.user import User

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=window_days)

    candidate_rows = (
        await db.execute(
            select(UserScreeningProfile.user_id)
            .join(User, User.id == UserScreeningProfile.user_id)
            .where(User.is_active == True)  # noqa: E712
        )
    ).scalars().all()
    # Users without a profile row but with assessments still matter; union in
    # distinct assessment user ids.
    assessment_user_ids = (
        await db.execute(
            select(ConversationRiskAssessment.user_id)
            .where(
                ConversationRiskAssessment.created_at >= since,
                ConversationRiskAssessment.user_id.is_not(None),
            )
            .distinct()
        )
    ).scalars().all()

    user_ids = sorted(set(candidate_rows) | set(int(uid) for uid in assessment_user_ids if uid is not None))

    summary: Dict[str, Any] = {
        "users_checked": len(user_ids),
        "deteriorating": 0,
        "alerts_sent": 0,
        "checkins_sent": 0,
    }

    for user_id in user_ids:
        try:
            points = await _collect_points(db, user_id, since)
            trajectory = compute_trajectory(points)
            if trajectory["direction"] != "worsening":
                continue

            profile_row = (
                await db.execute(
                    select(UserScreeningProfile).where(
                        UserScreeningProfile.user_id == user_id
                    )
                )
            ).scalar_one_or_none()

            existing_trend: Optional[Dict[str, Any]] = None
            if profile_row is not None and profile_row.profile_data:
                existing_trend = profile_row.profile_data.get("trend")

            summary["deteriorating"] += 1
            should_alert = alert and not _has_recent_alert(existing_trend)

            now_iso = now.isoformat()
            trend_record = {
                "direction": trajectory["direction"],
                "delta": trajectory["delta"],
                "slope_per_week": trajectory["slope_per_week"],
                "points": trajectory["n"],
                "window_days": window_days,
                "basis": "conversation_risk_assessments+formal_instruments",
                "computed_at": now_iso,
            }
            if should_alert:
                trend_record["last_alerted_at"] = now_iso

            if profile_row is not None:
                profile_data = dict(profile_row.profile_data or {})
                profile_data["trend"] = trend_record
                profile_data["risk_trajectory"] = "worsening"
                profile_row.profile_data = profile_data
                profile_row.updated_at = now
                if should_alert:
                    profile_row.requires_attention = True
            else:
                db.add(
                    UserScreeningProfile(
                        user_id=user_id,
                        profile_data={
                            "trend": trend_record,
                            "risk_trajectory": "worsening",
                        },
                        overall_risk="mild",
                        requires_attention=should_alert,
                    )
                )
            await db.flush()

            if not should_alert:
                continue

            summary["alerts_sent"] += 1
            if alert:
                try:
                    from app.services.event_sse_bridge import (
                        create_user_risk_counselor_alert,
                    )
                    from app.models.alerts import AlertSeverity

                    await create_user_risk_counselor_alert(
                        user_id=user_id,
                        title="Deteriorating Trend Detected",
                        message=(
                            f"Cross-conversation risk trajectory worsened over the "
                            f"last {window_days} days (Δ {trajectory['delta']:+.2f} "
                            f"levels, slope {trajectory['slope_per_week']:+.2f}/week "
                            f"over {trajectory['n']} points). Review the profile."
                        ),
                        severity=AlertSeverity.HIGH,
                        detail={"user_id": user_id, **trajectory},
                    )
                except Exception as exc:
                    logger.error(
                        "trajectory counselor alert failed for user %s: %s",
                        user_id,
                        exc,
                        exc_info=True,
                    )

            if await _send_proactive_checkin(db, user_id):
                summary["checkins_sent"] += 1

        except Exception as exc:
            logger.error(
                "trajectory detection failed for user %s: %s", user_id, exc, exc_info=True
            )
            continue

    logger.info("Trajectory detection summary: %s", summary)
    return summary
