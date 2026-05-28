
import asyncio
from sqlalchemy import text, inspect
from app.db.database import engine
from app.db.models import Campaign

async def compare_schema():
    async with engine.connect() as conn:
        # Get DB columns
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns'"))
        db_cols = set([r[0] for r in res.fetchall()])
        
        # Get Model columns
        # We can use reflection or just inspect the mapper
        from sqlalchemy.orm import class_mapper
        model_cols = set([c.key for c in class_mapper(Campaign).columns])
        
        print(f"DB Columns: {db_cols}")
        print(f"Model Columns: {model_cols}")
        
        missing_in_db = model_cols - db_cols
        print(f"MISSING IN DB: {missing_in_db}")
        
        extra_in_db = db_cols - model_cols
        print(f"EXTRA IN DB: {extra_in_db}")

if __name__ == "__main__":
    asyncio.run(compare_schema())
