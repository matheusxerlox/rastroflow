import asyncio
from passlib.context import CryptContext
from app.database import AsyncSessionLocal, engine
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def create_admin():
    email = input("Email do admin: ")
    password = input("Senha do admin: ")
    name = input("Nome do admin: ")

    async with AsyncSessionLocal() as db:
        admin_user = User(
            name=name,
            email=email,
            password_hash=get_password_hash(password),
            is_active=True,
            is_admin=True,
            primeiro_acesso=False
        )
        db.add(admin_user)
        await db.commit()
        print(f"Administrador {email} criado com sucesso!")

if __name__ == "__main__":
    asyncio.run(create_admin())
