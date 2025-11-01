"""add admin infrastructure tables

Revision ID: add_admin_infra_001
Revises: fix_cases_table_001
Create Date: 2025-10-15 06:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


# revision identifiers, used by Alembic.
revision = 'add_admin_infra_001'
down_revision = 'fix_cases_table_001'
branch_labels = None
depends_on = None


def upgrade():
    # 0. Create triage_assessments table if it doesn't exist
    # This table is required for admin dashboard queries and must exist before creating indexes
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()
    
    if 'triage_assessments' not in existing_tables:
        op.create_table(
            'triage_assessments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('conversation_id', sa.Integer(), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('risk_score', sa.Float(), nullable=False),
            sa.Column('confidence_score', sa.Float(), nullable=False),
            sa.Column('severity_level', sa.String(50), nullable=False),
            sa.Column('risk_factors', sa.JSON(), nullable=True),
            sa.Column('recommended_action', sa.String(100), nullable=True),
            sa.Column('assessment_data', sa.JSON(), nullable=True),
            sa.Column('processing_time_ms', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        )
        op.create_index('ix_triage_assessments_id', 'triage_assessments', ['id'])
        op.create_index('ix_triage_assessments_conversation_id', 'triage_assessments', ['conversation_id'])
        op.create_index('ix_triage_assessments_user_id', 'triage_assessments', ['user_id'])
        op.create_index('ix_triage_assessments_severity_level', 'triage_assessments', ['severity_level'])
        op.create_index('ix_triage_assessments_created_at', 'triage_assessments', ['created_at'])
    
    # 1. Create insights_reports table if it doesn't exist
    if 'insights_reports' not in existing_tables:
        op.create_table(
        'insights_reports',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('report_type', sa.String(50), nullable=False, index=True),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('trending_topics', JSONB, nullable=True),
        sa.Column('sentiment_data', JSONB, nullable=True),
        sa.Column('high_risk_count', sa.Integer(), default=0),
        sa.Column('assessment_count', sa.Integer(), default=0),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('generated_by', sa.String(100), nullable=False, default='ia_agent'),
    )
        op.create_index('ix_insights_reports_report_type', 'insights_reports', ['report_type'])
        op.create_index('ix_insights_reports_generated_at', 'insights_reports', ['generated_at'])
    
    # 2. Create campaigns table if it doesn't exist
    if 'campaigns' not in existing_tables:
        op.create_table(
        'campaigns',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trigger_rules', JSONB, nullable=True),
        sa.Column('message_template', sa.Text(), nullable=False),
        sa.Column('target_audience', JSONB, nullable=True),
        sa.Column('status', sa.String(50), nullable=False, default='draft', index=True),
        sa.Column('priority', sa.String(50), nullable=False, default='medium'),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('last_executed_at', sa.DateTime(timezone=True), nullable=True),
    )
        op.create_index('ix_campaigns_status', 'campaigns', ['status'])
        op.create_index('ix_campaigns_created_at', 'campaigns', ['created_at'])
    
    # 3. Create campaign_triggers table if it doesn't exist
    if 'campaign_triggers' not in existing_tables:
        op.create_table(
        'campaign_triggers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('campaign_id', UUID(as_uuid=True), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('condition_type', sa.String(100), nullable=False),
        sa.Column('condition_value', JSONB, nullable=False),
        sa.Column('evaluation_frequency', sa.String(50), nullable=False, default='daily'),
        sa.Column('last_evaluated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_match_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('match_count', sa.Integer(), default=0),
    )
        op.create_index('ix_campaign_triggers_campaign_id', 'campaign_triggers', ['campaign_id'])
    
    # 4. Create campaign_metrics table if it doesn't exist
    if 'campaign_metrics' not in existing_tables:
        op.create_table(
        'campaign_metrics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('campaign_id', UUID(as_uuid=True), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('execution_date', sa.Date(), nullable=False, index=True),
        sa.Column('messages_sent', sa.Integer(), default=0),
        sa.Column('users_targeted', sa.Integer(), default=0),
        sa.Column('users_engaged', sa.Integer(), default=0),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('avg_sentiment_before', sa.Float(), nullable=True),
        sa.Column('avg_sentiment_after', sa.Float(), nullable=True),
    )
        op.create_index('ix_campaign_metrics_campaign_id', 'campaign_metrics', ['campaign_id'])
        op.create_index('ix_campaign_metrics_execution_date', 'campaign_metrics', ['execution_date'])
    
    # 5. Create system_settings table if it doesn't exist
    if 'system_settings' not in existing_tables:
        op.create_table(
        'system_settings',
        sa.Column('key', sa.String(255), primary_key=True),
        sa.Column('value', JSONB, nullable=False),
        sa.Column('category', sa.String(100), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
        op.create_index('ix_system_settings_category', 'system_settings', ['category'])
    
    # 6. Create agent_health_logs table if it doesn't exist
    if 'agent_health_logs' not in existing_tables:
        op.create_table(
        'agent_health_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('agent_name', sa.String(50), nullable=False, index=True),
        sa.Column('status', sa.String(50), nullable=False, index=True),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_success_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_count', sa.Integer(), default=0),
        sa.Column('performance_metrics', JSONB, nullable=True),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
    )
        op.create_index('ix_agent_health_logs_agent_name', 'agent_health_logs', ['agent_name'])
        op.create_index('ix_agent_health_logs_created_at', 'agent_health_logs', ['created_at'])
    
    # 7. Create case_assignments table (audit trail) if it doesn't exist
    if 'case_assignments' not in existing_tables:
        op.create_table(
        'case_assignments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('case_id', UUID(as_uuid=True), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('assigned_to', sa.String(255), nullable=False),
        sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('reassignment_reason', sa.Text(), nullable=True),
        sa.Column('previous_assignee', sa.String(255), nullable=True),
    )
        op.create_index('ix_case_assignments_case_id', 'case_assignments', ['case_id'])
        op.create_index('ix_case_assignments_assigned_at', 'case_assignments', ['assigned_at'])
    
    # 8. Add indexes to existing cases table for better query performance
    existing_indexes = {idx['name'] for idx in inspector.get_indexes('cases')} if 'cases' in existing_tables else set()
    if 'idx_cases_status' not in existing_indexes:
        op.create_index('idx_cases_status', 'cases', ['status'])
    if 'idx_cases_severity' not in existing_indexes:
        op.create_index('idx_cases_severity', 'cases', ['severity'])
    if 'idx_cases_created_at' not in existing_indexes:
        op.create_index('idx_cases_created_at', 'cases', ['created_at'])
    if 'idx_cases_assigned_to' not in existing_indexes:
        op.create_index('idx_cases_assigned_to', 'cases', ['assigned_to'])
    
    # 9. Add conversation_id FK to cases table (optional, for linking cases to conversations)
    existing_columns = {col['name'] for col in inspector.get_columns('cases')} if 'cases' in existing_tables else set()
    
    if 'conversation_id' not in existing_columns:
        op.add_column('cases', sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True))
        op.create_index('idx_cases_conversation_id', 'cases', ['conversation_id'])
    
    # 10. Add additional indexes to triage_assessments for better dashboard query performance
    # (Basic indexes were created with the table above)
    # Only create these additional indexes if they don't exist
    triage_indexes = {idx['name'] for idx in inspector.get_indexes('triage_assessments')} if 'triage_assessments' in existing_tables else set()
    if 'idx_triage_severity_level' not in triage_indexes:
        try:
            op.create_index('idx_triage_severity_level', 'triage_assessments', ['severity_level'], unique=False)
        except Exception:
            pass  # Index may already exist
    
    if 'idx_triage_created_at' not in triage_indexes:
        try:
            op.create_index('idx_triage_created_at', 'triage_assessments', ['created_at'], unique=False)
        except Exception:
            pass  # Index may already exist
    
    # 11. Insert default system settings
    op.execute("""
        INSERT INTO system_settings (key, value, category, description) VALUES
        ('sta_high_threshold', '0.7', 'sta', 'Risk score threshold for high severity classification'),
        ('sta_critical_threshold', '0.9', 'sta', 'Risk score threshold for critical severity classification'),
        ('sda_sla_critical_minutes', '15', 'sda', 'SLA time in minutes for critical cases'),
        ('sda_sla_high_minutes', '60', 'sda', 'SLA time in minutes for high severity cases'),
        ('ia_report_schedule', '{"day": "sunday", "hour": 2, "minute": 0}', 'ia', 'Schedule for IA weekly report generation'),
        ('ia_email_recipients', '[]', 'ia', 'Email distribution list for IA reports'),
        ('sca_max_campaign_messages_per_day', '100', 'sca', 'Maximum messages SCA can send per campaign per day')
        ON CONFLICT (key) DO NOTHING;
    """)


def downgrade():
    # Drop indexes first (with if_exists to handle optional indexes)
    op.drop_index('idx_triage_created_at', 'triage_assessments', if_exists=True)
    op.drop_index('idx_triage_severity_level', 'triage_assessments', if_exists=True)
    op.drop_index('idx_cases_conversation_id', 'cases', if_exists=True)
    op.drop_column('cases', 'conversation_id', if_exists=True)
    op.drop_index('idx_cases_assigned_to', 'cases')
    op.drop_index('idx_cases_created_at', 'cases')
    op.drop_index('idx_cases_severity', 'cases')
    op.drop_index('idx_cases_status', 'cases')
    
    # Drop tables in reverse order (respecting FK constraints)
    op.drop_table('case_assignments')
    op.drop_table('agent_health_logs')
    op.drop_table('system_settings')
    op.drop_table('campaign_metrics')
    op.drop_table('campaign_triggers')
    op.drop_table('campaigns')
    op.drop_table('insights_reports')
    
    # Note: We do NOT drop triage_assessments here as it may have been created 
    # in a different migration or may be needed by other parts of the system
    # If you need to remove it, create a separate migration
