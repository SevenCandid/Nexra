
from fastapi.testclient import TestClient
from app.main import app
from app.api import deps
from app.db.models import User
import json

# Mock user for testing the endpoint
class MockUser:
    def __init__(self):
        self.id = 1
        self.organization_id = 1
        self.is_active = True
        self.email = "frankbedi507@gmail.com"

async def override_get_current_active_user():
    return MockUser()

# Apply override
app.dependency_overrides[deps.get_current_active_user] = override_get_current_active_user

client = TestClient(app)

def verify_internal():
    print("--- TESTING GET /api/v1/campaigns ---")
    response = client.get("/api/v1/campaigns")
    
    if response.status_code == 200:
        data = response.json()
        print("Response Status: 200 OK")
        print("Response Body Structure:")
        print(json.dumps(data, indent=2 if isinstance(data, dict) else 0)[:500] + "...")
        
        if isinstance(data, dict) and "items" in data and "total" in data:
            print("\nVERIFICATION SUCCESS: Endpoint returns expected paginated structure {items, total}.")
        else:
            print(f"\nVERIFICATION FAILURE: Expected dict with 'items' and 'total', got {type(data)}")
    else:
        print(f"FAILED: Status {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    verify_internal()
