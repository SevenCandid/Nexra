
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User

async def verify_casing():
    async with SessionLocal() as db:
        test_email = "FrankBediako38@gmail.com"
        print(f"Searching for: {test_email}")
        
        # Case-sensitive check (current implementation)
        res = await db.execute(select(User).where(User.email == test_email))
        user = res.scalar_one_or_none()
        if user:
            print("FOUND (Case-sensitive)")
        else:
            print("NOT FOUND (Case-sensitive)")
            
        # Case-insensitive check
        from sqlalchemy import func
        res = await db.execute(select(User).where(func.lower(User.email) == func.lower(test_email)))
        user = res.scalar_one_or_none()
        if user:
            print(f"FOUND (Case-insensitive) -> ID: {user.id}, Email: {user.email}")
        else:
            print("NOT FOUND (Case-insensitive)")

if __name__ == "__main__":
    asyncio.run(verify_casing())
