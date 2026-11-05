"""Peer-support program models.

Pairings anchor 1-on-1 peer-supporter ↔ student support (optionally linked to
the Case that triggered the escalation); circles are moderated group spaces.
Messages live in a single polymorphic table keyed by (thread_type, thread_id).

Safety invariants enforced at the service layer:
- a student has at most one ACTIVE pairing;
- every pairing/circle has a named counselor supervisor;
- every message is PII-redacted before persistence;
- consent_peer_support is required for pairing creation, circle membership,
  and sending.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class PeerSupportPairing(Base):
    """1-on-1 pairing between a peer supporter and a student."""

    __tablename__ = "peer_support_pairings"
    __table_args__ = (
        Index("ix_peer_pairings_supporter_status", "supporter_id", "status"),
        Index("ix_peer_pairings_student_status", "student_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Counselor profile id of the peer supporter (same id-space as
    # Case.assigned_to via agent_users shadow rows).
    supporter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("counselors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Counselor profile id of the supervising professional.
    supervisor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("counselors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # The triggering case, when the pairing grew out of an escalation.
    case_id: Mapped[Optional["uuid.UUID"]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    # Values: active, closed
    close_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Read receipts: messages created after the reader's timestamp are unread.
    student_read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    staff_read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["User"] = relationship("User", foreign_keys=[student_id])
    supporter: Mapped["Counselor"] = relationship("Counselor", foreign_keys=[supporter_id])
    supervisor: Mapped[Optional["Counselor"]] = relationship("Counselor", foreign_keys=[supervisor_id])


class CounselorThread(Base):
    """Direct counselor ↔ student messaging thread.

    Separate from PeerSupportPairing: this is professional (not supervised
    volunteer) communication. Messages reuse the polymorphic PeerMessage
    table with thread_type='counseling'.
    """

    __tablename__ = "counselor_threads"
    __table_args__ = (
        Index("ix_counselor_threads_counselor_status", "counselor_id", "status"),
        Index("ix_counselor_threads_student_status", "student_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    counselor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("counselors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    subject: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    student_read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    staff_read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["User"] = relationship("User", foreign_keys=[student_id])
    counselor: Mapped["Counselor"] = relationship("Counselor", foreign_keys=[counselor_id])


class PeerCircle(Base):
    """Moderated group space (a 'circle') run by a peer supporter."""

    __tablename__ = "peer_circles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # users.id of the peer supporter who moderates the circle.
    moderator_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    supervisor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("counselors.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    moderator: Mapped["User"] = relationship("User", foreign_keys=[moderator_id])
    members: Mapped[List["PeerCircleMember"]] = relationship(
        "PeerCircleMember", back_populates="circle", cascade="all, delete-orphan"
    )


class PeerCircleMember(Base):
    __tablename__ = "peer_circle_members"
    __table_args__ = (
        UniqueConstraint("circle_id", "user_id", name="uq_peer_circle_member"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    circle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("peer_circles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    circle: Mapped["PeerCircle"] = relationship("PeerCircle", back_populates="members")


class PeerMessage(Base):
    """A single message in a peer-support thread (pairing or circle).

    Polymorphic thread reference — ``thread_type`` is 'pairing' or 'circle'
    and ``thread_id`` points into the matching table. Content is redacted via
    ``sanitize_text`` before persistence, mirroring the Aika chat pipeline.
    """

    __tablename__ = "peer_messages"
    __table_args__ = (
        Index("ix_peer_messages_thread_time", "thread_type", "thread_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    thread_type: Mapped[str] = mapped_column(String(16), nullable=False)
    thread_id: Mapped[int] = mapped_column(Integer, nullable=False)
    sender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content_redacted: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
