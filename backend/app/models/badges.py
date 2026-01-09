"""EDU Chain badge management models.

These tables support *admin-managed* badge templates (metadata + image CIDs)
and a durable issuance/audit log for admin-controlled minting.

Design:
- Metadata is treated as effectively immutable once published.
- Minting is recorded as an issuance row to support retries/auditing.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class BadgeTemplateStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class BadgeIssuanceStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"


if TYPE_CHECKING:
    from .user import User


class BadgeTemplate(Base):
    """Admin-managed definition for an ERC1155 badge (token id + immutable metadata)."""

    __tablename__ = "badge_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    contract_address: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    token_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # IPFS assets
    image_cid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    image_mime: Mapped[str | None] = mapped_column(String(64), nullable=True)
    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    metadata_cid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    metadata_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="DRAFT")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    issuances: Mapped[list["BadgeIssuance"]] = relationship(
        "BadgeIssuance",
        back_populates="template",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("contract_address", "token_id", name="uq_badge_templates_contract_token"),
        Index("ix_badge_templates_status", "status"),
    )


class BadgeIssuance(Base):
    """Durable log of an attempted/successful mint of a badge to a user wallet."""

    __tablename__ = "badge_issuances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    template_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("badge_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by_admin_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    wallet_address: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")

    tx_hash: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="PENDING")
    error_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    template: Mapped[BadgeTemplate] = relationship("BadgeTemplate", back_populates="issuances")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    requested_by_admin: Mapped["User" | None] = relationship("User", foreign_keys=[requested_by_admin_id])

    __table_args__ = (
        UniqueConstraint("template_id", "user_id", name="uq_badge_issuances_template_user"),
    )
