
import asyncio
import httpx

async def test_api():
    base_url = "http://localhost:8000/api/v1"
    
    # Login as frankbediako07@gmail.com (Org 4)
    # Success/frankbediako07@gmail.com
    # (Assuming password is 'password' or something similar, but I can't know)
    # Actually, I'll just check the DB directly for tokens or just run a DB query that simulates the API logic but prints more.
    pass

if __name__ == "__main__":
    # Instead of HTTP, let's use the DB session directly to simulate the API call for a specific user.
    from app.db.database import SessionLocal
    from app.db.models import User, SenderID
    from sqlalchemy import select
    
    async def simulate_api():
        async with SessionLocal() as db:
            # Find User frankbediako07@gmail.com
            result = await db.execute(select(User).where(User.email == "frankbediako07@gmail.com"))
            user = result.scalar_one_or_none()
            if not user:
                print("User not found")
                return
            
            print(f"Simulating API for User: {user.email}, OrgID: {user.organization_id}")
            
            # Simulate list_sender_ids
            query = select(SenderID).where(SenderID.organization_id == user.organization_id)
            result_sids = await db.execute(query)
            sids = result_sids.scalars().all()
            
            print(f"Found {len(sids)} Sender IDs")
            for s in sids:
                print(f"ID: {s.id}, Name: {s.sender_id}, Status: {s.status}, Type of Status: {type(s.status)}")

    asyncio.run(simulate_api())
