"""Add cases.resolution_notes + cases.resolved_at (counselor Resolve flow).

Revision ID: add_case_resolution
Revises: add_formal_screening
Create Date: 2026-09-18

Counselors can now genuinely resolve cases: the resolution outcome is stored
structured (resolution_notes + resolved_at) instead of only surviving as a
generic status-change note, and the list endpoint no longer relabels resolved
cases as closed.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_case_resolution"
down_revision = "add_formal_screening"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def upgrade() -> None:
    if not _column_exists("cases", "resolution_notes"):
        op.add_column("cases", sa.Column("resolution_notes", sa.Text(), nullable=True))
    if not _column_exists("cases", "resolved_at"):
        op.add_column("cases", sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    if _column_exists("cases", "resolved_at"):
        op.drop_column("cases", "resolved_at")
    if _column_exists("cases", "resolution_notes"):
        op.drop_column("cases", "resolution_notes")
