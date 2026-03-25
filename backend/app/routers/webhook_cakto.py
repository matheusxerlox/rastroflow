import os
from fastapi import APIRouter, Depends, Request, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import secrets
import string

from app.database import get_db
from app.models.user import User
from app.models.quota import QuotaUsage
from app.models.webhook_log import WebhookLog
from app.services.quota import get_current_month_str
from app.services.email import send_welcome_email, send_subscription_renewed_email, send_subscription_canceled_email, send_subscription_refunded_email
from app.routers.auth import get_password_hash

router = APIRouter(prefix="/webhook/cakto", tags=["webhooks"])

CAKTO_SECRET = os.getenv("CAKTO_WEBHOOK_SECRET", "secret")

def gerar_senha_aleatoria(tamanho: int = 10) -> str:
    alfabeto = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alfabeto) for _ in range(tamanho))

@router.post("")
async def webhook_cakto(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.json()
    
    # 1. SALVAR LOG PRIMEIRO DE TUDO
    webhook_log = WebhookLog(
        provider="cakto",
        payload=payload
    )
    db.add(webhook_log)
    await db.commit() # Commita imediatamente para garantir que o log chegue ao painel Admin
    await db.refresh(webhook_log)
    
    # 2. Validar token da Cakto (Procura no JSON, na Querystring ou no Header)
    token_recebido = payload.get("token") or request.query_params.get("token") or request.headers.get("x-cakto-token", "")
    if token_recebido != CAKTO_SECRET and CAKTO_SECRET != "secret":
        # Se for inválido, marcamos no log
        webhook_log.processed = False
        await db.commit()
        # Não rejeita com 401 ainda, se o CAKTO_SECRET="secret" no prod pode dar falha. Mas ele usa token no cakto.
        if token_recebido != CAKTO_SECRET:
            raise HTTPException(status_code=401, detail="Token inválido")
    
    # Tolerância a variações do Payload da Cakto
    event = payload.get("event") or payload.get("type") or payload.get("status") or ""
    
    # Buscar cliente em raiz ou em objeto "customer"
    customer_obj = payload.get("customer", {})
    email = payload.get("email") or payload.get("customer_email") or customer_obj.get("email")
    name = payload.get("name") or payload.get("customer_name") or customer_obj.get("name", "Usuário")
    
    if not email:
        raise HTTPException(status_code=400, detail="Sem email no payload")
    
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    now = datetime.now(timezone.utc)
    
    # Extensas Listas de Eventos
    events_aprovacao = ["purchase_approved", "subscription_renewed", "approved", "order_approved", "payment_approved"]
    events_cancelamento = ["subscription_canceled", "canceled", "cancelled", "subscription_past_due"]
    events_estorno = ["refund", "chargeback", "refunded", "order_refunded"]
    
    if event in events_aprovacao:
        if not user:
            # Novo usuário
            senha_limpa = gerar_senha_aleatoria()
            expira_em = now + timedelta(days=30)
            user = User(
                name=name,
                email=email,
                password_hash=get_password_hash(senha_limpa),
                is_active=True,
                plano_expira_em=expira_em,
                quota_base=300,  # Limite padrão
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            mes_atual = await get_current_month_str()
            quota_usage = QuotaUsage(
                user_id=user.id,
                mes_referencia=mes_atual,
                quota_base=user.quota_base,
            )
            db.add(quota_usage)
            await db.commit()
            
            send_welcome_email(user.email, user.name, senha_limpa)
        else:
            # Renovação
            user.is_active = True
            user.motivo_bloqueio = None
            user.plano_expira_em = now + timedelta(days=30)
            
            mes_atual = await get_current_month_str()
            stmt_q = select(QuotaUsage).where(
                QuotaUsage.user_id == user.id,
                QuotaUsage.mes_referencia == mes_atual
            )
            q_res = await db.execute(stmt_q)
            if not q_res.scalar_one_or_none():
                quota_usage = QuotaUsage(
                    user_id=user.id,
                    mes_referencia=mes_atual,
                    quota_base=user.quota_base,
                )
                db.add(quota_usage)
            
            await db.commit()
            send_subscription_renewed_email(user.email, user.name, user.plano_expira_em.strftime("%d/%m/%Y"))
    
    elif event in events_cancelamento:
        if user:
            user.is_active = False
            user.motivo_bloqueio = "cancelled"
            await db.commit()
            send_subscription_canceled_email(user.email, user.name)
    
    elif event in events_estorno:
        if user:
            user.is_active = False
            user.motivo_bloqueio = "refunded"
            await db.commit()
            send_subscription_refunded_email(user.email, user.name)
    
    if user:
        webhook_log.user_id = user.id
    webhook_log.processed = True
    await db.commit()
    return {"message": "Processado"}
