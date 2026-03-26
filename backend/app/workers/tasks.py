import asyncio
import os
import httpx
from datetime import datetime, timezone
import time
from celery.schedules import crontab

from app.workers.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.shipment import Shipment
from app.models.user import User
from app.models.quota import QuotaUsage
from app.services.track17 import register_shipments, push_shipments
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

# Para o cron funcionar, registramos diretamente no decorator
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Polling de encomendas ativas a cada 30 minutos
    sender.add_periodic_task(
        1800.0,
        polling_entregas_proximas.s(),
        name='polling_entregas_proximas'
    )
    # Verificação diária de planos expirados (todo dia às 01:00 UTC)
    sender.add_periodic_task(
        crontab(hour=1, minute=0),
        verificar_planos_expirados.s(),
        name='verificar_planos_expirados'
    )
    # Virada de mês - meia noite de dia 1
    sender.add_periodic_task(
        crontab(hour=0, minute=1, day_of_month=1),
        resetar_quotas_mensais.s(),
        name='resetar_quotas_mensais'
    )

async def _registrar_lote_async(shipment_ids: list):
    import uuid
    uuids_seguros = [uuid.UUID(uid) if isinstance(uid, str) else uid for uid in shipment_ids]
    async with AsyncSessionLocal() as db:
        stmt = select(Shipment).where(Shipment.id.in_(uuids_seguros), Shipment.registered_17track == False)
        result = await db.execute(stmt)
        shipments = result.scalars().all()
        
        if not shipments:
            return

        payload_17track = []
        for s in shipments:
            carrier_code = 0
            if s.carrier == "jtexpress-br":
                carrier_code = 100797
            elif s.carrier == "correios":
                carrier_code = 2151
            elif s.carrier == "jadlog":
                carrier_code = 101052

            item = {
                "number": s.tracking_number,
                "tag": f"shipment_{s.id}",
                "lang": "pt"
            }
            if carrier_code > 0:
                item["carrier"] = carrier_code
            
            if s.carrier == "jtexpress-br" and s.customer_document:
                item["param"] = s.customer_document

            payload_17track.append(item)
        
        accepted = await register_shipments(payload_17track)
        accepted_numbers = [item.get("number") for item in accepted]
        
        for s in shipments:
            if s.tracking_number in accepted_numbers:
                s.registered_17track = True
                s.tag_17track = f"shipment_{s.id}"
                
        await db.commit()

@celery_app.task
def registrar_encomenda_17track(shipment_id: str):
    asyncio.run(_registrar_lote_async([shipment_id]))

@celery_app.task
def registrar_lote_17track(shipment_ids: list):
    # Lotes de até 40
    for i in range(0, len(shipment_ids), 40):
        lote = shipment_ids[i:i+40]
        asyncio.run(_registrar_lote_async(lote))
        if i + 40 < len(shipment_ids):
            time.sleep(0.4) # Limite de 3 req/seg

async def _disparar_cobranca_async(shipment_id: str):
    async with AsyncSessionLocal() as db:
        stmt = select(Shipment).options(selectinload(Shipment.user)).where(Shipment.id == shipment_id)
        result = await db.execute(stmt)
        shipment = result.scalar_one_or_none()
        
        if not shipment or not shipment.user.webhook_cobranca_url:
            return
            
        payload = {
            "event": "cobranca",
            "tracking_code": shipment.tracking_number,
            "customer_name": shipment.customer_name,
            "customer_email": shipment.customer_email,
            "customer_phone": shipment.customer_phone,
            "customer_document": shipment.customer_document,
            "product_name": shipment.product_name,
            "amount": float(shipment.amount) if shipment.amount else None,
            "status": shipment.status,
            "transaction_id": shipment.transaction_id,
            "triggered_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            async with httpx.AsyncClient() as client:
                await client.post(shipment.user.webhook_cobranca_url, json=payload, timeout=5.0)
                
            shipment.cobrado = True
            shipment.cobrado_em = datetime.now(timezone.utc)
            await db.commit()
        except Exception as e:
            print(f"Erro ao disparar cobranca do shipment {shipment_id}: {e}")

@celery_app.task
def disparar_cobranca(shipment_id: str):
    asyncio.run(_disparar_cobranca_async(shipment_id))

async def _polling_entregas_proximas_async():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        stmt = select(Shipment).where(Shipment.polling_ativo == True)
        result = await db.execute(stmt)
        shipments = result.scalars().all()
        
        to_push = []
        shipments_to_update = []
        for s in shipments:
            if s.ultimo_push is None or (now - s.ultimo_push).total_seconds() > 1800:
                carrier_code = 0
                if s.carrier == "jtexpress-br":
                    carrier_code = 100797
                elif s.carrier == "correios":
                    carrier_code = 2151
                elif s.carrier == "jadlog":
                    carrier_code = 101052

                push_item = {
                    "number": s.tracking_number,
                    "carrier": carrier_code
                }
                
                if s.carrier == "jtexpress-br" and s.customer_document:
                    push_item["param"] = s.customer_document

                to_push.append(push_item)
                s.ultimo_push = now
                shipments_to_update.append(s)
                
        if to_push:
            # Enviar em lotes de 40
            for i in range(0, len(to_push), 40):
                lote = to_push[i:i+40]
                await push_shipments(lote)
            
            await db.commit()

@celery_app.task
def polling_entregas_proximas():
    asyncio.run(_polling_entregas_proximas_async())

async def _resetar_quotas_mensais_async():
    mes_atual = datetime.utcnow().strftime("%Y-%m")
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(User.is_active == True)
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        for u in users:
            stmt_quota = select(QuotaUsage).where(
                QuotaUsage.user_id == u.id,
                QuotaUsage.mes_referencia == mes_atual
            )
            res = await db.execute(stmt_quota)
            if not res.scalar_one_or_none():
                nova_quota = QuotaUsage(
                    user_id=u.id,
                    mes_referencia=mes_atual,
                    quota_base=u.quota_base,
                    quota_extra=0,
                    quota_usada=0
                )
                db.add(nova_quota)
        
        await db.commit()

@celery_app.task
def resetar_quotas_mensais():
    asyncio.run(_resetar_quotas_mensais_async())

async def _verificar_planos_expirados_async():
    from datetime import datetime, timezone
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        # Busca usuários ativos cujo plano expirou
        stmt = select(User).where(
            User.is_active == True,
            User.plano_expira_em != None,
            User.plano_expira_em < now,
            User.is_admin == False  # Nunca bloqueia admin
        )
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        bloqueados = 0
        for u in users:
            u.is_active = False
            u.motivo_bloqueio = "plano_expirado"
            bloqueados += 1
        
        if bloqueados > 0:
            await db.commit()
            print(f"[verificar_planos_expirados] {bloqueados} usuário(s) bloqueado(s) por plano expirado.")

@celery_app.task
def verificar_planos_expirados():
    asyncio.run(_verificar_planos_expirados_async())
