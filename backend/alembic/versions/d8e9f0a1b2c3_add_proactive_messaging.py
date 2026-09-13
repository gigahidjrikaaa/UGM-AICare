"""Add proactive messaging: proactive_messages table + users consent column.

Revision ID: add_proactive_messaging
Revises: add_content_resource_chunks
Create Date: 2026-09-09

Two additions for the proactive-Aika feature:

1. ``proactive_messages`` — server-initiated Aika chat messages (currently
   only plan follow-ups), each carrying the ``session_id`` of the Aika
   thread the frontend should adopt when the user opens the chat. Deliberately
   NOT a row in ``conversations``/``messages``: those tables have no
   origin/read-state columns, and read-state is the core UX here.

2. ``users.consent_proactive_chat`` — opt-in consent flag (DEFAULT false:
   Aika speaking first uninvited requires explicit consent). Changes are also
   appended to the user_consent_ledger by the application layer.

Idempotent-safe: IF NOT EXISTS semantics throughout.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_proactive_messaging"
down_revision = "add_content_resource_chunks"
branch_labels = None
depends_on = None

_PROACTIVE_SOURCE_VALUES = ("plan_followup",)
_PROACTIVE_STATUS_VALUES = ("pending", "read", "dismissed", "expired")


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _table_exists("proactive_messages"):
        op.create_table(
            "proactive_messages",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("source", sa.String(32), nullable=False),
            sa.Column("source_entity_id", sa.Integer(), nullable=True),
            sa.Column("session_id", sa.String(64), nullable=False),
            sa.Column("content_redacted", sa.Text(), nullable=False),
            sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
            sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.CheckConstraint(
                "source IN ('%s')" % "', '".join(_PROACTIVE_SOURCE_VALUES),
                name="ck_proactive_messages_source",
            ),
            sa.CheckConstraint(
                "status IN ('%s')" % "', '".join(_PROACTIVE_STATUS_VALUES),
                name="ck_proactive_messages_status",
            ),
        )
        op.create_index(
            "ix_proactive_messages_user_status",
            "proactive_messages",
            ["user_id", "status"],
        )

    if not _column_exists("users", "consent_proactive_chat"):
        op.add_column(
            "users",
            sa.Column(
                "consent_proactive_chat",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    if _column_exists("users", "consent_proactive_chat"):
        op.drop_column("users", "consent_proactive_chat")
    if _table_exists("proactive_messages"):
        op.drop_index("ix_proactive_messages_user_status", table_name="proactive_messages")
        op.drop_table("proactive_messages")
