import asyncio
import httpx
import uuid
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database setup for cleanup
SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URI")
if not SQLALCHEMY_DATABASE_URL:
    # Construct it if not in .env (rare for this project)
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "Nexra2026")
    POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "nexra")
    SQLALCHEMY_DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"

engine = create_async_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def clear_database():
    from app.db.models import User, Organization, Wallet, StaffInvite, SenderID, AdminAuditLog, SMSMessage, DeliveryReportLog, Campaign, Notification
    async with SessionLocal() as db:
        print("[*] Clearing database for E2E test...")
        # Delete in order to satisfy FK constraints
        await db.execute(delete(Notification))
        await db.execute(delete(AdminAuditLog))
        await db.execute(delete(SenderID))
        await db.execute(delete(StaffInvite))
        # Clear messages and campaigns
        await db.execute(delete(DeliveryReportLog))
        await db.execute(delete(SMSMessage))
        await db.execute(delete(Campaign))
        # Clear core identity
        await db.execute(delete(Wallet))
        await db.execute(delete(User))
        await db.execute(delete(Organization))
        await db.commit()
    print("[+] Database cleared.")

BASE_URL = "http://localhost:8000/api/v1"

async def test_system_e2e():
    await clear_database()
    suffix = uuid.uuid4().hex[:4]
    super_email = f"super_e2e_{suffix}@nexra.com"
    staff_email = f"staff_e2e_{suffix}@nexra.com"
    user_email = f"user_e2e_{suffix}@nexra.com"
    password = "TestPassword123"
    admin_secret = "nexra-superadmin-5381"

    async with httpx.AsyncClient(timeout=30.0) as client:
        print("[*] 1. Registering Superadmin...")
        resp = await client.post(f"{BASE_URL}/auth/register", json={
            "full_name": "E2E Superadmin",
            "email": super_email,
            "password": password,
            "admin_secret": admin_secret,
            "organization_name": "NEXRA MASTER"
        })
        if resp.status_code != 200:
            print(f"[-] Superadmin registration failed: {resp.text}")
            return
        
        print("[*] 2. Logging in as Superadmin...")
        resp = await client.post(f"{BASE_URL}/auth/login", data={
            "username": super_email,
            "password": password
        })
        super_token = resp.json()["access_token"]
        super_headers = {"Authorization": f"Bearer {super_token}"}

        print("[*] 3. Generating Staff Invite...")
        resp = await client.post(f"{BASE_URL}/staff/invites", headers=super_headers)
        staff_id = resp.json()["staff_id"]
        print(f"[+] Staff ID: {staff_id}")

        print("[*] 4. Registering Staff User...")
        resp = await client.post(f"{BASE_URL}/auth/register", json={
            "full_name": "E2E Staff Member",
            "email": staff_email,
            "password": password,
            "staff_id": staff_id,
            "organization_name": "NEXRA INTERNAL"
        })
        print("[*] 5. Logging in as Staff...")
        resp = await client.post(f"{BASE_URL}/auth/login", data={
            "username": staff_email,
            "password": password
        })
        staff_token = resp.json()["access_token"]
        staff_headers = {"Authorization": f"Bearer {staff_token}"}

        # Get staff user ID
        resp = await client.get(f"{BASE_URL}/auth/me", headers=staff_headers)
        staff_user_id = resp.json()["id"]
        print(f"[+] Staff User ID: {staff_user_id}")

        print("[*] 6. Delegating 'manage_sender_ids' to Staff...")
        resp = await client.patch(
            f"{BASE_URL}/platform/users/{staff_user_id}/permissions",
            headers=super_headers,
            json={"permissions": {"manage_sender_ids": True}}
        )
        print(f"[+] Permissions updated: {resp.status_code}")

        print("[*] 7. Registering Normal User...")
        user_suffix = uuid.uuid4().hex[:4]
        resp = await client.post(f"{BASE_URL}/auth/register", json={
            "full_name": "E2E Public User",
            "email": user_email,
            "password": password,
            "organization_name": f"User_Org_{user_suffix}"
        })
        print(f"[+] User registered: {resp.status_code}")

        print("[*] 8. Logging in as User...")
        resp = await client.post(f"{BASE_URL}/auth/login", data={
            "username": user_email,
            "password": password
        })
        user_token = resp.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        print("[*] 9. User requesting Sender ID 'MYAPP'...")
        resp = await client.post(
            f"{BASE_URL}/sender-ids",
            headers=user_headers,
            json={"sender_id": "MYAPP"}
        )
        sender_id_obj = resp.json()
        sender_id_id = sender_id_obj["id"]
        print(f"[+] Sender ID Requested: {sender_id_id} (Status: {sender_id_obj['status']})")

        print("[*] 10. Staff listing pending IDs...")
        resp = await client.get(f"{BASE_URL}/sender-ids/admin/pending", headers=staff_headers)
        pending_ids = resp.json()
        print(f"[+] Pending IDs count: {len(pending_ids)}")
        assert any(p["id"] == sender_id_id for p in pending_ids)

        print("[*] 11. Staff Approving 'MYAPP'...")
        resp = await client.patch(
            f"{BASE_URL}/sender-ids/{sender_id_id}/status",
            headers=staff_headers,
            json={"status": "approved", "admin_comment": "Verified branding"}
        )
        print(f"[+] Approval result: {resp.status_code}")

        print("[*] 12. User verifying status...")
        resp = await client.get(f"{BASE_URL}/sender-ids", headers=user_headers)
        user_ids = resp.json()
        myapp = next(s for s in user_ids if s["id"] == sender_id_id)
        print(f"[+] Final Status: {myapp['status']}")
        assert myapp["status"] == "approved"

        print("[*] 13. User requesting 'SPAMMY'...")
        resp = await client.post(
            f"{BASE_URL}/sender-ids",
            headers=user_headers,
            json={"sender_id": "SPAMMY"}
        )
        spam_id = resp.json()["id"]

        print("[*] 14. Staff Rejecting 'SPAMMY'...")
        resp = await client.patch(
            f"{BASE_URL}/sender-ids/{spam_id}/status",
            headers=staff_headers,
            json={"status": "rejected", "admin_comment": "Violates anti-spam policy"}
        )
        print(f"[+] Rejection result: {resp.status_code}")

        print("[*] 15. User verifying rejection...")
        resp = await client.get(f"{BASE_URL}/sender-ids", headers=user_headers)
        user_ids = resp.json()
        spam = next(s for s in user_ids if s["id"] == spam_id)
        print(f"[+] Final Status: {spam['status']} (Comment: {spam.get('admin_comment')})")
        assert spam["status"] == "rejected"
        assert spam["admin_comment"] == "Violates anti-spam policy"

        print("\n[!!!] ALL END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY [!!!]")
        print(f"Superadmin: {super_email} / {password}")
        print(f"Staff:      {staff_email} / {password}")
        print(f"User:       {user_email} / {password}")

if __name__ == "__main__":
    asyncio.run(test_system_e2e())
