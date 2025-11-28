import requests
import json
import sys

def test_aika_api():
    url = "http://localhost:8000/api/v1/aika"
    headers = {
        "Content-Type": "application/json",
        # Assuming we might need auth, but for now trying without or with a dummy token if needed.
        # The router uses `get_current_user`, so we likely need a token.
        # However, for local dev, maybe we can bypass or use a known test token?
        # Let's try to login first or use a hardcoded token if available.
        # Actually, let's try to use the same auth as the notebook.
        # The notebook likely has a login function.
    }
    
    # Payload for "Exam Stress"
    payload = {
        "user_id": 3, # Evaluation User
        "role": "user",
        "message": "Ujian bikin stres banget, rasanya nggak sanggup.",
        "conversation_history": []
    }
    
    # We need a token. Let's try to login as admin/user first.
    # Assuming default credentials from seed data: admin@example.com / admin123 or similar.
    # Or user@example.com / password
    
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_payload = {
        "username": "student@example.com", # Trying a standard student user
        "password": "password123"
    }
    
    try:
        # 1. Login
        print(f"Logging in to {login_url}...")
        # Note: OAuth2PasswordRequestForm usually expects form data, not JSON
        login_response = requests.post(login_url, data=login_payload)
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code} {login_response.text}")
            # Try admin
            login_payload["username"] = "admin@example.com"
            login_response = requests.post(login_url, data=login_payload)
            if login_response.status_code != 200:
                print("Admin login also failed.")
                return

        token = login_response.json().get("access_token")
        headers["Authorization"] = f"Bearer {token}"
        print("Login successful.")

        # 2. Call Aika
        print(f"Sending request to {url}...")
        response = requests.post(url, headers=headers, json=payload)
        
        print(f"Status Code: {response.status_code}")
        try:
            data = response.json()
            print("Response JSON:")
            print(json.dumps(data, indent=2))
            
            # Check risk assessment specifically
            metadata = data.get("metadata", {})
            risk = metadata.get("risk_assessment")
            print(f"\nRisk Assessment Field: {risk} (Type: {type(risk)})")
            
        except Exception as e:
            print(f"Failed to parse JSON: {e}")
            print(response.text)

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_aika_api()
