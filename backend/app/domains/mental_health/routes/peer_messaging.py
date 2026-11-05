"""Counselor ↔ student messaging routes.

Threads are 1-on-1 (student ↔ counselor). Messages reuse the polymorphic
peer_messages table with thread_type='counseling'. Crisis screening applies
to student sends; the counselor receives the message directly (they ARE the
professional) while a formal case tracks the episode.

Read receipts are thread-level timestamps (student_read_at / staff_read_at):
opening a thread marks it read; the sender's own send bumps their receipt.
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
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.mental_health.models import (
    Counselor,
    CounselorThread,
    PeerMessage,
)
from app.models.user import User
from app.domains.mental_health.services import peer_support_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/peer", tags=["Counselor Messaging"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CounselorThreadCreate(BaseModel):
    counselor_id: Optional[int] = Field(None, description="Explicit counselor; omit to auto-route")
    case_id: Optional[str] = Field(None, description="Link the thread to a case")
    subject: Optional[str] = Field(None, max_length=200)


class CounselorThreadOut(BaseModel):
    id: int
    counselor_id: int
    counselor_name: Optional[str] = None
    status: str
    subject: Optional[str] = None
    created_at: datetime
    last_message_at: Optional[datetime] = None
    unread_for_me: int = 0


class CounselorThreadListResponse(BaseModel):
    threads: List[CounselorThreadOut]
    me: Optional[int] = None


class MessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    content: str
    created_at: datetime
    crisis_flagged: bool = False


class UnreadCounts(BaseModel):
    pairing: int
    counseling: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _load_thread_or_404(
    db: AsyncSession, thread_id: int, user: User
) -> CounselorThread:
    thread = await peer_support_service.load_counselor_thread_for_user(db, thread_id, user)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


async def _serialize_thread(
    db: AsyncSession, thread: CounselorThread, *, reader_is_student: bool
) -> CounselorThreadOut:
    counselor = (
        await db.execute(select(Counselor).where(Counselor.id == thread.counselor_id))
    ).scalar_one_or_none()
    unread = await peer_support_service.count_unread_messages(
        db,
        thread_type="counseling",
        thread_id=thread.id,
        reader_is_student=reader_is_student,
        student_id=thread.student_id,
        after=thread.student_read_at if reader_is_student else thread.staff_read_at,
    )
    return CounselorThreadOut(
        id=thread.id,
        counselor_id=thread.counselor_id,
        counselor_name=counselor.name if counselor else None,
        status=thread.status,
        subject=thread.subject,
        created_at=thread.created_at,
        last_message_at=thread.last_message_at,
        unread_for_me=unread,
    )


def _serialize_message(msg: PeerMessage) -> MessageOut:
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        content=msg.content_redacted,
        created_at=msg.created_at,
    )


async def _counseling_recipients(
    db: AsyncSession, thread: CounselorThread, sender: User
) -> List[int]:
    counselor_profile = (
        await db.execute(select(Counselor).where(Counselor.id == thread.counselor_id))
    ).scalar_one_or_none()
    recipients: List[int] = []
    if counselor_profile and counselor_profile.user_id and counselor_profile.user_id != sender.id:
        recipients.append(int(counselor_profile.user_id))
    if thread.student_id != sender.id:
        recipients.append(thread.student_id)
    return recipients


async def _broadcast_counseling_message(
    *, thread_id: int, recipients: List[int], message: PeerMessage
) -> None:
    try:
        from app.services.sse_broadcaster import get_broadcaster

        payload = {
            "thread_type": "counseling",
            "thread_id": thread_id,
            "message_id": message.id,
            "sender_id": message.sender_id,
            "content": message.content_redacted,
            "created_at": message.created_at.isoformat() if message.created_at else None,
        }
        for user_id in recipients:
            await get_broadcaster().broadcast("peer_message", payload, user_id=user_id)
    except Exception:
        logger.warning("counseling SSE broadcast failed (row persisted)", exc_info=True)


# ---------------------------------------------------------------------------
# Student endpoints
# ---------------------------------------------------------------------------

@router.post("/counselor-threads", response_model=CounselorThreadOut,
             dependencies=[Depends(check_rate_limit_dependency)])
async def create_counselor_thread(
    payload: CounselorThreadCreate | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Open (or return) a direct message thread with a counselor."""
    body = payload or CounselorThreadCreate()
    try:
        thread = await peer_support_service.get_or_create_counselor_thread(
            db,
            student=current_user,
            counselor_profile_id=body.counselor_id,
            case_id=body.case_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    await db.commit()
    return await _serialize_thread(db, thread, reader_is_student=True)


@router.get("/counselor-threads", response_model=CounselorThreadListResponse)
async def list_my_counselor_threads(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    rows = await peer_support_service.list_counselor_threads_for_student(db, current_user.id)
    return CounselorThreadListResponse(
        threads=[await _serialize_thread(db, r, reader_is_student=True) for r in rows]
    )


@router.get("/unread", response_model=UnreadCounts)
async def get_my_unread_counts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Unread counts for the student dashboard (peer pairing + counselor threads)."""
    pairing_row = await peer_support_service.get_active_pairing_for_student(
        db, current_user.id
    )
    pairing_unread = 0
    if pairing_row is not None:
        pairing_unread = await peer_support_service.count_unread_messages(
            db,
            thread_type="pairing",
            thread_id=pairing_row.id,
            reader_is_student=True,
            student_id=current_user.id,
            after=pairing_row.student_read_at,
        )

    counseling_unread = 0
    for thread in await peer_support_service.list_counselor_threads_for_student(
        db, current_user.id
    ):
        if thread.status != "active":
            continue
        counseling_unread += await peer_support_service.count_unread_messages(
            db,
            thread_type="counseling",
            thread_id=thread.id,
            reader_is_student=True,
            student_id=current_user.id,
            after=thread.student_read_at,
        )
    return UnreadCounts(pairing=pairing_unread, counseling=counseling_unread)


@router.get("/threads/counseling/{thread_id}/messages", response_model=List[MessageOut])
async def get_counseling_messages(
    thread_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    thread = await _load_thread_or_404(thread_id, current_user, db)
    reader_is_student = thread.student_id == current_user.id

    # Read receipt: opening the thread marks it read.
    await peer_support_service.mark_thread_read(
        db, thread=thread, reader_is_student=reader_is_student
    )
    await db.commit()

    rows = await peer_support_service.list_messages(
        db, thread_type="counseling", thread_id=thread.id
    )
    return [_serialize_message(m) for m in rows]


@router.post("/threads/counseling/{thread_id}/messages", response_model=MessageOut,
             dependencies=[Depends(check_rate_limit_dependency)])
async def send_counseling_message(
    thread_id: int,
    payload: MessageIn,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    thread = await _load_thread_or_404(thread_id, current_user, db)
    if thread.status != "active":
        raise HTTPException(status_code=409, detail="This thread is closed")

    reader_is_student = thread.student_id == current_user.id
    message, crisis_flagged = await peer_support_service.create_message(
        db,
        thread_type="counseling",
        thread_id=thread.id,
        sender=current_user,
        content=payload.content,
    )
    now = datetime.now(timezone.utc)
    thread.last_message_at = now
    # The sender's own send bumps their receipt; the recipient reads on open.
    if reader_is_student:
        thread.student_read_at = now
    else:
        thread.staff_read_at = now
    db.add(thread)
    await db.commit()

    out = _serialize_message(message)
    out.crisis_flagged = crisis_flagged and reader_is_student

    recipients = await _counseling_recipients(db, thread, current_user)
    await _broadcast_counseling_message(
        thread_id=thread.id, recipients=recipients, message=message
    )
    return out


@router.post("/threads/counseling/{thread_id}/close")
async def close_counseling_thread(
    thread_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    thread = await _load_thread_or_404(thread_id, current_user, db)
    if thread.student_id != current_user.id and current_user.role not in ("counselor", "peer_supporter"):
        raise HTTPException(status_code=403, detail="Not a participant")
    thread.status = "closed"
    thread.closed_at = datetime.now(timezone.utc)
    db.add(thread)
    await db.commit()
    return {"ok": True, "status": "closed"}


# ---------------------------------------------------------------------------
# Counselor portal endpoints
# ---------------------------------------------------------------------------

async def _counselor_profile_or_404(db: AsyncSession, user: User) -> Counselor:
    profile = (
        await db.execute(select(Counselor).where(Counselor.user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Counselor profile not found")
    return profile


@router.get("/counselor-threads/inbox", response_model=CounselorThreadListResponse)
async def list_counselor_inbox(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    if current_user.role not in ("counselor", "admin", "peer_supporter"):
        raise HTTPException(status_code=403, detail="Counselor access required")
    profile = await _counselor_profile_or_404(db, current_user)
    rows = await peer_support_service.list_counselor_threads_for_counselor(
        db, profile.id
    )
    return CounselorThreadListResponse(
        threads=[await _serialize_thread(db, r, reader_is_student=False) for r in rows],
        me=current_user.id,
    )


@router.get("/counselor-inbox/unread", response_model=UnreadCounts)
async def get_counselor_inbox_unread(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Unread counts for the counselor portal dashboard (counseling + peer)."""
    if current_user.role not in ("counselor", "admin", "peer_supporter"):
        raise HTTPException(status_code=403, detail="Counselor access required")
    profile = await _counselor_profile_or_404(db, current_user)

    counseling_unread = 0
    for thread in await peer_support_service.list_counselor_threads_for_counselor(
        db, profile.id
    ):
        if thread.status != "active":
            continue
        counseling_unread += await peer_support_service.count_unread_messages(
            db,
            thread_type="counseling",
            thread_id=thread.id,
            reader_is_student=False,
            student_id=thread.student_id,
            after=thread.staff_read_at,
        )

    peer_unread = 0
    for pairing in await peer_support_service.list_pairings_for_supporter(db, profile.id):
        if pairing.status != "active":
            continue
        peer_unread += await peer_support_service.count_unread_messages(
            db,
            thread_type="pairing",
            thread_id=pairing.id,
            reader_is_student=False,
            student_id=pairing.student_id,
            after=pairing.staff_read_at,
        )
    return UnreadCounts(counseling=counseling_unread, pairing=peer_unread)
