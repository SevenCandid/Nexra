import asyncio
from sqlalchemy import create_engine, inspect
from app.core.config import settings

def check_schema():
    # Sync engine for inspection
    url = settings.SQLALCHEMY_DATABASE_URI
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    
    engine = create_engine(url)
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('campaigns')]
    print(f"Columns in 'campaigns': {columns}")

if __name__ == "__main__":
    check_schema()
