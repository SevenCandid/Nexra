
import httpx
import asyncio

async def test_api():
    # We need a token. I'll see if I can find one or just try to hit it and see the error.
    # Actually, hit it without a token might give 401, which is NOT a 500.
    # If the 500 happens BEFORE auth, then even a raw hit might show it.
    # But it likely happens DURING or AFTER auth.
    
    url = "http://localhost:8000/api/v1/campaigns"
    print(f"Testing {url}...")
    try:
        async with httpx.AsyncClient() as client:
            # First, check if root is alive
            root_res = await client.get("http://localhost:8000/")
            print(f"Root check: {root_res.status_code} {root_res.text}")
            
            # Now hit campaigns
            res = await client.get(url)
            print(f"Campaigns check: {res.status_code}")
            if res.status_code == 500:
                print("500 ERROR DETECTED!")
                print(res.text)
            else:
                print(f"Response: {res.text[:200]}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())
