"""add conversation risk assessments table

Revision ID: c7a8b9d0e1f2
Revises: 92227960c1f8
Create Date: 2025-11-18 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c7a8b9d0e1f2'
down_revision = '92227960c1f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'conversation_risk_assessments',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('conversation_id', sa.String(length=255), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('overall_risk_level', sa.String(length=32), nullable=False),
        sa.Column('risk_trend', sa.String(length=32), nullable=False),
        sa.Column('conversation_summary', sa.Text(), nullable=False),
        sa.Column('user_context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('protective_factors', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('concerns', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('recommended_actions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('should_invoke_cma', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('reasoning', sa.Text(), nullable=False),
        sa.Column('message_count', sa.Integer(), nullable=False),
        sa.Column('conversation_duration_seconds', sa.Float(), nullable=True),
        sa.Column('analysis_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('raw_assessment', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_conversation_risk_assessments_conversation_id', 'conversation_risk_assessments', ['conversation_id'], unique=False)
    op.create_index('ix_conversation_risk_assessments_session_id', 'conversation_risk_assessments', ['session_id'], unique=False)
    op.create_index('ix_conversation_risk_assessments_user_id', 'conversation_risk_assessments', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_conversation_risk_assessments_user_id', table_name='conversation_risk_assessments')
    op.drop_index('ix_conversation_risk_assessments_session_id', table_name='conversation_risk_assessments')
    op.drop_index('ix_conversation_risk_assessments_conversation_id', table_name='conversation_risk_assessments')
    op.drop_table('conversation_risk_assessments')
