from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from typing import Optional, List
from uuid import UUID
import uuid
import csv
import io

from app.database import get_db
from app.models.user import User
from app.models.shipment import Shipment
from app.models.quota import QuotaUsage
from app.models.admin_log import AdminLog
from app.routers.auth import get_current_admin, get_password_hash
from app.services.email import send_welcome_email
from app.workers.tasks import registrar_encomenda_17track, push_shipments
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

async def log_admin_action(db: AsyncSession, admin_id: UUID, acao: str, user_alvo: UUID = None, detalhes: dict = None):
    log_entry = AdminLog(
        admin_id=admin_id,
        acao=acao,
        user_alvo_id=user_alvo,
        detalhes=detalhes or {}
    )
    db.add(log_entry)

@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    from sqlalchemy import cast, Date
    from datetime import datetime, timezone, timedelta
    from app.services.track17 import get_quota_17track
    hoje = datetime.now(timezone.utc)
    sete_dias = hoje + timedelta(days=7)

    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar_one()
    blocked_users = (await db.execute(select(func.count(User.id)).where(User.is_active == False))).scalar_one()

    rastreados_hoje = (await db.execute(
        select(func.count(Shipment.id)).where(cast(Shipment.created_at, Date) == cast(hoje, Date))
    )).scalar_one()

    entregues_hoje = (await db.execute(
        select(func.count(Shipment.id)).where(
            Shipment.status == "Delivered",
            cast(Shipment.delivered_at, Date) == cast(hoje, Date)
        )
    )).scalar_one()

    expirando_semana = (await db.execute(
        select(func.count(User.id)).where(
            User.is_active == True,
            User.plano_expira_em >= hoje,
            User.plano_expira_em <= sete_dias
        )
    )).scalar_one()

    quota_17track_disponivel = await get_quota_17track()

    return {
        "usuarios_ativos": active_users,
        "usuarios_bloqueados": blocked_users,
        "rastreados_hoje": rastreados_hoje,
        "entregues_hoje": entregues_hoje,
        "expirando_semana": expirando_semana,
        "quota_17track_disponivel": quota_17track_disponivel
    }

