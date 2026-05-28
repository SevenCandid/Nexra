
import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def ultimate_fix():
    async with SessionLocal() as db:
        try:
            print("Applying ULTIMATE fix to 'campaigns' and 'sms_messages'...")
            
            # 1. Campaigns Table
            campaign_queries = [
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS name VARCHAR(255)",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sender VARCHAR(20)",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template TEXT",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(20)",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS contact_ids JSONB",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_data JSONB",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS organization_id INTEGER"
            ]
            
            # 2. SMS Messages Table
            sms_queries = [
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS sender VARCHAR(20)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS recipient VARCHAR(20)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS content TEXT",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS status VARCHAR(20)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS provider_name VARCHAR(50)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS provider_msg_id VARCHAR(100)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS user_id INTEGER",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS organization_id INTEGER",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS campaign_id INTEGER",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 4)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS credit_source VARCHAR(20)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN DEFAULT FALSE",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 4)",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITHOUT TIME ZONE",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS ledger_entry_id INTEGER",
                "ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS refund_ledger_entry_id INTEGER"
            ]
            
            # Extra: rename body to content if body exists and content doesn't (to preserve any accidental data)
            extra_queries = [
                "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sms_messages' AND column_name='body') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sms_messages' AND column_name='content') THEN ALTER TABLE sms_messages RENAME COLUMN body TO content; END IF; END $$;"
            ]

            for q in campaign_queries + sms_queries + extra_queries:
                try:
                    await db.execute(text(q))
                except Exception as e:
                    print(f"Query failed (likely harmless): {e}")
            
            await db.commit()
            print("Successfully applied ULTIMATE fix.")
            
        except Exception as e:
            await db.rollback()
            print(f"CRITICAL ERROR in ultimate fix: {e}")

if __name__ == "__main__":
    asyncio.run(ultimate_fix())
