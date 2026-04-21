import asyncio
import os
import sys

# Add project root to sys.path to allow imports from app
sys.path.append(os.getcwd())

from sqlalchemy.future import select
from app.db.database import AsyncSessionLocal
from app.db.models import Waitlist

async def view_waitlist():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Waitlist).order_by(Waitlist.position))
        entries = result.scalars().all()
        
        if not entries:
            print("\nWaitlist is empty.\n")
            return

        print("\n" + "="*100)
        print(f"{'Pos':<5} | {'Email':<30} | {'Name':<20} | {'Company':<20} | {'Date':<20}")
        print("-" * 100)
        
        for entry in entries:
            name = entry.name if entry.name else "N/A"
            company = entry.company if entry.company else "N/A"
            date_str = entry.signup_date.strftime("%Y-%m-%d %H:%M")
            print(f"{entry.position:<5} | {entry.email:<30} | {name:<20} | {company:<20} | {date_str:<20}")
        
        print("="*100 + "\n")
        print(f"Total entries: {len(entries)}\n")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(view_waitlist())
