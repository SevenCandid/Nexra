import asyncio
import httpx
from app.core.config import settings

async def test_arkesel():
    api_key = settings.ARKESEL_API_KEY
    msg_id = "a7602af1-625f-488d-95ad-ddeb2790c127"
    
    async with httpx.AsyncClient() as client:
        # Test 1: path parameter
        resp1 = await client.get(f"https://sms.arkesel.com/api/v2/sms/{msg_id}", headers={"api-key": api_key})
        print("Path param response code:", resp1.status_code)
        try:
            print("Path param JSON:", resp1.json())
        except:
            print("Path param raw:", resp1.text[:200])
            
        # Test 2: query parameter
        resp2 = await client.get(f"https://sms.arkesel.com/api/v2/sms", params={"id": msg_id}, headers={"api-key": api_key})
        print("Query param response code:", resp2.status_code)
        try:
            print("Query param JSON:", resp2.json())
        except:
            print("Query param raw:", resp2.text[:200])

if __name__ == "__main__":
    asyncio.run(test_arkesel())
