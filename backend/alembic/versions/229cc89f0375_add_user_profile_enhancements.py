"""add user profile enhancements"""

from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '229cc89f0375'
down_revision = '612167b98a55'
branch_labels = None
depends_on = None


CHECKIN_CONSTRAINT_NAME = 'uq_users_check_in_code'


def upgrade() -> None:
    op.add_column('users', sa.Column('profile_photo_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column('preferred_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('pronouns', sa.String(), nullable=True))
    op.add_column('users', sa.Column('alternate_phone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('check_in_code', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('emergency_contact_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('emergency_contact_relationship', sa.String(), nullable=True))
    op.add_column('users', sa.Column('emergency_contact_phone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('emergency_contact_email', sa.String(), nullable=True))
    op.add_column('users', sa.Column('risk_level', sa.String(), nullable=True))
    op.add_column('users', sa.Column('clinical_summary', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('primary_concerns', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('safety_plan_notes', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('current_therapist_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('current_therapist_contact', sa.String(), nullable=True))
    op.add_column('users', sa.Column('therapy_modality', sa.String(), nullable=True))
    op.add_column('users', sa.Column('therapy_frequency', sa.String(), nullable=True))
    op.add_column('users', sa.Column('therapy_notes', sa.Text(), nullable=True))
    op.add_column(
        'users',
        sa.Column('consent_data_sharing', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'users',
        sa.Column('consent_research', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'users',
        sa.Column('consent_emergency_contact', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'users',
        sa.Column('consent_marketing', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column('users', sa.Column('preferred_language', sa.String(), nullable=True))
    op.add_column('users', sa.Column('preferred_timezone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('accessibility_needs', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('communication_preferences', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('interface_preferences', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('aicare_team_notes', sa.Text(), nullable=True))

    op.create_unique_constraint(CHECKIN_CONSTRAINT_NAME, 'users', ['check_in_code'])

    connection = op.get_bind()
    result = connection.execute(sa.text('SELECT id FROM users WHERE check_in_code IS NULL'))
    rows = result.fetchall()
    for row in rows:
        connection.execute(
            sa.text('UPDATE users SET check_in_code = :code WHERE id = :user_id'),
            {'code': uuid.uuid4().hex, 'user_id': row.id},
        )

    op.alter_column('users', 'consent_data_sharing', server_default=None)
    op.alter_column('users', 'consent_research', server_default=None)
    op.alter_column('users', 'consent_emergency_contact', server_default=None)
    op.alter_column('users', 'consent_marketing', server_default=None)


def downgrade() -> None:
    op.drop_constraint(CHECKIN_CONSTRAINT_NAME, 'users', type_='unique')
    op.drop_column('users', 'aicare_team_notes')
    op.drop_column('users', 'interface_preferences')
    op.drop_column('users', 'communication_preferences')
    op.drop_column('users', 'accessibility_needs')
    op.drop_column('users', 'preferred_timezone')
    op.drop_column('users', 'preferred_language')
    op.drop_column('users', 'consent_marketing')
    op.drop_column('users', 'consent_emergency_contact')
    op.drop_column('users', 'consent_research')
    op.drop_column('users', 'consent_data_sharing')
    op.drop_column('users', 'therapy_notes')
    op.drop_column('users', 'therapy_frequency')
    op.drop_column('users', 'therapy_modality')
    op.drop_column('users', 'current_therapist_contact')
    op.drop_column('users', 'current_therapist_name')
    op.drop_column('users', 'safety_plan_notes')
    op.drop_column('users', 'primary_concerns')
    op.drop_column('users', 'clinical_summary')
    op.drop_column('users', 'risk_level')
    op.drop_column('users', 'emergency_contact_email')
    op.drop_column('users', 'emergency_contact_phone')
    op.drop_column('users', 'emergency_contact_relationship')
    op.drop_column('users', 'emergency_contact_name')
    op.drop_column('users', 'check_in_code')
    op.drop_column('users', 'alternate_phone')
    op.drop_column('users', 'pronouns')
    op.drop_column('users', 'preferred_name')
    op.drop_column('users', 'profile_photo_url')
