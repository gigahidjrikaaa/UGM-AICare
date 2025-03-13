import requests
import json
import unittest
import uuid
import time

class TestChatAPI(unittest.TestCase):
    """Test cases for the Chat API interactions between frontend and backend."""
    
    # Base URL for the API (change to your actual development/test API URL)
    BASE_URL = "http://127.0.0.1:8000"
    
    def setUp(self):
        """Set up test data."""
        # Simulate a unique user ID similar to what Google Auth would provide
        self.user_id = f"google-oauth2|{uuid.uuid4()}"
        
        # Simulated frontend messages
        self.initial_message = "Hello, I've been feeling a bit stressed lately."
        self.follow_up_message = "I'm having trouble sleeping because of it."
        
        # For storing conversation ID
        self.conversation_id = None
    
    def test_01_new_conversation(self):
        """Test starting a new conversation."""
        print(f"\n[TEST] Starting new conversation as user: {self.user_id}")
        
        # Prepare request payload (similar to frontend)
        payload = {
            "user_id": self.user_id,
            "message": self.initial_message
        }
        
        # Make the request
        response = requests.post(
            f"{self.BASE_URL}/chat/", 
            json=payload, 
            headers={"Content-Type": "application/json"}
        )
        
        # Validate response
        self.assertEqual(response.status_code, 200, "API should return 200 OK")
        
        # Parse response
        data = response.json()
        print(f"[Response] Status: {response.status_code}")
        print(f"[Response] Message: {data.get('message', '')[:100]}...")  # Print first 100 chars
        print(f"[Response] Emotion: {data.get('emotion', '')}")
        
        # Store conversation ID for next test
        self.conversation_id = data.get("conversation_id")
        self.assertIsNotNone(self.conversation_id, "API should return a conversation ID")
        print(f"[Info] Conversation ID: {self.conversation_id}")
        
        return self.conversation_id
    
    def test_02_continue_conversation(self):
        """Test continuing an existing conversation."""
        # Only run this test if we have a conversation ID from previous test
        if not hasattr(self, 'conversation_id') or not self.conversation_id:
            self.conversation_id = self.test_01_new_conversation()
        
        print(f"\n[TEST] Continuing conversation: {self.conversation_id}")
        
        # Prepare request payload with conversation ID (similar to frontend)
        payload = {
            "user_id": self.user_id,
            "message": self.follow_up_message,
            "conversation_id": self.conversation_id
        }
        
        # Make the request
        response = requests.post(
            f"{self.BASE_URL}/chat/", 
            json=payload, 
            headers={"Content-Type": "application/json"}
        )
        
        # Validate response
        self.assertEqual(response.status_code, 200, "API should return 200 OK")
        
        # Parse response
        data = response.json()
        print(f"[Response] Status: {response.status_code}")
        print(f"[Response] Message: {data.get('message', '')[:100]}...")  # Print first 100 chars
        print(f"[Response] Emotion: {data.get('emotion', '')}")
        
        # Verify conversation ID remains the same
        self.assertEqual(
            data.get("conversation_id"), 
            self.conversation_id, 
            "Conversation ID should remain consistent"
        )
    
    def test_03_invalid_conversation_id(self):
        """Test behavior with an invalid conversation ID."""
        print("\n[TEST] Using invalid conversation ID")
        
        # Prepare request with invalid conversation ID
        payload = {
            "user_id": self.user_id,
            "message": "Can you help me?",
            "conversation_id": "invalid-id-12345"
        }
        
        # Make the request
        response = requests.post(
            f"{self.BASE_URL}/chat/", 
            json=payload, 
            headers={"Content-Type": "application/json"}
        )
        
        # API should either create a new conversation or return an appropriate error
        print(f"[Response] Status: {response.status_code}")
        data = response.json()
        
        # Print response for debugging
        print(f"[Response] Data: {json.dumps(data, indent=2)}")
        
        # Two possible valid behaviors:
        # 1. API creates a new conversation (status 200)
        # 2. API returns an error about the invalid ID (status 400)
        self.assertIn(
            response.status_code, 
            [200, 400], 
            "API should either create a new conversation or return a 400 error"
        )
    
    def test_04_large_message(self):
        """Test sending a larger message that simulates a longer user input."""
        print("\n[TEST] Sending larger message")
        
        # Generate a longer message (~500 chars)
        long_message = (
            "I've been experiencing symptoms of anxiety for several weeks now. "
            "It started after I had a particularly stressful presentation at work. "
            "Since then, I've noticed increased heart rate, trouble focusing, and "
            "I'm constantly worrying about things that might go wrong. I've tried "
            "some breathing exercises I found online, but they only help temporarily. "
            "I'm having trouble sleeping too, which makes everything worse the next day. "
            "Sometimes I feel overwhelmed by simple tasks. What can I do to manage this?"
        )
        
        # Prepare request payload
        payload = {
            "user_id": self.user_id,
            "message": long_message
        }
        
        # Time the response
        start_time = time.time()
        
        # Make the request
        response = requests.post(
            f"{self.BASE_URL}/chat/", 
            json=payload, 
            headers={"Content-Type": "application/json"}
        )
        
        response_time = time.time() - start_time
        
        # Validate response
        self.assertEqual(response.status_code, 200, "API should return 200 OK")
        
        # Parse response
        data = response.json()
        print(f"[Response] Status: {response.status_code}")
        print(f"[Response] Time: {response_time:.2f}s")
        print(f"[Response] Message length: {len(data.get('message', ''))}")
        print(f"[Response] Message preview: {data.get('message', '')[:100]}...")


if __name__ == "__main__":
    unittest.main()