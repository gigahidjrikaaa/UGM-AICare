"""Assessment and triage models."""

from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Text, Index, func
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from datetime import datetime

if TYPE_CHECKING:
    from .conversations import Conversation
    from app.models.user import User

class TriageAssessment(Base):
    """Risk assessment and triage results."""
    __tablename__ = "triage_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    severity_level: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    risk_factors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    recommended_action: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assessment_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    conversation: Mapped["Conversation"] = relationship("Conversation")
    user: Mapped["User"] = relationship("User")


class UserScreeningProfile(Base):
    """Accumulated screening profile from conversational intelligence extraction.
    
    This table stores the longitudinal mental health screening data gathered
    seamlessly during natural conversations with Aika. It enables proactive
    intervention without explicit assessment questionnaires.
    
    Key Features:
    - Tracks multiple mental health dimensions (PHQ-9, GAD-7 aligned)
    - Uses exponential decay for temporal weighting
    - Stores intervention history for follow-up
    - Enables counselor visibility into student wellbeing trends
    """

    __tablename__ = "user_screening_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    
    # Aggregated profile data (JSONB for flexible schema)
    profile_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Quick access fields for querying
    overall_risk: Mapped[str] = mapped_column(String(32), default="none", nullable=False, index=True)
    requires_attention: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    
    # Metadata
    total_messages_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_sessions_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_intervention_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationship
    user: Mapped["User"] = relationship("User")


class ConversationRiskAssessment(Base):
    """Persistent record of STA conversation-level risk analyses."""

    __tablename__ = "conversation_risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    overall_risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    risk_trend: Mapped[str] = mapped_column(String(32), nullable=False)
    conversation_summary: Mapped[str] = mapped_column(Text, nullable=False)

    user_context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    protective_factors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    concerns: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    recommended_actions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    should_invoke_cma: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)

    # Unified Affective Framework (2.5D PAD Model)
    pleasure: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    arousal: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dominance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    message_count: Mapped[int] = mapped_column(Integer, nullable=False)
    conversation_duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    analysis_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    raw_assessment: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User")


class ScreeningDimensionSample(Base):
    """Append-only longitudinal time series of screening dimension scores.

    ``user_screening_profiles`` keeps only the *latest* score per dimension, so
    pre/post comparisons ("did this intervention help?") are impossible from it
    alone. This table records one row per (user, dimension, observation) every
    time the profile updates (conversation analysis) or a self-report is
    submitted, giving a queryable series for outcome measurement (JITAI).

    ``source``:
        - ``conversation``: covert extraction from an Aika conversation
        - ``self_report``:  opt-in weekly micro-check (PHQ-2 / GAD-2)
        - ``backfill``:     historical import
    """

    __tablename__ = "screening_dimension_samples"
    __table_args__ = (
        Index("ix_screening_samples_user_dim_time", "user_id", "dimension", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dimension: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    # Normalized 0-1 scores (same scale as the covert screening engine).
    current_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    protective_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Instrument provenance (for instrument-aware comparison).
    instrument: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    raw_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    normalized_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    source: Mapped[str] = mapped_column(
        String(32), nullable=False, default="conversation", index=True
    )
    source_entity_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship("User")


class FormalScreeningSubmission(Base):
    """One administered formal instrument (PHQ-9 / GAD-7) with item responses.

    Unlike ``ScreeningDimensionSample`` (which stores only the derived score),
    this keeps the full response vector so results can be re-scored, audited,
    and shown to the user as history. ``crisis_flag`` marks a non-zero answer
    on a gateway crisis item (PHQ-9 item 9) and independently of the total
    score drives the safety response.
    """

    __tablename__ = "formal_screening_submissions"
    __table_args__ = (
        Index(
            "ix_formal_screening_user_instrument_time",
            "user_id",
            "instrument",
            "created_at",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    instrument: Mapped[str] = mapped_column(String(32), nullable=False)
    responses: Mapped[list] = mapped_column(JSON, nullable=False)

    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    normalized_score: Mapped[float] = mapped_column(Float, nullable=False)
    severity_band: Mapped[str] = mapped_column(String(32), nullable=False)
    severity_label: Mapped[str] = mapped_column(String(64), nullable=False)

    crisis_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    crisis_item_indices: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship("User")