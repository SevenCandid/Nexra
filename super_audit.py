
import asyncio
from sqlalchemy import text, inspect
from app.db.database import engine
from app.db.models import Campaign

async def super_audit():
    async with engine.connect() as conn:
        print("\n--- DATABASE SCHEMA (campaigns) ---")
        res = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns' AND table_schema = 'public'
            ORDER BY ordinal_position
        """))
        db_cols = {row[0]: row[1] for row in res.fetchall()}
        for col, dtype in db_cols.items():
            print(f"DB: {col} ({dtype})")

        print("\n--- MODEL ATTRIBUTES (Campaign) ---")
        # Get attributes from the model
        model_attrs = [a for a in dir(Campaign) if not a.startswith('_') and not callable(getattr(Campaign, a))]
        # More robust way using inspector
        from sqlalchemy import inspect
        mapper = inspect(Campaign)
        model_cols = {c.key: c.type for c in mapper.attrs if hasattr(c, 'key')}
        
        for attr, atype in model_cols.items():
            print(f"Model: {attr} ({atype})")

        print("\n--- COMPARISON ---")
        missing_in_db = set(model_cols.keys()) - set(db_cols.keys())
        missing_in_model = set(db_cols.keys()) - set(model_cols.keys())
        
        if missing_in_db:
            print(f"❌ MISSING IN DB: {missing_in_db}")
        else:
            print("✅ All model fields present in DB")
            
        if missing_in_model:
            print(f"⚠️ EXTRA IN DB: {missing_in_model}")

if __name__ == "__main__":
    asyncio.run(super_audit())
