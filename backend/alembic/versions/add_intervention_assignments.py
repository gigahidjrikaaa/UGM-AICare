"""Add intervention_assignments (baseline → outcome ledger for JITAI Phase 2).

Revision ID: add_intervention_assignments
Revises: add_self_report_checkin
Create Date: 2026-09-13

One row per intervention plan capturing baseline scores, the target dimensions,
and the measured post-intervention outcome. Unique on ``plan_id`` (plan-as-unit),
so assignment creation is idempotent.

Idempotent-safe: IF NOT EXISTS semantics throughout.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_intervention_assignments"
down_revision = "add_self_report_checkin"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _table_exists("intervention_assignments"):
        return

    op.create_table(
        "intervention_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "plan_id",
            sa.Integer(),
            sa.ForeignKey("intervention_plan_records.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("intervention_key", sa.String(128), nullable=False),
        sa.Column("primary_activity_id", sa.String(64), nullable=True),
        sa.Column("target_dimensions", sa.JSON(), nullable=True),
        sa.Column("baseline_scores", sa.JSON(), nullable=True),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("measure_after", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assignment_method", sa.String(32), nullable=False, server_default="rule"),
        sa.Column("arm", sa.String(64), nullable=True),
        sa.Column("experiment_key", sa.String(64), nullable=True),
        sa.Column("policy_decision", sa.String(32), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="assigned"),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("post_scores", sa.JSON(), nullable=True),
        sa.Column("outcome", sa.JSON(), nullable=True),
        sa.Column("outcome_label", sa.String(32), nullable=True),
        sa.Column("unmeasured_reason", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("plan_id", name="uq_intervention_assignments_plan_id"),
    )

    op.create_index(
        "ix_intervention_assignments_user_id",
        "intervention_assignments",
        ["user_id"],
    )
    op.create_index(
        "ix_intervention_assignments_plan_id",
        "intervention_assignments",
        ["plan_id"],
    )
    op.create_index(
        "ix_intervention_assignments_intervention_key",
        "intervention_assignments",
        ["intervention_key"],
    )
    op.create_index(
        "ix_intervention_assignments_measure_after",
        "intervention_assignments",
        ["measure_after"],
    )
    op.create_index(
        "ix_intervention_assignments_status",
        "intervention_assignments",
        ["status"],
    )
    op.create_index(
        "ix_intervention_assignments_outcome_label",
        "intervention_assignments",
        ["outcome_label"],
    )
    op.create_index(
        "ix_intervention_assignments_user_status",
        "intervention_assignments",
        ["user_id", "status"],
    )


def downgrade() -> None:
    if not _table_exists("intervention_assignments"):
        return
    for name in (
        "ix_intervention_assignments_user_status",
        "ix_intervention_assignments_outcome_label",
        "ix_intervention_assignments_status",
        "ix_intervention_assignments_measure_after",
        "ix_intervention_assignments_intervention_key",
        "ix_intervention_assignments_plan_id",
        "ix_intervention_assignments_user_id",
    ):
        op.drop_index(name, table_name="intervention_assignments")
    op.drop_table("intervention_assignments")
