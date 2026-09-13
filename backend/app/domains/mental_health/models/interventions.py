"""Intervention campaign and automation models."""

from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float, Index, UniqueConstraint, func
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from datetime import datetime

if TYPE_CHECKING:
    from app.models.user import User
    from .conversations import Conversation

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

class InterventionPlanRecord(Base):
    """Stores TCA-generated intervention plans for users."""
    __tablename__ = "intervention_plan_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    conversation_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    
    # Plan metadata
    plan_title: Mapped[str] = mapped_column(String(500), nullable=False)
    risk_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # From STA (0-3)
    
    # Full plan data from TCA (JSON structure)
    plan_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Structure: {
    #   "plan_steps": [{"title": str, "description": str, "completed": bool}],
    #   "resource_cards": [{"title": str, "url": str, "description": str}],
    #   "next_check_in": {"timeframe": str, "method": str}
    # }
    
    # Progress tracking (integer counts for quick queries)
    total_steps: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_steps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Progress tracking (detailed JSON)
    completion_tracking: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # Structure: {
    #   "completed_steps": [0, 2],  # indices of completed steps
    #   "completion_percentage": 0.0,
    #   "last_updated": "2025-10-07T12:00:00Z"
    # }
    
    # Status tracking
    status: Mapped[str] = mapped_column(String(50), default="active", index=True)
    # Values: active, completed, archived, expired
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    last_viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User")
    conversation: Mapped[Optional["Conversation"]] = relationship("Conversation")


class InterventionAssignment(Base):
    """Baseline → outcome ledger for one intervention plan (JITAI Phase 2).

    One row per plan (plan-as-unit). Captures the target dimensions and their
    normalized scores at assignment, then the measured post-intervention scores
    and the derived outcome once a later screening sample arrives. This is what
    makes "did this plan help *this* student?" answerable.
    """

    __tablename__ = "intervention_assignments"
    __table_args__ = (
        UniqueConstraint("plan_id", name="uq_intervention_assignments_plan_id"),
        Index("ix_intervention_assignments_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("intervention_plan_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # What was assigned.
    intervention_key: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    primary_activity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_dimensions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    baseline_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # baseline_scores: {dimension: {"current": float, "protective": float, "net": float}}

    # Assignment + measurement timeline.
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    measure_after: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # Experiment bookkeeping (Phase 4 reuses these).
    assignment_method: Mapped[str] = mapped_column(String(32), nullable=False, default="rule")
    arm: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    experiment_key: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    policy_decision: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Outcome.
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="assigned", index=True)
    # assigned | measured | unmeasured
    measured_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    post_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    outcome: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # outcome: {dimension: {"baseline_net": float, "post_net": float, "delta": float, "direction": str}}
    outcome_label: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    # improved | unchanged | worsened
    unmeasured_reason: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User")
    plan: Mapped["InterventionPlanRecord"] = relationship("InterventionPlanRecord")


class InterventionPlanStepCompletion(Base):
    """Tracks individual step completions within intervention plans."""
    __tablename__ = "intervention_plan_step_completions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("intervention_plan_records.id"), nullable=False, index=True)
    step_index: Mapped[int] = mapped_column(Integer, nullable=False)
    step_title: Mapped[str] = mapped_column(String(500), nullable=False)
    
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)