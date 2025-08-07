# backend/app/models/user.py
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_sub = Column(String, unique=True, index=True, nullable=False) # Hashed version
    twitter_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, nullable=True)
    sentiment_score = Column(Float, default=0.0)
    wallet_address = Column(String, unique=True, index=True, nullable=True) # Optional EDU Chain wallet address
    
    # User role and authentication
    role = Column(String, default="user", nullable=False) # "user", "admin", "therapist"
    password_hash = Column(String, nullable=True) # For email/password authentication
    email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)
    last_login = Column(DateTime, nullable=True)

    # Streaks and activity tracking
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(Date, nullable=True) # Last date user had journal/chat activity
    allow_email_checkins = Column(Boolean, default=True, nullable=False) # Whether user wants email check-ins

    conversations = relationship("Conversation", back_populates="user") # Relationship name corrected
    journal_entries = relationship("JournalEntry", back_populates="user")
    awarded_badges = relationship("UserBadge", back_populates="user")
    appointments = relationship("Appointment", back_populates="user")

class UserSummary(Base):
    __tablename__ = "user_summaries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    summarized_session_id = Column(String, index=True, nullable=True) # Session ID for the summary
    summary_text = Column(Text, nullable=False) # The actual summary content
    timestamp = Column(DateTime, default=datetime.now, nullable=False) # When the summary was created

    user = relationship("User") # Relationship to User (optional but good practice)

class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(Integer, nullable=False, index=True) # Your internal ID for the badge type (e.g., 1 for first entry, 3 for 7-day streak)
    contract_address = Column(String, nullable=False, index=True) # Store contract address for context
    transaction_hash = Column(String, unique=True, nullable=False) # Hash of the mint transaction
    awarded_at = Column(DateTime, default=datetime.now, nullable=False)

    user = relationship("User") # Relationship back to User

    # Optional: Ensure a user can only receive each specific badge ID once
    __table_args__ = (UniqueConstraint('user_id', 'badge_id', name='_user_badge_uc'),)