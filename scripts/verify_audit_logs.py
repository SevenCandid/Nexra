import asyncio
import os
import sys
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import SessionLocal
from app.db.models import AdminAuditLog, Notification

async def verify_data():
    async with SessionLocal() as db:
        # Check Audit Logs
        res_audit = await db.execute(select(AdminAuditLog))
        logs = res_audit.scalars().all()
        print(f"[*] Found {len(logs)} audit logs.")
        
        # Check Notifications
        res_notif = await db.execute(select(Notification))
        notifs = res_notif.scalars().all()
        print(f"[*] Found {len(notifs)} notifications.")
        
        for n in notifs:
            print(f"  - Notification: {n.title} | Type: {n.type}")

if __name__ == "__main__":
    asyncio.run(verify_data())
