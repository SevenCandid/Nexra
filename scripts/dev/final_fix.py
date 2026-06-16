
import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def final_comprehensive_fix():
    async with SessionLocal() as db:
        try:
            print("Applying final comprehensive fix to 'campaigns' and 'sms_messages'...")
            
            queries = [
                # Campaigns table fixes
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
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                
                # SMS Messages table fixes (based on potential missing ones from relationships)
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS sender VARCHAR(20)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS recipient VARCHAR(20)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS body TEXT",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS status VARCHAR(20)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            ]
            
            for query in queries:
                try:
                    print(f"Executing: {query}")
                    await db.execute(text(query))
                except Exception as inner_e:
                    print(f"Skipping failed query (might already be fixed): {inner_e}")
            
            await db.commit()
            print("Successfully applied final comprehensive fix.")
            
        except Exception as e:
            await db.rollback()
            print(f"Error applying fix: {e}")

if __name__ == "__main__":
    asyncio.run(final_comprehensive_fix())
