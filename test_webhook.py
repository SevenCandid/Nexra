import urllib.request
import json

def test_webhook():
    url = "https://nexra-api.onrender.com/api/v1/sms/webhook/arkesel"
    payload = json.dumps({"data": {"id": "test-123", "status": "DELIVERED"}}).encode("utf-8")
    
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            print("Status code:", resp.status)
            print("Response text:", resp.read().decode())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_webhook()
