import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4, nullable=False)
    expira_em = Column(DateTime(timezone=True), nullable=False)
    usado = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
