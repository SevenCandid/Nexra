import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def create_database():
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("POSTGRES_SERVER", "localhost")
    db_name = os.getenv("POSTGRES_DB", "nexra")

    print(f"Connecting to PostgreSQL as {user}...")
    try:
        # Connect to the default 'postgres' database
        conn = await asyncpg.connect(user=user, password=password, host=host, database='postgres')
        
        # Check if database exists
        exists = await conn.fetchval(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
        
        if not exists:
            print(f"Creating database '{db_name}'...")
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"Database '{db_name}' created successfully.")
        else:
            print(f"Database '{db_name}' already exists.")
            
        await conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    asyncio.run(create_database())
