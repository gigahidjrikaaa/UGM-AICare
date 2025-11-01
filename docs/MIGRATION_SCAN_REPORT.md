# Migration Idempotency Scan Report

**Scan Date:** The current date is: 01/11/2025 
Enter the new date: (dd-mm-yy)

## Summary

- 🔴 High Severity: 268
- 🟡 Medium Severity: 151
- ⚪ Low Severity: 111
- 📁 Total Migrations: 24

## High Priority Migrations (Fix Immediately)

### `042b575a9fe3_add_intervention_plan_records_tables.py`

- **Line 40**: `create_table`
  ```python
  op.create_table('intervention_plan_records',
  ```

- **Line 67**: `create_table`
  ```python
  op.create_table('intervention_plan_step_completions',
  ```

- **Line 61**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_records_conversation_id'), 'intervention_plan_records', ['conversation_id'], unique=False)
  ```

- **Line 62**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_records_created_at'), 'intervention_plan_records', ['created_at'], unique=False)
  ```

- **Line 63**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_records_id'), 'intervention_plan_records', ['id'], unique=False)
  ```

- **Line 64**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_records_session_id'), 'intervention_plan_records', ['session_id'], unique=False)
  ```

- **Line 65**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_records_status'), 'intervention_plan_records', ['status'], unique=False)
  ```

- **Line 66**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_records_user_id'), 'intervention_plan_records', ['user_id'], unique=False)
  ```

- **Line 80**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_step_completions_id'), 'intervention_plan_step_completions', ['id'], unique=False)
  ```

- **Line 81**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_plan_step_completions_plan_id'), 'intervention_plan_step_completions', ['plan_id'], unique=False)
  ```

### `102d43ee6fca_add_quest_engine_v1_tables_revision_1.py`

- **Line 115**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 141**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 154**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 183**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 202**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 221**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 233**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 172**: `create_index`
  ```python
  op.create_index(
  ```

- **Line 177**: `create_index`
  ```python
  op.create_index(
  ```

- **Line 219**: `create_index`
  ```python
  op.create_index("ix_attestation_status", "attestation_records", ["status"])
  ```

- **Line 247**: `create_index`
  ```python
  op.create_index("ix_quest_analytics_events_user_id", "quest_analytics_events", ["user_id"])
  ```

- **Line 248**: `create_index`
  ```python
  op.create_index("ix_quest_analytics_events_instance_id", "quest_analytics_events", ["quest_instance_id"])
  ```

- **Line 249**: `create_index`
  ```python
  op.create_index("ix_reward_ledger_entries_user_id", "reward_ledger_entries", ["user_id"])
  ```

- **Line 250**: `create_index`
  ```python
  op.create_index(
  ```

### `1840440620a5_add_content_resources_table.py`

- **Line 20**: `create_table`
  ```python
  op.create_table('content_resources',
  ```

- **Line 30**: `create_index`
  ```python
  op.create_index(op.f('ix_content_resources_id'), 'content_resources', ['id'], unique=False)
  ```

### `196e622e2990_add_appointments_tables.py`

- **Line 21**: `create_table`
  ```python
  op.create_table('psychologists',
  ```

- **Line 32**: `create_table`
  ```python
  op.create_table('appointment_types',
  ```

- **Line 42**: `create_table`
  ```python
  op.create_table('appointments',
  ```

- **Line 29**: `create_index`
  ```python
  op.create_index(op.f('ix_psychologists_id'), 'psychologists', ['id'], unique=False)
  ```

- **Line 39**: `create_index`
  ```python
  op.create_index(op.f('ix_appointment_types_id'), 'appointment_types', ['id'], unique=False)
  ```

- **Line 57**: `create_index`
  ```python
  op.create_index(op.f('ix_appointments_id'), 'appointments', ['id'], unique=False)
  ```

### `1970e622e299_intervention_table.py`

- **Line 20**: `create_table`
  ```python
  op.create_table('intervention_agent_settings',
  ```

- **Line 36**: `create_index`
  ```python
  op.create_index(op.f('ix_intervention_agent_settings_id'), 'intervention_agent_settings', ['id'], unique=False)
  ```

### `219b264bb1ce_add_admin_infrastructure_tables.py`

- **Line 35**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 54**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 74**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 89**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 106**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 119**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 136**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 50**: `create_index`
  ```python
  op.create_index('ix_insights_reports_report_type', 'insights_reports', ['report_type'])
  ```

- **Line 51**: `create_index`
  ```python
  op.create_index('ix_insights_reports_generated_at', 'insights_reports', ['generated_at'])
  ```

- **Line 70**: `create_index`
  ```python
  op.create_index('ix_campaigns_status', 'campaigns', ['status'])
  ```

- **Line 71**: `create_index`
  ```python
  op.create_index('ix_campaigns_created_at', 'campaigns', ['created_at'])
  ```

- **Line 86**: `create_index`
  ```python
  op.create_index('ix_campaign_triggers_campaign_id', 'campaign_triggers', ['campaign_id'])
  ```

- **Line 102**: `create_index`
  ```python
  op.create_index('ix_campaign_metrics_campaign_id', 'campaign_metrics', ['campaign_id'])
  ```

- **Line 103**: `create_index`
  ```python
  op.create_index('ix_campaign_metrics_execution_date', 'campaign_metrics', ['execution_date'])
  ```

