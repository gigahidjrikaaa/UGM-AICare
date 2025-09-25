"""Intervention campaign and automation models."""

from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from datetime import datetime

if TYPE_CHECKING:
    from .user import User

class InterventionCampaign(Base):
    """Automated intervention campaigns."""
    __tablename__ = "intervention_campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    target_criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    target_audience_size: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[str] = mapped_column(String(50), default="medium")
    status: Mapped[str] = mapped_column(String(50), default="created", index=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    executions_delivered: Mapped[int] = mapped_column(Integer, default=0)
    executions_failed: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    executions: Mapped[List["CampaignExecution"]] = relationship("CampaignExecution", back_populates="campaign", cascade="all, delete-orphan")

class CampaignExecution(Base):
    """Individual campaign execution records."""
    __tablename__ = "campaign_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, ForeignKey("intervention_campaigns.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    status: Mapped[str] = mapped_column(String(50), default="scheduled", index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivery_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    engagement_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    trigger_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    campaign: Mapped["InterventionCampaign"] = relationship("InterventionCampaign", back_populates="executions")
    user: Mapped["User"] = relationship("User")

class InterventionAgentSettings(Base):
    """Settings for automated intervention agent."""
    __tablename__ = "intervention_agent_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    auto_mode_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    human_review_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    risk_score_threshold: Mapped[float] = mapped_column(Float, default=0.7, nullable=False)
    daily_send_limit: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    channels_enabled: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    escalation_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    office_hours_start: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    office_hours_end: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    manual_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    updated_by_user: Mapped[Optional["User"]] = relationship("User")