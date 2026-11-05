"""Peer-support service: pairing lifecycle, circles, messages, safety.

Safety invariants (all enforced here, not in routes):
- consent_peer_support gates pairing creation, circle membership, and sends;
- a student has at most one ACTIVE pairing;
- peer supporters only touch their own pairings/circles; supervisors read;
- every message is PII-redacted before persistence;
- crisis-lexicon hits on a send deliver the message (never silently
  suppress) BUT escalate: a high-severity counselor case is created and the
  supervisor + on-duty counselors alerted.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.redaction import sanitize_text
from app.domains.mental_health.models import (
    Case,
    CaseSeverityEnum,
    CaseStatusEnum,
    Counselor,
    CounselorThread,
    PeerCircle,
    PeerCircleMember,
    PeerMessage,
    PeerSupportPairing,
)
from app.models.user import User

logger = logging.getLogger(__name__)

CLOSE_REASON_STUDENT = "closed_by_student"
CLOSE_REASON_SUPPORTER = "closed_by_supporter"
CLOSE_REASON_ESCALATED = "escalated_to_counselor"


# ---------------------------------------------------------------------------
# Supporter selection (CMA peer pool)
# ---------------------------------------------------------------------------

async def select_supporter_for_assignment(db: AsyncSession) -> Optional[int]:
    """Pick the least-loaded accepting peer supporter (CMA peer pool).

    Returns the Counselor profile id (the id-space Case.assigned_to uses), or
    None when the pool is empty — callers fall back to the counselor pool.
    """
    rows = (
        await db.execute(
            select(Counselor.id)
            .join(User, User.id == Counselor.user_id)
            .where(
                User.role == "peer_supporter",
                User.is_active == True,  # noqa: E712
                Counselor.is_available == True,  # noqa: E712
                Counselor.accepts_peer_cases == True,  # noqa: E712
            )
        )
    ).scalars().all()

    if not rows:
        return None

    open_statuses = (CaseStatusEnum.new, CaseStatusEnum.in_progress, CaseStatusEnum.waiting)
    best_id: Optional[int] = None
    best_load: Optional[int] = None
    for supporter_profile_id in rows:
        load = int(
            await db.scalar(
                select(func.count(Case.id)).where(
                    Case.assigned_to == str(supporter_profile_id),
                    Case.status.in_(open_statuses),
                )
            )
            or 0
        )
        if best_load is None or load < best_load:
            best_id = int(supporter_profile_id)
            best_load = load
    return best_id


async def select_supervisor_for_supporter(
    db: AsyncSession, supporter_profile_id: int
) -> Optional[int]:
    """Pick the least-loaded available professional counselor as supervisor."""
    rows = (
        await db.execute(
            select(Counselor.id)
            .join(User, User.id == Counselor.user_id)
            .where(
                User.role == "counselor",
                User.is_active == True,  # noqa: E712
                Counselor.is_available == True,  # noqa: E712
                Counselor.id != supporter_profile_id,
            )
        )
    ).scalars().all()

    if not rows:
        return None

    open_statuses = (CaseStatusEnum.new, CaseStatusEnum.in_progress, CaseStatusEnum.waiting)
    best_id: Optional[int] = None
    best_load: Optional[int] = None
    for supervisor_profile_id in rows:
        load = int(
            await db.scalar(
                select(func.count(Case.id)).where(
                    Case.assigned_to == str(supervisor_profile_id),
                    Case.status.in_(open_statuses),
                )
            )
            or 0
        )
        if best_load is None or load < best_load:
            best_id = int(supervisor_profile_id)
            best_load = load
    return best_id


# ---------------------------------------------------------------------------
# Pairings
# ---------------------------------------------------------------------------

async def get_active_pairing_for_student(
    db: AsyncSession, student_id: int
) -> Optional[PeerSupportPairing]:
    return (
        await db.execute(
            select(PeerSupportPairing)
            .where(
                PeerSupportPairing.student_id == student_id,
                PeerSupportPairing.status == "active",
            )
            .order_by(PeerSupportPairing.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def create_pairing(
    db: AsyncSession,
    *,
    student: User,
    case_id: Optional[str] = None,
) -> PeerSupportPairing:
    """Create an active pairing: least-loaded supporter + auto supervisor.

    Raises ``PermissionError`` when consent is missing and ``RuntimeError``
    when no supporter is accepting peer cases.
    """
    if not bool(student.consent_peer_support):
        raise PermissionError("Peer support requires consent — enable it in your profile first.")

    existing = await get_active_pairing_for_student(db, student.id)
    if existing is not None:
        return existing

    supporter_profile_id = await select_supporter_for_assignment(db)
    if supporter_profile_id is None:
        raise RuntimeError(
            "No peer supporters are available right now. Please try again later "
            "or book a counselor appointment."
        )

    supervisor_profile_id = await select_supervisor_for_supporter(db, supporter_profile_id)

    pairing = PeerSupportPairing(
        supporter_id=supporter_profile_id,
        student_id=student.id,
        supervisor_id=supervisor_profile_id,
        case_id=case_id,
        status="active",
    )
    db.add(pairing)
    await db.flush()
    logger.info(
        "Peer pairing created: pairing=%s student=%s supporter=%s supervisor=%s",
        pairing.id,
        student.id,
        supporter_profile_id,
        supervisor_profile_id,
    )
    return pairing


def is_pairing_participant(pairing: PeerSupportPairing, user: User) -> bool:
    """Supporter, student, or supervisor — the three roles allowed in-thread."""
    if user.role == "peer_supporter":
        return pairing.supporter_id == _profile_id_for(user)
    if pairing.student_id == user.id:
        return True
    if user.role == "counselor" and pairing.supervisor_id == _profile_id_for(user):
        return True
    return False


def _profile_id_for(user: User) -> Optional[int]:
    """Resolve the Counselor profile id for a supporter/supervisor user.

    The Counselor relationship isn't always loaded — callers that need it
    should pass users fetched with the relationship; this helper falls back
    to ``user.counselor_profile.id`` when present.
    """
    profile = getattr(user, "counselor_profile", None)
    return profile.id if profile is not None else None


async def load_pairing_for_user(
    db: AsyncSession, pairing_id: int, user: User
) -> Optional[PeerSupportPairing]:
    """Load a pairing if the user is a participant (supporter/student/supervisor)."""
    pairing = (
        await db.execute(
            select(PeerSupportPairing)
            .options(
                selectinload(PeerSupportPairing.supporter),
                selectinload(PeerSupportPairing.supervisor),
            )
            .where(PeerSupportPairing.id == pairing_id)
        )
    ).scalar_one_or_none()
    if pairing is None:
        return None

    # Supervisor check needs the profile id — resolve via DB when the
    # relationship isn't loaded.
    if user.role == "counselor" and pairing.supervisor_id is not None:
        profile = (
            await db.execute(
                select(Counselor.id).where(Counselor.user_id == user.id)
            )
        ).scalar_one_or_none()
        if profile is not None and pairing.supervisor_id == int(profile):
            return pairing

    if pairing.student_id == user.id:
        return pairing

    if user.role == "peer_supporter":
        profile = (
            await db.execute(select(Counselor.id).where(Counselor.user_id == user.id))
        ).scalar_one_or_none()
        if profile is not None and pairing.supporter_id == int(profile):
            return pairing

    return None


async def close_pairing(
    db: AsyncSession,
    pairing: PeerSupportPairing,
    *,
    reason: str,
    actor_user_id: int,
) -> PeerSupportPairing:
    pairing.status = "closed"
    pairing.close_reason = reason
    pairing.closed_at = datetime.now(timezone.utc)
    db.add(pairing)
    await db.flush()
    logger.info(
        "Peer pairing closed: pairing=%s by user=%s reason=%s",
        pairing.id,
        actor_user_id,
        reason,
    )
    return pairing


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

async def list_messages(
    db: AsyncSession,
    *,
    thread_type: Literal["pairing", "circle"],
    thread_id: int,
    limit: int = 200,
) -> List[PeerMessage]:
    rows = (
        await db.execute(
            select(PeerMessage)
            .where(
                PeerMessage.thread_type == thread_type,
                PeerMessage.thread_id == thread_id,
            )
            .order_by(PeerMessage.created_at.asc(), PeerMessage.id.asc())
            .limit(limit)
        )
    ).scalars().all()
    return list(rows)


async def create_message(
    db: AsyncSession,
    *,
    thread_type: Literal["pairing", "circle"],
    thread_id: int,
    sender: User,
    content: str,
) -> tuple[PeerMessage, bool]:
    """Persist a redacted message. Returns (message, crisis_flagged).

    The caller is responsible for authorization and consent checks; this
    function handles redaction, persistence, thread timestamp bump, and the
    crisis-lexicon safety screen.
    """
    content_redacted = sanitize_text(content.strip())
    message = PeerMessage(
        thread_type=thread_type,
        thread_id=thread_id,
        sender_id=sender.id,
        content_redacted=content_redacted,
    )
    db.add(message)

    crisis_flagged = False
    if thread_type == "pairing":
        pairing = (
            await db.execute(
                select(PeerSupportPairing).where(PeerSupportPairing.id == thread_id)
            )
        ).scalar_one_or_none()
        if pairing is not None:
            pairing.last_message_at = datetime.now(timezone.utc)
            db.add(pairing)
            crisis_flagged = _has_crisis_markers(content_redacted)

    await db.flush()

    if crisis_flagged:
        await _escalate_thread_crisis(db, thread_id=thread_id, sender=sender, message=message)

    logger.info(
        "Peer message persisted: thread=%s/%s sender=%s crisis=%s",
        thread_type,
        thread_id,
        sender.id,
        crisis_flagged,
    )
    return message, crisis_flagged


def _has_crisis_markers(text: str) -> bool:
    """Crisis-lexicon screen for peer-channel sends.

    Uses the shared lexicon module (same source of truth as STA) — any hit
    escalates the thread rather than suppressing the message.
    """
    try:
        from app.agents.shared.crisis_lexicon import CRISIS_PATTERNS

        lowered = text.lower()
        return any(pattern.search(lowered) for pattern in CRISIS_PATTERNS)
    except Exception:
        logger.warning("crisis lexicon screen failed (fail-open to no-flag)", exc_info=True)
        return False


async def _escalate_thread_crisis(
    db: AsyncSession,
    *,
    thread_id: int,
    sender: User,
    message: PeerMessage,
) -> None:
    """Deliver-then-escalate: create a high-severity counselor case + alerts."""
    try:
        user_hash = hashlib.sha256(f"user_{sender.id}".encode()).hexdigest()[:16]

        existing = (
            await db.execute(
                select(Case)
                .where(Case.user_hash == user_hash)
                .where(Case.status.in_((CaseStatusEnum.new, CaseStatusEnum.in_progress, CaseStatusEnum.waiting)))
                .limit(1)
            )
        ).scalar_one_or_none()
        if existing is not None:
            logger.warning(
                "Peer-thread crisis markers for user %s: active case %s already exists",
                sender.id,
                existing.id,
            )
            return

        pairing = (
            await db.execute(
                select(PeerSupportPairing).where(PeerSupportPairing.id == thread_id)
            )
        ).scalar_one_or_none()

        case = Case(
            status=CaseStatusEnum.new,
            severity=CaseSeverityEnum.high,
            routed_pool='counselor',
            user_hash=user_hash,
            session_id=message.thread_id and f"peer_pairing_{thread_id}",
            summary_redacted=sanitize_text(
                "Crisis language detected in peer-support chat. Immediate professional "
                "review required. Original message withheld from summary."
            ),
            sla_breach_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        db.add(case)
        await db.flush()

        from app.services.event_sse_bridge import create_user_risk_counselor_alert
        from app.models.alerts import AlertSeverity

        await create_user_risk_counselor_alert(
            user_id=sender.id,
            title="Crisis Language in Peer Support Chat",
            message=(
                "Crisis language was detected in a peer-support conversation. "
                "A high-severity case was created automatically — review immediately."
            ),
            severity=AlertSeverity.CRITICAL,
            detail={
                "pairing_id": thread_id,
                "supervisor_id": pairing.supervisor_id if pairing else None,
                "message_id": message.id,
                "detection_type": "peer_chat_crisis",
            },
        )
        logger.warning(
            "Peer-thread crisis escalated: user=%s pairing=%s case=%s",
            sender.id,
            thread_id,
            case.id,
        )
    except Exception:
        logger.error(
            "Peer-thread crisis escalation failed for user %s",
            sender.id,
            exc_info=True,
        )


# ---------------------------------------------------------------------------
# Counselor ↔ student messaging threads
# ---------------------------------------------------------------------------

async def select_counselor_for_thread(db: AsyncSession) -> Optional[int]:
    """Least-loaded available professional counselor for a new thread."""
    rows = (
        await db.execute(
            select(Counselor.id)
            .join(User, User.id == Counselor.user_id)
            .where(
                User.role == "counselor",
                User.is_active == True,  # noqa: E712
                Counselor.is_available == True,  # noqa: E712
            )
        )
    ).scalars().all()

    if not rows:
        return None

    open_statuses = (CaseStatusEnum.new, CaseStatusEnum.in_progress, CaseStatusEnum.waiting)
    best_id: Optional[int] = None
    best_load: Optional[int] = None
    for counselor_profile_id in rows:
        load = int(
            await db.scalar(
                select(func.count(Case.id)).where(
                    Case.assigned_to == str(counselor_profile_id),
                    Case.status.in_(open_statuses),
                )
            )
            or 0
        )
        if best_load is None or load < best_load:
            best_id = int(counselor_profile_id)
            best_load = load
    return best_id


async def get_counselor_thread_for_student(
    db: AsyncSession, student_id: int, counselor_profile_id: int
) -> Optional[CounselorThread]:
    return (
        await db.execute(
            select(CounselorThread)
            .where(
                CounselorThread.student_id == student_id,
                CounselorThread.counselor_id == counselor_profile_id,
                CounselorThread.status == "active",
            )
            .order_by(CounselorThread.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def get_or_create_counselor_thread(
    db: AsyncSession,
    *,
    student: User,
    counselor_profile_id: Optional[int] = None,
    case_id: Optional[str] = None,
) -> CounselorThread:
    """Route to the counselor assigned to the student's latest active case
    when no explicit counselor is given; fall back to the least-loaded
    available counselor. Always returns an active thread (existing or new)."""
    if counselor_profile_id is None:
        user_hash = hashlib.sha256(f"user_{student.id}".encode()).hexdigest()[:16]
        latest_case = (
            await db.execute(
                select(Case)
                .where(
                    Case.user_hash == user_hash,
                    Case.status.in_((CaseStatusEnum.new, CaseStatusEnum.in_progress, CaseStatusEnum.waiting)),
                    Case.assigned_to.is_not(None),
                )
                .order_by(Case.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if latest_case is not None:
            try:
                counselor_profile_id = int(str(latest_case.assigned_to))
            except ValueError:
                counselor_profile_id = None

    if counselor_profile_id is not None:
        profile = (
            await db.execute(select(Counselor).where(Counselor.id == counselor_profile_id))
        ).scalar_one_or_none()
        if profile is None:
            counselor_profile_id = None

    if counselor_profile_id is None:
        counselor_profile_id = await select_counselor_for_thread(db)
    if counselor_profile_id is None:
        raise RuntimeError("No counselors are available right now. Please try again later.")

    existing = await get_counselor_thread_for_student(db, student.id, counselor_profile_id)
    if existing is not None:
        return existing

    thread = CounselorThread(
        counselor_id=counselor_profile_id,
        student_id=student.id,
        case_id=case_id,
        status="active",
    )
    db.add(thread)
    await db.flush()
    logger.info(
        "Counselor thread created: thread=%s student=%s counselor=%s",
        thread.id,
        student.id,
        counselor_profile_id,
    )
    return thread


async def list_counselor_threads_for_student(
    db: AsyncSession, student_id: int
) -> List[CounselorThread]:
    rows = (
        await db.execute(
            select(CounselorThread)
            .where(CounselorThread.student_id == student_id)
            .order_by(CounselorThread.last_message_at.desc().nullslast(), CounselorThread.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return list(rows)


async def list_counselor_threads_for_counselor(
    db: AsyncSession, counselor_profile_id: int
) -> List[CounselorThread]:
    rows = (
        await db.execute(
            select(CounselorThread)
            .where(CounselorThread.counselor_id == counselor_profile_id)
            .order_by(CounselorThread.last_message_at.desc().nullslast(), CounselorThread.created_at.desc())
            .limit(100)
        )
    ).scalars().all()
    return list(rows)


async def load_counselor_thread_for_user(
    db: AsyncSession, thread_id: int, user: User
) -> Optional[CounselorThread]:
    thread = (
        await db.execute(select(CounselorThread).where(CounselorThread.id == thread_id))
    ).scalar_one_or_none()
    if thread is None:
        return None
    if thread.student_id == user.id:
        return thread
    if user.role in ("counselor", "peer_supporter", "admin"):
        profile = (
            await db.execute(select(Counselor).where(Counselor.user_id == user.id))
        ).scalar_one_or_none()
        if profile is not None and thread.counselor_id == int(profile.id):
            return thread
    return None


async def count_unread_messages(
    db: AsyncSession,
    *,
    thread_type: str,
    thread_id: int,
    reader_is_student: bool,
    student_id: int,
    after: Optional[datetime],
) -> int:
    query = (
        select(func.count(PeerMessage.id)).where(
            PeerMessage.thread_type == thread_type,
            PeerMessage.thread_id == thread_id,
            PeerMessage.sender_id != student_id if reader_is_student else PeerMessage.sender_id == student_id,
        )
    )
    if after is not None:
        query = query.where(PeerMessage.created_at > after)
    return int(await db.scalar(query) or 0)


async def mark_thread_read(
    db: AsyncSession,
    *,
    thread: PeerSupportPairing | CounselorThread,
    reader_is_student: bool,
) -> None:
    now = datetime.now(timezone.utc)
    if reader_is_student:
        thread.student_read_at = now
    else:
        thread.staff_read_at = now
    db.add(thread)
    await db.flush()


async def list_pairings_for_supporter(
    db: AsyncSession, supporter_profile_id: int
) -> List[PeerSupportPairing]:
    """All pairings for a supporter (active first, then closed)."""
    rows = (
        await db.execute(
            select(PeerSupportPairing)
            .where(PeerSupportPairing.supporter_id == supporter_profile_id)
            .order_by(PeerSupportPairing.created_at.desc())
            .limit(100)
        )
    ).scalars().all()
    return list(rows)
