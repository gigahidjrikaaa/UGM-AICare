import requests
import json
import time

environment = "production"  # Set to "production" or "development" to test different environments
if environment == "production":
    url = "https://ugm-aicare.onrender.com/chat/"
else:
    url = "http://127.0.0.1:8000/chat/"

payload = {
    "user_id": "test_user",
    "message": "Kamu siapa, Aika?"
}

print(f"=== Test Request ===")
print(f"URL: {url}")
print(f"User ID: {payload['user_id']}")
print(f"Message: {payload['message']}")
print("=" * 50)

try:
    # Record start time for measuring latency
    start_time = time.time()
    
    # Send the request
    response = requests.post(url, json=payload)
    
    # Calculate latency
    latency = time.time() - start_time
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("Request successful!")
        response_data = response.json()
        
        # Extract main response data
        print("\n=== Response Data ===")
        print(f"Message: {response_data.get('message', 'Not found')[:100]}...")  # First 100 chars
        print(f"Conversation ID: {response_data.get('conversation_id', 'Not provided')}")
        print(f"Emotion: {response_data.get('emotion', 'Not provided')}")
        print(f"Latency: {latency:.2f} seconds")
        
        # Extract token usage information
        if "raw_response" in response_data and "usage" in response_data["raw_response"]:
            usage = response_data["raw_response"]["usage"]
            print("\n=== Token Usage ===")
            print(f"Prompt tokens: {usage.get('prompt_tokens', 'N/A')}")
            print(f"Completion tokens: {usage.get('completion_tokens', 'N/A')}")
            print(f"Total tokens: {usage.get('total_tokens', 'N/A')}")
            
            # Calculate cost (using approximations for GPT-3.5)
            prompt_cost = (usage.get('prompt_tokens', 0) / 1000) * 0.0015
            completion_cost = (usage.get('completion_tokens', 0) / 1000) * 0.002
            total_cost = prompt_cost + completion_cost
            
            print("\n=== Cost Estimate ===")
            print(f"Prompt cost: ${prompt_cost:.6f}")
            print(f"Completion cost: ${completion_cost:.6f}")
            print(f"Total cost: ${total_cost:.6f} USD")
        elif "usage" in response_data:
            # Alternative format where usage is directly in the response
            usage = response_data["usage"]
            print("\n=== Token Usage ===")
            print(f"Prompt tokens: {usage.get('prompt_tokens', 'N/A')}")
            print(f"Completion tokens: {usage.get('completion_tokens', 'N/A')}")
            print(f"Total tokens: {usage.get('total_tokens', 'N/A')}")
        else:
            # If token usage is not found in expected locations, try to find it
            print("\n=== Token Usage ===")
            print("Searching for token usage in response...")
            
            # Try to find 'usage' at any level of the response
            def find_usage(obj):
                if isinstance(obj, dict):
                    if "usage" in obj:
                        return obj["usage"]
                    for key, value in obj.items():
                        result = find_usage(value)
                        if result:
                            return result
                elif isinstance(obj, list):
                    for item in obj:
                        result = find_usage(item)
                        if result:
                            return result
                return None
            
            usage = find_usage(response_data)
            if usage:
                print(f"Found usage data: {json.dumps(usage, indent=2)}")
            else:
                print("No token usage information found in the response")
                print("Full response structure:")
                print(f"{json.dumps(response_data, indent=2)}")
    else:
        print("Request failed!")
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Request failed with error: {str(e)}")