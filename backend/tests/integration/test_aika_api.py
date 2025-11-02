#!/usr/bin/env python
"""
Aika API Integration Test

Tests the /api/v1/aika endpoint with authentication.
Requires a running backend server on localhost:8000

Usage:
    python test_aika_api.py
    
Or with custom credentials:
    python test_aika_api.py --email user@example.com --password mypassword
"""

import asyncio
import argparse
import requests
import json
from typing import Dict, Optional


BASE_URL = "http://localhost:8000"
AUTH_ENDPOINT = f"{BASE_URL}/api/auth/login"
AIKA_ENDPOINT = f"{BASE_URL}/api/v1/aika"


def get_auth_token(email: str, password: str) -> Optional[str]:
    """Authenticate and get JWT token"""
    print(f"🔐 Authenticating as {email}...")
    
    try:
        response = requests.post(
            AUTH_ENDPOINT,
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print(f"✅ Authentication successful! Token: {token[:30]}...")
                return token
            else:
                print(f"❌ No access_token in response: {data}")
                return None
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None


def test_aika_message(
    token: str,
    message: str,
    session_id: str,
    history: list = None,
    test_name: str = "Test",
) -> Dict:
    """Send message to Aika and return response"""
    
    print(f"\n{'='*80}")
    print(f"{test_name}")
    print(f"{'='*80}")
    print(f"📝 Message: {message[:100]}...")
    
    payload = {
        "message": message,
        "session_id": session_id,
    }
    
    if history:
        payload["history"] = history
    
    try:
        response = requests.post(
            AIKA_ENDPOINT,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"\n✅ Success: {data.get('success')}")
            print(f"💬 Response: {data.get('response', '')[:300]}...")
            
            metadata = data.get('metadata', {})
            print(f"\n📊 Metadata:")
            print(f"   - Agents: {metadata.get('agents_invoked', [])}")
            print(f"   - Intent: {metadata.get('intent')}")
            print(f"   - Risk Level: {metadata.get('risk_level')}")
            print(f"   - Escalation: {metadata.get('escalation_needed')}")
            print(f"   - Processing Time: {metadata.get('processing_time_ms', 0):.2f}ms")
            print(f"   - Actions: {metadata.get('actions_taken', [])}")
            
            return data
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"❌ Request error: {e}")
        return {"success": False, "error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Test Aika API")
    parser.add_argument("--email", default="test@ugm.ac.id", help="User email")
    parser.add_argument("--password", default="testpassword123", help="User password")
    parser.add_argument("--base-url", default=BASE_URL, help="Base URL")
    
    args = parser.parse_args()
    
    print("\n" + "🌟"*40)
    print("AIKA API INTEGRATION TEST SUITE")
    print("🌟"*40)
    print(f"\nBase URL: {args.base_url}")
    print(f"User: {args.email}")
    
    # Step 1: Authenticate
    token = get_auth_token(args.email, args.password)
    
    if not token:
        print("\n❌ Cannot proceed without authentication token")
        print("\n💡 Make sure:")
        print("   1. Backend server is running (uvicorn app.main:app)")
        print("   2. Database is up and has test user")
        print("   3. Credentials are correct")
        return
    
    # Step 2: Run tests
    print("\n" + "="*80)
    print("Running Aika Tests...")
    print("="*80)
    
    # Test 1: Normal student conversation
    test_aika_message(
        token=token,
        message="Hai Aika, aku sedang merasa sedikit stress dengan tugas kuliah.",
        session_id="api_test_1",
        test_name="TEST 1: Student Conversation (Low Risk)"
    )
    
    # Test 2: Crisis conversation
    test_aika_message(
        token=token,
        message="Aku merasa tidak ada harapan lagi. Aku tidak tahu harus berbuat apa.",
        session_id="api_test_2",
        test_name="TEST 2: Crisis Conversation (Should Escalate)"
    )
    
    # Test 3: Conversation with history
    test_aika_message(
        token=token,
        message="Terima kasih sudah mendengarkan aku.",
        session_id="api_test_3",
        history=[
            {"role": "user", "content": "Aku sedang stress"},
            {"role": "assistant", "content": "Aku mengerti kamu sedang merasa tertekan..."}
        ],
        test_name="TEST 3: Conversation with History"
    )
    
    # Test 4: Different topics
    test_aika_message(
        token=token,
        message="Bagaimana cara mengelola kecemasan?",
        session_id="api_test_4",
        test_name="TEST 4: Asking for Coping Strategies"
    )
    
    # Test 5: Emotional expression
    test_aika_message(
        token=token,
        message="Hari ini aku merasa lebih baik. Terima kasih Aika!",
        session_id="api_test_5",
        test_name="TEST 5: Positive Emotional Expression"
    )
    
    print("\n" + "="*80)
    print("✅ ALL API TESTS COMPLETED")
    print("="*80)
    
    print("\n📝 Summary:")
    print("   - Test 1: Normal conversation (low risk)")
    print("   - Test 2: Crisis detection and escalation")
    print("   - Test 3: Context-aware with history")
    print("   - Test 4: Resource request")
    print("   - Test 5: Positive feedback")
    
    print("\n💡 Next Steps:")
    print("   1. Check backend logs for detailed execution")
    print("   2. Verify database for created cases (Test 2)")
    print("   3. Review agent coordination in metadata")
    print("   4. Test admin and counselor endpoints (requires different roles)")
    print()


if __name__ == "__main__":
    main()
