"""add shipment notes

Revision ID: 004_add_shipment_notes
Revises: 003_add_parent_id
Create Date: 2026-03-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '004_add_shipment_notes'
down_revision = '003_add_parent_id'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('shipments', sa.Column('notes', sa.String(length=300), nullable=True))

def downgrade():
    op.drop_column('shipments', 'notes')
