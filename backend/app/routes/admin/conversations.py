"""Conversation management endpoints for the admin panel."""
from __future__ import annotations

import logging
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import asc, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import Conversation, FlaggedSession, User
from app.schemas.admin import (
    ConversationDetailResponse,
    ConversationListItem,
    ConversationStats,
    ConversationsResponse,
    SessionDetailResponse,
    SessionListItem,
    SessionListResponse,
    SessionUser,
)
from .utils import decrypt_user_email, hash_user_id

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin - Conversations"])


@router.get("/conversations", response_model=ConversationsResponse)
async def get_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search in message or response content"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    date_from: Optional[date] = Query(None, description="Filter conversations from this date"),
    date_to: Optional[date] = Query(None, description="Filter conversations to this date"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Get paginated list of AI conversations with privacy censoring."""
    logger.info(
        "Admin %s requesting conversations list (page %s, limit %s)",
        admin_user.id,
        page,
        limit,
    )

    query = select(Conversation).order_by(desc(Conversation.timestamp))

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Conversation.message.ilike(search_term),
                Conversation.response.ilike(search_term),
            )
        )

    if session_id:
        query = query.filter(Conversation.session_id == session_id)

    if date_from:
        query = query.filter(func.date(Conversation.timestamp) >= date_from)

    if date_to:
        query = query.filter(func.date(Conversation.timestamp) <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * limit
    conversations = (
        await db.execute(query.offset(offset).limit(limit))
    ).scalars().all()

    session_counts: Dict[str, int] = {}
    last_role_map: Dict[str, str] = {}
    last_text_map: Dict[str, str] = {}

    if conversations:
        session_ids = list({conv.session_id for conv in conversations})
        session_count_query = (
            select(Conversation.session_id, func.count(Conversation.id))
            .filter(Conversation.session_id.in_(session_ids))
            .group_by(Conversation.session_id)
        )
        session_counts = {
            sid: count for sid, count in await db.execute(session_count_query)
        }

        last_subq = (
            select(
                Conversation.session_id.label("sid"),
                func.max(Conversation.timestamp).label("max_ts"),
            )
            .filter(Conversation.session_id.in_(session_ids))
            .group_by(Conversation.session_id)
            .subquery()
        )

        role_expr = case((Conversation.response.isnot(None), "assistant"), else_="user")
        last_results = await db.execute(
            select(
                Conversation.session_id,
                Conversation.message,
                Conversation.response,
                role_expr,
            ).join(
                last_subq,
                (Conversation.session_id == last_subq.c.sid)
                & (Conversation.timestamp == last_subq.c.max_ts),
            )
        )
        for sid, msg, resp, role in last_results.all():
            full_text = resp or msg or ""
            last_text_map[str(sid)] = full_text
            last_role_map[str(sid)] = role

    conversation_items = [
        ConversationListItem(
            id=conv.id,
            user_id_hash=hash_user_id(conv.user_id),
            session_id=conv.session_id,
            conversation_id=conv.conversation_id,
            message_preview=(conv.message or "")[:100],
            response_preview=(conv.response or "")[:100],
            timestamp=conv.timestamp,
            message_length=len(conv.message or ""),
            response_length=len(conv.response or ""),
            session_message_count=int(session_counts.get(conv.session_id, 1)),
            last_role=last_role_map.get(conv.session_id),
            last_text=last_text_map.get(conv.session_id),
        )
        for conv in conversations
    ]

    total_conversations = (
        await db.execute(select(func.count(Conversation.id)))
    ).scalar() or 0
    total_sessions = (
        await db.execute(select(func.count(func.distinct(Conversation.session_id))))
    ).scalar() or 0
    total_users_with_conversations = (
        await db.execute(select(func.count(func.distinct(Conversation.user_id))))
    ).scalar() or 0

    avg_stats = (
        await db.execute(
            select(
                func.avg(func.length(Conversation.message)).label("avg_message_length"),
                func.avg(func.length(Conversation.response)).label("avg_response_length"),
            )
        )
    ).first()

    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())

    conversations_today = (
        await db.execute(
            select(func.count(Conversation.id)).filter(
                func.date(Conversation.timestamp) == today
            )
        )
    ).scalar() or 0
    conversations_this_week = (
        await db.execute(
            select(func.count(Conversation.id)).filter(
                func.date(Conversation.timestamp) >= week_start
            )
        )
    ).scalar() or 0

    hour_counts = (
        await db.execute(
            select(
                func.extract("hour", Conversation.timestamp).label("hour"),
                func.count(Conversation.id),
            ).group_by("hour")
        )
    ).all()
    most_active_hour = 0
    if hour_counts:
        most_active_hour = max(hour_counts, key=lambda x: x[1])[0]

    stats = ConversationStats(
        total_conversations=total_conversations,
        total_sessions=total_sessions,
        total_users_with_conversations=total_users_with_conversations,
        avg_messages_per_session=
            round(total_conversations / total_sessions, 2) if total_sessions else 0,
        avg_message_length=round(avg_stats.avg_message_length or 0, 2),
        avg_response_length=round(avg_stats.avg_response_length or 0, 2),
        conversations_today=conversations_today,
        conversations_this_week=conversations_this_week,
        most_active_hour=int(most_active_hour),
    )

    return ConversationsResponse(
        conversations=conversation_items,
        total_count=total_count,
        stats=stats,
    )
*
