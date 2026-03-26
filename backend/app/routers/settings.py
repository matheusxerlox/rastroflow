from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])

class WebhookCobrancaRequest(BaseModel):
    url: str

@router.get("/webhook-url")
async def get_webhook_url(current_user: User = Depends(get_current_user)):
    import os
    base_url = os.getenv("WEBHOOK_BASE_URL", "https://v4.rastroflow.com.br")
    return {"webhook_url": f"{base_url}/w/{current_user.webhook_token}"}

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """Retorna dados do perfil incluindo a URL de cobrança salva"""
    return {
        "webhook_cobranca_url": current_user.webhook_cobranca_url or ""
    }

@router.post("/regenerate-token")
async def regenerate_token(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    import os
    current_user.webhook_token = uuid.uuid4()
    await db.commit()
    base_url = os.getenv("WEBHOOK_BASE_URL", "https://v4.rastroflow.com.br")
    return {"webhook_url": f"{base_url}/w/{current_user.webhook_token}"}

@router.get("/webhook-cobranca")
async def get_webhook_cobranca(current_user: User = Depends(get_current_user)):
    return {"url": current_user.webhook_cobranca_url or ""}

@router.put("/webhook-cobranca")
async def update_webhook_cobranca(req: WebhookCobrancaRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.webhook_cobranca_url = req.url
    await db.commit()
    return {"message": "URL de cobrança atualizada com sucesso", "url": current_user.webhook_cobranca_url}
