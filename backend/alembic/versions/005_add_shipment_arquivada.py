"""add shipment arquivada

Revision ID: 005_add_shipment_arquivada
Revises: 004_add_shipment_notes
Create Date: 2026-03-24 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '005_add_shipment_arquivada'
down_revision = '004_add_shipment_notes'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('shipments', sa.Column('arquivada', sa.Boolean(), server_default='false', nullable=False))

def downgrade():
    op.drop_column('shipments', 'arquivada')