- **Line 116**: `create_index`
  ```python
  op.create_index('ix_system_settings_category', 'system_settings', ['category'])
  ```

- **Line 132**: `create_index`
  ```python
  op.create_index('ix_agent_health_logs_agent_name', 'agent_health_logs', ['agent_name'])
  ```

- **Line 133**: `create_index`
  ```python
  op.create_index('ix_agent_health_logs_created_at', 'agent_health_logs', ['created_at'])
  ```

- **Line 147**: `create_index`
  ```python
  op.create_index('ix_case_assignments_case_id', 'case_assignments', ['case_id'])
  ```

- **Line 148**: `create_index`
  ```python
  op.create_index('ix_case_assignments_assigned_at', 'case_assignments', ['assigned_at'])
  ```

- **Line 151**: `create_index`
  ```python
  op.create_index('ix_cases_status', 'cases', ['status'])
  ```

- **Line 152**: `create_index`
  ```python
  op.create_index('ix_cases_severity', 'cases', ['severity'])
  ```

- **Line 153**: `create_index`
  ```python
  op.create_index('ix_cases_created_at', 'cases', ['created_at'])
  ```

- **Line 154**: `create_index`
  ```python
  op.create_index('ix_triage_assessments_severity_level', 'triage_assessments', ['severity_level'])
  ```

### `229cc89f0375_add_user_profile_enhancements.py`

- **Line 22**: `add_column`
  ```python
  op.add_column('users', sa.Column('profile_photo_url', sa.String(), nullable=True))
  ```

- **Line 23**: `add_column`
  ```python
  op.add_column('users', sa.Column('preferred_name', sa.String(), nullable=True))
  ```

- **Line 24**: `add_column`
  ```python
  op.add_column('users', sa.Column('pronouns', sa.String(), nullable=True))
  ```

- **Line 25**: `add_column`
  ```python
  op.add_column('users', sa.Column('alternate_phone', sa.String(), nullable=True))
  ```

- **Line 26**: `add_column`
  ```python
  op.add_column('users', sa.Column('check_in_code', sa.String(length=64), nullable=True))
  ```

- **Line 27**: `add_column`
  ```python
  op.add_column('users', sa.Column('emergency_contact_name', sa.String(), nullable=True))
  ```

- **Line 28**: `add_column`
  ```python
  op.add_column('users', sa.Column('emergency_contact_relationship', sa.String(), nullable=True))
  ```

- **Line 29**: `add_column`
  ```python
  op.add_column('users', sa.Column('emergency_contact_phone', sa.String(), nullable=True))
  ```

- **Line 30**: `add_column`
  ```python
  op.add_column('users', sa.Column('emergency_contact_email', sa.String(), nullable=True))
  ```

- **Line 31**: `add_column`
  ```python
  op.add_column('users', sa.Column('risk_level', sa.String(), nullable=True))
  ```

- **Line 32**: `add_column`
  ```python
  op.add_column('users', sa.Column('clinical_summary', sa.Text(), nullable=True))
  ```

- **Line 33**: `add_column`
  ```python
  op.add_column('users', sa.Column('primary_concerns', sa.Text(), nullable=True))
  ```

- **Line 34**: `add_column`
  ```python
  op.add_column('users', sa.Column('safety_plan_notes', sa.Text(), nullable=True))
  ```

- **Line 35**: `add_column`
  ```python
  op.add_column('users', sa.Column('current_therapist_name', sa.String(), nullable=True))
  ```

- **Line 36**: `add_column`
  ```python
  op.add_column('users', sa.Column('current_therapist_contact', sa.String(), nullable=True))
  ```

- **Line 37**: `add_column`
  ```python
  op.add_column('users', sa.Column('therapy_modality', sa.String(), nullable=True))
  ```

- **Line 38**: `add_column`
  ```python
  op.add_column('users', sa.Column('therapy_frequency', sa.String(), nullable=True))
  ```

- **Line 39**: `add_column`
  ```python
  op.add_column('users', sa.Column('therapy_notes', sa.Text(), nullable=True))
  ```

- **Line 40**: `add_column`
  ```python
  op.add_column(
  ```

- **Line 44**: `add_column`
  ```python
  op.add_column(
  ```

- **Line 48**: `add_column`
  ```python
  op.add_column(
  ```

- **Line 52**: `add_column`
  ```python
  op.add_column(
  ```

- **Line 56**: `add_column`
  ```python
  op.add_column('users', sa.Column('preferred_language', sa.String(), nullable=True))
  ```

- **Line 57**: `add_column`
  ```python
  op.add_column('users', sa.Column('preferred_timezone', sa.String(), nullable=True))
  ```

- **Line 58**: `add_column`
  ```python
  op.add_column('users', sa.Column('accessibility_needs', sa.Text(), nullable=True))
  ```

- **Line 59**: `add_column`
  ```python
  op.add_column('users', sa.Column('communication_preferences', sa.Text(), nullable=True))
  ```

- **Line 60**: `add_column`
  ```python
  op.add_column('users', sa.Column('interface_preferences', sa.Text(), nullable=True))
  ```

- **Line 61**: `add_column`
  ```python
  op.add_column('users', sa.Column('aicare_team_notes', sa.Text(), nullable=True))
  ```

