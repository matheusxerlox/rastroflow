from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, null
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.shipment import Shipment
from app.models.quota import QuotaUsage
from app.routers.auth import get_current_user, get_password_hash, verify_password
from app.services.quota import get_current_month_str, check_quota

from pydantic import BaseModel

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ShipmentNoteRequest(BaseModel):
    notes: Optional[str] = None

@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # KPIs
    stmt_ativas = select(func.count(Shipment.id)).where(Shipment.user_id == current_user.id, Shipment.status.in_(["InTransit", "OutForDelivery"]))
    stmt_entregues = select(func.count(Shipment.id)).where(Shipment.user_id == current_user.id, Shipment.status == "Delivered")
    stmt_problema = select(func.count(Shipment.id)).where(Shipment.user_id == current_user.id, Shipment.status.in_(["Exception", "DeliveryFailure"]))
    stmt_sairam = select(func.count(Shipment.id)).where(Shipment.user_id == current_user.id, Shipment.status == "OutForDelivery")
    
    ativas = (await db.execute(stmt_ativas)).scalar_one()
    entregues = (await db.execute(stmt_entregues)).scalar_one()
    problema = (await db.execute(stmt_problema)).scalar_one()
    sairam = (await db.execute(stmt_sairam)).scalar_one()
    
    return {
        "ativas": ativas,
        "entregues": entregues,
        "problema": problema,
        "sairam_hoje": sairam
    }

@router.get("/shipments")
async def get_shipments(
    status: Optional[str] = None,
    carrier: Optional[str] = None,
    search: Optional[str] = None,
    arquivada: bool = False,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    page: int = 1,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    query = select(Shipment).where(Shipment.user_id == current_user.id, Shipment.arquivada == arquivada)
    
    if status:
        query = query.where(Shipment.status == status)
    if carrier:
        query = query.where(Shipment.carrier == carrier)
    if search:
        query = query.where(
            (Shipment.tracking_number.ilike(f"%{search}%")) |
            (Shipment.customer_name.ilike(f"%{search}%"))
        )
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
        
    # Count total sem gerar full subquery memory table
    count_query = select(func.count(Shipment.id))
    
    count_query = count_query.where(Shipment.user_id == current_user.id, Shipment.arquivada == arquivada)
    if status:
        count_query = count_query.where(Shipment.status == status)
    if carrier:
        count_query = count_query.where(Shipment.carrier == carrier)
    if search:
        count_query = count_query.where(
            (Shipment.tracking_number.ilike(f"%{search}%")) |
            (Shipment.customer_name.ilike(f"%{search}%"))
        )
    if date_from:
        try:
            count_query = count_query.where(Shipment.updated_at >= datetime.fromisoformat(date_from.replace("Z", "+00:00")))
        except Exception:
            pass
    if date_to:
        try:
            count_query = count_query.where(Shipment.updated_at <= datetime.fromisoformat(date_to.replace("Z", "+00:00")))
        except Exception:
            pass
        
    total = (await db.execute(count_query)).scalar_one()
    
    # Pagination & Filtering
    if sort_by == "updated_at":
        order_col = Shipment.updated_at
    elif sort_by == "delivered_at":
        order_col = Shipment.delivered_at
    else:
        order_col = Shipment.created_at
        
    if sort_dir == "asc":
        query = query.order_by(order_col.asc().nulls_last())
    else:
        query = query.order_by(order_col.desc().nulls_last())

    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    shipments = result.scalars().all()
    
    return {
        "items": shipments,
        "total": total,
        "page": page,
        "limit": limit
    }



@router.get("/shipments/{shipment_id}")
async def get_shipment(shipment_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == current_user.id)
    result = await db.execute(stmt)
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment

@router.post("/shipments/{shipment_id}/cobrar")
async def cobrar_shipment(shipment_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.webhook_cobranca_url:
        raise HTTPException(status_code=400, detail="URL de cobrança não configurada nas Configurações.")
    
    from app.workers.tasks import disparar_cobranca
    from datetime import datetime, timezone
    
    stmt = select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == current_user.id)
    result = await db.execute(stmt)
    shipment = result.scalar_one_or_none()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    shipment.cobrado = True
    shipment.cobrado_em = datetime.now(timezone.utc)
    await db.commit()
    disparar_cobranca.delay(str(shipment.id))
    return {"message": "Cobrança disparada"}

@router.post("/shipments/{shipment_id}/resetar-cobranca")
async def resetar_cobranca_shipment(shipment_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == current_user.id)
    result = await db.execute(stmt)
    shipment = result.scalar_one_or_none()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    from app.workers.tasks import disparar_cobranca
    shipment.cobrado = False
    shipment.cobrado_em = None
    await db.commit()
    disparar_cobranca.delay(str(shipment.id))
    return {"message": "Cobrança resetada e reenviada"}

@router.put("/shipments/{shipment_id}/notes")
async def update_shipment_notes(shipment_id: UUID, req: ShipmentNoteRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == current_user.id)
    result = await db.execute(stmt)
    shipment = result.scalar_one_or_none()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    shipment.notes = req.notes
    await db.commit()
    return {"message": "Anotação salva com sucesso"}

@router.put("/shipments/{shipment_id}/archive")
async def toggle_shipment_archive(shipment_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == current_user.id)
    result = await db.execute(stmt)
    shipment = result.scalar_one_or_none()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    shipment.arquivada = not shipment.arquivada
    await db.commit()
    return {"message": "Status de arquivamento atualizado", "arquivada": shipment.arquivada}

@router.get("/quota")
async def get_quota(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    tem_quota, quota_usage = await check_quota(db, current_user)
    return {
        "tem_quota": tem_quota,
        "quota_base": quota_usage.quota_base,
        "quota_extra": quota_usage.quota_extra,
        "quota_usada": quota_usage.quota_usada,
        "quota_disponivel": quota_usage.quota_base + quota_usage.quota_extra - quota_usage.quota_usada
    }

@router.put("/change-password")
async def change_password(req: ChangePasswordRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    current_user.password_hash = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "Senha alterada com sucesso"}

@router.get("/charts")
async def get_charts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import func, cast, Date
    from datetime import datetime, timezone
    
    # Entregas por dia no mês atual
    hoje = datetime.now(timezone.utc)
    primeiro_dia_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    stmt_line = (
        select(
            cast(Shipment.delivered_at, Date).label("dia"),
            func.count(Shipment.id).label("total")
        )
        .where(
            Shipment.user_id == current_user.id,
            Shipment.status == "Delivered",
            Shipment.delivered_at >= primeiro_dia_mes
        )
        .group_by(cast(Shipment.delivered_at, Date))
        .order_by(cast(Shipment.delivered_at, Date))
    )
    result_line = await db.execute(stmt_line)
    line_data = [
        {"date": str(row.dia), "entregas": row.total}
        for row in result_line.all()
    ]
    
    # Distribuição por status
    stmt_pie = (
        select(Shipment.status, func.count(Shipment.id).label("total"))
        .where(Shipment.user_id == current_user.id)
        .group_by(Shipment.status)
    )
    result_pie = await db.execute(stmt_pie)
    pie_data = [
        {"status": row.status, "total": row.total}
        for row in result_pie.all()
    ]
    
    return {"line_data": line_data, "pie_data": pie_data}
