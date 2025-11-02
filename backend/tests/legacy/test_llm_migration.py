"""Test script to verify google-genai SDK migration.

This script tests the migrated llm.py functions to ensure they work correctly
with the new google-genai SDK.

Run with: python test_llm_migration.py
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app.core import llm
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_basic_generation():
    """Test basic text generation without tools."""
    logger.info("=" * 60)
    logger.info("TEST 1: Basic Text Generation")
    logger.info("=" * 60)
    
    history = [
        {"role": "user", "content": "Say 'Hello, migration successful!' in one sentence."}
    ]
    
    try:
        response = await llm.generate_gemini_response(
            history=history,
            model=llm.DEFAULT_GEMINI_MODEL,
            temperature=0.5
        )
        
        logger.info(f"✅ Response received: {response}")
        assert isinstance(response, str), "Response should be a string"
        assert len(response) > 0, "Response should not be empty"
        assert not response.startswith("Error:"), f"Response is an error: {response}"
        logger.info("✅ TEST 1 PASSED")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 1 FAILED: {e}", exc_info=True)
        return False


async def test_with_system_prompt():
    """Test generation with system prompt."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 2: Generation with System Prompt")
    logger.info("=" * 60)
    
    history = [
        {"role": "user", "content": "high"}
    ]
    
    system_prompt = "I say high, you say low. Respond with only one word."
    
    try:
        response = await llm.generate_gemini_response(
            history=history,
            system_prompt=system_prompt,
            temperature=0.3
        )
        
        logger.info(f"✅ Response received: {response}")
        assert isinstance(response, str), "Response should be a string"
        assert "low" in response.lower(), f"Expected 'low' in response, got: {response}"
        logger.info("✅ TEST 2 PASSED")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 2 FAILED: {e}", exc_info=True)
        return False


async def test_multi_turn_conversation():
    """Test multi-turn conversation with history."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 3: Multi-turn Conversation")
    logger.info("=" * 60)
    
    history = [
        {"role": "user", "content": "My name is Alice."},
        {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
        {"role": "user", "content": "What's my name?"}
    ]
    
    try:
        response = await llm.generate_gemini_response(
            history=history,
            temperature=0.5
        )
        
        logger.info(f"✅ Response received: {response}")
        assert isinstance(response, str), "Response should be a string"
        assert "alice" in response.lower(), f"Expected 'Alice' in response, got: {response}"
        logger.info("✅ TEST 3 PASSED")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 3 FAILED: {e}", exc_info=True)
        return False


async def test_streaming():
    """Test streaming response."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 4: Streaming Response")
    logger.info("=" * 60)
    
    history = [
        {"role": "user", "content": "Count from 1 to 5, one number per line."}
    ]
    
    try:
        chunks = []
        async for chunk in llm.stream_gemini_response(
            history=history,
            temperature=0.5
        ):
            chunks.append(chunk)
            logger.info(f"📥 Chunk received: {chunk[:50]}...")
        
        full_response = "".join(chunks)
        logger.info(f"✅ Full response: {full_response}")
        
        assert len(chunks) > 0, "Should receive at least one chunk"
        assert not full_response.startswith("Error:"), f"Response is an error: {full_response}"
        logger.info("✅ TEST 4 PASSED")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 4 FAILED: {e}", exc_info=True)
        return False


async def test_client_initialization():
    """Test that client can be initialized."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 5: Client Initialization")
    logger.info("=" * 60)
    
    try:
        client = llm.get_gemini_client()
        assert client is not None, "Client should not be None"
        logger.info(f"✅ Client initialized: {type(client)}")
        
        # Test singleton pattern
        client2 = llm.get_gemini_client()
        assert client is client2, "Should return same client instance (singleton)"
        logger.info("✅ Singleton pattern working correctly")
        logger.info("✅ TEST 5 PASSED")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 5 FAILED: {e}", exc_info=True)
        return False


async def test_tool_schema_converter():
    """Test tool schema conversion to new SDK format."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 6: Tool Schema Converter")
    logger.info("=" * 60)
    
    # Old format with uppercase types
    old_tools = [
        {
            "function_declarations": [
                {
                    "name": "test_function",
                    "description": "A test function",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "query": {
                                "type": "STRING",
                                "description": "Search query"
                            },
                            "limit": {
                                "type": "INTEGER",
                                "description": "Result limit"
                            }
                        },
                        "required": ["query"]
                    }
                }
            ]
        }
    ]
    
    try:
        converted_tools = llm._convert_tool_schemas_for_new_sdk(old_tools)
        
        assert len(converted_tools) > 0, "Should convert at least one tool"
        assert isinstance(converted_tools[0], llm.types.Tool), "Should be types.Tool instance"
        
        func_decl = converted_tools[0].function_declarations[0]
        assert func_decl.name == "test_function", f"Function name mismatch: {func_decl.name}"
        
        logger.info("✅ Tool schema converted correctly")
        logger.info(f"✅ Function: {func_decl.name}")
        logger.info(f"✅ Description: {func_decl.description}")
        logger.info("✅ TEST 6 PASSED")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 6 FAILED: {e}", exc_info=True)
        return False


async def main():
    """Run all tests."""
    logger.info("\n" + "🚀" * 30)
    logger.info("Starting LLM Migration Tests")
    logger.info("Testing google-genai SDK (new) vs google-generativeai (old)")
    logger.info("🚀" * 30 + "\n")
    
    # Check if API key is configured
    if not os.getenv("GOOGLE_GENAI_API_KEY"):
        logger.error("❌ GOOGLE_GENAI_API_KEY not set!")
        logger.error("Set it with: export GOOGLE_GENAI_API_KEY='your-key'")
        return
    
    tests = [
        ("Client Initialization", test_client_initialization),
        ("Tool Schema Converter", test_tool_schema_converter),
        ("Basic Generation", test_basic_generation),
        ("System Prompt", test_with_system_prompt),
        ("Multi-turn Conversation", test_multi_turn_conversation),
        ("Streaming", test_streaming),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"❌ Test {test_name} crashed: {e}", exc_info=True)
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status}: {test_name}")
    
    logger.info("=" * 60)
    logger.info(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 ALL TESTS PASSED! Migration successful!")
    else:
        logger.error(f"⚠️  {total - passed} test(s) failed. Check logs above.")
    
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