### `2e01d72c41b0_add_therapist_schedules_table.py`

- **Line 20**: `create_table`
  ```python
  op.create_table('therapist_schedules',
  ```

- **Line 31**: `create_index`
  ```python
  op.create_index(op.f('ix_therapist_schedules_id'), 'therapist_schedules', ['id'], unique=False)
  ```

### `43029bbefb9d_add_alerts_table_phase4.py`

- **Line 46**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 64**: `create_index`
  ```python
  op.create_index('ix_alerts_alert_type', 'alerts', ['alert_type'])
  ```

- **Line 65**: `create_index`
  ```python
  op.create_index('ix_alerts_severity', 'alerts', ['severity'])
  ```

- **Line 66**: `create_index`
  ```python
  op.create_index('ix_alerts_entity_id', 'alerts', ['entity_id'])
  ```

- **Line 67**: `create_index`
  ```python
  op.create_index('ix_alerts_is_seen', 'alerts', ['is_seen'])
  ```

- **Line 68**: `create_index`
  ```python
  op.create_index('ix_alerts_created_at', 'alerts', ['created_at'])
  ```

- **Line 71**: `create_index`
  ```python
  op.create_index('ix_alerts_seen_created', 'alerts', ['is_seen', 'created_at'])
  ```

### `756c4fde7a1b_add_category_field_to_surveys.py`

- **Line 24**: `add_column`
  ```python
  op.add_column('surveys', sa.Column('category', sa.String(length=100), nullable=True))
  ```

- **Line 20**: `create_index`
  ```python
  op.create_index(op.f('ix_agent_messages_id'), 'agent_messages', ['id'], unique=False)
  ```

- **Line 23**: `create_index`
  ```python
  op.create_index(op.f('ix_agent_runs_id'), 'agent_runs', ['id'], unique=False)
  ```

- **Line 22**: `create_foreign_key`
  ```python
  op.create_foreign_key(None, 'agent_messages', 'agent_runs', ['run_id'], ['id'])
  ```

- **Line 33**: `create_foreign_key`
  ```python
  op.create_foreign_key('agent_messages_run_id_fkey', 'agent_messages', 'agent_runs', ['run_id'], ['id'], ondelete='CASCADE')
  ```

### `7a8a556dff02_add_survey_tables.py`

- **Line 20**: `create_table`
  ```python
  op.create_table('surveys',
  ```

- **Line 30**: `create_table`
  ```python
  op.create_table('survey_questions',
  ```

- **Line 42**: `create_table`
  ```python
  op.create_table('survey_responses',
  ```

- **Line 52**: `create_table`
  ```python
  op.create_table('survey_answers',
  ```

- **Line 29**: `create_index`
  ```python
  op.create_index(op.f('ix_surveys_id'), 'surveys', ['id'], unique=False)
  ```

- **Line 41**: `create_index`
  ```python
  op.create_index(op.f('ix_survey_questions_id'), 'survey_questions', ['id'], unique=False)
  ```

- **Line 51**: `create_index`
  ```python
  op.create_index(op.f('ix_survey_responses_id'), 'survey_responses', ['id'], unique=False)
  ```

- **Line 61**: `create_index`
  ```python
  op.create_index(op.f('ix_survey_answers_id'), 'survey_answers', ['id'], unique=False)
  ```

### `84b70966366d_drop_unused_email_tables.py`

- **Line 76**: `create_table`
  ```python
  op.create_table('email_groups',
  ```

- **Line 85**: `create_table`
  ```python
  op.create_table('email_recipients',
  ```

- **Line 94**: `create_table`
  ```python
  op.create_table('email_logs',
  ```

### `87ae07d03632_add_campaign_tables_phase5.py`

- **Line 92**: `add_column`
  ```python
  op.add_column('consents', sa.Column('subject_id', sa.String(), nullable=False))
  ```

- **Line 93**: `add_column`
  ```python
  op.add_column('consents', sa.Column('evidence_uri', sa.String(), nullable=True))
  ```

- **Line 105**: `add_column`
  ```python
  op.add_column('events', sa.Column('user_hash', sa.String(), nullable=False))
  ```

- **Line 106**: `add_column`
  ```python
  op.add_column('events', sa.Column('session_id', sa.String(), nullable=True))
  ```

- **Line 107**: `add_column`
  ```python
  op.add_column('events', sa.Column('intent', sa.String(), nullable=True))
  ```

- **Line 108**: `add_column`
  ```python
  op.add_column('events', sa.Column('risk_flag', sa.SmallInteger(), nullable=True))
  ```

- **Line 109**: `add_column`
  ```python
  op.add_column('events', sa.Column('step', sa.String(), nullable=False))
  ```

- **Line 110**: `add_column`
  ```python
  op.add_column('events', sa.Column('resource_id', sa.String(), nullable=True))
  ```

- **Line 111**: `add_column`
  ```python
  op.add_column('events', sa.Column('latency_ms', sa.Integer(), nullable=True))
  ```

- **Line 112**: `add_column`
  ```python
  op.add_column('events', sa.Column('tokens_in', sa.Integer(), nullable=True))
  ```

- **Line 113**: `add_column`
  ```python
  op.add_column('events', sa.Column('tokens_out', sa.Integer(), nullable=True))
  ```

