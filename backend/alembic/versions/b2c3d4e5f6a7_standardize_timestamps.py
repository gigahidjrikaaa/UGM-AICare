"""Standardize timestamps to timezone-aware timestamptz with server defaults.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-07

Converts every remaining naive/Date/epoch timestamp column to
`timestamptz` and aligns server defaults with the models
(`server_default=now()`).

Existing values are interpreted as UTC:
- naive `timestamp` values were written by client-side `datetime.now()` /
  `datetime.utcnow()` defaults — treated as UTC (best-effort).
- `user_preferences.created_at/updated_at` were Unix epoch seconds —
  converted with `to_timestamp()`.
- `user_profiles.created_at/updated_at` were `date` — converted to midnight UTC.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


# (table, column, source_kind, set_server_default)
# source_kind: "timestamp" | "date" | "epoch"
_COLUMNS: list[tuple[str, str, str, bool]] = [
    ("users", "created_at", "timestamp", True),
    ("users", "updated_at", "timestamp", True),
    ("users", "last_login", "timestamp", False),
    ("users", "last_checkin_sent_at", "timestamp", False),
    ("users", "password_reset_expires", "timestamp", False),
    ("user_profiles", "created_at", "date", True),
    ("user_profiles", "updated_at", "date", True),
    ("user_profiles", "simaster_verified_at", "timestamp", False),
    ("user_preferences", "created_at", "epoch", True),
    ("user_preferences", "updated_at", "epoch", True),
    ("tweets", "created_at", "timestamp", True),
    ("tweets", "updated_at", "timestamp", True),
    ("user_badges", "awarded_at", "timestamp", True),
    ("pending_badge_grants", "qualified_at", "timestamp", True),
    ("user_ai_memory_facts", "created_at", "timestamp", True),
    ("user_ai_memory_facts", "updated_at", "timestamp", True),
    ("journal_entries", "created_at", "timestamp", True),
    ("journal_entries", "updated_at", "timestamp", True),
    ("journal_tags", "created_at", "timestamp", True),
    ("journal_reflection_points", "created_at", "timestamp", True),
    ("triage_assessments", "created_at", "timestamp", True),
    ("triage_assessments", "updated_at", "timestamp", True),
    ("user_screening_profiles", "created_at", "timestamp", True),
    ("user_screening_profiles", "updated_at", "timestamp", True),
    ("user_screening_profiles", "last_intervention_at", "timestamp", False),
    ("conversation_risk_assessments", "analysis_timestamp", "timestamp", True),
    ("conversation_risk_assessments", "created_at", "timestamp", True),
    ("conversation_risk_assessments", "updated_at", "timestamp", True),
    ("conversations", "timestamp", "timestamp", True),
    ("user_summaries", "timestamp", "timestamp", True),
    ("flagged_sessions", "created_at", "timestamp", True),
    ("flagged_sessions", "updated_at", "timestamp", True),
]


def _table_exists(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def _column_exists(table_name: str, column_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    columns = sa.inspect(op.get_bind()).get_columns(table_name)
    return any(col.get("name") == column_name for col in columns)


def _column_type(table_name: str, column_name: str) -> str | None:
    columns = sa.inspect(op.get_bind()).get_columns(table_name)
    for col in columns:
        if col.get("name") == column_name:
            return str(col.get("type"))
    return None


def _conversion_using(column_ref: str, source_kind: str) -> str:
    if source_kind == "epoch":
        return f"to_timestamp({column_ref})"
    if source_kind == "date":
        return f"({column_ref})::timestamp AT TIME ZONE 'UTC'"
    return f"{column_ref} AT TIME ZONE 'UTC'"


def upgrade() -> None:
    for table, column, source_kind, set_default in _COLUMNS:
        if not _column_exists(table, column):
            continue

        current_type = (_column_type(table, column) or "").upper()
        if "TIMESTAMPTZ" in current_type or "TIME ZONE" in current_type:
            # Already timezone-aware; only align the server default.
            if set_default:
                op.alter_column(
                    table, column,
                    server_default=sa.text("now()"),
                    existing_type=postgresql.TIMESTAMP(timezone=True),
                    existing_nullable=True,
                )
            continue

        using = _conversion_using(f'"{column}"', source_kind)

        # Drop any existing default first: defaults like EXTRACT(epoch FROM now())
        # or CURRENT_DATE cannot be cast automatically to timestamptz.
        op.alter_column(table, column, server_default=sa.null(), existing_nullable=True)
        op.alter_column(
            table, column,
            type_=postgresql.TIMESTAMP(timezone=True),
            postgresql_using=using,
            existing_nullable=True,
        )
        if set_default:
            op.alter_column(
                table, column,
                server_default=sa.text("now()"),
                existing_type=postgresql.TIMESTAMP(timezone=True),
                existing_nullable=True,
            )


def downgrade() -> None:
    # Best-effort reverse: convert back to naive UTC timestamp. Epoch and date
    # representations are not restored.
    for table, column, _source_kind, _set_default in _COLUMNS:
        if not _column_exists(table, column):
            continue
        current_type = (_column_type(table, column) or "").upper()
        if "TIMESTAMPTZ" not in current_type and "TIME ZONE" not in current_type:
            continue
        op.alter_column(
            table, column,
            type_=sa.DateTime(),
            postgresql_using=f'"{column}" AT TIME ZONE \'UTC\'',
            existing_nullable=True,
        )
        op.alter_column(table, column, server_default=sa.null(), existing_type=sa.DateTime(), existing_nullable=True)
