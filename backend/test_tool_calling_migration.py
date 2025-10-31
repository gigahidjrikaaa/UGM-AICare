"""Test suite for tool_calling.py migration to new google-genai SDK.

This verifies that the tool calling functionality works correctly after migration
from google-generativeai to google-genai.
"""

import asyncio
import os
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

# Set test environment
os.environ["GEMINI_API_KEY"] = "test-key-for-mocking"


async def test_generate_with_tools_basic():
    """Test basic tool calling flow with mocked response."""
    from app.domains.mental_health.services.tool_calling import generate_with_tools
    from app.domains.mental_health.schemas import AikaChatRequest
    
    # Mock database
    mock_db = MagicMock()
    
    # Create test request
    request = AikaChatRequest(
        message="What is the weather in Jakarta?",
        max_tokens=1024,
        temperature=0.7
    )
    
    # Mock conversation history
    conversation_history = [
        {"role": "user", "content": "What is the weather in Jakarta?"}
    ]
    
    # Mock tools
    tools = [{
        "function_declarations": [{
            "name": "get_weather",
            "description": "Get weather information",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name"}
                },
                "required": ["location"]
            }
        }]
    }]
    
    # Mock the LLM response that requests a tool call
    mock_response_with_tool = MagicMock()
    mock_response_with_tool.candidates = [MagicMock()]
    mock_response_with_tool.candidates[0].content = MagicMock()
    mock_response_with_tool.candidates[0].content.parts = [MagicMock()]
    
    # Mock function call part
    mock_function_call = MagicMock()
    mock_function_call.name = "get_weather"
    mock_function_call.args = {"location": "Jakarta"}
    mock_response_with_tool.candidates[0].content.parts[0].function_call = mock_function_call
    
    # Mock the final response after tool execution
    mock_final_response = MagicMock()
    mock_final_response.text = "The weather in Jakarta is sunny with 30°C."
    mock_final_response.candidates = [MagicMock()]
    mock_final_response.candidates[0].content = MagicMock()
    mock_final_response.candidates[0].content.parts = [MagicMock()]
    mock_final_response.candidates[0].content.parts[0].text = "The weather in Jakarta is sunny with 30°C."
    
    # Mock tool execution result
    mock_tool_result = {
        "tool_name": "get_weather",
        "result": {"temperature": 30, "condition": "sunny"}
    }
    
    with patch('app.core.llm.generate_gemini_response') as mock_generate, \
         patch('app.domains.mental_health.services.tool_calling._check_and_execute_tool_calls') as mock_check_tools, \
         patch('app.core.llm.get_gemini_client') as mock_client:
        
        # Setup mock responses
        # First call returns tool request, second call (after tool execution) returns final text
        mock_generate.side_effect = [
            mock_response_with_tool,  # First call: tool request
        ]
        
        # Mock tool execution
        mock_check_tools.side_effect = [
            [mock_tool_result],  # First iteration: execute tool
            []  # Second iteration: no more tools
        ]
        
        # Mock client for the second API call (after tool execution)
        mock_aio_client = MagicMock()
        mock_aio_client.models.generate_content = AsyncMock(return_value=mock_final_response)
        mock_client.return_value.aio = mock_aio_client
        
        # Run the function
        try:
            response_text, tool_calls = await generate_with_tools(
                conversation_history=conversation_history,
                system_prompt="You are a helpful assistant.",
                request=request,
                model_name="gemini-2.0-flash",
                tools=tools,
                db=mock_db,
                user_id=1
            )
            
            print("✓ Test passed: Basic tool calling flow works")
            print(f"  Response: {response_text[:100]}...")
            print(f"  Tools executed: {len(tool_calls)}")
            assert len(tool_calls) > 0, "Expected at least one tool call"
            assert "get_weather" in tool_calls[0]["tool_name"], "Expected get_weather tool"
            
        except Exception as e:
            print(f"✗ Test failed: {e}")
            raise


async def test_no_tools_scenario():
    """Test normal conversation without tools."""
    from app.domains.mental_health.services.tool_calling import generate_with_tools
    from app.domains.mental_health.schemas import AikaChatRequest
    
    mock_db = MagicMock()
    
    request = AikaChatRequest(
        message="Hello, how are you?",
        max_tokens=1024,
        temperature=0.7
    )
    
    conversation_history = [
        {"role": "user", "content": "Hello, how are you?"}
    ]
    
    # Mock response without tool calls
    mock_response = MagicMock()
    mock_response.text = "Hello! I'm doing well, thank you for asking."
    mock_response.candidates = [MagicMock()]
    mock_response.candidates[0].content = MagicMock()
    mock_response.candidates[0].content.parts = [MagicMock()]
    
    with patch('app.core.llm.generate_gemini_response', return_value=mock_response), \
         patch('app.domains.mental_health.services.tool_calling._check_and_execute_tool_calls', return_value=[]):
        
        response_text, tool_calls = await generate_with_tools(
            conversation_history=conversation_history,
            system_prompt="You are a helpful assistant.",
            request=request,
            model_name="gemini-2.0-flash",
            tools=None,
            db=mock_db,
            user_id=1
        )
        
        print("✓ Test passed: No-tools scenario works")
        print(f"  Response: {response_text}")
        assert len(tool_calls) == 0, "Expected no tool calls"
        assert "Hello" in response_text, "Expected greeting in response"


async def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing tool_calling.py migration to new google-genai SDK")
    print("=" * 60)
    print()
    
    tests = [
        ("Basic tool calling flow", test_generate_with_tools_basic),
        ("No-tools scenario", test_no_tools_scenario),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"Running: {test_name}")
        try:
            await test_func()
            passed += 1
            print()
        except Exception as e:
            print(f"✗ FAILED: {e}")
            failed += 1
            print()
    
    print("=" * 60)
    print(f"Results: {passed}/{len(tests)} tests passed")
    if failed > 0:
        print(f"⚠️  {failed} test(s) failed")
    else:
        print("✅ All tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
