"""
Check and update the Postgres ENUM type for messagestatus to include
the new values ('submitted', 'not_delivered') and remove old ones
('sent', 'undeliverable', 'expired').

Postgres ENUMs can only ADD values (not rename/remove) without rebuilding.
Since we already migrated all data rows, we:
  1. Add the new values if they don't exist yet.
  2. Convert the column to VARCHAR, drop the old enum, recreate it cleanly,
     then convert back — only if the old values still exist in the type.

Run from project root:
    python scripts/fix_enum.py
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

db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
db_url = db_url.replace("postgres://", "postgresql://")
db_url = db_url.split("?sslmode=")[0]

print(f"Connecting to: {db_url[:50]}...")

try:
    conn = psycopg2.connect(db_url, sslmode="require")
except Exception as e:
    print(f"SSL connect failed ({e}), retrying without SSL...")
    conn = psycopg2.connect(db_url)

conn.autocommit = False
cur = conn.cursor()

# Check what values are currently in the enum type
cur.execute("""
    SELECT enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'messagestatus'
    ORDER BY enumsortorder;
""")
existing_values = [row[0] for row in cur.fetchall()]
print(f"Current ENUM values: {existing_values}")

if not existing_values:
    print("No 'messagestatus' ENUM found — may be using VARCHAR. Skipping enum migration.")
    conn.close()
    sys.exit(0)

DESIRED = ['pending', 'processing', 'submitted', 'delivered', 'failed', 'not_delivered']
OLD_VALUES = {'sent', 'undeliverable', 'expired'}
needs_rebuild = bool(OLD_VALUES.intersection(existing_values))

if not needs_rebuild:
    print("ENUM already has correct values. Nothing to do.")
    conn.close()
    sys.exit(0)

print("Rebuilding ENUM type via column conversion...")

steps = [
    # 1. Convert the column to plain text
    "ALTER TABLE sms_messages ALTER COLUMN status TYPE VARCHAR(50)",
    # 2. Drop the old enum
    "DROP TYPE IF EXISTS messagestatus",
    # 3. Recreate with correct values
    "CREATE TYPE messagestatus AS ENUM ('pending', 'processing', 'submitted', 'delivered', 'failed', 'not_delivered')",
    # 4. Cast column back to the new enum
    "ALTER TABLE sms_messages ALTER COLUMN status TYPE messagestatus USING status::messagestatus",
]

for sql in steps:
    print(f"  Executing: {sql[:70]}...")
    cur.execute(sql)

conn.commit()
cur.close()
conn.close()
print("ENUM rebuild complete.")
