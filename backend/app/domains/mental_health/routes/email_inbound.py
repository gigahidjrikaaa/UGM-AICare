"""Inbound email webhook — the receiving half of two-way counselor email.

A provider (SendGrid Inbound Parse, Mailgun Routes, or a self-hosted IMAP
bridge) POSTs a JSON payload here with a shared secret header. The reply
address carries a per-thread HMAC token that is verified before anything is
stored, so forged or mismatched addresses are rejected without a DB lookup.

Accepted payload (generic JSON; adapt your provider's parse hook to this):
{
  "from_email": "student@ugm.ac.id",
  "to_email":   "reply+12.abcdef0123456789@replies.ugm-aicare.com",
  "subject":    "Re: ...",
  "text":       "plain-text body"
}

The message lands in the counselor↔student counseling thread (persisted
redacted), the counselor is notified via SSE, and crisis language triggers
the same warning path as in-app sends.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.shared.crisis_lexicon import has_crisis_signal
from app.core.redaction import sanitize_text
from app.core.settings import settings
from app.database import get_async_db
from app.domains.mental_health.models import (
    Counselor,
    CounselorThread,
    PeerMessage,
)
from app.domains.mental_health.services.counselor_email_service import (
    verify_reply_address,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["Email Inbound"])


class InboundEmailPayload(BaseModel):
    from_email: str
    to_email: str
    subject: Optional[str] = None
    text: str = ""


@router.post("/inbound")
async def receive_inbound_email(
    payload: InboundEmailPayload,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    x_inbound_secret: str = Header(default=""),
):
    """Store a student's email reply into their counseling thread."""
    expected = settings.inbound_email_webhook_secret
    if not expected:
        raise HTTPException(status_code=404, detail="Inbound email is not configured")
    if x_inbound_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    thread_id = verify_reply_address(payload.to_email)
    if thread_id is None:
        raise HTTPException(status_code=422, detail="Reply address not recognized")

    from app.models.user import User

    thread = (
        await db.execute(
            select(CounselorThread).where(CounselorThread.id == thread_id)
        )
    ).scalar_one_or_none()
    if thread is None or thread.status != "active":
        raise HTTPException(status_code=404, detail="Thread not found or closed")

    student = (
        await db.execute(select(User).where(User.id == thread.student_id))
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Thread student not found")

    content, _redaction_meta = sanitize_text(payload.text.strip())
    crisis_flagged = has_crisis_signal(content)

    message = PeerMessage(
        thread_type="counseling",
        thread_id=thread.id,
        sender_id=student.id,
        content_redacted=content,
    )
    db.add(message)
    now = datetime.now(timezone.utc)
    thread.last_message_at = now
    thread.student_read_at = now
    db.add(thread)
    await db.commit()

    # Notify the counselor via the user-scoped SSE channel.
    counselor_user_id = None
    counselor_profile = (
        await db.execute(select(Counselor).where(Counselor.id == thread.counselor_id))
    ).scalar_one_or_none()
    if counselor_profile is not None:
        counselor_user_id = counselor_profile.user_id
    if counselor_user_id is not None:
        try:
            from app.services.sse_broadcaster import get_broadcaster

            await get_broadcaster().broadcast(
                "peer_message",
                {
                    "thread_type": "counseling",
                    "thread_id": thread.id,
                    "message_id": message.id,
                    "sender_id": student.id,
                    "content": message.content_redacted,
                    "created_at": message.created_at.isoformat() if message.created_at else None,
                    "via_email": True,
                },
                user_id=counselor_user_id,
            )
        except Exception:
            logger.warning("inbound email SSE broadcast failed", exc_info=True)

    if crisis_flagged:
        logger.warning(
            "Inbound email reply contains crisis language: student=%s thread=%s",
            student.id,
            thread.id,
        )

    return {"ok": True, "thread_id": thread.id, "crisis_flagged": crisis_flagged}
