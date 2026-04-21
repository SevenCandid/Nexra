
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User, Organization

async def list_entities():
    async with SessionLocal() as db:
        print("--- USERS ---")
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Org ID: {u.organization_id}, Role: {u.role}")
            
        print("\n--- ORGANIZATIONS ---")
        res = await db.execute(select(Organization))
        orgs = res.scalars().all()
        for o in orgs:
            print(f"ID: {o.id}, Name: {o.name}, Slug: {o.slug}")

if __name__ == "__main__":
    asyncio.run(list_entities())
