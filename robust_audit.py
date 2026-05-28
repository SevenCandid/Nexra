
import asyncio
from sqlalchemy import inspect
from app.db.database import engine

async def robust_audit():
    def get_cols():
        inspector = inspect(engine.sync_engine if hasattr(engine, 'sync_engine') else engine)
        return inspector.get_columns('campaigns')

    cols = await asyncio.to_thread(get_cols)
    print("\n--- CAMPAIGNS COLUMNS (Inspector) ---")
    for col in cols:
        print(f"Name: {col['name']}, Type: {col['type']}")

if __name__ == "__main__":
    asyncio.run(robust_audit())
