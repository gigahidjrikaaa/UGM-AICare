"""Harden data model: FK integrity, legacy PII/PHI column removal, CHECK constraints.

Revision ID: a1b2c3d4e5f6
Revises: d21e8b4f0a9c
Create Date: 2026-04-07

Implements the data-model audit fixes:

1. Consent ledger / audit log FKs: CASCADE -> RESTRICT (append-only compliance
   data must never be deleted with the user).
2. Legacy denormalized PII/PHI columns on `users` are backfilled into the
   normalized tables (user_profiles, user_preferences, user_clinical_records,
   user_emergency_contacts) and then dropped. The normalized tables are the
   single source of truth.
3. Missing FK constraints added (alerts.seen_by, revenue_reports.created_by)
   and ondelete behavior fixed on actor FKs (SET NULL) and child tables
   (CASCADE).
4. CHECK constraints for clinical risk values, alert severity, campaign
   status/priority, badge statuses, and journal mood range.
5. campaign_metrics: dedupe + unique (campaign_id, execution_date).
6. New append-only care_token_mints table (off-chain mint receipts).
7. Drop dead user_profiles.total_care_tokens (on-chain balance is canonical).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "d21e8b4f0a9c"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(table_name)


def _column_exists(table_name: str, column_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    inspector = sa.inspect(bind := op.get_bind())
    columns = inspector.get_columns(table_name)
    return any(col.get("name") == column_name for col in columns)


def _fk_constraint_names(table_name: str, column_name: str) -> list[str]:
    """Return names of FK constraints on table covering exactly column."""
    if not _table_exists(table_name):
        return []
    inspector = sa.inspect(op.get_bind())
    names: list[str] = []
    for fk in inspector.get_foreign_keys(table_name):
        constrained = fk.get("constrained_columns") or []
        if constrained == [column_name]:
            name = fk.get("name")
            if name:
                names.append(name)
    return names


def _rebuild_fk(
    table_name: str,
    column_name: str,
    referent_table: str,
    referent_column: str,
    ondelete: str,
    constraint_name: str,
) -> None:
    """Drop existing FK(s) on (table, column) and recreate with ondelete."""
    for name in _fk_constraint_names(table_name, column_name):
        op.drop_constraint(name, table_name, type_="foreignkey")
    if not _column_exists(table_name, column_name):
        return
    op.create_foreign_key(
        constraint_name,
        source_table=table_name,
        referent_table=referent_table,
        local_cols=[column_name],
        remote_cols=[referent_column],
        ondelete=ondelete,
    )


def _add_check(table_name: str, constraint_name: str, condition: str) -> None:
    if not _table_exists(table_name):
        return
    inspector = sa.inspect(op.get_bind())
    existing = {c["name"] for c in inspector.get_check_constraints(table_name)}
    if constraint_name in existing:
        return
    op.create_check_constraint(constraint_name, table_name, condition)


# ---------------------------------------------------------------------------
# Backfill: legacy users columns -> normalized tables
# ---------------------------------------------------------------------------

_BACKFILL_PROFILES = """
INSERT INTO user_profiles (
    user_id, country, first_name, last_name, preferred_name, pronouns,
    phone, alternate_phone, telegram_username, date_of_birth, gender, city,
    university, major, year_of_study, sentiment_score, current_streak,
    longest_streak, last_activity_date, profile_photo_url
)
SELECT
    u.id,
    'Indonesia',
    u.first_name, u.last_name, u.preferred_name, u.pronouns,
    u.phone, u.alternate_phone, u.telegram_username, u.date_of_birth, u.gender,
    u.city, u.university, u.major,
    CASE WHEN u.year_of_study ~ '^[0-9]+$' THEN u.year_of_study::int ELSE NULL END,
    u.sentiment_score, u.current_streak, u.longest_streak,
    u.last_activity_date, u.profile_photo_url
