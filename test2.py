import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import select, func, cast, Date
from sqlalchemy.sql import text
import ssl

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_XIg9vFDGiMn5@ep-orange-cake-anvgz7pb.c-6.us-east-1.aws.neon.tech/neondb"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
engine = create_async_engine(DATABASE_URL, connect_args={"ssl": ctx}, echo=True)

async def main():
    async with engine.connect() as conn:
        print("Connected!")
        # 1. Test cast(created_at, Date)
        print("Testing cast to Date...")
        try:
            res = await conn.execute(text("SELECT CAST(created_at AS DATE) FROM sms_messages LIMIT 1"))
            print(res.all())
        except Exception as e:
            print("ERROR 1:", e)

        # 2. Test extract epoch
        print("Testing extract epoch...")
        try:
            res = await conn.execute(text("SELECT AVG(EXTRACT('epoch' FROM (delivered_at - sent_at))) FROM sms_messages WHERE delivered_at IS NOT NULL AND sent_at IS NOT NULL"))
            print(res.all())
        except Exception as e:
            print("ERROR 2:", e)

        # 3. Test date_trunc
        print("Testing date_trunc...")
        try:
            res = await conn.execute(text("SELECT date_trunc('hour', created_at) FROM sms_messages GROUP BY date_trunc('hour', created_at) LIMIT 1"))
            print(res.all())
        except Exception as e:
            print("ERROR 3:", e)
            
        print("Done!")

asyncio.run(main())
