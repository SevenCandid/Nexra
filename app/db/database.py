from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create Async Engine
engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)

# Create Async Session Factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
)

SessionLocal = AsyncSessionLocal

async def get_db():
    """
    Dependency to get a database session.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
