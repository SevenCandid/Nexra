import asyncio
import httpx

async def test_platform_api():
    base_url = "http://localhost:8000/api/v1"
    
    # We need a token for a superadmin. 
    # Since I don't have the password for a superadmin handy, 
    # I'll check if I can just see the openapi spec to verify the routes are registered.
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{base_url}/openapi.json")
            if resp.status_code == 200:
                spec = resp.json()
                paths = spec.get("paths", {})
                platform_paths = [p for p in paths if p.startswith("/platform")]
                print(f"Registered platform paths: {platform_paths}")
                
                if "/platform/users" in platform_paths and "/platform/organizations" in platform_paths:
                    print("✅ Platform routes are correctly registered.")
                else:
                    print("❌ Missing platform routes.")
            else:
                print(f"❌ Failed to fetch openapi spec: {resp.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_platform_api())
