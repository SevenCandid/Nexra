
import asyncio
from sqlalchemy import text, inspect
from app.db.database import engine
from app.db.models import Campaign, SMSMessage

async def super_audit():
    async with engine.connect() as conn:
        for table_name in ['campaigns', 'sms_messages']:
            print(f"\n--- TABLE: {table_name} ---")
            res = await conn.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' AND table_schema = 'public'
                ORDER BY ordinal_position
            """))
            db_cols = {row[0]: row[1] for row in res.fetchall()}
            for col, dtype in db_cols.items():
                print(f"DB: {col} ({dtype})")

            model_class = Campaign if table_name == 'campaigns' else SMSMessage
            mapper = inspect(model_class)
            model_cols = [c.key for c in mapper.attrs if hasattr(c, 'key')]
            
            print(f"\nMODEL {table_name} COLUMNS:")
            for mcol in model_cols:
                print(f" - {mcol}")

            missing_in_db = set(model_cols) - set(db_cols.keys())
            if missing_in_db:
                print(f"❌ MISSING IN DB '{table_name}': {missing_in_db}")
            else:
                print(f"✅ All model fields present in DB table '{table_name}'")

if __name__ == "__main__":
    asyncio.run(super_audit())
