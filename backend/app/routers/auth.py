from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import os
import uuid

from app.database import get_db
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.services.email import send_password_reset_email 

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "chave_secreta_default")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None, pwd_rev: str | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    if pwd_rev:
        to_encode.update({"pwd_rev": pwd_rev})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        pwd_rev_token = payload.get("pwd_rev")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    if pwd_rev_token and getattr(user, "password_hash", None):
        current_pwd_rev = user.password_hash[-10:] if len(user.password_hash) >= 10 else user.password_hash
        if pwd_rev_token != current_pwd_rev:
            raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail=f"User inactive. Reason: {user.motivo_bloqueio}")
    
    # Verifica expiração do plano
    if user.plano_expira_em:
        expira = user.plano_expira_em
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expira:
            raise HTTPException(status_code=403, detail="Plano expirado. Renove sua assinatura para continuar.")
        
    if user.parent_id:
        stmt_parent = select(User).where(User.id == user.parent_id)
        parent = (await db.execute(stmt_parent)).scalar_one_or_none()
        if parent and not parent.is_active:
            raise HTTPException(status_code=403, detail="A conta principal (matriz) está bloqueada.")
            
    return user

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user

# -----------------
# Pydantic Schemas
# -----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail=f"Conta bloqueada: {user.motivo_bloqueio}")
    
    # Verifica expiração do plano no login
    if user.plano_expira_em:
        expira = user.plano_expira_em
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expira:
            raise HTTPException(status_code=403, detail="Plano expirado. Renove sua assinatura para continuar.")
        
    if user.parent_id:
        stmt_parent = select(User).where(User.id == user.parent_id)
        parent = (await db.execute(stmt_parent)).scalar_one_or_none()
        if parent and not parent.is_active:
            raise HTTPException(status_code=403, detail="A conta principal (matriz) está bloqueada.")
            
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    pwd_rev = user.password_hash[-10:] if getattr(user, "password_hash", None) else ""
    
    access_token = create_access_token(
        data={"sub": str(user.id), "is_admin": user.is_admin}, 
        expires_delta=access_token_expires,
        pwd_rev=pwd_rev
    )
    
    parent_name = None
    if user.parent_id:
        stmt_parent = select(User.name).where(User.id == user.parent_id)
        parent_name = (await db.execute(stmt_parent)).scalar_one_or_none()

    user_data = {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "is_admin": user.is_admin,
        "plano": user.plano,
        "primeiro_acesso": user.primeiro_acesso,
        "parent_name": parent_name
    }
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_data}

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user:
        reset_token = uuid.uuid4()
        expira_em = datetime.now(timezone.utc) + timedelta(minutes=30)
        
        token_entry = PasswordResetToken(
            user_id=user.id,
            token=reset_token,
            expira_em=expira_em
        )
        db.add(token_entry)
        await db.commit()
        
        send_password_reset_email(user.email, str(reset_token))
        
    return {"message": "If the email exists, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    try:
        token_uuid = uuid.UUID(req.token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token format")
        
    stmt = select(PasswordResetToken).where(
        PasswordResetToken.token == token_uuid,
        PasswordResetToken.usado == False
    )
    result = await db.execute(stmt)
    token_entry = result.scalar_one_or_none()
    
    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid or used token")
        
    if token_entry.expira_em < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
        
    stmt_user = select(User).where(User.id == token_entry.user_id)
    result_user = await db.execute(stmt_user)
    user = result_user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = get_password_hash(req.new_password)
    user.primeiro_acesso = False
    token_entry.usado = True
    
    await db.commit()
    return {"message": "Password reset successfully"}
