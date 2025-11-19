"""Assessment and triage models."""

from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Text
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
    conversation_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    severity_level: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    risk_factors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    recommended_action: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assessment_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    conversation: Mapped["Conversation"] = relationship("Conversation")
    user: Mapped["User"] = relationship("User")


class ConversationRiskAssessment(Base):
    """Persistent record of STA conversation-level risk analyses."""

    __tablename__ = "conversation_risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    overall_risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    risk_trend: Mapped[str] = mapped_column(String(32), nullable=False)
    conversation_summary: Mapped[str] = mapped_column(Text, nullable=False)

    user_context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    protective_factors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    concerns: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    recommended_actions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    should_invoke_cma: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)

    message_count: Mapped[int] = mapped_column(Integer, nullable=False)
    conversation_duration_seconds: Mapped[float] = mapped_column(Float, nullable=True)
    analysis_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    raw_assessment: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User")