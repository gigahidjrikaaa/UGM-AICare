"""link psychologists to users and add extended profile fields

Revision ID: link_psych_users_001
Revises: 219b264bb1ce
Create Date: 2025-01-16 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'link_psych_users_001'
down_revision = '219b264bb1ce'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_id column to psychologists table
    op.add_column('psychologists', sa.Column('user_id', sa.Integer(), nullable=True))
    
    # Add extended profile fields
    op.add_column('psychologists', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('psychologists', sa.Column('education', sa.JSON(), nullable=True))
    op.add_column('psychologists', sa.Column('certifications', sa.JSON(), nullable=True))
    op.add_column('psychologists', sa.Column('years_of_experience', sa.Integer(), nullable=True))
    op.add_column('psychologists', sa.Column('languages', sa.JSON(), nullable=True))
    op.add_column('psychologists', sa.Column('consultation_fee', sa.Float(), nullable=True))
    op.add_column('psychologists', sa.Column('availability_schedule', sa.JSON(), nullable=True))
    op.add_column('psychologists', sa.Column('rating', sa.Float(), default=0.0, nullable=True))
    op.add_column('psychologists', sa.Column('total_reviews', sa.Integer(), default=0, nullable=True))
    op.add_column('psychologists', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.add_column('psychologists', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_psychologists_user_id', 
        'psychologists', 
        'users', 
        ['user_id'], 
        ['id'],
        ondelete='CASCADE'
    )
    
    # Create unique constraint on user_id (one user can have only one psychologist profile)
    op.create_unique_constraint('uq_psychologists_user_id', 'psychologists', ['user_id'])
    
    # Create index for faster lookups
    op.create_index('ix_psychologists_user_id', 'psychologists', ['user_id'])
    op.create_index('ix_psychologists_is_available', 'psychologists', ['is_available'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_psychologists_is_available', table_name='psychologists')
    op.drop_index('ix_psychologists_user_id', table_name='psychologists')
    
    # Drop unique constraint
    op.drop_constraint('uq_psychologists_user_id', 'psychologists', type_='unique')
    
    # Drop foreign key
    op.drop_constraint('fk_psychologists_user_id', 'psychologists', type_='foreignkey')
    
    # Drop columns
    op.drop_column('psychologists', 'updated_at')
    op.drop_column('psychologists', 'created_at')
    op.drop_column('psychologists', 'total_reviews')
    op.drop_column('psychologists', 'rating')
    op.drop_column('psychologists', 'availability_schedule')
    op.drop_column('psychologists', 'consultation_fee')
    op.drop_column('psychologists', 'languages')
    op.drop_column('psychologists', 'years_of_experience')
    op.drop_column('psychologists', 'certifications')
    op.drop_column('psychologists', 'education')
    op.drop_column('psychologists', 'bio')
    op.drop_column('psychologists', 'user_id')
