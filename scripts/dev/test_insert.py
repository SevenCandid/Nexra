
import asyncio
from sqlalchemy import select, text
from app.db.database import SessionLocal, engine
from app.db.models import Campaign, CampaignStatus, User

async def test_insert():
    async with SessionLocal() as db:
        try:
            # 1. Check user
            res = await db.execute(select(User).limit(1))
            user = res.scalar_one_or_none()
            if not user:
                print("No user found.")
                return
            
            print(f"Testing insert for user {user.id} in org {user.organization_id}")
            
            # 2. Try raw insert first to see if it works
            try:
                print("Step: Raw SQL Insert...")
                await db.execute(text("""
                    INSERT INTO campaigns (name, sender, template, status, organization_id, user_id, contact_ids)
                    VALUES (:name, :sender, :template, :status, :org_id, :user_id, :contacts)
                """), {
                    "name": "Raw Test",
                    "sender": "NEXRA",
                    "template": "Hello",
                    "status": "draft",
                    "org_id": user.organization_id,
                    "user_id": user.id,
                    "contacts": []
                })
                await db.commit()
                print("Raw SQL Insert successful.")
            except Exception as e:
                print(f"Raw SQL Insert FAILED: {e}")
                await db.rollback()

            # 3. Try ORM insert
            try:
                print("\nStep: ORM Insert...")
                new_c = Campaign(
                    name="ORM Test",
                    sender="NEXRA",
                    template="Hello ORM",
                    organization_id=user.organization_id,
                    user_id=user.id,
                    contact_ids=[],
                    status=CampaignStatus.DRAFT
                )
                db.add(new_c)
                await db.commit()
                print("ORM Insert successful.")
            except Exception as e:
                print(f"ORM Insert FAILED: {e}")
                import traceback
                traceback.print_exc()
                await db.rollback()

        except Exception as e:
            print(f"Overall test failure: {e}")

if __name__ == "__main__":
    asyncio.run(test_insert())
