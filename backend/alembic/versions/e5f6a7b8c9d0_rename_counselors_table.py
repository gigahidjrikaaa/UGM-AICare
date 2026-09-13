"""Rename psychologists → counselors (normalize counselor terminology).

Revision ID: rename_psychologists_to_counselors
Revises: add_case_sla_breach_notified
Create Date: 2026-09-11

The platform calls this persona a "counselor" everywhere (role, portal,
routes, alerts) except the legacy DB/model name. This migration renames:

    table  psychologists → counselors
    column appointments.psychologist_id → counselor_id
    indexes ix_psychologists_* → ix_counselors_*

Postgres tracks FKs by OID, so renaming the table/column automatically keeps
the FKs valid. Constraint/index NAMES are cosmetic and renamed best-effort
(names differ across DB lineages, so each rename is existence-checked and
non-fatal).

Code-level: the SQLAlchemy model is now ``Counselor`` with
``__tablename__ = "counselors"`` and attribute ``counselor_id``.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "rename_counselors_table"
down_revision = "add_case_sla_breach_notified"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return table in inspector.get_table_names()


def _try_exec(sql: str) -> None:
    """Execute best-effort DDL inside a SAVEPOINT.

    On Postgres a failed statement aborts the surrounding transaction, so
    optional renames (constraint names differ across DB lineages) must be
    isolated or every later statement fails with InFailedSqlTransaction.
    """
    conn = op.get_bind()
    nested = conn.begin_nested()
    try:
        conn.exec_driver_sql(sql)
        nested.commit()
    except Exception:
        nested.rollback()


def _rename_if_exists(schema_obj: str, new_name: str, kind: str) -> None:
    try:
        op.execute(f"ALTER {kind} {schema_obj} RENAME TO {new_name}")
    except Exception:
        pass


def upgrade() -> None:
    if _table_exists("psychologists"):
        # Rename indexes/constraints BEFORE the table rename while the old
        # names are unambiguous; Postgres renames follow the objects.
        _try_exec("ALTER INDEX IF EXISTS ix_psychologists_id RENAME TO ix_counselors_id")
        _try_exec(
            "ALTER INDEX IF EXISTS ix_psychologists_is_available "
            "RENAME TO ix_counselors_is_available"
        )
        _try_exec(
            "ALTER INDEX IF EXISTS ix_psychologists_user_id "
            "RENAME TO ix_counselors_user_id"
        )
        _try_exec(
            "ALTER TABLE psychologists "
            "RENAME CONSTRAINT uq_psychologists_user_id TO uq_counselors_user_id"
        )
        _try_exec(
            "ALTER TABLE psychologists "
            "RENAME CONSTRAINT fk_psychologists_user_id TO fk_counselors_user_id"
        )

        op.rename_table("psychologists", "counselors")

    inspector = Inspector.from_engine(op.get_bind())
    if _table_exists("appointments"):
        columns = [c["name"] for c in inspector.get_columns("appointments")]
        if "psychologist_id" in columns:
            # Postgres: renaming the column carries its FK along.
            op.alter_column(
                "appointments",
                "psychologist_id",
                new_column_name="counselor_id",
            )
        _try_exec(
            "ALTER INDEX IF EXISTS appointments_psychologist_id_fkey "
            "RENAME TO appointments_counselor_id_fkey"
        )
        _try_exec(
            "ALTER TABLE appointments "
            "RENAME CONSTRAINT appointments_psychologist_id_fkey "
            "TO appointments_counselor_id_fkey"
        )
        _ = inspector  # noqa: B018 (kept for symmetry with downgrade)


def downgrade() -> None:
    if _table_exists("counselors"):
        _try_exec("ALTER INDEX IF EXISTS ix_counselors_id RENAME TO ix_psychologists_id")
        _try_exec(
            "ALTER INDEX IF EXISTS ix_counselors_is_available "
            "RENAME TO ix_psychologists_is_available"
        )
        _try_exec(
            "ALTER INDEX IF EXISTS ix_counselors_user_id "
            "RENAME TO ix_psychologists_user_id"
        )
        _try_exec(
            "ALTER TABLE counselors "
            "RENAME CONSTRAINT uq_counselors_user_id TO uq_psychologists_user_id"
        )
        _try_exec(
            "ALTER TABLE counselors "
            "RENAME CONSTRAINT fk_counselors_user_id TO fk_psychologists_user_id"
        )
        op.rename_table("counselors", "psychologists")

    inspector = Inspector.from_engine(op.get_bind())
    if _table_exists("appointments"):
        columns = [c["name"] for c in inspector.get_columns("appointments")]
        if "counselor_id" in columns:
            op.alter_column(
                "appointments",
                "counselor_id",
                new_column_name="psychologist_id",
            )
        _ = inspector
