"""Pydantic models for admin conversation endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class ConversationListItem(BaseModel):
    id: int
    user_id_hash: str
    session_id: str
    conversation_id: str
    message_preview: str
    response_preview: str
    timestamp: datetime
    message_length: int
    response_length: int
    session_message_count: int
    last_role: Optional[str] = None
    last_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(BaseModel):
    id: int
    user_id_hash: str
    session_id: str
    conversation_id: str
    message: str
    response: str
    timestamp: datetime
    sentiment_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationStats(BaseModel):
    total_conversations: int
    total_sessions: int
    total_users_with_conversations: int
    avg_messages_per_session: float
    avg_message_length: float
    avg_response_length: float
    conversations_today: int
    conversations_this_week: int
    most_active_hour: int


class ConversationsResponse(BaseModel):
    conversations: List[ConversationListItem]
    total_count: int
    stats: ConversationStats


class SessionUser(BaseModel):
    id: int
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    sentiment_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class SessionDetailResponse(BaseModel):
    session_id: str
    user_id_hash: str
    user: Optional[SessionUser] = None
    conversation_count: int
    first_message_time: datetime
    last_message_time: datetime
    total_duration_minutes: float
    conversations: List[ConversationDetailResponse]
    analysis: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class SessionListItem(BaseModel):
    session_id: str
    user_id_hash: str
    message_count: int
    first_time: datetime
    last_time: datetime
    last_preview: str
    last_role: Optional[str] = None
    last_text: Optional[str] = None
    open_flag_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SessionListResponse(BaseModel):
    sessions: List[SessionListItem]
    total_count: int
