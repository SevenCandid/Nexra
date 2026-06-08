from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import urllib.request, json

DATABASE_URL = "postgresql://neondb_owner:npg_XIg9vFDGiMn5@ep-orange-cake-anvgz7pb.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

ARKESEL_API_KEY = "dE9HU0pPV0dXQUdwbVpxQ0hieUY"

def resolve_remaining():
    with SessionLocal() as db:
        # Show remaining submitted messages
        rows = db.execute(text("""
            SELECT id, status, provider_msg_id, sent_at, recipient, organization_id
            FROM sms_messages 
            WHERE status = 'submitted'
        """)).fetchall()
        
        print(f"--- {len(rows)} remaining submitted messages ---")
        for r in rows:
            print(dict(r._mapping))
        
        # For each one with a provider_msg_id, poll Arkesel
        for r in rows:
            msg_id = r.provider_msg_id
            if not msg_id:
                print(f"  msg_id={r.id}: no provider_msg_id, force-marking delivered")
                db.execute(text("UPDATE sms_messages SET status='delivered', delivered_at=NOW() WHERE id=:id"), {"id": r.id})
            else:
                url = f"https://sms.arkesel.com/api/v2/sms/{msg_id}"
                req = urllib.request.Request(url, headers={"api-key": ARKESEL_API_KEY})
                try:
                    with urllib.request.urlopen(req) as resp:
                        data = json.loads(resp.read())
                        print(f"  msg_id={r.id}, provider_id={msg_id}: Arkesel says {data}")
                        raw = data.get("data", data)
                        status = str(raw.get("status") or "").upper()
                        print(f"    -> status = {status}")
                        if status in ("DELIVERED", "DELIVRD"):
                            db.execute(text("UPDATE sms_messages SET status='delivered', delivered_at=NOW() WHERE id=:id"), {"id": r.id})
                            print(f"    -> Updated to DELIVERED")
                        elif status in ("NOT_DELIVERED", "UNDELIV", "FAILED", "EXPIRED", "REJECTED"):
                            db.execute(text("UPDATE sms_messages SET status='not_delivered' WHERE id=:id"), {"id": r.id})
                            print(f"    -> Updated to NOT_DELIVERED")
                        else:
                            print(f"    -> Arkesel status '{status}' not mappable, leaving as-is")
                except Exception as e:
                    print(f"  msg_id={r.id}: error {e}")

        db.commit()
        
        print("\n--- Final status summary ---")
        summary = db.execute(text("SELECT status, count(*) FROM sms_messages GROUP BY status ORDER BY count DESC")).fetchall()
        for s in summary:
            print(dict(s._mapping))

if __name__ == "__main__":
    resolve_remaining()
