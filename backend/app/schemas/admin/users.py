from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class UserListItem(BaseModel):
    id: int
    email: Optional[str] = None
    google_sub: Optional[str] = None
    wallet_address: Optional[str] = None
    sentiment_score: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    allow_email_checkins: bool
    role: Optional[str] = "user"
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    # Computed fields
    total_journal_entries: int
    total_conversations: int
    total_badges: int
    total_appointments: int
    last_login: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
    }


class UserStats(BaseModel):
    total_users: int
    active_users_30d: int
    active_users_7d: int
    new_users_today: int
    avg_sentiment_score: float
    total_journal_entries: int
    total_conversations: int
    total_badges_awarded: int


class UsersResponse(BaseModel):
    users: List[UserListItem]
    total_count: int
    stats: UserStats


class UserDetailResponse(BaseModel):
    id: int
    email: Optional[str] = None
    google_sub: Optional[str] = None
    wallet_address: Optional[str] = None
    sentiment_score: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    allow_email_checkins: bool
    role: Optional[str] = "user"
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    # Detailed stats
    journal_entries: List[Dict[str, Any]]
    recent_conversations: List[Dict[str, Any]]
    badges: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]

    model_config = {
        "from_attributes": True,
    }