@router.get("/charts")
async def get_charts(db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    from sqlalchemy import cast, Date
    from datetime import datetime, timezone
    hoje = datetime.now(timezone.utc)
    primeiro_dia_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    stmt_line = (
        select(cast(Shipment.created_at, Date).label("dia"), func.count(Shipment.id).label("total"))
        .where(Shipment.created_at >= primeiro_dia_mes)
        .group_by(cast(Shipment.created_at, Date))
        .order_by(cast(Shipment.created_at, Date))
    )
    result_line = await db.execute(stmt_line)
    line_data = [{"date": str(row.dia), "rastreios": row.total} for row in result_line.all()]
    
    stmt_pie = select(Shipment.status, func.count(Shipment.id).label("total")).group_by(Shipment.status)
    result_pie = await db.execute(stmt_pie)
    pie_data = [{"status": row.status, "total": row.total} for row in result_pie.all()]
    
    return {"line_data": line_data, "pie_data": pie_data}

@router.get("/users")
async def list_users(search: str = None, page: int = 1, limit: int = 20, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    query = select(User)
    if search:
        query = query.where(User.email.ilike(f"%{search}%") | User.name.ilike(f"%{search}%"))
        
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.order_by(desc(User.created_at)).offset((page - 1) * limit).limit(limit)
    users = (await db.execute(query)).scalars().all()
    
    return {"items": users, "total": total, "page": page, "limit": limit}

from datetime import datetime

class CreateUserReq(BaseModel):
    name: str
    email: str
    quota_base: int = 300
    plano_expira_em: Optional[datetime] = None

@router.post("/users")
async def create_user(req: CreateUserReq, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    from app.routers.webhook_cakto import gerar_senha_aleatoria
    existing = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already used")
        
    senha = gerar_senha_aleatoria()
    from datetime import datetime, timezone, timedelta
    
    exp_date = req.plano_expira_em
    if not exp_date:
        exp_date = datetime.now(timezone.utc) + timedelta(days=30)
        
    user = User(
        name=req.name,
        email=req.email,
        password_hash=get_password_hash(senha),
        is_active=True,
        quota_base=req.quota_base,
        plano_expira_em=exp_date
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await log_admin_action(db, current_admin.id, "create_user", user.id, {"email": user.email})
    send_welcome_email(user.email, user.name, senha)
    return {"message": "User created", "id": str(user.id)}

@router.get("/users/{user_id}")
async def get_user_detail(user_id: UUID, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user

@router.put("/users/{user_id}/toggle-active")
async def toggle_active(user_id: UUID, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    from datetime import datetime, timedelta, timezone
    
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
        
    user.is_active = not user.is_active
    if user.is_active:
        user.motivo_bloqueio = None
        user.plano_expira_em = datetime.now(timezone.utc) + timedelta(days=30)
    else:
        user.motivo_bloqueio = "manual"
        
    await db.commit()
    await log_admin_action(db, current_admin.id, "toggle_active", user.id, {"is_active": user.is_active})
    return {"message": "Status changed", "is_active": user.is_active}

class UpdateExpirationReq(BaseModel):
    plano_expira_em: datetime

@router.put("/users/{user_id}/expiration")
async def update_user_expiration(user_id: UUID, req: UpdateExpirationReq, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
        
    user.plano_expira_em = req.plano_expira_em
    await db.commit()
    await log_admin_action(db, current_admin.id, "update_expiration", user.id, {"expira_em": str(req.plano_expira_em)})
    return {"message": "Expiration updated", "plano_expira_em": user.plano_expira_em}


class AddQuotaReq(BaseModel):
    quantidade: int
    motivo: str

@router.post("/users/{user_id}/add-quota")
async def add_quota(user_id: UUID, req: AddQuotaReq, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
        
    from app.services.quota import get_current_month_str
    mes_atual = await get_current_month_str()
    quota = (await db.execute(select(QuotaUsage).where(QuotaUsage.user_id == user.id, QuotaUsage.mes_referencia == mes_atual))).scalar_one_or_none()
    
    if quota:
        quota.quota_extra += req.quantidade
    else:
        quota = QuotaUsage(user_id=user.id, mes_referencia=mes_atual, quota_extra=req.quantidade)
        db.add(quota)
        
    await db.commit()
    await log_admin_action(db, current_admin.id, "add_quota", user.id, {"amount": req.quantidade, "motivo": req.motivo})
    return {"message": "Quota added"}

class UploadShipmentsReq(BaseModel):
    tracking_numbers: List[str]
    carrier: str

@router.post("/users/{user_id}/shipments")
async def manual_upload_shipments(user_id: UUID, req: UploadShipmentsReq, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
        
    # Descontaria quota manualmente se quisessemos, mas o admin está enviando de graça ou consumindo do extra
    
    created_ids = []
    for code in req.tracking_numbers:
        code = code.strip()
        if not code: continue
        shipment = Shipment(
            user_id=user.id,
            tracking_number=code,
            carrier=req.carrier,
            customer_name="Manual Upload"
        )
        db.add(shipment)
        await db.flush()
        created_ids.append(str(shipment.id))
        
    await db.commit()
    
    from app.workers.tasks import _registrar_lote_async
    if created_ids:
        # Processando online para dar retorno em tempo real sem depender de tasks
        for i in range(0, len(created_ids), 40):
            await _registrar_lote_async(created_ids[i:i+40])
        
    await log_admin_action(db, current_admin.id, "upload_shipments", user.id, {"count": len(created_ids)})
    return {"message": f"{len(created_ids)} shipments uploaded and processed"}

@router.get("/logs")
async def get_logs(page: int = 1, limit: int = 50, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    total = (await db.execute(select(func.count(AdminLog.id)))).scalar_one()
    query = select(AdminLog).order_by(desc(AdminLog.feito_em)).offset((page - 1) * limit).limit(limit)
    logs = (await db.execute(query)).scalars().all()
    return {"items": logs, "total": total, "page": page, "limit": limit}

@router.get("/webhook-logs")
async def get_webhook_logs(
    page: int = 1,
    limit: int = 50,
    provider: str = None,
    search: str = None,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    from app.models.webhook_log import WebhookLog
    import sqlalchemy as sa
    
    query = select(WebhookLog)
    
    if provider:
        query = query.where(WebhookLog.provider == provider)
        
    if status == "processed":
        query = query.where(WebhookLog.processed == True)
    elif status == "unprocessed":
        query = query.where(WebhookLog.processed == False)
        
    if search:
        query = query.where(
            sa.or_(
                WebhookLog.tracking_number.ilike(f"%{search}%"),
                sa.cast(WebhookLog.payload, sa.String).ilike(f"%{search}%")
            )
        )
        
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.order_by(desc(WebhookLog.received_at)).offset((page - 1) * limit).limit(limit)
    logs = (await db.execute(query)).scalars().all()
    
    user_ids = {log.user_id for log in logs if log.user_id}
    users_map = {}
    if user_ids:
        stmt_users = select(User).where(User.id.in_(user_ids))
        res_users = await db.execute(stmt_users)
        for u in res_users.scalars().all():
            users_map[u.id] = u.email
            
    items = []
    for log in logs:
        items.append({
            "id": str(log.id),
            "provider": log.provider,
            "received_at": log.received_at,
            "processed": log.processed,
            "tracking_number": log.tracking_number,
            "user_email": users_map.get(log.user_id),
            "payload": log.payload,
            "error_message": log.error_message
        })
        
    return {"items": items, "total": total, "page": page, "limit": limit}

@router.get("/users/{user_id}/shipments")
async def get_user_shipments(
    user_id: UUID,
    page: int = 1,
    limit: int = 50,
    search: str = None,
    status: str = None,
    carrier: str = None,
    date_from: str = None,
    date_to: str = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    from datetime import datetime
    query = select(Shipment).where(Shipment.user_id == user_id)
    
    if search:
        query = query.where(
            Shipment.tracking_number.ilike(f"%{search}%") |
            Shipment.customer_name.ilike(f"%{search}%") |
            Shipment.customer_email.ilike(f"%{search}%")
        )
    if status:
        query = query.where(Shipment.status == status)
    if carrier:
        query = query.where(Shipment.carrier == carrier)
    if date_from:
        try:
            query = query.where(Shipment.updated_at >= datetime.fromisoformat(date_from.replace("Z", "+00:00")))
        except Exception:
            pass
    if date_to:
        try:
            query = query.where(Shipment.updated_at <= datetime.fromisoformat(date_to.replace("Z", "+00:00")))
        except Exception:
            pass
        
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.order_by(desc(Shipment.created_at)).offset((page - 1) * limit).limit(limit)
    shipments = (await db.execute(query)).scalars().all()
    
    return {"items": shipments, "total": total, "page": page, "limit": limit}

class BulkDeleteShipmentsReq(BaseModel):
    shipment_ids: list[str]
    permanent: bool

@router.delete("/users/{user_id}/shipments/bulk")
async def bulk_delete_user_shipments(
    user_id: UUID,
    req: BulkDeleteShipmentsReq,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    from sqlalchemy import delete
    from app.services.track17 import delete_shipments_17track
    from app.models.webhook_log import WebhookLog

    if not req.shipment_ids:
        return {"message": "Nenhuma encomenda selecionada"}

    uuids_seguros = [uuid.UUID(uid) if isinstance(uid, str) else uid for uid in req.shipment_ids]
    
    stmt = select(Shipment.tracking_number).where(Shipment.id.in_(uuids_seguros), Shipment.user_id == user_id)
    tracking_numbers = (await db.execute(stmt)).scalars().all()

    if req.permanent and tracking_numbers:
        await db.execute(
            delete(WebhookLog).where(
                WebhookLog.user_id == user_id,
                WebhookLog.tracking_number.in_(tracking_numbers)
            )
        )
        await delete_shipments_17track(tracking_numbers)

    await db.execute(
        delete(Shipment).where(Shipment.id.in_(uuids_seguros), Shipment.user_id == user_id)
    )
    
    await db.commit()
    await log_admin_action(db, current_admin.id, "delete_shipments_bulk", user_id, {"count": len(req.shipment_ids), "permanent": req.permanent})
    
    return {"message": f"{len(req.shipment_ids)} encomendas deletadas (Permanente: {req.permanent})"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: UUID, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    import sqlalchemy as sa
    from app.services.track17 import delete_shipments_17track

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    # Parar rastreamento no 17TRACK antes de deletar do banco
    stmt_ativos = select(Shipment).where(
        Shipment.user_id == user_id,
        Shipment.registered_17track == True,
        Shipment.status.notin_(["Delivered", "Exception", "Expired"])
    )
    shipments_ativos = (await db.execute(stmt_ativos)).scalars().all()

    if shipments_ativos:
        numeros = [s.tracking_number for s in shipments_ativos]
        await delete_shipments_17track(numeros)

    # Deletar todos os dados do usuário no banco
    from sqlalchemy import delete
    from app.models.password_reset import PasswordResetToken

    await db.execute(delete(AdminLog).where((AdminLog.admin_id == user_id) | (AdminLog.user_alvo_id == user_id)))
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
    await db.execute(delete(QuotaUsage).where(QuotaUsage.user_id == user_id))
    await db.execute(delete(Shipment).where(Shipment.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))

    await db.commit()

    if current_admin.id != user_id:
        await log_admin_action(db, current_admin.id, "delete_user", None, {"email_deletado": user.email})

    return {"message": "User deleted"}

class SetPasswordReq(BaseModel):
    new_password: str

@router.post("/users/{user_id}/set-password")
async def set_user_password(user_id: UUID, req: SetPasswordReq, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    
    user.password_hash = get_password_hash(req.new_password)
    await db.commit()
    await log_admin_action(db, current_admin.id, "set_password", user.id, {})
    return {"message": "Password updated"}

@router.post("/users/{user_id}/reset-password-email")
async def reset_password_admin_email(user_id: UUID, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    import sqlalchemy as sa
    from datetime import datetime, timezone, timedelta
    
    token_str = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=60)
    
    await db.execute(
        sa.text("INSERT INTO password_reset_tokens (id, user_id, token, expira_em) VALUES (:id, :uid, :tk, :exp)"),
        {"id": str(uuid.uuid4()), "uid": str(user.id), "tk": token_str, "exp": exp}
    )
    await db.commit()
    
    from app.services.email import send_password_reset_email
    send_password_reset_email(user.email, token_str)
    
    await log_admin_action(db, current_admin.id, "send_reset_password_email", user.id, {})
    return {"message": "Reset email sent"}

@router.post("/users/{user_id}/shipments/csv")
async def upload_csv_para_usuario(
    user_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    from app.services.shipment import detectar_transportadora
    from app.services.quota import get_current_month_str

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    fieldnames = [f.lower().strip() for f in (reader.fieldnames or [])]

    if "tracking_code" not in fieldnames:
        raise HTTPException(400, "CSV deve conter ao menos a coluna 'tracking_code'")

    # Buscar quota do usuário no mês atual
    mes_atual = await get_current_month_str()
    target_user_id = user.parent_id if user.parent_id else user.id
    stmt_quota = select(QuotaUsage).where(
        QuotaUsage.user_id == target_user_id,
        QuotaUsage.mes_referencia == mes_atual
    )
    quota_usage = (await db.execute(stmt_quota)).scalar_one_or_none()

    adicionadas = 0
    ignoradas_dup = 0
    ignoradas_limite = 0
    created_ids = []

    for row in reader:
        row_clean = {k.lower().strip(): (v.strip() if v else "") for k, v in row.items() if k}

        tracking_code = row_clean.get("tracking_code", "")
        if not tracking_code:
            continue

        # Verificar duplicidade
        dup = (await db.execute(
            select(Shipment).where(
                Shipment.user_id == user.id,
                Shipment.tracking_number == tracking_code
            )
        )).scalar_one_or_none()

        if dup:
            ignoradas_dup += 1
            continue

        # Verificar e consumir limite
        if quota_usage:
            disponivel = quota_usage.quota_base + quota_usage.quota_extra - quota_usage.quota_usada
            if disponivel <= 0:
                ignoradas_limite += 1
                continue
            quota_usage.quota_usada += 1

        tracking_url = row_clean.get("tracking_url", "")
        carrier_csv = row_clean.get("carrier", "")
        
        if carrier_csv:
            c_low = carrier_csv.lower()
            if "jadlog" in c_low:
                carrier = "jadlog"
            elif "j&t" in c_low or "jt " in c_low or "jtexpress" in c_low or c_low.strip() == "express":
                carrier = "jtexpress-br"
            elif "correios" in c_low:
                carrier = "correios"
            else:
                carrier = carrier_csv
        else:
            carrier = detectar_transportadora(tracking_url, tracking_code)

        amount_raw = row_clean.get("amount", "")
        try:
            amount = float(amount_raw) if amount_raw else None
        except ValueError:
            amount = None

        document = row_clean.get("customer_document", "") or row_clean.get("cpf", "") or None
        t_id = row_clean.get("transaction_id", "") or None

        shipment = Shipment(
            user_id=user.id,
            tracking_number=tracking_code,
            carrier=carrier,
            customer_name=row_clean.get("customer_name", "") or "Importado via CSV",
            customer_phone=row_clean.get("customer_phone", "") or None,
            customer_document=document,
            product_name=row_clean.get("product_name", "") or None,
            amount=amount,
            transaction_id=t_id,
        )
        db.add(shipment)
        await db.flush()
        created_ids.append(str(shipment.id))
        adicionadas += 1

    await db.commit()

    if created_ids:
        from app.workers.tasks import _registrar_lote_async
        for i in range(0, len(created_ids), 40):
            await _registrar_lote_async(created_ids[i:i+40])

    await log_admin_action(db, current_admin.id, "upload_csv", user_id, {
        "adicionadas": adicionadas,
        "ignoradas_duplicidade": ignoradas_dup,
        "ignoradas_limite": ignoradas_limite
    })

    return {
        "adicionadas": adicionadas,
        "ignoradas_duplicidade": ignoradas_dup,
        "ignoradas_limite": ignoradas_limite,
        "message": f"CSV processado: {adicionadas} adicionadas, {ignoradas_dup} duplicadas ignoradas, {ignoradas_limite} bloqueadas por limite."
    }

class AddDependentReq(BaseModel):
    name: str
    email: str

@router.get("/users/{user_id}/dependents")
async def get_dependents(user_id: UUID, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    stmt = select(User).where(User.parent_id == user_id)
    result = await db.execute(stmt)
    dependents = result.scalars().all()
    return dependents

@router.post("/users/{user_id}/dependents")
async def add_dependent(user_id: UUID, req: AddDependentReq, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    parent = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not parent:
        raise HTTPException(404, "Parent user not found")
        
    dependent = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    
    if dependent:
        if dependent.id == parent.id:
            raise HTTPException(400, "Usuário não pode ser dependente de si mesmo")
        dependent.parent_id = parent.id
        await db.commit()
        await log_admin_action(db, current_admin.id, "add_dependent_existing", parent.id, {"dependent_email": dependent.email})
        return {"message": "Usuário existente vinculado com sucesso!"}
    
    from app.routers.webhook_cakto import gerar_senha_aleatoria
    from app.services.email import send_welcome_email
    
    senha = gerar_senha_aleatoria()
    novo_dependente = User(
        name=req.name,
        email=req.email,
        password_hash=get_password_hash(senha),
        is_active=True,
        parent_id=parent.id
    )
    db.add(novo_dependente)
    await db.commit()
    await db.refresh(novo_dependente)
    await log_admin_action(db, current_admin.id, "add_dependent_new", parent.id, {"dependent_email": novo_dependente.email})
    send_welcome_email(novo_dependente.email, novo_dependente.name, senha)
    
    return {"message": "Novo dependente cadastrado e vinculado com sucesso!"}

@router.delete("/users/{user_id}/dependents/{dependent_id}")
async def remove_dependent(user_id: UUID, dependent_id: UUID, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    dependent = (await db.execute(select(User).where(User.id == dependent_id, User.parent_id == user_id))).scalar_one_or_none()
    if not dependent:
        raise HTTPException(404, "Dependent not found for this user")
        
    dependent.parent_id = None
    await db.commit()
    await log_admin_action(db, current_admin.id, "remove_dependent", user_id, {"dependent_id": str(dependent_id)})
    return {"message": "Dependent removed"}
