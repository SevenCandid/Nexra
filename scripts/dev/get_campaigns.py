import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
db_url = os.getenv('DATABASE_URL')
if db_url.startswith('postgresql+asyncpg://'):
    db_url = db_url.replace('postgresql+asyncpg://', 'postgresql://')

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT id, name, status FROM campaigns WHERE status = 'delivering';")
rows = cur.fetchall()

if not rows:
    print("No campaigns found in 'delivering' status.")
else:
    for row in rows:
        print(f'Campaign Name: "{row[1]}" | Campaign ID: {row[0]} | Status: {row[2]}')

cur.close()
conn.close()
