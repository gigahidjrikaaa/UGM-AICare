"""Add users.token_version for JWT revocation on password change.

Revision ID: add_user_token_version
Revises: add_proactive_messaging
Create Date: 2026-09-11

``token_version`` is embedded in every access token ("tv" claim) and checked
on every authenticated request: changing the user's version invalidates all
previously issued tokens (used by the password-reset flow, which previously
left stolen/old sessions valid for up to 24h).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "add_user_token_version"
down_revision = "add_proactive_messaging"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return column in [c["name"] for c in inspector.get_columns(table)]


def upgrade() -> None:
    if not _column_exists("users", "token_version"):
        op.add_column(
            "users",
            sa.Column(
                "token_version",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )


def downgrade() -> None:
    if _column_exists("users", "token_version"):
        op.drop_column("users", "token_version")
