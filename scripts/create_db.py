import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect(user='postgres', password='Nexra2026', host='localhost', database='postgres')
        await conn.execute('CREATE DATABASE nexra')
        await conn.close()
        print("Database 'nexra' created successfully.")
    except asyncpg.exceptions.DuplicateDatabaseError:
        print("Database 'nexra' already exists.")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
