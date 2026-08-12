import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("DATABASE_URL")
if not url:
    print("NO DB URL")
    exit()

try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()

    print("--- Users ---")
    cur.execute("SELECT id, email, plan FROM users;")
    for row in cur.fetchall():
        print(row)

    print("\n--- Messages today ---")
    cur.execute("""
        SELECT user_id, status, count(*) 
        FROM messages 
        WHERE date(created_at) = CURRENT_DATE
        GROUP BY user_id, status;
    """)
    for row in cur.fetchall():
        print(row)

    print("\n--- Wallets ---")
    cur.execute("SELECT user_id, balance FROM wallets;")
    for row in cur.fetchall():
        print(row)

    print("\n--- Transactions ---")
    cur.execute("SELECT user_id, type, amount, status, created_at FROM transactions ORDER BY created_at DESC LIMIT 20;")
    for row in cur.fetchall():
        print(row)

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
