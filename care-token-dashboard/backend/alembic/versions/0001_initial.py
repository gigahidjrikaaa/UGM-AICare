"""Initial dashboard schema: users, revenue_reports, revenue_approvals.

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-07

Baseline migration for the CARE Token Dashboard database (a separate database
from the main UGM-AICare backend — no shared tables or FKs). Matches the
models in app/models/__init__.py.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    userrole = postgresql.ENUM(
        "admin", "finance_team", "auditor", "viewer",
        name="userrole",
        create_type=True,
    )
    reportstatus = postgresql.ENUM(
        "draft", "submitted", "pending_approval", "approved", "challenged", "finalized",
        name="reportstatus",
        create_type=True,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", userrole, nullable=False),
        sa.Column("wallet_address", sa.String(length=42), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "revenue_reports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("wellness_fees", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("subscriptions", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("nft_sales", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("partner_fees", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("treasury_returns", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("total_revenue", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("total_expenses", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("net_profit", sa.Numeric(20, 6), nullable=False, server_default=sa.text("0")),
        sa.Column("status", reportstatus, nullable=False, server_default="DRAFT"),
        sa.Column("transaction_hash", sa.String(length=66), nullable=True),
        sa.Column("block_number", sa.Integer(), nullable=True),
        sa.Column("approvals_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("required_approvals", sa.Integer(), nullable=False, server_default=sa.text("3")),
        sa.Column("is_challenged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("challenge_reason", sa.Text(), nullable=True),
        sa.Column("submitted_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("submitted_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("finalized_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_revenue_reports_id", "revenue_reports", ["id"])
    op.create_index("ix_revenue_reports_year", "revenue_reports", ["year"])
    op.create_index("ix_revenue_reports_month", "revenue_reports", ["month"])

    op.create_table(
        "revenue_approvals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("revenue_reports.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("wallet_address", sa.String(length=42), nullable=False),
        sa.Column("approved", sa.Boolean(), nullable=False),
        sa.Column("transaction_hash", sa.String(length=66), nullable=True),
        sa.Column("signature", sa.Text(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_revenue_approvals_id", "revenue_approvals", ["id"])
    op.create_index("ix_revenue_approvals_report_id", "revenue_approvals", ["report_id"])
    op.create_index("ix_revenue_approvals_user_id", "revenue_approvals", ["user_id"])


def downgrade() -> None:
    op.drop_table("revenue_approvals")
    op.drop_table("revenue_reports")
    op.drop_table("users")
    postgresql.ENUM(name="reportstatus").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="userrole").drop(op.get_bind(), checkfirst=True)
