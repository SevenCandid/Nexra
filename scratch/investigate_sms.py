import asyncio
from sqlalchemy import text
from app.db.database import engine
from datetime import datetime, date

async def investigate():
    async with engine.connect() as conn:
        print("--- Finding Tables ---")
        result = await conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in result.fetchall()]
        print(f"Tables: {tables}")

        print("\n--- Users ---")
        try:
            result = await conn.execute(text("SELECT id, email, plan FROM users LIMIT 10"))
            for row in result.fetchall():
                print(row)
        except Exception as e:
            print(f"Error reading users: {e}")

        print("\n--- Messages (Failed / Delivered Today) ---")
        try:
            result = await conn.execute(text("""
                SELECT user_id, status, count(*) 
                FROM messages 
                WHERE date(created_at) = CURRENT_DATE
                GROUP BY user_id, status
            """))
            for row in result.fetchall():
                print(row)
        except Exception as e:
            print(f"Error reading messages: {e}")
            
        print("\n--- Wallets ---")
        try:
            result = await conn.execute(text("SELECT user_id, balance FROM wallets LIMIT 10"))
            for row in result.fetchall():
                print(row)
        except Exception as e:
            print(f"Error reading wallets: {e}")
            
        print("\n--- Transactions ---")
        try:
            result = await conn.execute(text("SELECT user_id, type, amount, status FROM transactions LIMIT 10"))
            for row in result.fetchall():
                print(row)
        except Exception as e:
            print(f"Error reading transactions: {e}")

if __name__ == "__main__":
    asyncio.run(investigate())
