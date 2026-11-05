"""Add formal_screening_submissions (administered PHQ-9 / GAD-7).

Revision ID: add_formal_screening
Revises: add_consent_personalization
Create Date: 2026-09-18

One row per administered formal instrument: the full response vector, the
published-instrument total score and severity band, and a ``crisis_flag``
set by a non-zero answer on a gateway crisis item (PHQ-9 item 9) that drives
the safety response independently of the total.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_formal_screening"
down_revision = "add_consent_personalization"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _table_exists("formal_screening_submissions"):
        op.create_table(
            "formal_screening_submissions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("instrument", sa.String(length=32), nullable=False),
            sa.Column("responses", sa.JSON(), nullable=False),
            sa.Column("total_score", sa.Integer(), nullable=False),
            sa.Column("max_score", sa.Integer(), nullable=False),
            sa.Column("normalized_score", sa.Float(), nullable=False),
            sa.Column("severity_band", sa.String(length=32), nullable=False),
            sa.Column("severity_label", sa.String(length=64), nullable=False),
            sa.Column(
                "crisis_flag", sa.Boolean(), nullable=False, server_default=sa.text("false")
            ),
            sa.Column("crisis_item_indices", sa.JSON(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
                index=True,
            ),
        )
        op.create_index(
            "ix_formal_screening_user_instrument_time",
            "formal_screening_submissions",
            ["user_id", "instrument", "created_at"],
        )


def downgrade() -> None:
    if _table_exists("formal_screening_submissions"):
        op.drop_table("formal_screening_submissions")
