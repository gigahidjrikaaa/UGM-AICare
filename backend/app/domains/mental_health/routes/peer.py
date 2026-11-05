"""Peer-support routes: pairings, threads (1-on-1), and moderated circles.

Auth model:
- students: authenticated users; program actions require consent_peer_support
- peer supporters / counselors: portal access via require_counselor; scoped to
  their own pairings (supporter) or supervisions (supervisor)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limiter import check_rate_limit_dependency
from app.core.redaction import sanitize_text
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.mental_health.models import (
    Counselor,
    PeerCircle,
    PeerCircleMember,
    PeerMessage,
    PeerSupportPairing,
)
from app.models.user import User
from app.domains.mental_health.services import peer_support_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/peer", tags=["Peer Support"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PairingRequest(BaseModel):
    case_id: Optional[str] = Field(None, description="Triggering case, if any")


class SupporterOut(BaseModel):
    profile_id: int
    name: str
    peer_bio: Optional[str] = None


class PairingOut(BaseModel):
    id: int
    status: str
    created_at: datetime
    supporter: Optional[SupporterOut] = None
    student_hashed: Optional[str] = None
    case_id: Optional[str] = None
    close_reason: Optional[str] = None


class PairingRequestResponse(BaseModel):
    pairing: PairingOut


class MessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    sender_role: Optional[str] = None
    content: str
    created_at: datetime
    crisis_flagged: bool = False


class CircleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    is_member: bool = False
    member_count: int = 0


class PeerConsentResponse(BaseModel):
    consent_peer_support: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _supporter_profile_for(db: AsyncSession, user: User) -> Optional[Counselor]:
    return (
        await db.execute(select(Counselor).where(Counselor.user_id == user.id))
    ).scalar_one_or_none()


async def _require_consent(user: User) -> None:
    if not bool(getattr(user, "consent_peer_support", False)):
        raise HTTPException(
            status_code=403,
            detail="Peer support requires consent — enable it in your profile first.",
        )


async def _serialize_pairing(
    db: AsyncSession, pairing: PeerSupportPairing, viewer: User
) -> PairingOut:
    supporter = (
        await db.execute(select(Counselor).where(Counselor.id == pairing.supporter_id))
    ).scalar_one_or_none()
    supporter_out = (
        SupporterOut(
            profile_id=supporter.id,
            name=supporter.name,
            peer_bio=supporter.peer_bio,
        )
        if supporter
        else None
    )

    from hashlib import sha256

    student_hashed = (
        sha256(f"peer_{pairing.student_id}".encode()).hexdigest()[:12]
        if viewer.role in ("counselor", "peer_supporter")
        else None
    )
    return PairingOut(
        id=pairing.id,
        status=pairing.status,
        created_at=pairing.created_at,
        supporter=supporter_out,
        student_hashed=student_hashed,
        case_id=pairing.case_id,
        close_reason=pairing.close_reason,
    )


def _serialize_message(msg: PeerMessage, viewer_id: int) -> MessageOut:
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_role=None,
        content=msg.content_redacted,
        created_at=msg.created_at,
        crisis_flagged=False,
    )


async def _broadcast_peer_message(
    *,
    thread_type: str,
    thread_id: int,
    recipient_user_ids: List[int],
    message: PeerMessage,
) -> None:
    try:
        from app.services.sse_broadcaster import get_broadcaster

        payload = {
            "thread_type": thread_type,
            "thread_id": thread_id,
            "message_id": message.id,
            "sender_id": message.sender_id,
            "content": message.content_redacted,
            "created_at": message.created_at.isoformat() if message.created_at else None,
        }
        for user_id in recipient_user_ids:
            await get_broadcaster().broadcast("peer_message", payload, user_id=user_id)
    except Exception:
        logger.warning("peer_message SSE broadcast failed (row persisted)", exc_info=True)


# ---------------------------------------------------------------------------
# Student endpoints
# ---------------------------------------------------------------------------

@router.post("/requests", response_model=PairingRequestResponse,
             dependencies=[Depends(check_rate_limit_dependency)])
async def request_peer_support(
    payload: PairingRequest | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Request peer support: creates (or returns) the active pairing."""
    await _require_consent(current_user)
    case_id = payload.case_id if payload else None
    try:
        pairing = await peer_support_service.create_pairing(
            db, student=current_user, case_id=case_id
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    await db.commit()
    return PairingRequestResponse(pairing=await _serialize_pairing(db, pairing, current_user))


@router.get("/me", response_model=Optional[PairingRequestResponse])
async def get_my_pairing(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    pairing = await peer_support_service.get_active_pairing_for_student(db, current_user.id)
    if pairing is None:
        return None
    return PairingRequestResponse(pairing=await _serialize_pairing(db, pairing, current_user))


@router.get("/consent", response_model=PeerConsentResponse)
async def get_peer_consent(
    current_user: User = Depends(get_current_active_user),
):
    return PeerConsentResponse(
        consent_peer_support=bool(getattr(current_user, "consent_peer_support", False))
    )


@router.put("/consent", response_model=PeerConsentResponse)
async def set_peer_consent(
    granted: bool = Query(..., alias="granted"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    from app.models import UserConsentLedger

    current_user.consent_peer_support = granted
    db.add(current_user)
    db.add(
        UserConsentLedger(
            user_id=current_user.id,
            consent_type="peer_support",
            granted=granted,
            consent_version="v1.0",
            consent_language="id",
            consent_method="peer_support_page",
            timestamp=datetime.now(timezone.utc),
        )
    )
    await db.commit()
    return PeerConsentResponse(consent_peer_support=granted)


# ---------------------------------------------------------------------------
# Threads (pairing messages)
# ---------------------------------------------------------------------------

async def _load_pairing_or_404(
    pairing_id: int, current_user: User, db: AsyncSession
) -> PeerSupportPairing:
    pairing = await peer_support_service.load_pairing_for_user(
        db, pairing_id, current_user
    )
    if pairing is None:
        raise HTTPException(status_code=404, detail="Pairing not found")
    return pairing


async def _pairing_recipients(
    db: AsyncSession, pairing: PeerSupportPairing, sender: User
) -> List[int]:
    """All participant user_ids except the sender."""
    recipients: List[int] = []
    if pairing.student_id != sender.id:
        recipients.append(pairing.student_id)
    for profile_id in (pairing.supporter_id, pairing.supervisor_id):
        if profile_id is None:
            continue
        profile = (
            await db.execute(select(Counselor).where(Counselor.id == profile_id))
        ).scalar_one_or_none()
        if profile and profile.user_id and profile.user_id != sender.id:
            recipients.append(int(profile.user_id))
    return recipients


@router.get("/threads/pairing/{pairing_id}/messages", response_model=List[MessageOut])
async def get_pairing_messages(
    pairing_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    pairing = await _load_pairing_or_404(pairing_id, current_user, db)
    rows = await peer_support_service.list_messages(
        db, thread_type="pairing", thread_id=pairing.id
    )
    return [_serialize_message(m, current_user.id) for m in rows]


@router.post("/threads/pairing/{pairing_id}/messages", response_model=MessageOut,
             dependencies=[Depends(check_rate_limit_dependency)])
async def send_pairing_message(
    pairing_id: int,
    payload: MessageIn,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    pairing = await _load_pairing_or_404(pairing_id, current_user, db)
    if pairing.status != "active":
        raise HTTPException(status_code=409, detail="This pairing is closed")

    # Students need consent to keep sending; supporters/supervisors act in
    # their professional capacity.
    if pairing.student_id == current_user.id:
        await _require_consent(current_user)

    message, crisis_flagged = await peer_support_service.create_message(
        db,
        thread_type="pairing",
        thread_id=pairing.id,
        sender=current_user,
        content=payload.content,
    )
    await db.commit()

    out = _serialize_message(message, current_user.id)
    out.crisis_flagged = crisis_flagged

    recipients = await _pairing_recipients(db, pairing, current_user)
    await _broadcast_peer_message(
        thread_type="pairing",
        thread_id=pairing.id,
        recipient_user_ids=recipients,
        message=message,
    )
    return out


@router.post("/threads/pairing/{pairing_id}/close", response_model=PairingRequestResponse)
async def close_pairing(
    pairing_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    pairing = await _load_pairing_or_404(pairing_id, current_user, db)
    if pairing.student_id != current_user.id and current_user.role != "peer_supporter":
        raise HTTPException(status_code=403, detail="Only the student or supporter can close")
    reason = (
        peer_support_service.CLOSE_REASON_STUDENT
        if pairing.student_id == current_user.id
        else peer_support_service.CLOSE_REASON_SUPPORTER
    )
    await peer_support_service.close_pairing(
        db, pairing, reason=reason, actor_user_id=current_user.id
    )
    await db.commit()
    return PairingRequestResponse(pairing=await _serialize_pairing(db, pairing, current_user))


# ---------------------------------------------------------------------------
# Supporter / supervisor endpoints (counselor-portal role)
# ---------------------------------------------------------------------------

@router.get("/assignments", response_model=List[PairingOut])
async def list_my_assignments(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    if current_user.role == "peer_supporter":
        profile = await _supporter_profile_for(db, current_user)
        if profile is None:
            return []
        rows = (
            await db.execute(
                select(PeerSupportPairing)
                .where(PeerSupportPairing.supporter_id == profile.id)
                .order_by(PeerSupportPairing.created_at.desc())
                .limit(100)
            )
        ).scalars().all()
    elif current_user.role in ("counselor", "admin"):
        profile = await _supporter_profile_for(db, current_user)
        if profile is None:
            return []
        rows = (
            await db.execute(
                select(PeerSupportPairing)
                .where(PeerSupportPairing.supervisor_id == profile.id)
                .order_by(PeerSupportPairing.created_at.desc())
                .limit(100)
            )
        ).scalars().all()
    else:
        raise HTTPException(status_code=403, detail="Supporter access required")

    return [await _serialize_pairing(db, row, current_user) for row in rows]


@router.get("/supervision", response_model=List[PairingOut])
async def list_supervised_pairings(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Pairings the counselor supervises (read-only oversight)."""
    if current_user.role not in ("counselor", "admin"):
        raise HTTPException(status_code=403, detail="Counselor access required")
    profile = await _supporter_profile_for(db, current_user)
    if profile is None:
        return []
    rows = (
        await db.execute(
            select(PeerSupportPairing)
            .where(PeerSupportPairing.supervisor_id == profile.id)
            .order_by(PeerSupportPairing.created_at.desc())
            .limit(100)
        )
    ).scalars().all()
    return [await _serialize_pairing(db, row, current_user) for row in rows]


@router.post("/threads/pairing/{pairing_id}/escalate", response_model=PairingRequestResponse)
async def escalate_pairing(
    pairing_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Supporter hands the case up: closes the pairing and alerts supervisors."""
    if current_user.role != "peer_supporter":
        raise HTTPException(status_code=403, detail="Supporter access required")
    pairing = await _load_pairing_or_404(pairing_id, current_user, db)
    await peer_support_service.close_pairing(
        db,
        pairing,
        reason=peer_support_service.CLOSE_REASON_ESCALATED,
        actor_user_id=current_user.id,
    )
    await db.commit()

    from app.services.event_sse_bridge import create_user_risk_counselor_alert
    from app.models.alerts import AlertSeverity

    await create_user_risk_counselor_alert(
        user_id=pairing.student_id,
        title="Peer Support Escalation",
        message=(
            "A peer supporter escalated their support pairing — the situation "
            "needs professional review."
        ),
        severity=AlertSeverity.HIGH,
        detail={"pairing_id": pairing.id, "detection_type": "peer_escalation"},
    )
    return PairingRequestResponse(pairing=await _serialize_pairing(db, pairing, current_user))


# ---------------------------------------------------------------------------
# Circles
# ---------------------------------------------------------------------------

async def _circle_or_404(db: AsyncSession, circle_id: int) -> PeerCircle:
    circle = (
        await db.execute(
            select(PeerCircle).where(PeerCircle.id == circle_id, PeerCircle.is_active == True)  # noqa: E712
        )
    ).scalar_one_or_none()
    if circle is None:
        raise HTTPException(status_code=404, detail="Circle not found")
    return circle


async def _circle_member_ids(db: AsyncSession, circle_id: int) -> List[int]:
    rows = (
        await db.execute(
            select(PeerCircleMember.user_id).where(PeerCircleMember.circle_id == circle_id)
        )
    ).scalars().all()
    return [int(uid) for uid in rows]


async def _circle_context(db: AsyncSession, circle: PeerCircle, user: User):
    member_ids = await _circle_member_ids(db, circle.id)
    moderator_profile = (
        await db.execute(select(Counselor).where(Counselor.user_id == circle.moderator_id))
    ).scalar_one_or_none()
    is_moderator = circle.moderator_id == user.id
    supervisor_profile_id = circle.supervisor_id
    supervisor_profile = (
        await db.execute(select(Counselor).where(Counselor.id == supervisor_profile_id))
    ).scalar_one_or_none()
    is_supervisor = (
        user.role == "counselor"
        and supervisor_profile is not None
        and supervisor_profile.user_id == user.id
    )
    return member_ids, is_moderator, is_supervisor


@router.get("/circles", response_model=List[CircleOut])
async def list_circles(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    circles = (
        await db.execute(
            select(PeerCircle).where(PeerCircle.is_active == True).order_by(PeerCircle.id.asc())  # noqa: E712
        )
    ).scalars().all()

    out: List[CircleOut] = []
    for circle in circles:
        member_ids = await _circle_member_ids(db, circle.id)
        out.append(
            CircleOut(
                id=circle.id,
                name=circle.name,
                description=circle.description,
                is_active=circle.is_active,
                is_member=current_user.id in member_ids,
                member_count=len(member_ids),
            )
        )
    return out


@router.post("/circles/{circle_id}/join", response_model=CircleOut)
async def join_circle(
    circle_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    await _require_consent(current_user)
    circle = await _circle_or_404(db, circle_id)
    member_ids = await _circle_member_ids(db, circle.id)
    if current_user.id not in member_ids:
        db.add(PeerCircleMember(circle_id=circle.id, user_id=current_user.id))
        await db.commit()
    member_ids = await _circle_member_ids(db, circle.id)
    return CircleOut(
        id=circle.id,
        name=circle.name,
        description=circle.description,
        is_active=circle.is_active,
        is_member=True,
        member_count=len(member_ids),
    )


@router.post("/circles/{circle_id}/leave", response_model=CircleOut)
async def leave_circle(
    circle_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    circle = await _circle_or_404(db, circle_id)
    membership = (
        await db.execute(
            select(PeerCircleMember).where(
                PeerCircleMember.circle_id == circle.id,
                PeerCircleMember.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if membership is not None:
        await db.delete(membership)
        await db.commit()
    member_ids = await _circle_member_ids(db, circle.id)
    return CircleOut(
        id=circle.id,
        name=circle.name,
        description=circle.description,
        is_active=circle.is_active,
        is_member=False,
        member_count=len(member_ids),
    )


async def _require_circle_access(
    db: AsyncSession, circle_id: int, current_user: User
) -> tuple[PeerCircle, List[int]]:
    """Moderator, member, or counselor-supervisor — else 404 (no enumeration)."""
    circle = await _circle_or_404(db, circle_id)
    member_ids, is_moderator, is_supervisor = await _circle_context(db, circle, current_user)
    if not (is_moderator or is_supervisor or current_user.id in member_ids):
        raise HTTPException(status_code=404, detail="Circle not found")
    return circle, member_ids


@router.get("/circles/{circle_id}/messages", response_model=List[MessageOut])
async def get_circle_messages(
    circle_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    circle, _ = await _require_circle_access(db, circle_id, current_user)
    rows = await peer_support_service.list_messages(
        db, thread_type="circle", thread_id=circle.id
    )
    return [_serialize_message(m, current_user.id) for m in rows]


@router.post("/circles/{circle_id}/messages", response_model=MessageOut,
             dependencies=[Depends(check_rate_limit_dependency)])
async def send_circle_message(
    circle_id: int,
    payload: MessageIn,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    await _require_consent(current_user)
    circle, member_ids = await _require_circle_access(db, circle_id, current_user)

    message, _crisis = await peer_support_service.create_message(
        db,
        thread_type="circle",
        thread_id=circle.id,
        sender=current_user,
        content=payload.content,
    )
    await db.commit()

    recipients = [uid for uid in member_ids if uid != current_user.id]
    if circle.moderator_id != current_user.id:
        recipients.append(circle.moderator_id)
    await _broadcast_peer_message(
        thread_type="circle",
        thread_id=circle.id,
        recipient_user_ids=recipients,
        message=message,
    )
    return _serialize_message(message, current_user.id)


# ---------------------------------------------------------------------------
