"""Counselor outbound-email audit log.

One row per counselor→student email attempt. Stores WHO sent to WHOM via
which template and the outcome — message content is stored redacted (the
counselor's custom note only; the rendered brand template is not stored).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class CounselorEmailLog(Base):
    __tablename__ = "counselor_email_logs"
    __table_args__ = (
        Index("ix_counselor_emails_counselor_time", "counselor_user_id", "created_at"),
        Index("ix_counselor_emails_student_time", "student_user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    counselor_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    template_key: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message_redacted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # sent | failed
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Whether the student had allow_email_checkins / opted into email contact
    student_email_opt_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
