"""Add self-report check-in source and consent flag (JITAI Phase 1b).

Revision ID: add_self_report_checkin
Revises: add_screening_dimension_samples
Create Date: 2026-09-13

Two changes for the weekly opt-in self-report prompt:

1. ``users.consent_self_report`` — opt-in flag (DEFAULT false). History is
   appended to ``user_consent_ledger`` (consent_type='self_report').

2. Widen the ``proactive_messages`` source check constraint to allow
   ``self_report_checkin`` alongside the existing ``plan_followup``.

Idempotent-safe: IF NOT EXISTS semantics throughout.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_self_report_checkin"
down_revision = "add_screening_dimension_samples"
branch_labels = None
depends_on = None

_SOURCE_VALUES = ("plan_followup", "self_report_checkin")
_CONSTRAINT_NAME = "ck_proactive_messages_source"


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def _constraint_sqltext(table_name: str, name: str) -> str | None:
    inspector = Inspector.from_engine(op.get_bind())
    for constraint in inspector.get_check_constraints(table_name):
        if constraint.get("name") == name:
            return str(constraint.get("sqltext") or "")
    return None


def upgrade() -> None:
    if not _column_exists("users", "consent_self_report"):
        op.add_column(
            "users",
            sa.Column(
                "consent_self_report",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    existing = _constraint_sqltext("proactive_messages", _CONSTRAINT_NAME)
    if existing is not None and "self_report_checkin" not in existing:
        op.drop_constraint(_CONSTRAINT_NAME, "proactive_messages", type_="check")
        op.create_check_constraint(
            _CONSTRAINT_NAME,
            "proactive_messages",
            "source IN ('%s')" % "', '".join(_SOURCE_VALUES),
        )


def downgrade() -> None:
    existing = _constraint_sqltext("proactive_messages", _CONSTRAINT_NAME)
    if existing is not None and "self_report_checkin" in existing:
        op.drop_constraint(_CONSTRAINT_NAME, "proactive_messages", type_="check")
        op.create_check_constraint(
            _CONSTRAINT_NAME,
            "proactive_messages",
            "source IN ('plan_followup')",
        )

    if _column_exists("users", "consent_self_report"):
        op.drop_column("users", "consent_self_report")
