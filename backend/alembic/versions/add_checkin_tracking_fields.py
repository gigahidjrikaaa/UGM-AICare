"""Add check-in tracking fields to users table.

Revision ID: add_checkin_tracking
Revises: add_screening_profiles
Create Date: 2024-12-02

This migration adds fields to track proactive check-in history:
- last_checkin_sent_at: When the last check-in email was sent
- checkin_count: Total number of check-ins sent to this user
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_checkin_tracking'
down_revision = 'add_screening_profiles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add check-in tracking fields to users table
    op.add_column('users', sa.Column('last_checkin_sent_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('checkin_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'checkin_count')
    op.drop_column('users', 'last_checkin_sent_at')
