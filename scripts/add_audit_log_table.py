"""
Migration script: Create admin_audit_logs table.
Run from the NEXRA root directory with the venv activated.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.models import Base, AdminAuditLog  # noqa: F401 -- ensures table is registered

async def run_migration():
    """Create any tables in the metadata that don't yet exist in the DB."""
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
    async with engine.begin() as conn:
        # Only creates tables that don't exist — safe to run multiple times
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("✅ Migration complete: admin_audit_logs table ensured.")

if __name__ == "__main__":
    asyncio.run(run_migration())
