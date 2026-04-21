
import asyncio
from sqlalchemy import text, inspect
from app.db.database import engine

async def debug_schema_conflict():
    async with engine.connect() as conn:
        print(f"Engine URL: {engine.url}")
        
        # 1. Check all campaigns tables across all schemas
        print("\n--- ALL 'campaigns' TABLES IN ALL SCHEMAS ---")
        res = await conn.execute(text("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name = 'campaigns'
        """))
        tables = res.fetchall()
        for t in tables:
            schema, name = t
            print(f"Checking Schema: {schema}, Table: {name}")
            col_res = await conn.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = '{schema}' AND table_name = '{name}'
            """))
            cols = [r[0] for r in col_res.fetchall()]
            print(f"  Columns: {cols}")
            
        # 2. Check search path
        print("\n--- CURRENT SEARCH PATH ---")
        res = await conn.execute(text("SHOW search_path"))
        print(res.scalar())

if __name__ == "__main__":
    asyncio.run(debug_schema_conflict())
