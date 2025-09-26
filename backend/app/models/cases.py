from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, String, Text
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
    assigned_to = Column(String, nullable=True)
    user_hash = Column(String, nullable=False)
    session_id = Column(String, nullable=True)
    summary_redacted = Column(Text, nullable=True)
    sla_breach_at = Column(DateTime(timezone=True), nullable=True)
    closure_reason = Column(Text, nullable=True)
