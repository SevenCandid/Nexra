import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.database import SessionLocal

async def check_schema():
    async with SessionLocal() as db:
        try:
            # Try to query the column
            result = await db.execute(text("SELECT contact_ids FROM campaigns LIMIT 1"))
            print("Successfully queried 'contact_ids' column.")
        except Exception as e:
            print(f"Error querying 'contact_ids': {e}")
            
        try:
            # List all columns
            result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns'"))
            columns = [row[0] for row in result.all()]
            print(f"Columns in 'campaigns' table: {columns}")
        except Exception as e:
            print(f"Error listing columns: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