FROM users u
ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(user_profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(user_profiles.last_name, EXCLUDED.last_name),
    preferred_name = COALESCE(user_profiles.preferred_name, EXCLUDED.preferred_name),
    pronouns = COALESCE(user_profiles.pronouns, EXCLUDED.pronouns),
    phone = COALESCE(user_profiles.phone, EXCLUDED.phone),
    alternate_phone = COALESCE(user_profiles.alternate_phone, EXCLUDED.alternate_phone),
    telegram_username = COALESCE(user_profiles.telegram_username, EXCLUDED.telegram_username),
    date_of_birth = COALESCE(user_profiles.date_of_birth, EXCLUDED.date_of_birth),
    gender = COALESCE(user_profiles.gender, EXCLUDED.gender),
    city = COALESCE(user_profiles.city, EXCLUDED.city),
    university = COALESCE(user_profiles.university, EXCLUDED.university),
    major = COALESCE(user_profiles.major, EXCLUDED.major),
    year_of_study = COALESCE(user_profiles.year_of_study, EXCLUDED.year_of_study),
    sentiment_score = COALESCE(NULLIF(user_profiles.sentiment_score, 0), EXCLUDED.sentiment_score),
    current_streak = GREATEST(COALESCE(user_profiles.current_streak, 0), COALESCE(EXCLUDED.current_streak, 0)),
    longest_streak = GREATEST(COALESCE(user_profiles.longest_streak, 0), COALESCE(EXCLUDED.longest_streak, 0)),
    last_activity_date = COALESCE(user_profiles.last_activity_date, EXCLUDED.last_activity_date),
    profile_photo_url = COALESCE(user_profiles.profile_photo_url, EXCLUDED.profile_photo_url)
"""

_BACKFILL_PREFERENCES = """
INSERT INTO user_preferences (
    user_id, preferred_language, preferred_timezone, accessibility_notes,
    communication_preferences, interface_preferences
)
SELECT
    u.id,
    COALESCE(NULLIF(u.preferred_language, ''), 'id'),
    COALESCE(NULLIF(u.preferred_timezone, ''), 'Asia/Jakarta'),
    u.accessibility_needs,
    u.communication_preferences,
    u.interface_preferences
FROM users u
ON CONFLICT (user_id) DO UPDATE SET
    preferred_language = CASE
        WHEN user_preferences.preferred_language = 'id' THEN EXCLUDED.preferred_language
        ELSE user_preferences.preferred_language END,
    preferred_timezone = CASE
        WHEN user_preferences.preferred_timezone = 'Asia/Jakarta' THEN EXCLUDED.preferred_timezone
        ELSE user_preferences.preferred_timezone END,
    accessibility_notes = COALESCE(user_preferences.accessibility_notes, EXCLUDED.accessibility_notes),
    communication_preferences = COALESCE(user_preferences.communication_preferences, EXCLUDED.communication_preferences),
    interface_preferences = COALESCE(user_preferences.interface_preferences, EXCLUDED.interface_preferences)
"""

_BACKFILL_CLINICAL = """
INSERT INTO user_clinical_records (
    user_id, current_risk_level, clinical_summary, primary_concerns,
    safety_plan_notes, external_therapist_name, external_therapist_contact,
    therapy_modality, therapy_frequency, therapy_notes, aicare_team_notes
)
SELECT
    u.id,
    u.risk_level,
    u.clinical_summary,
    CASE
        WHEN u.primary_concerns IS NOT NULL AND btrim(u.primary_concerns) <> '' THEN
            ARRAY(
                SELECT btrim(x)
                FROM unnest(string_to_array(replace(u.primary_concerns, E'\\n', ','), ',')) AS x
                WHERE btrim(x) <> ''
            )
    END,
    u.safety_plan_notes,
    u.current_therapist_name,
    u.current_therapist_contact,
    u.therapy_modality,
    u.therapy_frequency,
    u.therapy_notes,
    u.aicare_team_notes
FROM users u
WHERE u.risk_level IS NOT NULL
   OR u.clinical_summary IS NOT NULL
   OR u.primary_concerns IS NOT NULL
   OR u.safety_plan_notes IS NOT NULL
   OR u.current_therapist_name IS NOT NULL
   OR u.current_therapist_contact IS NOT NULL
   OR u.therapy_modality IS NOT NULL
   OR u.therapy_frequency IS NOT NULL
   OR u.therapy_notes IS NOT NULL
   OR u.aicare_team_notes IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
    current_risk_level = COALESCE(user_clinical_records.current_risk_level, EXCLUDED.current_risk_level),
    clinical_summary = COALESCE(user_clinical_records.clinical_summary, EXCLUDED.clinical_summary),
    primary_concerns = COALESCE(user_clinical_records.primary_concerns, EXCLUDED.primary_concerns),
    safety_plan_notes = COALESCE(user_clinical_records.safety_plan_notes, EXCLUDED.safety_plan_notes),
    external_therapist_name = COALESCE(user_clinical_records.external_therapist_name, EXCLUDED.external_therapist_name),
    external_therapist_contact = COALESCE(user_clinical_records.external_therapist_contact, EXCLUDED.external_therapist_contact),
    therapy_modality = COALESCE(user_clinical_records.therapy_modality, EXCLUDED.therapy_modality),
    therapy_frequency = COALESCE(user_clinical_records.therapy_frequency, EXCLUDED.therapy_frequency),
    therapy_notes = COALESCE(user_clinical_records.therapy_notes, EXCLUDED.therapy_notes),
    aicare_team_notes = COALESCE(user_clinical_records.aicare_team_notes, EXCLUDED.aicare_team_notes)
"""

_BACKFILL_EMERGENCY_CONTACTS = """
INSERT INTO user_emergency_contacts (
    user_id, full_name, relationship_to_user, phone, email,
    priority, is_active
)
SELECT
    u.id,
    u.emergency_contact_name,
    COALESCE(u.emergency_contact_relationship, 'Unknown'),
    u.emergency_contact_phone,
    u.emergency_contact_email,
    1, TRUE
FROM users u
WHERE u.emergency_contact_name IS NOT NULL
  AND u.emergency_contact_phone IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_emergency_contacts c WHERE c.user_id = u.id
  )
