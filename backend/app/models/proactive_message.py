"""ProactiveMessage model — Aika-initiated chat messages.

A server-initiated proactive message (currently: intervention-plan follow-ups)
that Aika delivers in-app. Deliberately a SEPARATE table from
``conversations``/``messages``: those have no origin or read-state columns
(``messages`` even lacks ``user_id``), and read-state is the core of the
proactive UX (badge → chat bubble → read).

Lifecycle: ``pending`` → (frontend GET) → ``read`` | ``dismissed``.
Durability in the chat transcript: the frontend adopts ``session_id`` as its
Aika thread id and replays the content inside ``conversation_history`` on the
user's next reply, so the existing backfill path in aika_stream persists it.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class ProactiveMessageSource(str, enum.Enum):
    plan_followup = "plan_followup"


class ProactiveMessageStatus(str, enum.Enum):
    pending = "pending"
    read = "read"
    dismissed = "dismissed"
    expired = "expired"


class ProactiveMessage(Base):
    __tablename__ = "proactive_messages"
    __table_args__ = (
        Index("ix_proactive_messages_user_status", "user_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source: Mapped[ProactiveMessageSource] = mapped_column(
        SAEnum(ProactiveMessageSource, native_enum=False, length=32),
        nullable=False,
    )
    # Originating entity (e.g. intervention_plan_records.id) for audit + skip logic.
    source_entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    # The Aika thread id the client should adopt so the conversation continues
    # under one LangGraph thread (user_{uid}_session_{session_id}).
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)
    content_redacted: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[ProactiveMessageStatus] = mapped_column(
        SAEnum(ProactiveMessageStatus, native_enum=False, length=16),
        nullable=False,
        default=ProactiveMessageStatus.pending,
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<ProactiveMessage(id={self.id}, user_id={self.user_id}, "
            f"source='{self.source.value if hasattr(self.source, 'value') else self.source}', "
            f"status='{self.status.value if hasattr(self.status, 'value') else self.status}')>"
        )
