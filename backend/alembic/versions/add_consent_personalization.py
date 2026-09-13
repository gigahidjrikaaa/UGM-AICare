"""Add users.consent_personalization (JITAI Phase 4 experiment consent).

Revision ID: add_consent_personalization
Revises: add_intervention_assignments
Create Date: 2026-09-13

Explicit opt-in for personalization/experimentation. The adaptive selector
(Phase 4) refuses to run without it, so no randomization occurs by default.
History is appended to ``user_consent_ledger`` (consent_type='personalization').

Idempotent-safe: IF NOT EXISTS semantics.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_consent_personalization"
down_revision = "add_intervention_assignments"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def upgrade() -> None:
    if not _column_exists("users", "consent_personalization"):
        op.add_column(
            "users",
            sa.Column(
                "consent_personalization",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    if _column_exists("users", "consent_personalization"):
        op.drop_column("users", "consent_personalization")
