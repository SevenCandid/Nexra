import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def check():
    async with SessionLocal() as db:
        try:
            r = await db.execute(text('SELECT count(*) FROM users'))
            print(f'Users: {r.scalar()}')
        except Exception as e:
            print(f"Error checking users: {e}")
            
        try:
            r = await db.execute(text('SELECT count(*) FROM contacts'))
            print(f'Contacts: {r.scalar()}')
        except Exception as e:
            print(f"Error checking contacts: {e}")

if __name__ == "__main__":
    asyncio.run(check())
