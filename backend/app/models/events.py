from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime, Enum, Index, Integer, SmallInteger, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class AgentNameEnum(str, enum.Enum):
    STA = "STA"
    SCA = "SCA"
    SDA = "SDA"
    IA = "IA"


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ts = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    user_hash = Column(String, nullable=False, index=True)
    session_id = Column(String, nullable=True)
    agent = Column(Enum(AgentNameEnum, name="agent_name_enum"), nullable=False)
    intent = Column(String, nullable=True)
    risk_flag = Column(SmallInteger, nullable=True)
    step = Column(String, nullable=False)
    resource_id = Column(String, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    tokens_in = Column(Integer, nullable=True)
    tokens_out = Column(Integer, nullable=True)
    cost_cents = Column(Integer, nullable=True)
    outcome = Column(String, nullable=True)
    consent_scope = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint("risk_flag >= 0 AND risk_flag <= 3", name="events_risk_flag_range"),
        Index("ix_events_agent_ts", "agent", "ts"),
        Index("ix_events_intent_ts", "intent", "ts"),
        Index("ix_events_risk_flag_ts", "risk_flag", "ts"),
    )
