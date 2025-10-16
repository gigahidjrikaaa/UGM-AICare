from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class CaseStatusEnum(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    waiting = "waiting"
    closed = "closed"


class CaseSeverityEnum(str, enum.Enum):
    low = "low"
    med = "med"
    high = "high"
    critical = "critical"


class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    status = Column(Enum(CaseStatusEnum, name="case_status_enum"), nullable=False)
    severity = Column(Enum(CaseSeverityEnum, name="case_severity_enum"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_hash = Column(String, nullable=False)
    session_id = Column(String, nullable=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    summary_redacted = Column(Text, nullable=True)
    sla_breach_at = Column(DateTime(timezone=True), nullable=True)
    closure_reason = Column(Text, nullable=True)

    # Relationships
    notes: Mapped[list["CaseNote"]] = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")


class CaseNote(Base):
    __tablename__ = "case_notes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    author_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="notes")
