"""Peer-support program schema (pairings, circles, messages, consent).

Revision ID: add_peer_support
Revises: add_peer_role_enum
Create Date: 2026-09-18

- users.consent_peer_support           program opt-in (ledger type 'peer_support')
- counselors.accepts_peer_cases        gates the CMA peer pool
- counselors.peer_bio                  student-facing supporter blurb
- cases.routed_pool                    'peer' | 'counselor' assignment hint
- peer_support_pairings                1-on-1 supporter ↔ student pairings
- peer_circles / peer_circle_members   moderated group circles
- peer_messages                        polymorphic thread messages (redacted)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_peer_support"
down_revision = "add_peer_role_enum"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def _table_exists(table_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _column_exists("users", "consent_peer_support"):
        op.add_column(
            "users",
            sa.Column(
                "consent_peer_support",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if not _column_exists("counselors", "accepts_peer_cases"):
        op.add_column(
            "counselors",
            sa.Column(
                "accepts_peer_cases",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
    if not _column_exists("counselors", "peer_bio"):
        op.add_column("counselors", sa.Column("peer_bio", sa.Text(), nullable=True))

    if not _column_exists("cases", "routed_pool"):
        op.add_column("cases", sa.Column("routed_pool", sa.String(length=20), nullable=True))

    if not _table_exists("peer_support_pairings"):
        op.create_table(
            "peer_support_pairings",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "supporter_id",
                sa.Integer(),
                sa.ForeignKey("counselors.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "student_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "supervisor_id",
                sa.Integer(),
                sa.ForeignKey("counselors.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column(
                "case_id",
                sa.dialects.postgresql.UUID(as_uuid=True),
                sa.ForeignKey("cases.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active", index=True),
            sa.Column("close_reason", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index(
            "ix_peer_pairings_supporter_status",
            "peer_support_pairings",
            ["supporter_id", "status"],
        )
        op.create_index(
            "ix_peer_pairings_student_status",
            "peer_support_pairings",
            ["student_id", "status"],
        )

    if not _table_exists("peer_circles"):
        op.create_table(
            "peer_circles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column(
                "moderator_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "supervisor_id",
                sa.Integer(),
                sa.ForeignKey("counselors.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

    if not _table_exists("peer_circle_members"):
        op.create_table(
            "peer_circle_members",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "circle_id",
                sa.Integer(),
                sa.ForeignKey("peer_circles.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "joined_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.UniqueConstraint("circle_id", "user_id", name="uq_peer_circle_member"),
        )

    if not _table_exists("peer_messages"):
        op.create_table(
            "peer_messages",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("thread_type", sa.String(length=16), nullable=False),
            sa.Column("thread_id", sa.Integer(), nullable=False),
            sa.Column(
                "sender_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("content_redacted", sa.Text(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index(
            "ix_peer_messages_thread_time",
            "peer_messages",
            ["thread_type", "thread_id", "created_at"],
        )


def downgrade() -> None:
    if _table_exists("peer_messages"):
        op.drop_table("peer_messages")
    if _table_exists("peer_circle_members"):
        op.drop_table("peer_circle_members")
    if _table_exists("peer_circles"):
        op.drop_table("peer_circles")
    if _table_exists("peer_support_pairings"):
        op.drop_table("peer_support_pairings")
    if _column_exists("cases", "routed_pool"):
        op.drop_column("cases", "routed_pool")
    if _column_exists("counselors", "peer_bio"):
        op.drop_column("counselors", "peer_bio")
    if _column_exists("counselors", "accepts_peer_cases"):
        op.drop_column("counselors", "accepts_peer_cases")
    if _column_exists("users", "consent_peer_support"):
        op.drop_column("users", "consent_peer_support")
