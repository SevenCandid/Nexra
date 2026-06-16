import urllib.request
import json

def check_api():
    try:
        with urllib.request.urlopen("http://localhost:8000/") as response:
            status = response.getcode()
            data = json.loads(response.read().decode())
            print(f"API Health: {status}")
            print(f"Response: {data}")
    except Exception as e:
        print(f"API is unreachable: {e}")

if __name__ == "__main__":
    check_api()
