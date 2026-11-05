"""Add 'peer_supporter' to agent_role_enum (peer-support program).

Revision ID: add_peer_role_enum
Revises: add_case_resolution
Create Date: 2026-09-18

Postgres enum values cannot be dropped, so this is additive-only. PG 12+
allows ALTER TYPE ... ADD VALUE inside a transaction as long as the new value
isn't used in the same transaction (it isn't — the shadow-row writes happen
at runtime, not in this migration).
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_peer_role_enum"
down_revision = "add_case_resolution"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE agent_role_enum ADD VALUE IF NOT EXISTS 'peer_supporter'")


def downgrade() -> None:
    # Enum values cannot be removed without a type rebuild; the value is
    # harmless to keep.
    pass
