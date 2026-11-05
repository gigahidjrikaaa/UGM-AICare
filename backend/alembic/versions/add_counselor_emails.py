"""Add counselor_email_logs (counselor outbound-email audit).

Revision ID: add_counselor_emails
Revises: add_counselor_threads
Create Date: 2026-09-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_counselor_emails"
down_revision = "add_counselor_threads"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _table_exists("counselor_email_logs"):
        op.create_table(
            "counselor_email_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "counselor_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "student_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("template_key", sa.String(length=50), nullable=False),
            sa.Column("subject", sa.String(length=255), nullable=False),
            sa.Column("message_redacted", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("error_reason", sa.Text(), nullable=True),
            sa.Column(
                "student_email_opt_in",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
                index=True,
            ),
        )
        op.create_index(
            "ix_counselor_emails_counselor_time",
            "counselor_email_logs",
            ["counselor_user_id", "created_at"],
        )
        op.create_index(
            "ix_counselor_emails_student_time",
            "counselor_email_logs",
            ["student_user_id", "created_at"],
        )


def downgrade() -> None:
    if _table_exists("counselor_email_logs"):
        op.drop_table("counselor_email_logs")
