"""User authentication and profile models."""

from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Date, Float, Text, func
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from datetime import datetime

if TYPE_CHECKING:
    from .appointments import Appointment, Counselor
    from .conversations import Conversation
    from .journal import JournalEntry
    from .social import UserBadge

class User(Base):
    """User model for authentication and profile management."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    google_sub: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    twitter_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    ocid_username: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    telegram_username: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    university: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    major: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    year_of_study: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    wallet_address: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    role: Mapped[str] = mapped_column(String, default="user", nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    password_reset_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    allow_email_checkins: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_checkin_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    checkin_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Extended profile fields
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    preferred_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    pronouns: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    check_in_code: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)

    # NOTE: Legacy denormalized PII/PHI columns (emergency_contact_*, risk_level,
    # clinical_summary, therapy_*, preferred_language, accessibility_needs, etc.)
    # were removed — the normalized tables (user_profiles, user_clinical_records,
    # user_preferences, user_emergency_contacts) are the single source of truth.
    # Consent booleans below are a current-state cache; the append-only
    # user_consent_ledger records the full grant/withdrawal history.

    # Consent fields (current-state cache; history lives in user_consent_ledger)
    consent_data_sharing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_research: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_emergency_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_marketing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_ai_memory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # JWT revocation: embedded as the "tv" claim; incrementing it (password
    # reset) invalidates every token issued before the change.
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Opt-in for Aika-initiated proactive chat messages (default OFF —
    # Aika speaking first requires explicit consent; history in ledger as
    # consent_type='proactive_chat').
    consent_proactive_chat: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships - use string references to avoid circular imports
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user")
    journal_entries: Mapped[List["JournalEntry"]] = relationship("JournalEntry", back_populates="user")
    awarded_badges: Mapped[List["UserBadge"]] = relationship("UserBadge", back_populates="user")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="user")
    counselor_profile: Mapped[Optional["Counselor"]] = relationship(
        "Counselor", 
        back_populates="user", 
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    # Normalized table relationships (Phase 1 - Nov 2025)
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        lazy="joined",  # Eager load for common access
        cascade="all, delete-orphan"
    )
    clinical_record: Mapped[Optional["UserClinicalRecord"]] = relationship(
        "UserClinicalRecord",
        back_populates="user",
        foreign_keys="[UserClinicalRecord.user_id]",  # Specify primary FK (not updated_by, etc.)
        uselist=False,
        lazy="selectin",  # Load separately (less common, restricted access)
        cascade="all, delete-orphan"
    )
    preferences: Mapped[Optional["UserPreferences"]] = relationship(
        "UserPreferences",
        back_populates="user",
        uselist=False,
        lazy="joined",  # Eager load for common access
        cascade="all, delete-orphan"
    )
    emergency_contacts: Mapped[List["UserEmergencyContact"]] = relationship(
        "UserEmergencyContact",
        back_populates="user",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    consent_ledger: Mapped[List["UserConsentLedger"]] = relationship(
        "UserConsentLedger",
        back_populates="user",
        lazy="selectin",
        passive_deletes=True,  # APPEND-ONLY: never cascade-delete compliance records
    )
    audit_log: Mapped[List["UserAuditLog"]] = relationship(
        "UserAuditLog",
        back_populates="user",
        foreign_keys="[UserAuditLog.user_id]",  # Specify primary FK (not performed_by)
        lazy="noload",  # Don't load by default (only for admin/compliance)
        passive_deletes=True,  # APPEND-ONLY: never cascade-delete compliance records
    )
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        lazy="noload",  # Don't load by default
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
