"""Counselor ↔ student messaging threads + pairings read receipts.

Revision ID: add_counselor_threads
Revises: add_peer_support
Create Date: 2026-09-18

Messages reuse the polymorphic peer_messages table with
thread_type='counseling'. Read receipts are thread-level timestamps
(student_read_at / staff_read_at) — messages newer than the reader's
timestamp and not authored by them are unread.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_counselor_threads"
down_revision = "add_peer_support"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def upgrade() -> None:
    if not _table_exists("counselor_threads"):
        op.create_table(
            "counselor_threads",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "counselor_id",
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
                "case_id",
                UUID(as_uuid=True),
                sa.ForeignKey("cases.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active", index=True),
            sa.Column("subject", sa.String(length=200), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("student_read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("staff_read_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index(
            "ix_counselor_threads_counselor_status",
            "counselor_threads",
            ["counselor_id", "status"],
        )
        op.create_index(
            "ix_counselor_threads_student_status",
            "counselor_threads",
            ["student_id", "status"],
        )

    for table, cols in (
        ("peer_support_pairings", ("student_read_at", "staff_read_at")),
    ):
        for col in cols:
            if not _column_exists(table, col):
                op.add_column(table, sa.Column(col, sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    if _table_exists("counselor_threads"):
        op.drop_table("counselor_threads")
    if _column_exists("peer_support_pairings", "staff_read_at"):
        op.drop_column("peer_support_pairings", "staff_read_at")
    if _column_exists("peer_support_pairings", "student_read_at"):
        op.drop_column("peer_support_pairings", "student_read_at")
