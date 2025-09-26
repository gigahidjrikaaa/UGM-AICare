from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)
    eligibility = Column(JSONB, nullable=True)
    contact = Column(JSONB, nullable=True)
    url = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