"""

# Legacy columns removed from users (PII/PHI + preference duplication).
_LEGACY_USER_COLUMNS = [
    "emergency_contact_name",
    "emergency_contact_relationship",
    "emergency_contact_phone",
    "emergency_contact_email",
    "risk_level",
    "clinical_summary",
    "primary_concerns",
    "safety_plan_notes",
    "current_therapist_name",
    "current_therapist_contact",
    "therapy_modality",
    "therapy_frequency",
    "therapy_notes",
    "preferred_language",
    "preferred_timezone",
    "accessibility_needs",
    "communication_preferences",
    "interface_preferences",
    "aicare_team_notes",
]


def upgrade() -> None:
    bind = op.get_bind()

    # ------------------------------------------------------------------
    # 1. C1: consent ledger / audit log must never cascade-delete
    # ------------------------------------------------------------------
    _rebuild_fk(
        "user_consent_ledger", "user_id", "users", "id",
        ondelete="RESTRICT", constraint_name="fk_consent_ledger_user_restrict",
    )
    _rebuild_fk(
        "user_audit_log", "user_id", "users", "id",
        ondelete="RESTRICT", constraint_name="fk_audit_log_user_restrict",
    )
    _rebuild_fk(
        "user_audit_log", "changed_by_user_id", "users", "id",
        ondelete="SET NULL", constraint_name="fk_audit_log_changed_by_set_null",
    )

    # ------------------------------------------------------------------
    # 2. C2: backfill normalized tables from legacy users columns
    # ------------------------------------------------------------------
    if _column_exists("users", "risk_level"):
        op.execute(_BACKFILL_PROFILES)
        op.execute(_BACKFILL_PREFERENCES)
        op.execute(_BACKFILL_CLINICAL)
        op.execute(_BACKFILL_EMERGENCY_CONTACTS)

        for column in _LEGACY_USER_COLUMNS:
            if _column_exists("users", column):
                op.drop_column("users", column)

    # ------------------------------------------------------------------
    # 3. FK fixes: missing FKs + ondelete behavior
    # ------------------------------------------------------------------
    # alerts.seen_by: clean orphans, then add FK
    if _column_exists("alerts", "seen_by"):
        op.execute(
            "UPDATE alerts SET seen_by = NULL "
            "WHERE seen_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = alerts.seen_by)"
        )
        existing = _fk_constraint_names("alerts", "seen_by")
        if not existing:
            op.create_foreign_key(
                "fk_alerts_seen_by_set_null", "alerts", "users",
                ["seen_by"], ["id"], ondelete="SET NULL",
            )

    # revenue_reports.created_by: clean orphans, then add FK
    if _column_exists("revenue_reports", "created_by"):
        op.execute(
            "UPDATE revenue_reports SET created_by = NULL "
            "WHERE created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = revenue_reports.created_by)"
        )
        if not _fk_constraint_names("revenue_reports", "created_by"):
            op.create_foreign_key(
                "fk_revenue_reports_created_by_set_null", "revenue_reports", "users",
                ["created_by"], ["id"], ondelete="SET NULL",
            )

    # Clinical record actor FKs -> SET NULL
    for column, cname in [
        ("safety_plan_reviewed_by_user_id", "fk_clinical_safety_reviewed_by_set_null"),
        ("flagged_by_user_id", "fk_clinical_flagged_by_set_null"),
        ("updated_by_user_id", "fk_clinical_updated_by_set_null"),
        ("last_reviewed_by_user_id", "fk_clinical_last_reviewed_by_set_null"),
    ]:
        if _column_exists("user_clinical_records", column):
            op.execute(
                f"UPDATE user_clinical_records SET {column} = NULL "
                f"WHERE {column} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = user_clinical_records.{column})"
            )
            _rebuild_fk("user_clinical_records", column, "users", "id", ondelete="SET NULL", constraint_name=cname)

    # Child tables -> CASCADE on user deletion
    _rebuild_fk("conversations", "user_id", "users", "id", ondelete="CASCADE", constraint_name="fk_conversations_user_cascade")
    _rebuild_fk("journal_entries", "user_id", "users", "id", ondelete="CASCADE", constraint_name="fk_journal_entries_user_cascade")
    _rebuild_fk("journal_reflection_points", "user_id", "users", "id", ondelete="CASCADE", constraint_name="fk_journal_reflection_user_cascade")
    _rebuild_fk("journal_tags", "journal_entry_id", "journal_entries", "id", ondelete="CASCADE", constraint_name="fk_journal_tags_entry_cascade")
    _rebuild_fk("journal_reflection_points", "journal_entry_id", "journal_entries", "id", ondelete="CASCADE", constraint_name="fk_journal_reflection_entry_cascade")
    _rebuild_fk("journal_entries", "prompt_id", "journal_prompts", "id", ondelete="SET NULL", constraint_name="fk_journal_entries_prompt_set_null")
    _rebuild_fk("user_screening_profiles", "user_id", "users", "id", ondelete="CASCADE", constraint_name="fk_screening_profiles_user_cascade")
    _rebuild_fk("user_badges", "user_id", "users", "id", ondelete="CASCADE", constraint_name="fk_user_badges_user_cascade")
    _rebuild_fk("therapist_schedules", "therapist_id", "users", "id", ondelete="CASCADE", constraint_name="fk_therapist_schedules_therapist_cascade")

    # Nullable actor/parent FKs -> SET NULL
    _rebuild_fk("triage_assessments", "conversation_id", "conversations", "id", ondelete="SET NULL", constraint_name="fk_triage_conversation_set_null")
    _rebuild_fk("triage_assessments", "user_id", "users", "id", ondelete="SET NULL", constraint_name="fk_triage_user_set_null")
    _rebuild_fk("conversation_risk_assessments", "user_id", "users", "id", ondelete="SET NULL", constraint_name="fk_conversation_risk_user_set_null")
    _rebuild_fk("flagged_sessions", "user_id", "users", "id", ondelete="SET NULL", constraint_name="fk_flagged_sessions_user_set_null")
    _rebuild_fk("flagged_sessions", "flagged_by_admin_id", "users", "id", ondelete="SET NULL", constraint_name="fk_flagged_sessions_admin_set_null")

    # ------------------------------------------------------------------
    # 4. CHECK constraints
    # ------------------------------------------------------------------
    _add_check("user_clinical_records", "ck_clinical_risk_level",
               "current_risk_level IS NULL OR current_risk_level IN ('low', 'medium', 'high', 'critical')")
    _add_check("user_clinical_records", "ck_clinical_risk_score",
               "last_risk_score IS NULL OR (last_risk_score >= 0 AND last_risk_score <= 10)")
    _add_check("user_clinical_records", "ck_clinical_highest_risk_level",
               "highest_risk_level_ever IS NULL OR highest_risk_level_ever IN ('low', 'medium', 'high', 'critical')")
    _add_check("user_clinical_records", "ck_clinical_access_level",
               "access_level IS NULL OR access_level IN ('counselor_only', 'clinical_team', 'research_anonymized')")
    _add_check("alerts", "ck_alerts_severity",
               "severity IN ('critical', 'high', 'medium', 'low', 'info')")
    _add_check("campaigns", "ck_campaigns_status",
               "status IN ('draft', 'active', 'paused', 'completed')")
    _add_check("campaigns", "ck_campaigns_priority",
               "priority IN ('low', 'medium', 'high')")
    _add_check("badge_templates", "ck_badge_templates_status",
               "status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')")
    _add_check("badge_issuances", "ck_badge_issuances_status",
               "status IN ('PENDING', 'SENT', 'CONFIRMED', 'FAILED')")
    _add_check("journal_entries", "ck_journal_mood_range",
               "mood IS NULL OR (mood >= 1 AND mood <= 5)")

    # ------------------------------------------------------------------
    # 5. campaign_metrics: dedupe + unique (campaign_id, execution_date)
    # ------------------------------------------------------------------
    if _table_exists("campaign_metrics"):
        op.execute(
            "DELETE FROM campaign_metrics a USING campaign_metrics b "
            "WHERE a.campaign_id = b.campaign_id AND a.execution_date = b.execution_date AND a.id > b.id"
        )
        inspector = sa.inspect(bind)
        existing_uniques = {
            u["name"]: u["column_names"]
            for u in inspector.get_unique_constraints("campaign_metrics")
        }
        if "uq_campaign_metrics_campaign_date" not in existing_uniques:
            op.create_unique_constraint(
                "uq_campaign_metrics_campaign_date", "campaign_metrics",
                ["campaign_id", "execution_date"],
            )

    # ------------------------------------------------------------------
    # 6. care_token_mints (append-only off-chain mint receipts)
    # ------------------------------------------------------------------
    if not _table_exists("care_token_mints"):
        op.create_table(
            "care_token_mints",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("wallet_address", sa.String(length=64), nullable=False),
            sa.Column("amount", sa.Numeric(30, 0), nullable=False, comment="Amount in wei (18 decimals)"),
            sa.Column("reason", sa.String(length=200), nullable=False),
            sa.Column("chain_id", sa.Integer(), nullable=True),
            sa.Column("tx_hash", sa.String(length=128), nullable=False),
            sa.Column("block_number", sa.Integer(), nullable=True),
            sa.Column("gas_used", sa.Integer(), nullable=True),
            sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("requested_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("ix_care_token_mints_id", "care_token_mints", ["id"])
        op.create_index("ix_care_token_mints_user_id", "care_token_mints", ["user_id"])
        op.create_index("ix_care_token_mints_wallet_address", "care_token_mints", ["wallet_address"])
        op.create_index("ix_care_token_mints_chain_id", "care_token_mints", ["chain_id"])
        op.create_index("ix_care_token_mints_tx_hash", "care_token_mints", ["tx_hash"], unique=True)
        op.create_index("ix_care_token_mints_created_at", "care_token_mints", ["created_at"])

    # ------------------------------------------------------------------
    # 7. Drop dead user_profiles.total_care_tokens (on-chain is canonical)
    # ------------------------------------------------------------------
    if _column_exists("user_profiles", "total_care_tokens"):
        op.drop_column("user_profiles", "total_care_tokens")

    # ------------------------------------------------------------------
    # 8. consent_version server default (L7)
    # ------------------------------------------------------------------
    if _column_exists("user_consent_ledger", "consent_version"):
        op.alter_column(
            "user_consent_ledger", "consent_version",
            server_default="v1.0",
            existing_type=sa.String(length=50),
            existing_nullable=False,
        )


def downgrade() -> None:
    # Restore legacy users columns as nullable (data cannot be restored from
    # this migration alone — restore from the pre-migration backup if needed).
    legacy_columns = {
        "emergency_contact_name": sa.String(),
        "emergency_contact_relationship": sa.String(),
        "emergency_contact_phone": sa.String(),
        "emergency_contact_email": sa.String(),
        "risk_level": sa.String(),
        "clinical_summary": sa.Text(),
        "primary_concerns": sa.Text(),
        "safety_plan_notes": sa.Text(),
        "current_therapist_name": sa.String(),
        "current_therapist_contact": sa.String(),
        "therapy_modality": sa.String(),
        "therapy_frequency": sa.String(),
        "therapy_notes": sa.Text(),
        "preferred_language": sa.String(),
        "preferred_timezone": sa.String(),
        "accessibility_needs": sa.Text(),
        "communication_preferences": sa.Text(),
        "interface_preferences": sa.Text(),
        "aicare_team_notes": sa.Text(),
    }
    for column, col_type in legacy_columns.items():
        if not _column_exists("users", column):
            op.add_column("users", sa.Column(column, col_type, nullable=True))

    if not _column_exists("user_profiles", "total_care_tokens"):
        op.add_column(
            "user_profiles",
            sa.Column("total_care_tokens", sa.Integer(), nullable=True, server_default=sa.text("0")),
        )

    op.drop_table("care_token_mints")

    for constraint, table in [
        ("uq_campaign_metrics_campaign_date", "campaign_metrics"),
        ("ck_clinical_risk_level", "user_clinical_records"),
        ("ck_clinical_risk_score", "user_clinical_records"),
        ("ck_clinical_highest_risk_level", "user_clinical_records"),
        ("ck_clinical_access_level", "user_clinical_records"),
        ("ck_alerts_severity", "alerts"),
        ("ck_campaigns_status", "campaigns"),
        ("ck_campaigns_priority", "campaigns"),
        ("ck_badge_templates_status", "badge_templates"),
        ("ck_badge_issuances_status", "badge_issuances"),
        ("ck_journal_mood_range", "journal_entries"),
    ]:
        try:
            op.drop_constraint(constraint, table, type_="unique" if "uq_" in constraint else "check")
        except Exception:
            pass

    op.alter_column(
        "user_consent_ledger", "consent_version",
        server_default=sa.null(),
        existing_type=sa.String(length=50),
        existing_nullable=False,
    )
