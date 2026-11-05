"""Admin-editable outbound email templates.

DB rows override the code-defined defaults in
``app/domains/mental_health/services/counselor_email_service.py``. Body text
supports the placeholders ``{counselor_name}``, ``{student_name}`` and
``{custom_message}``; the branded HTML wrapper is applied by the email
service, so templates only store the body text.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
