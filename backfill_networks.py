import asyncio
from app.db.database import get_db
from app.db.models import Contact
from app.core.phone_utils import detect_network
from sqlalchemy import select

async def backfill():
    async for db in get_db():
        try:
            query = select(Contact).where(Contact.network == None)
            result = await db.execute(query)
            contacts = result.scalars().all()
            
            count = 0
            for contact in contacts:
                network_provider, _ = detect_network(contact.phone_number)
                contact.network = network_provider.value
                db.add(contact)
                count += 1
                
            await db.commit()
            print(f"Backfilled network tag for {count} contacts.")
        except Exception as e:
            print(f"Error: {e}")
        break

if __name__ == "__main__":
    asyncio.run(backfill())
