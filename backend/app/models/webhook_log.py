import uuid
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
from app.database import Base

class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    provider = Column(String, index=True) # Ex: '17track', 'keedpay', 'cakto'
    payload = Column(JSONB, nullable=False)
    processed = Column(Boolean, default=False)
    error_message = Column(String, nullable=True)
    
    # Metadados extraídos para facilitar a filtragem
    tracking_number = Column(String, index=True, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    received_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
