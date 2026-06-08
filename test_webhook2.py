import urllib.request, json

def test():
    # Simulate exactly what Arkesel would send
    url = "https://nexra-api.onrender.com/api/v1/sms/webhook/arkesel"
    
    # Test 1: The format Arkesel V2 sends (nested data object)
    payload = {"data": {"ID": "deda544a-4f37-4132-9332-f2b710804e84", "status": "DELIVERED"}}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        result = resp.read().decode()
        print("Simulated Arkesel webhook response:", result)

if __name__ == "__main__":
    test()
