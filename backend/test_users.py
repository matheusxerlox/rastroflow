import asyncio
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
from app.database import get_db, Base, engine
from app.models.user import User
from app.models.webhook_log import WebhookLog
from sqlalchemy import select

async def test():
    print("Testing if models compile correctly...")
    from app.main import app
    print("FastAPI loaded successfully!")

asyncio.run(test())
