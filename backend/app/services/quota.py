import asyncio
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Tuple
from app.models.quota import QuotaUsage
from app.models.user import User

async def get_current_month_str() -> str:
    return datetime.utcnow().strftime("%Y-%m")

async def check_quota(db: AsyncSession, user: User) -> Tuple[bool, QuotaUsage]:
    """
    Verifica se o usuário tem quota no mês atual.
    Se o usuário for dependente (parent_id), abate e gerencia a quota da Conta Principal.
    Retorna (tem_quota: bool, quota_usage: QuotaUsage)
    """
    target_user_id = user.parent_id if user.parent_id else user.id

    if user.parent_id:
        stmt_parent = select(User).where(User.id == user.parent_id)
        parent_result = await db.execute(stmt_parent)
        parent_user = parent_result.scalar_one_or_none()
        quota_base_to_use = parent_user.quota_base if parent_user else user.quota_base
    else:
        quota_base_to_use = user.quota_base

    mes_atual = await get_current_month_str()
    stmt = select(QuotaUsage).where(
        QuotaUsage.user_id == target_user_id,
        QuotaUsage.mes_referencia == mes_atual
    )
    result = await db.execute(stmt)
    quota_usage = result.scalar_one_or_none()

    if not quota_usage:
        quota_usage = QuotaUsage(
            user_id=target_user_id,
            mes_referencia=mes_atual,
            quota_base=quota_base_to_use,
            quota_extra=0,
            quota_usada=0
        )
        db.add(quota_usage)
        await db.commit()
        await db.refresh(quota_usage)
    
    quota_disponivel = quota_usage.quota_base + quota_usage.quota_extra - quota_usage.quota_usada
    return quota_disponivel > 0, quota_usage

async def consume_quota(db: AsyncSession, quota_usage: QuotaUsage) -> None:
    """Incrementa a quota_usada em 1"""
    quota_usage.quota_usada += 1
    await db.commit()
