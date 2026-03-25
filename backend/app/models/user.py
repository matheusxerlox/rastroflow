import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    webhook_token = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4, nullable=False)
    webhook_cobranca_url = Column(String, nullable=True)
    plano = Column(String, default="base")
    quota_base = Column(Integer, default=300)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    motivo_bloqueio = Column(String, nullable=True)
    plano_expira_em = Column(DateTime(timezone=True), nullable=True)
    primeiro_acesso = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
