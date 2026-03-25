import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base

class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    acao = Column(String, nullable=False)
    user_alvo_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    detalhes = Column(JSONB, nullable=True)
    feito_em = Column(DateTime(timezone=True), server_default=func.now())
