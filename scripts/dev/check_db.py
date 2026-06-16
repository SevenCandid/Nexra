import asyncio
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://neondb_owner:npg_XIg9vFDGiMn5@ep-orange-cake-anvgz7pb.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_db():
    with SessionLocal() as db:
        print("--- LAST 5 DELIVERY REPORT LOGS ---")
        logs = db.execute(text("SELECT id, received_at, provider_msg_id, stat, err, sms_message_id, raw_content FROM delivery_report_logs ORDER BY received_at DESC LIMIT 5")).fetchall()
        for log in logs:
            print(dict(log._mapping))
            
        print("\n--- LAST 5 SMS MESSAGES ---")
        msgs = db.execute(text("SELECT id, recipient, status, provider_msg_id, sent_at, delivered_at FROM sms_messages ORDER BY created_at DESC LIMIT 5")).fetchall()
        for msg in msgs:
            print(dict(msg._mapping))

if __name__ == "__main__":
    check_db()
