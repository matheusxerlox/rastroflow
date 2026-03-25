import uuid
import sys
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'initial_migration_v4'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('webhook_token', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('webhook_cobranca_url', sa.String(), nullable=True),
        sa.Column('plano', sa.String(), server_default='base'),
        sa.Column('quota_base', sa.Integer(), server_default='400'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_admin', sa.Boolean(), server_default='false'),
        sa.Column('motivo_bloqueio', sa.String(), nullable=True),
        sa.Column('plano_expira_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('primeiro_acesso', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('webhook_token')
    )
    
    # Shipments table
    op.create_table('shipments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tracking_number', sa.String(), nullable=False),
        sa.Column('carrier', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='NotFound'),
        sa.Column('sub_status', sa.String(), nullable=True),
        sa.Column('tag_17track', sa.String(), nullable=True),
        sa.Column('polling_ativo', sa.Boolean(), server_default='false'),
        sa.Column('ultimo_push', sa.DateTime(timezone=True), nullable=True),
        sa.Column('events', postgresql.JSONB(astext_type=sa.Text()), server_default='[]'),
        sa.Column('registered_17track', sa.Boolean(), server_default='false'),
        sa.Column('payload_keedpay', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('customer_name', sa.String(), nullable=True),
        sa.Column('customer_email', sa.String(), nullable=True),
        sa.Column('customer_phone', sa.String(), nullable=True),
        sa.Column('customer_document', sa.String(), nullable=True),
        sa.Column('customer_address', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('product_name', sa.String(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('transaction_id', sa.String(), nullable=True),
        sa.Column('cobrado', sa.Boolean(), server_default='false'),
        sa.Column('cobrado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], )
    )

    # Quota_usage table
    op.create_table('quota_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mes_referencia', sa.String(), nullable=False),
        sa.Column('quota_base', sa.Integer(), server_default='400'),
        sa.Column('quota_extra', sa.Integer(), server_default='0'),
        sa.Column('quota_usada', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.UniqueConstraint('user_id', 'mes_referencia', name='uq_user_mes')
    )

    # Password_reset_tokens table
    op.create_table('password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('expira_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('usado', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.UniqueConstraint('token')
    )

    # Admin_logs table
    op.create_table('admin_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('admin_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('acao', sa.String(), nullable=False),
        sa.Column('user_alvo_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('detalhes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('feito_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_alvo_id'], ['users.id'], )
    )

def downgrade():
    op.drop_table('admin_logs')
    op.drop_table('password_reset_tokens')
    op.drop_table('quota_usage')
    op.drop_table('shipments')
    op.drop_table('users')
