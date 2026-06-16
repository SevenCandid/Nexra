
import asyncio
from sqlalchemy import select, func
from app.db.database import SessionLocal
from app.db.models import User

async def verify_oauth_casing_fix():
    async with SessionLocal() as db:
        # Mixed-case email that should match "frankbediako38@gmail.com"
        google_email = "FrankBediako38@Gmail.com"
        normalized_email = google_email.lower().strip()
        
        print(f"Simulating Google Callback for: {google_email}")
        print(f"Normalized to: {normalized_email}")
        
        # This is the logic I just implemented in auth.py
        result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"SUCCESS: User found despite casing! (ID: {user.id}, DB Email: {user.email})")
            if user.email == "frankbediako38@gmail.com":
                print("Confirmed: Matched the correct lowercase record.")
        else:
            print("FAILURE: User not found. Casing fix not working or user missing.")

if __name__ == "__main__":
    asyncio.run(verify_oauth_casing_fix())
