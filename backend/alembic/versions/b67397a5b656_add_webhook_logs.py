"""add webhook logs

Revision ID: b67397a5b656
Revises: 002_add_updated_at
Create Date: 2026-03-21 14:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'b67397a5b656'
down_revision = '002_add_updated_at'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'webhook_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('provider', sa.String(), index=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('processed', sa.Boolean(), nullable=True, default=False),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('tracking_number', sa.String(), index=True, nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column('received_at', sa.DateTime(timezone=True), index=True)
    )

def downgrade():
    op.drop_table('webhook_logs')
