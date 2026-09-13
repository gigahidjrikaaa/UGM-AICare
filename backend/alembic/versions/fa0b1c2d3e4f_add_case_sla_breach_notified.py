"""Add cases.sla_breach_notified_at for SLA scanner dedup.

Revision ID: add_case_sla_breach_notified
Revises: add_user_token_version
Create Date: 2026-09-11

The SLA scanner (scheduler job) publishes SLA_BREACH once per case; this
timestamp marks "counselors already notified" so the scan never spams.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "add_case_sla_breach_notified"
down_revision = "add_user_token_version"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return column in [c["name"] for c in inspector.get_columns(table)]


def upgrade() -> None:
    if not _column_exists("cases", "sla_breach_notified_at"):
        op.add_column(
            "cases",
            sa.Column("sla_breach_notified_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    if _column_exists("cases", "sla_breach_notified_at"):
        op.drop_column("cases", "sla_breach_notified_at")
