"""Add user_screening_profiles table for conversational intelligence extraction.

Revision ID: add_screening_profiles
Revises: 5f0351a53f67
Create Date: 2024-12-02

This migration adds the user_screening_profiles table which stores
longitudinal mental health screening data gathered seamlessly during
natural conversations with Aika.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = 'add_screening_profiles'
down_revision = '5f0351a53f67'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_screening_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profile_data', JSON(), nullable=True),
        sa.Column('overall_risk', sa.String(32), nullable=False, server_default='none'),
        sa.Column('requires_attention', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('total_messages_analyzed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_sessions_analyzed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_intervention_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create indexes
    op.create_index('ix_user_screening_profiles_user_id', 'user_screening_profiles', ['user_id'], unique=True)
    op.create_index('ix_user_screening_profiles_overall_risk', 'user_screening_profiles', ['overall_risk'])
    op.create_index('ix_user_screening_profiles_requires_attention', 'user_screening_profiles', ['requires_attention'])


def downgrade() -> None:
    op.drop_index('ix_user_screening_profiles_requires_attention', 'user_screening_profiles')
    op.drop_index('ix_user_screening_profiles_overall_risk', 'user_screening_profiles')
    op.drop_index('ix_user_screening_profiles_user_id', 'user_screening_profiles')
    op.drop_table('user_screening_profiles')