- **Line 114**: `add_column`
  ```python
  op.add_column('events', sa.Column('cost_cents', sa.Integer(), nullable=True))
  ```

- **Line 115**: `add_column`
  ```python
  op.add_column('events', sa.Column('outcome', sa.String(), nullable=True))
  ```

- **Line 116**: `add_column`
  ```python
  op.add_column('events', sa.Column('consent_scope', sa.String(), nullable=True))
  ```

- **Line 145**: `add_column`
  ```python
  op.add_column('messages', sa.Column('session_id', sa.String(), nullable=False))
  ```

- **Line 146**: `add_column`
  ```python
  op.add_column('messages', sa.Column('content_redacted', sa.Text(), nullable=False))
  ```

- **Line 147**: `add_column`
  ```python
  op.add_column('messages', sa.Column('tools_used', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
  ```

- **Line 148**: `add_column`
  ```python
  op.add_column('messages', sa.Column('trace_id', sa.String(), nullable=True))
  ```

- **Line 149**: `add_column`
  ```python
  op.add_column('messages', sa.Column('ts', sa.DateTime(timezone=True), nullable=False))
  ```

- **Line 176**: `add_column`
  ```python
  op.add_column('resources', sa.Column('resource_id', sa.String(), nullable=False))
  ```

- **Line 177**: `add_column`
  ```python
  op.add_column('resources', sa.Column('category', sa.String(), nullable=True))
  ```

- **Line 178**: `add_column`
  ```python
  op.add_column('resources', sa.Column('eligibility', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
  ```

- **Line 179**: `add_column`
  ```python
  op.add_column('resources', sa.Column('contact', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
  ```

- **Line 180**: `add_column`
  ```python
  op.add_column('resources', sa.Column('active', sa.Boolean(), nullable=False))
  ```

- **Line 204**: `add_column`
  ```python
  op.add_column('resources', sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True))
  ```

- **Line 205**: `add_column`
  ```python
  op.add_column('resources', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
  ```

- **Line 206**: `add_column`
  ```python
  op.add_column('resources', sa.Column('type', sa.VARCHAR(length=100), autoincrement=False, nullable=False))
  ```

- **Line 207**: `add_column`
  ```python
  op.add_column('resources', sa.Column('content', sa.TEXT(), autoincrement=False, nullable=True))
  ```

- **Line 208**: `add_column`
  ```python
  op.add_column('resources', sa.Column('id', sa.UUID(), autoincrement=False, nullable=False))
  ```

- **Line 209**: `add_column`
  ```python
  op.add_column('resources', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
  ```

- **Line 210**: `add_column`
  ```python
  op.add_column('resources', sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True))
  ```

- **Line 232**: `add_column`
  ```python
  op.add_column('messages', sa.Column('conversation_id', sa.INTEGER(), autoincrement=False, nullable=False))
  ```

- **Line 233**: `add_column`
  ```python
  op.add_column('messages', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
  ```

- **Line 234**: `add_column`
  ```python
  op.add_column('messages', sa.Column('agent', postgresql.ENUM('STA', 'SCA', 'SDA', 'IA', name='agent_name_enum'), autoincrement=False, nullable=True))
  ```

- **Line 235**: `add_column`
  ```python
  op.add_column('messages', sa.Column('content', sa.TEXT(), autoincrement=False, nullable=False))
  ```

- **Line 236**: `add_column`
  ```python
  op.add_column('messages', sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True))
  ```

- **Line 237**: `add_column`
  ```python
  op.add_column('messages', sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True))
  ```

- **Line 262**: `add_column`
  ```python
  op.add_column('events', sa.Column('conversation_id', sa.INTEGER(), autoincrement=False, nullable=True))
  ```

- **Line 263**: `add_column`
  ```python
  op.add_column('events', sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True))
  ```

- **Line 264**: `add_column`
  ```python
  op.add_column('events', sa.Column('event_type', sa.VARCHAR(length=100), autoincrement=False, nullable=False))
  ```

- **Line 265**: `add_column`
  ```python
  op.add_column('events', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
  ```

- **Line 266**: `add_column`
  ```python
  op.add_column('events', sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True))
  ```

- **Line 292**: `add_column`
  ```python
  op.add_column('consents', sa.Column('granted', sa.BOOLEAN(), server_default=sa.text('false'), autoincrement=False, nullable=False))
  ```

- **Line 293**: `add_column`
  ```python
  op.add_column('consents', sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False))
  ```

- **Line 294**: `add_column`
  ```python
  op.add_column('consents', sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True))
  ```

- **Line 295**: `add_column`
  ```python
  op.add_column('consents', sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True))
  ```

- **Line 336**: `add_column`
  ```python
  op.add_column('agent_users', sa.Column('email', sa.VARCHAR(length=255), autoincrement=False, nullable=False))
  ```

- **Line 337**: `add_column`
  ```python
  op.add_column('agent_users', sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True))
  ```

- **Line 338**: `add_column`
  ```python
  op.add_column('agent_users', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
  ```

- **Line 339**: `add_column`
  ```python
  op.add_column('agent_users', sa.Column('name', sa.VARCHAR(length=255), autoincrement=False, nullable=False))
  ```

- **Line 340**: `add_column`
  ```python
  op.add_column('agent_users', sa.Column('is_active', sa.BOOLEAN(), server_default=sa.text('true'), autoincrement=False, nullable=False))
  ```

