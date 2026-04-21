"""Create any missing tables that might not have been migrated."""
import asyncio
from app.db.database import engine
from app.db.models import Base

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("All tables created/verified successfully.")

if __name__ == "__main__":
    asyncio.run(create_tables())
