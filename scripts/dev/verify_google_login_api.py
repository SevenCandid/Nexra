
import httpx
import asyncio

async def verify_google_login():
    url = "http://127.0.0.1:8000/api/v1/auth/google/login"
    async with httpx.AsyncClient() as client:
        try:
            print(f"Pinging {url}...")
            res = await client.get(url)
            print(f"Status: {res.status_code}")
            if res.status_code == 200:
                print("--- SUCCESS ---")
                print(f"Auth URL: {res.json().get('url')[:100]}...")
            else:
                print(f"FAILURE: {res.text}")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(verify_google_login())
