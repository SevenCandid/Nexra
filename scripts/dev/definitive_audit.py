
import asyncio
from sqlalchemy import text, inspect
from app.db.database import engine
from app.db.models import Campaign, SMSMessage

async def definitive_audit():
    async with engine.connect() as conn:
        for table_name, model_class in [('campaigns', Campaign), ('sms_messages', SMSMessage)]:
            print(f"\n--- AUDITING TABLE: {table_name} ---")
            
            # DB Columns
            res = await conn.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' AND table_schema = 'public'
            """))
            db_cols = {row[0] for row in res.fetchall()}
            
            # Model Columns
            mapper = inspect(model_class)
            model_cols = {c.key for c in mapper.attrs if hasattr(c, 'key')}
            
            print(f"DB Columns: {sorted(list(db_cols))}")
            print(f"Model Fields: {sorted(list(model_cols))}")
            
            missing = model_cols - db_cols
            extra = db_cols - model_cols
            
            if missing:
                print(f"❌ MISSING IN DB: {missing}")
            else:
                print("✅ All model fields present in DB")
                
            if extra:
                print(f"⚠️ EXTRA IN DB (not in model): {extra}")

if __name__ == "__main__":
    asyncio.run(definitive_audit())
