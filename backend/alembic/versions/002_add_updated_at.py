"""add updated_at to shipments

Revision ID: 002_add_updated_at
Revises: initial_migration_v4
Create Date: 2026-03-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_add_updated_at'
down_revision = 'initial_migration_v4'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('shipments', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))

def downgrade():
    op.drop_column('shipments', 'updated_at')
