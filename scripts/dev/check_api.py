import asyncio
import httpx

async def check_api():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/")
            print(f"API Health: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"API is unreachable: {e}")

if __name__ == "__main__":
    asyncio.run(check_api())