- **Line 355**: `create_table`
  ```python
  op.create_table('intervention_agent_settings',
  ```

- **Line 124**: `create_index`
  ```python
  op.create_index('ix_events_agent_created_at', 'events', ['agent', 'created_at'], unique=False)
  ```

- **Line 125**: `create_index`
  ```python
  op.create_index('ix_events_intent_created_at', 'events', ['intent', 'created_at'], unique=False)
  ```

- **Line 126**: `create_index`
  ```python
  op.create_index('ix_events_risk_flag_created_at', 'events', ['risk_flag', 'created_at'], unique=False)
  ```

- **Line 127**: `create_index`
  ```python
  op.create_index(op.f('ix_events_user_hash'), 'events', ['user_hash'], unique=False)
  ```

- **Line 135**: `create_index`
  ```python
  op.create_index(op.f('ix_flagged_sessions_id'), 'flagged_sessions', ['id'], unique=False)
  ```

- **Line 136**: `create_index`
  ```python
  op.create_index(op.f('ix_flagged_sessions_status'), 'flagged_sessions', ['status'], unique=False)
  ```

- **Line 154**: `create_index`
  ```python
  op.create_index(op.f('ix_messages_session_id'), 'messages', ['session_id'], unique=False)
  ```

- **Line 155**: `create_index`
  ```python
  op.create_index('ix_messages_tools_used', 'messages', ['tools_used'], unique=False, postgresql_using='gin')
  ```

- **Line 156**: `create_index`
  ```python
  op.create_index(op.f('ix_messages_ts'), 'messages', ['ts'], unique=False)
  ```

- **Line 175**: `create_index`
  ```python
  op.create_index(op.f('ix_psychologists_user_id'), 'psychologists', ['user_id'], unique=True)
  ```

- **Line 195**: `create_index`
  ```python
  op.create_index(op.f('ix_user_summaries_id'), 'user_summaries', ['id'], unique=False)
  ```

- **Line 202**: `create_index`
  ```python
  op.create_index('idx_triage_severity_level', 'triage_assessments', ['severity_level'], unique=False)
  ```

- **Line 203**: `create_index`
  ```python
  op.create_index('idx_triage_created_at', 'triage_assessments', ['created_at'], unique=False)
  ```

- **Line 211**: `create_index`
  ```python
  op.create_index('ix_resources_type', 'resources', ['type'], unique=False)
  ```

- **Line 222**: `create_index`
  ```python
  op.create_index('ix_psychologists_user_id', 'psychologists', ['user_id'], unique=False)
  ```

- **Line 243**: `create_index`
  ```python
  op.create_index('ix_messages_user_id', 'messages', ['user_id'], unique=False)
  ```

- **Line 244**: `create_index`
  ```python
  op.create_index('ix_messages_created_at', 'messages', ['created_at'], unique=False)
  ```

- **Line 245**: `create_index`
  ```python
  op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'], unique=False)
  ```

- **Line 246**: `create_index`
  ```python
  op.create_index('ix_messages_agent', 'messages', ['agent'], unique=False)
  ```

- **Line 273**: `create_index`
  ```python
  op.create_index('ix_events_user_id', 'events', ['user_id'], unique=False)
  ```

- **Line 274**: `create_index`
  ```python
  op.create_index('ix_events_conversation_id', 'events', ['conversation_id'], unique=False)
  ```

- **Line 275**: `create_index`
  ```python
  op.create_index('ix_events_agent', 'events', ['agent'], unique=False)
  ```

- **Line 298**: `create_index`
  ```python
  op.create_index('ix_consents_user_id', 'consents', ['user_id'], unique=False)
  ```

- **Line 299**: `create_index`
  ```python
  op.create_index('ix_consents_scope', 'consents', ['scope'], unique=False)
  ```

- **Line 305**: `create_index`
  ```python
  op.create_index('ix_cases_status', 'cases', ['status'], unique=False)
  ```

- **Line 306**: `create_index`
  ```python
  op.create_index('ix_cases_assigned_to', 'cases', ['assigned_to'], unique=False)
  ```

- **Line 307**: `create_index`
  ```python
  op.create_index('idx_cases_status', 'cases', ['status'], unique=False)
  ```

- **Line 308**: `create_index`
  ```python
  op.create_index('idx_cases_severity', 'cases', ['severity'], unique=False)
  ```

- **Line 309**: `create_index`
  ```python
  op.create_index('idx_cases_created_at', 'cases', ['created_at'], unique=False)
  ```

- **Line 310**: `create_index`
  ```python
  op.create_index('idx_cases_conversation_id', 'cases', ['conversation_id'], unique=False)
  ```

- **Line 311**: `create_index`
  ```python
  op.create_index('idx_cases_assigned_to', 'cases', ['assigned_to'], unique=False)
  ```

- **Line 335**: `create_index`
  ```python
  op.create_index('ix_alerts_seen_created', 'alerts', ['is_seen', 'created_at'], unique=False)
  ```

- **Line 341**: `create_index`
  ```python
  op.create_index('ix_agent_users_role', 'agent_users', ['role'], unique=False)
  ```

- **Line 342**: `create_index`
  ```python
  op.create_index('ix_agent_users_email', 'agent_users', ['email'], unique=False)
  ```

