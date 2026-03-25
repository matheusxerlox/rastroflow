import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    tracking_number = Column(String, nullable=False)
    carrier = Column(String, nullable=False)
    status = Column(String, default="NotFound")
    sub_status = Column(String, nullable=True)
    tag_17track = Column(String, nullable=True)
    polling_ativo = Column(Boolean, default=False)
    ultimo_push = Column(DateTime(timezone=True), nullable=True)
    events = Column(JSONB, default=list)
    registered_17track = Column(Boolean, default=False)
    payload_keedpay = Column(JSONB, nullable=True)
    notes = Column(String(300), nullable=True)
    arquivada = Column(Boolean, default=False)
    
    # Dados extraídos
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    customer_document = Column(String, nullable=True)
    customer_address = Column(JSONB, nullable=True)
    product_name = Column(String, nullable=True)
    amount = Column(Numeric(10, 2), nullable=True)
    transaction_id = Column(String, nullable=True)
    
    cobrado = Column(Boolean, default=False)
    cobrado_em = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    delivered_at = Column(DateTime(timezone=True), nullable=True)
