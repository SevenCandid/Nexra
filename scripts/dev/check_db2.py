import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://neondb_owner:npg_XIg9vFDGiMn5@ep-orange-cake-anvgz7pb.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_db():
    with SessionLocal() as db:
        print("--- LAST 5 SMS MESSAGES ---")
        msgs = db.execute(text("SELECT id, organization_id, recipient, status, provider_msg_id FROM sms_messages ORDER BY created_at DESC LIMIT 5")).fetchall()
        for msg in msgs:
            print(dict(msg._mapping))
            
        print("\n--- USERS AND THEIR ORGS ---")
        users = db.execute(text("SELECT id, email, organization_id FROM users LIMIT 5")).fetchall()
        for user in users:
            print(dict(user._mapping))

if __name__ == "__main__":
    check_db()
