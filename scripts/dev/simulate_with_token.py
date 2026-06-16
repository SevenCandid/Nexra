
import asyncio
import httpx
from app.core import security
from app.db.database import SessionLocal
from app.db.models import User, SenderID, SenderIDStatus
from sqlalchemy import select

async def simulate_with_token():
    async with SessionLocal() as db:
        # 1. Get a user
        res = await db.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("No user found in DB.")
            return
        
        print(f"Testing for user: {user.email}")
        
        # 2. Get an approved Sender ID for this org
        res = await db.execute(select(SenderID).where(
            SenderID.organization_id == user.organization_id,
            SenderID.status == SenderIDStatus.APPROVED
        ))
        sid = res.scalar_one_or_none()
        if not sid:
            print(f"No approved Sender ID for org {user.organization_id}")
            sid_name = "NEXRA" # Fallback but might fail validation
        else:
            sid_name = sid.sender_id
            print(f"Using SID: {sid_name}")

        # 3. Create Token
        token = security.create_access_token(user.id)
        
        # 4. Create Campaign
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "name": "Verification Test Campaign",
            "sender": sid_name,
            "template": "Verification test message",
            "contact_ids": [1] # Assuming some contacts exist
        }
        
        async with httpx.AsyncClient() as client:
            print("Sending POST /api/v1/campaigns...")
            try:
                res = await client.post("http://localhost:8000/api/v1/campaigns", json=payload, headers=headers)
                print(f"Status Code: {res.status_code}")
                print(f"Response Body: {res.text}")
                
                if res.status_code == 500:
                    print("\nINTERNAL SERVER ERROR DETECTED.")
                elif res.status_code == 200:
                    print("\nSUCCESS: Campaign created!")
            except Exception as e:
                print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(simulate_with_token())
