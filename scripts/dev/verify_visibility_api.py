
import httpx
import asyncio
import json

async def verify_visibility():
    # Attempt to log in first
    login_url = "http://127.0.0.1:8000/api/v1/auth/login"
    data = {
        "username": "frankbedi507@gmail.com",
        "password": "password123"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Login
            login_res = await client.post(login_url, data=data)
            if login_res.status_code != 200:
                print(f"Login failed: {login_res.text}")
                return
            
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Fetch campaigns
            campaigns_url = "http://127.0.0.1:8000/api/v1/campaigns"
            res = await client.get(campaigns_url, headers=headers)
            
            if res.status_code == 200:
                data = res.json()
                print("--- API RESPONSE ---")
                print(json.dumps(data, indent=2))
                
                if "items" in data and "total" in data:
                    print("\nSUCCESS: API now returns paginated structure with 'items' and 'total'.")
                    print(f"Total campaigns found: {data['total']}")
                    if len(data["items"]) > 0:
                        print(f"Latest campaign: {data['items'][0]['name']} (ID: {data['items'][0]['id']})")
                else:
                    print("\nFAILURE: API is still not returning 'items' and 'total'.")
            else:
                print(f"Request failed with status {res.status_code}: {res.text}")
                
        except Exception as e:
            print(f"Error during verification: {e}")

if __name__ == "__main__":
    asyncio.run(verify_visibility())
