"""A Mako template for creating Alembic migration scripts.

This template is used by the ``alembic revision`` command to generate
a new migration script.

"""
from alembic import op
from alembic.ddl.base import Operations
import sqlalchemy as sa
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade():
    ${upgrades if upgrades else "pass"}


def downgrade():
    ${downgrades if downgrades else "pass"}
