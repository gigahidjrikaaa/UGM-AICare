"""Social media and gamification models."""

from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from datetime import datetime

from backend.app.models.user import User

class Tweet(Base):
    """Social media tweets for sentiment analysis."""
    __tablename__ = "tweets"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tweet_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

class UserBadge(Base):
    """User achievements and badges."""
    __tablename__ = "user_badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    contract_address: Mapped[str] = mapped_column(String, nullable=False, index=True)
    transaction_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    awarded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    user: Mapped["User"] = relationship("User")

    __table_args__ = (UniqueConstraint('user_id', 'badge_id', name='_user_badge_uc'),)