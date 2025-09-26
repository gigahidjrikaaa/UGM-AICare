"""introduce sda+ia schema and events overhaul

Revision ID: 9a5f9ae2bf74
Revises: c613d13854de
Create Date: 2025-09-25 19:40:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "9a5f9ae2bf74"
down_revision = "c613d13854de"
branch_labels = None
depends_on = None


AGENT_NAME_ENUM = sa.Enum("STA", "SCA", "SDA", "IA", name="agent_name_enum")
MESSAGE_ROLE_ENUM = sa.Enum("user", "assistant", "system", name="message_role_enum")
CONSENT_SCOPE_ENUM = sa.Enum("ops", "followup", "research", name="consent_scope_enum")
CASE_STATUS_ENUM = sa.Enum("new", "in_progress", "waiting", "closed", name="case_status_enum")
CASE_SEVERITY_ENUM = sa.Enum("low", "med", "high", "critical", name="case_severity_enum")
AGENT_ROLE_ENUM = sa.Enum("admin", "counselor", "operator", "student", name="agent_role_enum")


def upgrade() -> None:
    bind = op.get_bind()
    AGENT_NAME_ENUM.create(bind, checkfirst=True)
    MESSAGE_ROLE_ENUM.create(bind, checkfirst=True)
    CONSENT_SCOPE_ENUM.create(bind, checkfirst=True)
    CASE_STATUS_ENUM.create(bind, checkfirst=True)
    CASE_SEVERITY_ENUM.create(bind, checkfirst=True)
    AGENT_ROLE_ENUM.create(bind, checkfirst=True)

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("user_hash", sa.String(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("agent", AGENT_NAME_ENUM, nullable=False),
        sa.Column("intent", sa.String(), nullable=True),
        sa.Column("risk_flag", sa.SmallInteger(), nullable=True),
        sa.Column("step", sa.String(), nullable=False),
        sa.Column("resource_id", sa.String(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("tokens_in", sa.Integer(), nullable=True),
        sa.Column("tokens_out", sa.Integer(), nullable=True),
        sa.Column("cost_cents", sa.Integer(), nullable=True),
        sa.Column("outcome", sa.String(), nullable=True),
        sa.Column("consent_scope", sa.String(), nullable=True),
        sa.CheckConstraint("risk_flag >= 0 AND risk_flag <= 3", name="events_risk_flag_range"),
    )
    op.create_index("ix_events_ts", "events", ["ts"])
    op.create_index("ix_events_user_hash", "events", ["user_hash"])
    op.create_index("ix_events_agent_ts", "events", ["agent", "ts"])
    op.create_index("ix_events_intent_ts", "events", ["intent", "ts"])
    op.create_index("ix_events_risk_flag_ts", "events", ["risk_flag", "ts"])

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("role", MESSAGE_ROLE_ENUM, nullable=False),
        sa.Column("content_redacted", sa.Text(), nullable=False),
        sa.Column("tools_used", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("trace_id", sa.String(), nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_messages_session_id", "messages", ["session_id"])
    op.create_index("ix_messages_ts", "messages", ["ts"])
    op.create_index("ix_messages_tools_used", "messages", ["tools_used"], postgresql_using="gin")

    op.create_table(
        "consents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("subject_id", sa.String(), nullable=False),
        sa.Column("scope", CONSENT_SCOPE_ENUM, nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_uri", sa.String(), nullable=True),
        sa.UniqueConstraint("subject_id", "scope", "revoked_at", name="uq_consents_active"),
    )

    op.create_table(
        "cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("status", CASE_STATUS_ENUM, nullable=False),
        sa.Column("severity", CASE_SEVERITY_ENUM, nullable=False),
        sa.Column("assigned_to", sa.String(), nullable=True),
        sa.Column("user_hash", sa.String(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("summary_redacted", sa.Text(), nullable=True),
        sa.Column("sla_breach_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closure_reason", sa.Text(), nullable=True),
    )
    op.create_index("ix_cases_created_at", "cases", ["created_at"])
    op.create_index("ix_cases_status", "cases", ["status"])
    op.create_index("ix_cases_severity", "cases", ["severity"])

    op.create_table(
        "resources",
        sa.Column("resource_id", sa.String(), nullable=False, primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("eligibility", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("contact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "agent_users",
        sa.Column("id", sa.String(), nullable=False, primary_key=True),
        sa.Column("role", AGENT_ROLE_ENUM, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("agent_users")
    op.drop_table("resources")
    op.drop_index("ix_cases_severity", table_name="cases")
    op.drop_index("ix_cases_status", table_name="cases")
    op.drop_index("ix_cases_created_at", table_name="cases")
    op.drop_table("cases")
    op.drop_table("consents")
    op.drop_index("ix_messages_tools_used", table_name="messages")
    op.drop_index("ix_messages_ts", table_name="messages")
    op.drop_index("ix_messages_session_id", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_events_risk_flag_ts", table_name="events")
    op.drop_index("ix_events_intent_ts", table_name="events")
    op.drop_index("ix_events_agent_ts", table_name="events")
    op.drop_index("ix_events_user_hash", table_name="events")
    op.drop_index("ix_events_ts", table_name="events")
    op.drop_table("events")

    bind = op.get_bind()
    AGENT_ROLE_ENUM.drop(bind, checkfirst=True)
    CASE_SEVERITY_ENUM.drop(bind, checkfirst=True)
    CASE_STATUS_ENUM.drop(bind, checkfirst=True)
    CONSENT_SCOPE_ENUM.drop(bind, checkfirst=True)
    MESSAGE_ROLE_ENUM.drop(bind, checkfirst=True)
    AGENT_NAME_ENUM.drop(bind, checkfirst=True)
