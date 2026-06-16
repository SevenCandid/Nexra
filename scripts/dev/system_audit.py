
import asyncio
import httpx
from sqlalchemy import select, text
from app.db.database import SessionLocal
from app.core.config import settings

async def audit_system():
    print("=== NEXRA SYSTEM HEALTH AUDIT ===")
    
    # 1. Database Health
    print("\n[1/5] Checking Database Connection...")
    try:
        async with SessionLocal() as db:
            result = await db.execute(text("SELECT 1"))
            if result.scalar() == 1:
                print("SUCCESS: Database is reachable and responding.")
            else:
                print("FAILURE: Database returned unexpected result.")
    except Exception as e:
        print(f"CRITICAL: Database connection failed: {str(e)}")

    # 2. API Availability
    print("\n[2/5] Checking Backend API (localhost:8000)...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/")
            if response.status_code == 200:
                print(f"SUCCESS: API is UP ({response.json().get('message')})")
            else:
                print(f"WARNING: API returned status {response.status_code}")
    except Exception as e:
        print(f"CRITICAL: API is unreachable: {str(e)}")

    # 3. Google OAuth Configuration
    print("\n[3/5] Checking Google OAuth Configuration...")
    if all([settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET, settings.GOOGLE_REDIRECT_URI]):
        print("SUCCESS: Google OAuth credentials are set.")
        if "localhost:8000" in settings.GOOGLE_REDIRECT_URI:
            print("INFO: Redirect URI points to localhost (Dev Mode).")
    else:
        print("WARNING: Google OAuth credentials may be incomplete.")

    # 4. Background Workers (Mock Check)
    print("\n[4/5] Checking Background Workers status...")
    # Since we can't easily probe running tasks from outside, we check the last campaign/retry activity
    try:
        async with SessionLocal() as db:
            from app.db.models import SMSMessage
            res = await db.execute(select(SMSMessage).order_by(SMSMessage.id.desc()).limit(1))
            last_msg = res.scalar_one_or_none()
            if last_msg:
                print(f"INFO: Last message activity recorded at {last_msg.created_at}")
            else:
                print("INFO: No message activity found in database yet.")
    except Exception as e:
        print(f"WARNING: Could not check worker activity: {str(e)}")

    # 5. Frontend Check (Simple accessibility)
    print("\n[5/5] Checking Dashboard Server (localhost:8080)...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8080/")
            if response.status_code == 200:
                print("SUCCESS: Dashboard server is UP.")
            else:
                print(f"WARNING: Dashboard returned status {response.status_code}")
    except Exception as e:
        print(f"CRITICAL: Dashboard server is unreachable: {str(e)}")

if __name__ == "__main__":
    asyncio.run(audit_system())
