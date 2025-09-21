"""Pydantic models for admin user endpoints."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


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
    avatar_url: Optional[str] = None
    check_in_code: Optional[str] = None

    # Aggregated counts
    total_journal_entries: int
    total_conversations: int
    total_badges: int
    total_appointments: int
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


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
    avatar_url: Optional[str] = None
    check_in_code: Optional[str] = None
    preferred_name: Optional[str] = None
    pronouns: Optional[str] = None
    alternate_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_email: Optional[str] = None
    risk_level: Optional[str] = None
    clinical_summary: Optional[str] = None
    primary_concerns: Optional[str] = None
    safety_plan_notes: Optional[str] = None
    current_therapist_name: Optional[str] = None
    current_therapist_contact: Optional[str] = None
    therapy_modality: Optional[str] = None
    therapy_frequency: Optional[str] = None
    therapy_notes: Optional[str] = None
    consent_data_sharing: Optional[bool] = None
    consent_research: Optional[bool] = None
    consent_emergency_contact: Optional[bool] = None
    consent_marketing: Optional[bool] = None
    preferred_language: Optional[str] = None
    preferred_timezone: Optional[str] = None
    accessibility_needs: Optional[str] = None
    communication_preferences: Optional[str] = None
    interface_preferences: Optional[str] = None
    aicare_team_notes: Optional[str] = None

    journal_entries: List[Dict[str, Any]]
    recent_conversations: List[Dict[str, Any]]
    badges: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True)
