import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.models import Base

async def init_db():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
    
    print("Creating all tables in the database...")
    async with engine.begin() as conn:
        # Create all tables defined in models.py
        await conn.run_sync(Base.metadata.create_all)
    
    print("All tables created successfully.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