- **Line 371**: `create_index`
  ```python
  op.create_index('ix_intervention_agent_settings_id', 'intervention_agent_settings', ['id'], unique=False)
  ```

- **Line 137**: `create_foreign_key`
  ```python
  op.create_foreign_key(None, 'flagged_sessions', 'users', ['user_id'], ['id'])
  ```

- **Line 138**: `create_foreign_key`
  ```python
  op.create_foreign_key(None, 'flagged_sessions', 'users', ['flagged_by_admin_id'], ['id'])
  ```

- **Line 238**: `create_foreign_key`
  ```python
  op.create_foreign_key('messages_conversation_id_fkey', 'messages', 'conversations', ['conversation_id'], ['id'], ondelete='CASCADE')
  ```

- **Line 239**: `create_foreign_key`
  ```python
  op.create_foreign_key('messages_user_id_fkey', 'messages', 'users', ['user_id'], ['id'])
  ```

- **Line 267**: `create_foreign_key`
  ```python
  op.create_foreign_key('events_user_id_fkey', 'events', 'users', ['user_id'], ['id'])
  ```

- **Line 268**: `create_foreign_key`
  ```python
  op.create_foreign_key('events_conversation_id_fkey', 'events', 'conversations', ['conversation_id'], ['id'])
  ```

- **Line 296**: `create_foreign_key`
  ```python
  op.create_foreign_key('consents_user_id_fkey', 'consents', 'users', ['user_id'], ['id'], ondelete='CASCADE')
  ```

### `92227960c1f8_.py`

- **Line 21**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 52**: `create_index`
  ```python
  op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
  ```

- **Line 53**: `create_index`
  ```python
  op.create_index(op.f('ix_users_google_sub'), 'users', ['google_sub'], unique=True)
  ```

- **Line 54**: `create_index`
  ```python
  op.create_index(op.f('ix_users_twitter_id'), 'users', ['twitter_id'], unique=True)
  ```

- **Line 55**: `create_index`
  ```python
  op.create_index(op.f('ix_users_wallet_address'), 'users', ['wallet_address'], unique=True)
  ```

- **Line 56**: `create_index`
  ```python
  op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
  ```

### `add_admin_infra_001_add_admin_infrastructure.py`

- **Line 55**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 71**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 88**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 101**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 115**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 126**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 140**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 48**: `create_index`
  ```python
  op.create_index('ix_triage_assessments_id', 'triage_assessments', ['id'])
  ```

- **Line 49**: `create_index`
  ```python
  op.create_index('ix_triage_assessments_conversation_id', 'triage_assessments', ['conversation_id'])
  ```

- **Line 50**: `create_index`
  ```python
  op.create_index('ix_triage_assessments_user_id', 'triage_assessments', ['user_id'])
  ```

- **Line 51**: `create_index`
  ```python
  op.create_index('ix_triage_assessments_severity_level', 'triage_assessments', ['severity_level'])
  ```

- **Line 52**: `create_index`
  ```python
  op.create_index('ix_triage_assessments_created_at', 'triage_assessments', ['created_at'])
  ```

- **Line 152**: `create_index`
  ```python
  op.create_index('idx_cases_status', 'cases', ['status'])
  ```

- **Line 153**: `create_index`
  ```python
  op.create_index('idx_cases_severity', 'cases', ['severity'])
  ```

- **Line 154**: `create_index`
  ```python
  op.create_index('idx_cases_created_at', 'cases', ['created_at'])
  ```

- **Line 155**: `create_index`
  ```python
  op.create_index('idx_cases_assigned_to', 'cases', ['assigned_to'])
  ```

- **Line 175**: `create_index`
  ```python
  op.create_index('idx_triage_created_at', 'triage_assessments', ['created_at'], unique=False)
  ```

### `b669f9bb823a_add_password_reset_token_fields_to_user_.py`

- **Line 20**: `add_column`
  ```python
  op.add_column('users', sa.Column('password_reset_token', sa.String(), nullable=True))
  ```

- **Line 21**: `add_column`
  ```python
  op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(), nullable=True))
  ```

### `b9cb60d86e19_add_campaign_executions_table_for_audit_.py`

- **Line 40**: `create_table`
  ```python
  op.create_table(
  ```

- **Line 60**: `create_index`
  ```python
  op.create_index('ix_sca_campaign_executions_campaign_id', 'sca_campaign_executions', ['campaign_id'])
  ```

- **Line 61**: `create_index`
  ```python
  op.create_index('ix_sca_campaign_executions_executed_at', 'sca_campaign_executions', ['executed_at'])
  ```

### `c613d13854df_add_conversations_tables.py`

- **Line 21**: `create_table`
  ```python
  op.create_table('conversations',
  ```

- **Line 37**: `create_table`
  ```python
  op.create_table('user_summaries',
  ```

- **Line 32**: `create_index`
  ```python
  op.create_index(op.f('ix_conversations_id'), 'conversations', ['id'], unique=False)
  ```

- **Line 33**: `create_index`
  ```python
  op.create_index(op.f('ix_conversations_session_id'), 'conversations', ['session_id'], unique=False)
  ```

- **Line 34**: `create_index`
  ```python
  op.create_index(op.f('ix_conversations_conversation_id'), 'conversations', ['conversation_id'], unique=False)
  ```

