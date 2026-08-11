import asyncio
import traceback
from sqlalchemy import text
from app.db.database import SessionLocal

async def diagnose():
    async with SessionLocal() as db:
        print("--- Diagnosing BillingLedger Table ---")
        try:
            await db.execute(text("SELECT * FROM billing_ledger LIMIT 1"))
            print("Successfully queried all columns in 'billing_ledger'.")
        except Exception:
            print("Error in 'billing_ledger' table:")
            print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(diagnose())
