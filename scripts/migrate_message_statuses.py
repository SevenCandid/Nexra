"""
One-shot migration: update MessageStatus enum values in the SMSMessage table.

Old values  →  New values
-----------    -----------
sent        →  submitted
undeliverable → not_delivered
expired     →  not_delivered

Run from the project root:
    python scripts/migrate_message_statuses.py
"""
import asyncio
import sys
import os

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.database import engine


MIGRATIONS = [
    # 1. Rename 'sent' → 'submitted'
    "UPDATE sms_messages SET status = 'submitted' WHERE status = 'sent'",
    # 2. Rename 'undeliverable' → 'not_delivered'
    "UPDATE sms_messages SET status = 'not_delivered' WHERE status = 'undeliverable'",
    # 3. Rename 'expired' → 'not_delivered'
    "UPDATE sms_messages SET status = 'not_delivered' WHERE status = 'expired'",
]


async def run():
    async with engine.begin() as conn:
        for sql in MIGRATIONS:
            result = await conn.execute(text(sql))
            print(f"[OK] {sql!r}  →  {result.rowcount} row(s) updated")
    print("\nMigration complete.")


if __name__ == "__main__":
    asyncio.run(run())