- **Line 46**: `create_index`
  ```python
  op.create_index(op.f('ix_user_summaries_user_id'), 'user_summaries', ['user_id'], unique=False)
  ```

- **Line 47**: `create_index`
  ```python
  op.create_index(op.f('ix_user_summaries_summarized_session_id'), 'user_summaries', ['summarized_session_id'], unique=False)
  ```

### `d2f6c9f0d7a5_update_content_resource_storage.py`

- **Line 21**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('description', sa.Text(), nullable=True))
  ```

- **Line 22**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('tags', sa.JSON(), nullable=True, server_default='[]'))
  ```

- **Line 23**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('metadata', sa.JSON(), nullable=True, server_default='{}'))
  ```

- **Line 24**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('mime_type', sa.String(length=100), nullable=True))
  ```

- **Line 25**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('storage_backend', sa.String(length=50), nullable=False, server_default='database'))
  ```

- **Line 26**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('object_storage_key', sa.String(length=255), nullable=True))
  ```

- **Line 27**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('object_storage_bucket', sa.String(length=255), nullable=True))
  ```

- **Line 28**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('embedding_status', sa.String(length=50), nullable=False, server_default='pending'))
  ```

- **Line 29**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('embedding_last_processed_at', sa.DateTime(), nullable=True))
  ```

- **Line 30**: `add_column`
  ```python
  op.add_column('content_resources', sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'))
  ```

### `e574b9ff31e8_add_cbt_module_steps_table.py`

- **Line 21**: `create_table`
  ```python
  op.create_table('cbt_module_steps',
  ```

- **Line 42**: `create_index`
  ```python
  op.create_index(op.f('ix_cbt_module_steps_id'), 'cbt_module_steps', ['id'], unique=False)
  ```

### `f2131696e189_add_cbt_modules_table.py`

- **Line 21**: `create_table`
  ```python
  op.create_table('cbt_modules',
  ```

- **Line 29**: `create_index`
  ```python
  op.create_index(op.f('ix_cbt_modules_id'), 'cbt_modules', ['id'], unique=False)
  ```

### `link_psych_users_001_link_psychologists_to_users.py`

- **Line 21**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('user_id', sa.Integer(), nullable=True))
  ```

- **Line 24**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('bio', sa.Text(), nullable=True))
  ```

- **Line 25**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('education', sa.JSON(), nullable=True))
  ```

- **Line 26**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('certifications', sa.JSON(), nullable=True))
  ```

- **Line 27**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('years_of_experience', sa.Integer(), nullable=True))
  ```

- **Line 28**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('languages', sa.JSON(), nullable=True))
  ```

- **Line 29**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('consultation_fee', sa.Float(), nullable=True))
  ```

- **Line 30**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('availability_schedule', sa.JSON(), nullable=True))
  ```

- **Line 31**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('rating', sa.Float(), default=0.0, nullable=True))
  ```

- **Line 32**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('total_reviews', sa.Integer(), default=0, nullable=True))
  ```

- **Line 33**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
  ```

- **Line 34**: `add_column`
  ```python
  op.add_column('psychologists', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
  ```

- **Line 50**: `create_index`
  ```python
  op.create_index('ix_psychologists_user_id', 'psychologists', ['user_id'])
  ```

- **Line 51**: `create_index`
  ```python
  op.create_index('ix_psychologists_is_available', 'psychologists', ['is_available'])
  ```

- **Line 37**: `create_foreign_key`
  ```python
  op.create_foreign_key(
  ```

## Medium Priority Migrations

### `042b575a9fe3_add_intervention_plan_records_tables.py`

- **Line 89**: `drop_table`

- **Line 96**: `drop_table`

### `102d43ee6fca_add_quest_engine_v1_tables_revision_1.py`

- **Line 266**: `drop_table`

- **Line 267**: `drop_table`

- **Line 268**: `drop_table`

- **Line 269**: `drop_table`

- **Line 270**: `drop_table`

- **Line 271**: `drop_table`

- **Line 272**: `drop_table`

### `1840440620a5_add_content_resources_table.py`

- **Line 45**: `drop_table`

### `196e622e2990_add_appointments_tables.py`

- **Line 62**: `drop_table`

- **Line 64**: `drop_table`

- **Line 66**: `drop_table`

### `1970e622e299_intervention_table.py`

- **Line 198**: `drop_column`

- **Line 199**: `drop_column`

- **Line 207**: `drop_table`

### `20250922_add_agent_runs_and_messages.py`

- **Line 82**: `drop_table`

- **Line 83**: `drop_table`

### `219b264bb1ce_add_admin_infrastructure_tables.py`

- **Line 176**: `drop_table`

- **Line 180**: `drop_table`

- **Line 183**: `drop_table`

- **Line 187**: `drop_table`

- **Line 190**: `drop_table`

- **Line 194**: `drop_table`

- **Line 198**: `drop_table`

### `229cc89f0375_add_user_profile_enhancements.py`

- **Line 82**: `drop_column`

- **Line 83**: `drop_column`

- **Line 84**: `drop_column`

- **Line 85**: `drop_column`

- **Line 86**: `drop_column`

- **Line 87**: `drop_column`

- **Line 88**: `drop_column`

- **Line 89**: `drop_column`

- **Line 90**: `drop_column`

- **Line 91**: `drop_column`

