from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.announcement import Announcement, AnnouncementConfirmation
from app.models.user import User
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/api/admin/announcement", tags=["admin-announcement"])


class AnnouncementUpdateRequest(BaseModel):
    html_content: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


async def _get_or_create_announcement(db: AsyncSession) -> Announcement:
    """Garante que sempre existe um registro de comunicado."""
    stmt = select(Announcement).limit(1)
    result = await db.execute(stmt)
    ann = result.scalar_one_or_none()
    if not ann:
        ann = Announcement()
        db.add(ann)
        await db.commit()
        await db.refresh(ann)
    return ann


@router.get("")
async def get_announcement(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    ann = await _get_or_create_announcement(db)

    # Conta confirmações da versão atual
    stmt_count = select(AnnouncementConfirmation).where(
        AnnouncementConfirmation.announcement_id == ann.id,
        AnnouncementConfirmation.version_at == ann.version
    )
    confirmations = (await db.execute(stmt_count)).scalars().all()

    return {
        "id": str(ann.id),
        "html_content": ann.html_content,
        "is_active": ann.is_active,
        "start_at": ann.start_at.isoformat() if ann.start_at else None,
        "end_at": ann.end_at.isoformat() if ann.end_at else None,
        "version": ann.version,
        "updated_at": ann.updated_at.isoformat() if ann.updated_at else None,
        "total_confirmations": len(confirmations),
    }


@router.put("")
async def save_announcement(
    req: AnnouncementUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin)
):
    ann = await _get_or_create_announcement(db)

    content_changed = req.html_content is not None and req.html_content != ann.html_content

    if req.html_content is not None:
        ann.html_content = req.html_content
    if req.start_at is not None:
        ann.start_at = req.start_at
    if req.end_at is not None:
        ann.end_at = req.end_at

    # Se o conteúdo mudou → incrementa versão (e as confirmações antigas ficam obsoletas)
    if content_changed:
        ann.version = (ann.version or 1) + 1

    ann.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(ann)

    return {
        "id": str(ann.id),
        "version": ann.version,
        "message": "Comunicado salvo. Versão incrementada." if content_changed else "Comunicado salvo."
    }


@router.post("/toggle")
async def toggle_announcement(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    ann = await _get_or_create_announcement(db)
    ann.is_active = not ann.is_active
    await db.commit()
    return {"is_active": ann.is_active, "message": "Ativado" if ann.is_active else "Desativado"}


@router.get("/confirmations")
async def list_confirmations(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    ann = await _get_or_create_announcement(db)

    stmt = (
        select(AnnouncementConfirmation, User)
        .join(User, AnnouncementConfirmation.user_id == User.id)
        .where(
            AnnouncementConfirmation.announcement_id == ann.id,
            AnnouncementConfirmation.version_at == ann.version
        )
        .order_by(AnnouncementConfirmation.confirmed_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "confirmation_id": str(conf.id),
            "user_id": str(user.id),
            "user_name": user.name,
            "user_email": user.email,
            "confirmed_at": conf.confirmed_at.isoformat() if conf.confirmed_at else None,
        }
        for conf, user in rows
    ]


@router.delete("/confirmations")
async def reset_all_confirmations(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    ann = await _get_or_create_announcement(db)
    await db.execute(
        delete(AnnouncementConfirmation).where(
            AnnouncementConfirmation.announcement_id == ann.id,
            AnnouncementConfirmation.version_at == ann.version
        )
    )
    await db.commit()
    return {"message": "Todas as confirmações resetadas. O modal reaparecerá para todos."}


@router.delete("/confirmations/{user_id}")
async def reset_user_confirmation(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin)
):
    ann = await _get_or_create_announcement(db)
    await db.execute(
        delete(AnnouncementConfirmation).where(
            AnnouncementConfirmation.announcement_id == ann.id,
            AnnouncementConfirmation.user_id == user_id,
            AnnouncementConfirmation.version_at == ann.version
        )
    )
    await db.commit()
    return {"message": "Confirmação do usuário resetada."}
