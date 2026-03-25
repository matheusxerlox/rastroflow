from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import json

from app.database import get_db
from app.models.user import User
from app.models.shipment import Shipment
from app.models.webhook_log import WebhookLog
from app.services.quota import check_quota, consume_quota
from app.services.shipment import parse_keedpay_payload
from app.services.email import send_quota_exhausted_email
from app.workers.tasks import registrar_encomenda_17track

router = APIRouter(tags=["webhooks"])

@router.post("/w/{token}")
async def webhook_keedpay(token: UUID, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # 1. Recuperar Usuário de Forma Silenciosa para capturar Id (sem exception ainda)
    stmt = select(User).where(User.webhook_token == token)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    # 2. Ler Payload Robustamente Fix KeyError Json
    try:
        payload = await request.json()
    except Exception:
        raw_body = await request.body()
        payload = {"raw_fallback": raw_body.decode('utf-8', errors='ignore')}
        
    # 3. GRAVAÇÃO INCONDICIONAL NO LOG
    webhook_log = WebhookLog(
        provider="keedpay",
        payload=payload,
        user_id=user.id if user else None
    )
    db.add(webhook_log)
    await db.commit() # Salvamento físico garantido antes de qualquer Exception abortar o FastAPI
    await db.refresh(webhook_log)
    
    from datetime import datetime, timedelta, timezone

    # Validações agora com Log Seguro e Período de Carência!
    if not user:
        webhook_log.error_message = f"Token do webhook inválido: {token}"
        await db.commit()
        raise HTTPException(status_code=404, detail="Webhook inválido ou não encontrado")
        
    if not user.is_active:
        now = datetime.now(timezone.utc)
        carencia = None
        if user.plano_expira_em:
            p_exp = user.plano_expira_em if user.plano_expira_em.tzinfo else user.plano_expira_em.replace(tzinfo=timezone.utc)
            carencia = p_exp + timedelta(days=1)
            
        # Bloqueia se não tiver data, ou se o momento atual já passou do dia de carência
        if not carencia or now > carencia:
            webhook_log.error_message = f"Dono Inativo (Lojista suspenso por: {user.motivo_bloqueio})"
            await db.commit()
            raise HTTPException(status_code=403, detail=f"Acesso bloqueado. Motivo: {user.motivo_bloqueio}")
        
    if user.parent_id:
        stmt_parent = select(User).where(User.id == user.parent_id)
        parent = (await db.execute(stmt_parent)).scalar_one_or_none()
        if parent and not parent.is_active:
            webhook_log.error_message = "Matriz da Conta dependente Cancelada."
            await db.commit()
            raise HTTPException(status_code=403, detail="Conta matriz bloqueada.")
            
    tem_quota, quota_usage = await check_quota(db, user)
    
    if not tem_quota:
        webhook_log.error_message = "Quota do Cliente Esgotada"
        await db.commit()
        send_quota_exhausted_email(user.email, user.name)
        raise HTTPException(status_code=402, detail="Quota esgotada. Compre mais quota e reenvie na Keedpay.")
    
    # Parsing Keedpay Business Logic
    extracted = parse_keedpay_payload(payload)
    
    if not extracted.get("tracking_code"):
        webhook_log.error_message = "Ignorado - sem tracking_code rastreador no Json"
        await db.commit()
        return {"message": "Ignorado - sem tracking_code na transação"}
        
    webhook_log.tracking_number = extracted["tracking_code"]
        
    # Verificar se já existe a encomenda pra evitar duplicidade
    stmt_dup = select(Shipment).where(
        Shipment.user_id == user.id, 
        Shipment.tracking_number == extracted["tracking_code"]
    )
    dup = (await db.execute(stmt_dup)).scalar_one_or_none()
    if dup:
        webhook_log.error_message = "Bypass Duplicidade - Já cadastrado."
        webhook_log.processed = True
        await db.commit()
        return {"message": "Encomenda já registrada"}
        
    shipment = Shipment(
        user_id=user.id,
        tracking_number=extracted["tracking_code"],
        carrier=extracted["carrier"],
        customer_name=extracted["customer_name"],
        customer_email=extracted["customer_email"],
        customer_phone=extracted["customer_phone"],
        customer_document=extracted["customer_document"],
        customer_address=extracted["customer_address"],
        product_name=extracted["product_name"],
        amount=extracted["amount"],
        transaction_id=extracted["transaction_id"],
        payload_keedpay=extracted["payload_keedpay"]
    )
    db.add(shipment)
    
    # Consumir 1 quota e commitar
    await consume_quota(db, quota_usage)
    
    # Enviar pro background (sem celery)
    await db.refresh(shipment)
    from app.workers.tasks import _registrar_lote_async
    background_tasks.add_task(_registrar_lote_async, [str(shipment.id)])
    
    webhook_log.processed = True
    await db.commit()
    
    return {"message": "Recebido com sucesso"}
