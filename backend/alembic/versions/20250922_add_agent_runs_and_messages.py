"""add agent_runs and agent_messages tables

Revision ID: 20250922_add_agent_runs_and_messages
Revises: e574b9ff31e8_add_cbt_module_steps_table
Create Date: 2025-09-22
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250922_add_agent_runs_and_messages'
down_revision: Union[str, None] = 'e574b9ff31e8_add_cbt_module_steps_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'agent_runs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('agent_name', sa.String(length=64), nullable=False, index=True),
        sa.Column('action', sa.String(length=64), nullable=False, index=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending', index=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('input_payload', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('output_payload', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('correlation_id', sa.String(length=128), nullable=False, index=True),
        sa.Column('triggered_by_user_id', sa.Integer(), nullable=True, index=True),
        sa.ForeignKeyConstraint(['triggered_by_user_id'], ['users.id']),
    )
    op.create_index('ix_agent_runs_agent_name', 'agent_runs', ['agent_name'])
    op.create_index('ix_agent_runs_action', 'agent_runs', ['action'])
    op.create_index('ix_agent_runs_status', 'agent_runs', ['status'])
    op.create_index('ix_agent_runs_correlation_id', 'agent_runs', ['correlation_id'])
    op.create_index('ix_agent_runs_triggered_by_user_id', 'agent_runs', ['triggered_by_user_id'])

    op.create_table(
        'agent_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('run_id', sa.Integer(), nullable=False, index=True),
        sa.Column('agent_name', sa.String(length=64), nullable=False, index=True),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='system'),
        sa.Column('message_type', sa.String(length=32), nullable=False, server_default='event'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['agent_runs.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_agent_messages_run_id', 'agent_messages', ['run_id'])
    op.create_index('ix_agent_messages_agent_name', 'agent_messages', ['agent_name'])
    op.create_index('ix_agent_messages_created_at', 'agent_messages', ['created_at'])


def downgrade() -> None:
    op.drop_table('agent_messages')
    op.drop_table('agent_runs')
