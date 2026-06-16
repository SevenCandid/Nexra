
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Campaign, CampaignStatus, User

async def test_enum_insert():
    async with SessionLocal() as db:
        try:
            res = await db.execute(select(User).limit(1))
            user = res.scalar_one_or_none()
            if not user:
                print("No user found.")
                return
            
            print(f"Testing Enum vs Value insert for user {user.id}")
            
            # Test with Enum object (might fail if column is String)
            try:
                print("Inserting with CampaignStatus.DRAFT (Enum object)...")
                c1 = Campaign(
                    name="Enum Obj Test",
                    sender="NEXRA",
                    template="Test",
                    organization_id=user.organization_id,
                    user_id=user.id,
                    contact_ids=[],
                    status=CampaignStatus.DRAFT
                )
                db.add(c1)
                await db.commit()
                print("✅ Insert with Enum object WORKED")
            except Exception as e:
                print(f"❌ Insert with Enum object FAILED: {e}")
                await db.rollback()

            # Test with .value
            try:
                print("\nInserting with CampaignStatus.DRAFT.value (String)...")
                c2 = Campaign(
                    name="Enum Value Test",
                    sender="NEXRA",
                    template="Test",
                    organization_id=user.organization_id,
                    user_id=user.id,
                    contact_ids=[],
                    status=CampaignStatus.DRAFT.value
                )
                db.add(c2)
                await db.commit()
                print("✅ Insert with Enum value WORKED")
            except Exception as e:
                print(f"❌ Insert with Enum value FAILED: {e}")
                await db.rollback()

        except Exception as e:
            print(f"Test error: {e}")

if __name__ == "__main__":
    asyncio.run(test_enum_insert())
