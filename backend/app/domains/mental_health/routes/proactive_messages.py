"""Proactive message routes — the student-facing surface for Aika-initiated
chat messages (closed-loop plan follow-ups).

Read model: `GET /proactive-messages` returns the user's `pending` messages
(including the `session_id` the chat page must adopt). Mutations: mark read /
dismiss. Everything is strictly scoped to `current_user.id`.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database import get_async_db
from app.models import (
    ProactiveMessage,
    ProactiveMessageSource,
    ProactiveMessageStatus,
)
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/proactive-messages", tags=["proactive"])


def _serialize(message: ProactiveMessage) -> Dict[str, Any]:
    source = (
        message.source.value
        if hasattr(message.source, "value")
        else str(message.source)
    )
    return {
        "id": str(message.id),
        "source": source,
        "source_entity_id": message.source_entity_id,
        "session_id": message.session_id,
        "content": message.content_redacted,
        "status": (
            message.status.value
            if hasattr(message.status, "value")
            else str(message.status)
        ),
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "delivered_at": message.delivered_at.isoformat() if message.delivered_at else None,
    }


async def _get_own_message(
    db: AsyncSession, message_id: str, user: User
) -> ProactiveMessage:
    try:
        parsed = UUID(str(message_id))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Message not found"
        )
    message = (
        await db.execute(
            select(ProactiveMessage).where(
                ProactiveMessage.id == str(parsed),
                ProactiveMessage.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Message not found"
        )
    return message


@router.get("", response_model=Dict[str, Any])
async def list_pending_proactive_messages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> Dict[str, Any]:
    """List the current user's pending (unread) proactive messages."""
    rows = (
        (
            await db.execute(
                select(ProactiveMessage)
                .where(
                    ProactiveMessage.user_id == current_user.id,
                    ProactiveMessage.status == ProactiveMessageStatus.pending,
                )
                .order_by(ProactiveMessage.delivered_at.desc())
                .limit(20)
            )
        )
        .scalars()
        .all()
    )
    return {"messages": [_serialize(m) for m in rows], "unread_count": len(rows)}


@router.post("/{message_id}/read", response_model=Dict[str, Any])
async def mark_proactive_message_read(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> Dict[str, Any]:
    """Mark a proactive message as read."""
    message = await _get_own_message(db, message_id, current_user)
    if message.status == ProactiveMessageStatus.pending:
        message.status = ProactiveMessageStatus.read
        message.read_at = datetime.now(timezone.utc)
        await db.commit()
    return {"success": True, "id": str(message.id), "status": "read"}


@router.post("/{message_id}/dismiss", response_model=Dict[str, Any])
async def dismiss_proactive_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> Dict[str, Any]:
    """Dismiss a proactive message without reading it in chat."""
    message = await _get_own_message(db, message_id, current_user)
    if message.status == ProactiveMessageStatus.pending:
        message.status = ProactiveMessageStatus.dismissed
        message.read_at = datetime.now(timezone.utc)
        await db.commit()
    return {"success": True, "id": str(message.id), "status": "dismissed"}
