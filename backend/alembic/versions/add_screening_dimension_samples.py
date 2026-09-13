"""Add screening_dimension_samples (longitudinal screening time series).

Revision ID: add_screening_dimension_samples
Revises: rename_counselors_table
Create Date: 2026-09-13

``user_screening_profiles`` stores only the latest score per dimension, which
makes pre/post intervention comparison impossible. This table records an
append-only sample per (user, dimension, observation) on every profile update
(conversation analysis) or self-report, enabling outcome measurement for the
JITAI (outcome-adaptive intervention) loop.

Idempotent-safe: IF NOT EXISTS semantics throughout.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_screening_dimension_samples"
down_revision = "rename_counselors_table"
branch_labels = None
depends_on = None

_SOURCE_VALUES = ("conversation", "self_report", "backfill")


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _table_exists("screening_dimension_samples"):
        return

    op.create_table(
        "screening_dimension_samples",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("dimension", sa.String(32), nullable=False),
        sa.Column("current_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("protective_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("net_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("instrument", sa.String(32), nullable=True),
        sa.Column("raw_score", sa.Float(), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=True),
        sa.Column("normalized_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("source", sa.String(32), nullable=False, server_default="conversation"),
        sa.Column("source_entity_id", sa.String(255), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "source IN ('%s')" % "', '".join(_SOURCE_VALUES),
            name="ck_screening_samples_source",
        ),
    )

    op.create_index(
        "ix_screening_dimension_samples_user_id",
        "screening_dimension_samples",
        ["user_id"],
    )
    op.create_index(
        "ix_screening_dimension_samples_dimension",
        "screening_dimension_samples",
        ["dimension"],
    )
    op.create_index(
        "ix_screening_dimension_samples_source",
        "screening_dimension_samples",
        ["source"],
    )
    op.create_index(
        "ix_screening_dimension_samples_created_at",
        "screening_dimension_samples",
        ["created_at"],
    )
    op.create_index(
        "ix_screening_samples_user_dim_time",
        "screening_dimension_samples",
        ["user_id", "dimension", "created_at"],
    )


def downgrade() -> None:
    if not _table_exists("screening_dimension_samples"):
        return
    op.drop_index("ix_screening_samples_user_dim_time", table_name="screening_dimension_samples")
    op.drop_index("ix_screening_dimension_samples_created_at", table_name="screening_dimension_samples")
    op.drop_index("ix_screening_dimension_samples_source", table_name="screening_dimension_samples")
    op.drop_index("ix_screening_dimension_samples_dimension", table_name="screening_dimension_samples")
    op.drop_index("ix_screening_dimension_samples_user_id", table_name="screening_dimension_samples")
    op.drop_table("screening_dimension_samples")
