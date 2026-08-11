import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(dotenv_path='c:\\Users\\DELL\\NEXRA\\.env')

PAYSTACK_SECRET_KEY = os.getenv('PAYSTACK_SECRET_KEY')

if not PAYSTACK_SECRET_KEY:
    print("Error: PAYSTACK_SECRET_KEY not found in .env")
    exit(1)

# Calculate yesterday's date
yesterday = datetime.utcnow() - timedelta(days=1)
yesterday_str = yesterday.isoformat() + 'Z'

headers = {
    "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
    "Content-Type": "application/json"
}

params = {
    "from": yesterday_str,
    "perPage": 50
}

response = requests.get("https://api.paystack.co/transaction", headers=headers, params=params)

if response.status_code == 200:
    data = response.json()
    transactions = data.get('data', [])
    if not transactions:
        print("No transactions found since yesterday.")
    else:
        print(f"Found {len(transactions)} transactions since {yesterday_str}:\n")
        for tx in transactions:
            amount = tx.get('amount', 0) / 100  # Paystack returns in pesewas/kobo
            status = tx.get('status')
            ref = tx.get('reference')
            email = tx.get('customer', {}).get('email', 'N/A')
            date = tx.get('created_at')
            print(f"[{date}] {ref} - {status.upper()} - {amount} GHS - {email}")
else:
    print(f"Failed to fetch from Paystack. Status: {response.status_code}")
    print(response.text)
