from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://neondb_owner:npg_XIg9vFDGiMn5@ep-orange-cake-anvgz7pb.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def fix_stuck():
    with SessionLocal() as db:
        # Show the stuck messages with no provider_msg_id
        print("--- Messages stuck with no provider_msg_id ---")
        rows = db.execute(text("""
            SELECT id, status, provider_msg_id, sent_at, content, recipient 
            FROM sms_messages 
            WHERE status = 'submitted' AND provider_msg_id IS NULL
        """)).fetchall()
        for r in rows:
            print(dict(r._mapping))

        # Force update them to 'delivered' since the user confirmed they delivered
        if rows:
            ids = [r.id for r in rows]
            print(f"\nForce-updating message IDs {ids} to 'delivered'...")
            db.execute(text("""
                UPDATE sms_messages 
                SET status = 'delivered', delivered_at = NOW()
                WHERE id = ANY(:ids)
            """), {"ids": ids})
            db.commit()
            print("Done!")
        else:
            print("No stuck messages without provider_msg_id found.")
        
        # Also show total message count per status
        print("\n--- Message status summary ---")
        summary = db.execute(text("SELECT status, count(*) FROM sms_messages GROUP BY status")).fetchall()
        for s in summary:
            print(dict(s._mapping))

if __name__ == "__main__":
    fix_stuck()
