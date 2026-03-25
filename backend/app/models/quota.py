import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class QuotaUsage(Base):
    __tablename__ = "quota_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    mes_referencia = Column(String, nullable=False)
    quota_base = Column(Integer, default=400)
    quota_extra = Column(Integer, default=0)
    quota_usada = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'mes_referencia', name='uq_user_mes'),
    )
