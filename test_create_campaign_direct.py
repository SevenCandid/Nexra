
import asyncio
import httpx
import json

async def test_create_campaign():
    # 1. Login to get token
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {
        "username": "frank@example.com", # Assuming this is the user
        "password": "password" # Assuming password
    }
    
    # We might not know the password, so let's try to find a user and maybe reset?
    # Or just use the token from a recent run if I find one.
    # Actually, I'll just try to hit /api/v1/campaigns and see the 500 error if it happens before auth logic? 
    # No, it likely happens inside the endpoint.
    
    # Let's try to get a user and their organization_id first manually
    print("Testing create campaign...")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # I'll use a dummy token to see if it even gets to the endpoint
    # Actually, better yet, I'll bypass auth for a second or just add a test endpoint.
    
    # Let's try to find an approved SID first to make sure we don't hit the 400.
    
    payload = {
        "name": "API Test Campaign",
        "sender": "NEXRA",
        "template": "Hello from API test",
        "contact_ids": [1]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Hit it with no auth first
            res = await client.post("http://localhost:8000/api/v1/campaigns", json=payload)
            print(f"Status: {res.status_code}")
            print(f"Body: {res.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_create_campaign())
