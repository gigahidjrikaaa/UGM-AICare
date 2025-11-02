"""
Test script to verify Aika tool calling functionality.

Usage:
    python test_tool_calling.py
"""

import asyncio
import httpx
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = 3
TEST_MESSAGE = "Kamu tau apa tentang aku?"

# You'll need a valid JWT token for user 3
# Get this from your frontend after logging in
TEST_TOKEN = "your_jwt_token_here"  # Replace with actual token


async def test_aika_tool_calling():
    """Test Aika's tool calling functionality."""
    
    print("🧪 Testing Aika Tool Calling")
    print("=" * 50)
    print(f"User ID: {TEST_USER_ID}")
    print(f"Message: {TEST_MESSAGE}")
    print()
    
    # Prepare request
    payload = {
        "user_id": TEST_USER_ID,
        "role": "user",
        "message": TEST_MESSAGE,
        "conversation_history": [],
        "session_id": f"test_session_{datetime.now().timestamp()}"
    }
    
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print("📤 Sending request to /api/v1/aika...")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{BASE_URL}/api/v1/aika",
                json=payload,
                headers=headers
            )
            
            print(f"📥 Response status: {response.status_code}")
            print()
            
            if response.status_code == 200:
                data = response.json()
                
                print("✅ SUCCESS!")
                print("=" * 50)
                print(f"Response: {data.get('response', 'No response')}")
                print()
                
                # Check metadata for tool usage
                metadata = data.get('metadata', {})
                if 'sca_metadata' in metadata:
                    sca = metadata['sca_metadata']
                    tools_used = sca.get('tools_used', [])
                    
                    print(f"🔧 Tools used: {len(tools_used)}")
                    if tools_used:
                        for tool in tools_used:
                            print(f"   - {tool}")
                    else:
                        print("   ⚠️  No tools were used!")
                    
                    actions = sca.get('actions', [])
                    print(f"📋 Actions taken: {actions}")
                
                print()
                print("Full metadata:")
                print(json.dumps(metadata, indent=2))
                
            else:
                print("❌ ERROR!")
                print("=" * 50)
                print(f"Status: {response.status_code}")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Exception occurred: {e}")
        import traceback
        traceback.print_exc()


async def test_without_auth():
    """Quick test to see backend error if no auth provided."""
    
    print("\n🧪 Testing without authentication (should fail gracefully)")
    print("=" * 50)
    
    payload = {
        "user_id": TEST_USER_ID,
        "role": "user",
        "message": "Hello",
        "conversation_history": []
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{BASE_URL}/api/v1/aika",
                json=payload
            )
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")


if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("   Aika Tool Calling Test")
    print("=" * 50 + "\n")
    
    print("⚠️  SETUP REQUIRED:")
    print("1. Make sure backend is running on localhost:8000")
    print("2. Get a valid JWT token by logging in as user 3")
    print("3. Replace TEST_TOKEN in this script with your JWT")
    print()
    
    if TEST_TOKEN == "your_jwt_token_here":
        print("❌ TEST_TOKEN not set! Please update the script with a valid token.")
        print()
        print("To get a token:")
        print("1. Open browser DevTools (F12)")
        print("2. Log in to the frontend")
        print("3. Go to Network tab")
        print("4. Find a request to /api/mental-health/aika")
        print("5. Copy the Authorization header value (the part after 'Bearer ')")
        print()
        
        # Still run the no-auth test
        asyncio.run(test_without_auth())
    else:
        asyncio.run(test_aika_tool_calling())
