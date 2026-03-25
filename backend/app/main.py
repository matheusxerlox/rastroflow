from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RastroFlow v4 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://v4.rastroflow.com.br", "https://app.rastroflow.com.br", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        # Cria as tabelas caso não existam (útil para desenvolvimento inicial)
        await conn.run_sync(Base.metadata.create_all)

from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.settings import router as settings_router
from app.routers.webhook_keedpay import router as keedpay_router
from app.routers.webhook_17track import router as track17_router
from app.routers.webhook_cakto import router as cakto_router
from app.routers.admin import router as admin_router

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(keedpay_router)
app.include_router(track17_router)
app.include_router(cakto_router)
app.include_router(admin_router)

@app.get("/")
async def root():
    return {"message": "RastroFlow v4 API is running"}