- **Line 92**: `drop_column`

- **Line 93**: `drop_column`

- **Line 94**: `drop_column`

- **Line 95**: `drop_column`

- **Line 96**: `drop_column`

- **Line 97**: `drop_column`

- **Line 98**: `drop_column`

- **Line 99**: `drop_column`

- **Line 100**: `drop_column`

- **Line 101**: `drop_column`

- **Line 102**: `drop_column`

- **Line 103**: `drop_column`

- **Line 104**: `drop_column`

- **Line 105**: `drop_column`

- **Line 106**: `drop_column`

- **Line 107**: `drop_column`

- **Line 108**: `drop_column`

- **Line 109**: `drop_column`

### `2e01d72c41b0_add_therapist_schedules_table.py`

- **Line 38**: `drop_table`

### `43029bbefb9d_add_alerts_table_phase4.py`

- **Line 82**: `drop_table`

### `612167b98a55_add_topic_exceprts.py`

- **Line 36**: `drop_column`

- **Line 37**: `drop_column`

- **Line 38**: `drop_column`

- **Line 39**: `drop_column`

- **Line 40**: `drop_column`

- **Line 41**: `drop_column`

### `756c4fde7a1b_add_category_field_to_surveys.py`

- **Line 30**: `drop_column`

### `7a8a556dff02_add_survey_tables.py`

- **Line 68**: `drop_table`

- **Line 70**: `drop_table`

- **Line 72**: `drop_table`

- **Line 74**: `drop_table`

### `87ae07d03632_add_campaign_tables_phase5.py`

- **Line 56**: `drop_column`

- **Line 57**: `drop_column`

- **Line 58**: `drop_column`

- **Line 59**: `drop_column`

- **Line 60**: `drop_column`

- **Line 101**: `drop_column`

- **Line 102**: `drop_column`

- **Line 103**: `drop_column`

- **Line 104**: `drop_column`

- **Line 130**: `drop_column`

- **Line 131**: `drop_column`

- **Line 132**: `drop_column`

- **Line 133**: `drop_column`

- **Line 134**: `drop_column`

- **Line 159**: `drop_column`

- **Line 160**: `drop_column`

- **Line 161**: `drop_column`

- **Line 162**: `drop_column`

- **Line 163**: `drop_column`

- **Line 164**: `drop_column`

- **Line 186**: `drop_column`

- **Line 187**: `drop_column`

- **Line 188**: `drop_column`

- **Line 189**: `drop_column`

- **Line 190**: `drop_column`

- **Line 191**: `drop_column`

- **Line 192**: `drop_column`

- **Line 216**: `drop_column`

- **Line 217**: `drop_column`

- **Line 218**: `drop_column`

- **Line 219**: `drop_column`

- **Line 220**: `drop_column`

- **Line 247**: `drop_column`

- **Line 248**: `drop_column`

- **Line 249**: `drop_column`

- **Line 250**: `drop_column`

- **Line 251**: `drop_column`

- **Line 280**: `drop_column`

- **Line 281**: `drop_column`

- **Line 282**: `drop_column`

- **Line 283**: `drop_column`

- **Line 284**: `drop_column`

- **Line 285**: `drop_column`

- **Line 286**: `drop_column`

- **Line 287**: `drop_column`

- **Line 288**: `drop_column`

- **Line 289**: `drop_column`

- **Line 290**: `drop_column`

- **Line 291**: `drop_column`

- **Line 303**: `drop_column`

- **Line 304**: `drop_column`

- **Line 41**: `drop_table`

### `92227960c1f8_.py`

- **Line 60**: `drop_table`

### `add_admin_infra_001_add_admin_infrastructure.py`

- **Line 209**: `drop_table`

- **Line 210**: `drop_table`

- **Line 211**: `drop_table`

### `b669f9bb823a_add_password_reset_token_fields_to_user_.py`

- **Line 27**: `drop_column`

- **Line 28**: `drop_column`

### `b9cb60d86e19_add_campaign_executions_table_for_audit_.py`

- **Line 67**: `drop_table`

### `c613d13854df_add_conversations_tables.py`

- **Line 53**: `drop_table`

- **Line 58**: `drop_table`

### `d2f6c9f0d7a5_update_content_resource_storage.py`

- **Line 41**: `drop_column`

- **Line 42**: `drop_column`

- **Line 43**: `drop_column`

- **Line 44**: `drop_column`

- **Line 45**: `drop_column`

- **Line 46**: `drop_column`

- **Line 47**: `drop_column`

- **Line 48**: `drop_column`

- **Line 49**: `drop_column`

- **Line 50**: `drop_column`

### `e574b9ff31e8_add_cbt_module_steps_table.py`

- **Line 49**: `drop_table`

### `f2131696e189_add_cbt_modules_table.py`

- **Line 36**: `drop_table`

### `link_psych_users_001_link_psychologists_to_users.py`

- **Line 66**: `drop_column`

- **Line 67**: `drop_column`

- **Line 68**: `drop_column`

- **Line 69**: `drop_column`

- **Line 70**: `drop_column`

- **Line 71**: `drop_column`

- **Line 72**: `drop_column`

- **Line 73**: `drop_column`

- **Line 74**: `drop_column`

- **Line 75**: `drop_column`

- **Line 76**: `drop_column`

- **Line 77**: `drop_column`

