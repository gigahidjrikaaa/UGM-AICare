"""Chat history endpoints for the mental health domain."""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.mental_health.models import Conversation
from app.domains.mental_health.schemas.chat import ConversationHistoryItem
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Chat"])


@router.get("/history", response_model=List[ConversationHistoryItem])
async def get_chat_history(
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ConversationHistoryItem]:
    """Return persisted conversation turns for the authenticated user."""
    try:
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == current_user.id)
            .order_by(Conversation.timestamp.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        conversation_turns = result.scalars().all()

        history_items: List[Dict[str, Any]] = []
        for turn in conversation_turns:
            history_items.append(
                {
                    "role": "user",
                    "content": turn.message,
                    "timestamp": turn.timestamp,
                    "session_id": turn.session_id,
                }
            )
            history_items.append(
                {
                    "role": "assistant",
                    "content": turn.response,
                    "timestamp": turn.timestamp,
                    "session_id": turn.session_id,
                }
            )

        history_items.sort(key=lambda item: item["timestamp"], reverse=False)
        return [ConversationHistoryItem(**item) for item in history_items]

    except Exception as exc:  # pragma: no cover
        logger.error(
            "Error fetching chat history for user %s: %s",
            current_user.id,
            exc,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history") from exc


@router.get("/greeting", response_model=Dict[str, Any])
async def get_welcome_greeting(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Return Aika's personalized first chat message ("continue where you left off").

    Builds the opener from the user's most critical recent problem and/or
    their latest conversation summary. Surfaces the user's OWN data inside a
    chat THEY opened (reactive), so it does not require proactive-chat
    consent — that gate protects Aika-initiated pushes.

    Returns: {"text", "source": personalized|template|default|crisis_gentle,
    "based_on": {"risk_level", "top_concern"}}.
    """
    try:
        from app.services.welcome_back_service import build_welcome_greeting

        return await build_welcome_greeting(db, current_user)
    except Exception as exc:
        logger.error(
            "Welcome greeting failed for user %s: %s",
            current_user.id,
            exc,
            exc_info=True,
        )
        # Never break chat open: fall back to the default greeting.
        return {
            "text": "Halo! Aku Aika, asisten AI untuk kesehatan mentalmu. Bagaimana kabarmu hari ini? 💙",
            "source": "default",
            "based_on": {"risk_level": None, "top_concern": None},
        }
