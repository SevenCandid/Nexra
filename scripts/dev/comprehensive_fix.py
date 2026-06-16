
import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def comprehensive_fix():
    async with SessionLocal() as db:
        try:
            print("Applying comprehensive fix to 'campaigns' table...")
            
            # Add all potentially missing columns
            queries = [
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS name VARCHAR(255)",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sender VARCHAR(20)",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template TEXT",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(20)",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS contact_ids JSONB",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS organization_id INTEGER",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_data JSONB",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            ]
            
            for query in queries:
                print(f"Executing: {query}")
                await db.execute(text(query))
            
            # Fix naming mismatch if needed (renaming metadata to meta_data if it exists)
            # But safer to just add meta_data and leave metadata if it exists
            
            await db.commit()
            print("Successfully applied comprehensive fix.")
            
        except Exception as e:
            await db.rollback()
            print(f"Error applying fix: {e}")

if __name__ == "__main__":
    asyncio.run(comprehensive_fix())
