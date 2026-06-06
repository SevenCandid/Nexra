"""
One-shot DB migration via psycopg2 (sync).
Renames old MessageStatus values to new canonical ones.

Run from project root:
    python scripts/run_migration.py
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "")
if not db_url:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

# Normalise to a plain psycopg2-compatible URL
db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
db_url = db_url.replace("postgres://", "postgresql://")
db_url = db_url.split("?sslmode=")[0]

print(f"Connecting to: {db_url[:50]}...")

try:
    conn = psycopg2.connect(db_url, sslmode="require")
except Exception as e:
    # Fallback: try without explicit sslmode (e.g. local dev)
    print(f"SSL connect failed ({e}), retrying without SSL...")
    conn = psycopg2.connect(db_url)

conn.autocommit = False
cur = conn.cursor()

migrations = [
    ("sent -> submitted",           "UPDATE sms_messages SET status = 'submitted'    WHERE status = 'sent'"),
    ("undeliverable -> not_delivered", "UPDATE sms_messages SET status = 'not_delivered' WHERE status = 'undeliverable'"),
    ("expired -> not_delivered",    "UPDATE sms_messages SET status = 'not_delivered' WHERE status = 'expired'"),
]

for label, sql in migrations:
    cur.execute(sql)
    print(f"  [OK] {label}: {cur.rowcount} row(s) updated")

conn.commit()
cur.close()
conn.close()
print("Migration complete.")
