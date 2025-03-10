import requests
import json

url = "http://127.0.0.1:8000/chat/"
payload = {
    "user_id": "test_user",
    "message": "Tell me about yourself, Aika."
}

response = requests.post(url, json=payload)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print("Success!")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
else:
    print("Failed!")