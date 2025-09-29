"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision}
Create Date: ${create_date}
"""

from __future__ import annotations

from typing import Any

from alembic import context
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: str | None = ${repr(down_revision)}
branch_labels: tuple[str, ...] | None = ${repr(branch_labels)}
depends_on: tuple[str, ...] | str | None = ${repr(depends_on)}


def upgrade() -> None:
    """Apply schema (and optional data) upgrades."""
    schema_upgrade()
    if _should_run_data_migrations():
        data_upgrade()


def downgrade() -> None:
    """Revert schema (and optional data) upgrades."""
    if _should_run_data_migrations():
        data_downgrade()
    schema_downgrade()


def schema_upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def schema_downgrade() -> None:
    ${downgrades if downgrades else "pass"}


def data_upgrade() -> None:
    """Idempotent data migrations executed with --x data=true."""
    pass


def data_downgrade() -> None:
    """Rollback for data migrations executed with --x data=true."""
    pass


def _should_run_data_migrations() -> bool:
    """Return True when the revision is invoked with ``--x data=true``."""
    x_args: dict[str, Any] = context.get_x_argument(as_dictionary=True)
    flag = x_args.get("data")
    if isinstance(flag, str):
        return flag.lower() in {"1", "true", "yes", "on"}
    return bool(flag)
