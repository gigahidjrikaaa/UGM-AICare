#!/usr/bin/env python3
"""
Test Redis Caching Implementation for Gemini Classifier
Tests cache miss, cache hit, and Redis CLI verification
"""

import asyncio
import hashlib
import json
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, '/app')

from app.agents.sta.gemini_classifier import GeminiSTAClassifier
from app.agents.sta.schemas import STAClassifyRequest
from app.core.memory import get_redis_client


# Test configuration
CACHE_KEY_PREFIX = "ugm-aicare:gemini:assessment"
TEST_SESSION_ID = "test_redis_cache_001"

# Test messages (low-risk to ensure caching)
TEST_MESSAGES = [
    {
        "text": "I am feeling stressed about my exams",
        "expected_risk": "low",
        "description": "Academic stress"
    },
    {
        "text": "I need help with time management",
        "expected_risk": "low",
        "description": "General support"
    }
]


def generate_cache_key(session_id: str, message: str) -> str:
    """Generate cache key same way classifier does"""
    message_hash = hashlib.sha256(message.encode()).hexdigest()[:16]
    return f"{CACHE_KEY_PREFIX}:{session_id}:{message_hash}"


async def test_cache_miss(classifier: GeminiSTAClassifier):
    """Test 1: Cache MISS - First request should call Gemini API"""
    print("\n" + "="*80)
    print("TEST 1: Cache MISS (First Request)")
    print("="*80)
    
    test_msg = TEST_MESSAGES[0]
    payload = STAClassifyRequest(
        session_id=TEST_SESSION_ID,
        text=test_msg["text"]
    )
    
    cache_key = generate_cache_key(TEST_SESSION_ID, test_msg["text"])
    print(f"📋 Test Message: {test_msg['text']}")
    print(f"🔑 Expected Cache Key: {cache_key}")
    print(f"🎯 Expected: Cache MISS → Gemini API call")
    
    # Clear cache before test
    redis_client = await get_redis_client()
    await redis_client.delete(cache_key)
    print(f"🧹 Cleared cache key: {cache_key}")
    
    # Make classification request
    print(f"\n⏳ Making classification request...")
    start_time = datetime.now()
    
    result = await classifier.classify(payload)
    
    elapsed = (datetime.now() - start_time).total_seconds() * 1000
    
    print(f"\n✅ Classification Result:")
    print(f"   Risk Level: {result.risk_level}")
    print(f"   Intent: {result.intent}")
    print(f"   Next Step: {result.next_step}")
    print(f"   Handoff: {result.handoff}")
    print(f"   Response Time: {elapsed:.0f}ms")
    
    # Check if cached (should be if low-risk)
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        cached = json.loads(cached_data)
        print(f"\n✅ CACHE WRITE SUCCESSFUL")
        print(f"   Cached Risk Level: {cached.get('risk_level')}")
        print(f"   Cached At: {cached.get('cached_at')}")
        print(f"   Message Length: {cached.get('message_length')}")
        print(f"   TTL: {await redis_client.ttl(cache_key)} seconds")
        return True
    else:
        print(f"\n⚠️  CACHE WRITE FAILED (might be high-risk)")
        return False


async def test_cache_hit(classifier: GeminiSTAClassifier):
    """Test 2: Cache HIT - Second identical request should use cache"""
    print("\n" + "="*80)
    print("TEST 2: Cache HIT (Second Request)")
    print("="*80)
    
    test_msg = TEST_MESSAGES[0]
    payload = STAClassifyRequest(
        session_id=TEST_SESSION_ID,
        text=test_msg["text"]
    )
    
    cache_key = generate_cache_key(TEST_SESSION_ID, test_msg["text"])
    print(f"📋 Test Message: {test_msg['text']}")
    print(f"🔑 Cache Key: {cache_key}")
    print(f"🎯 Expected: Cache HIT → Instant response")
    
    # Check cache exists
    redis_client = await get_redis_client()
    cached_data = await redis_client.get(cache_key)
    
    if not cached_data:
        print(f"\n❌ ERROR: Cache key not found! Run Test 1 first.")
        return False
    
    print(f"✅ Cache key exists in Redis")
    
    # Make classification request
    print(f"\n⏳ Making classification request...")
    start_time = datetime.now()
    
    result = await classifier.classify(payload)
    
    elapsed = (datetime.now() - start_time).total_seconds() * 1000
    
    print(f"\n✅ Classification Result:")
    print(f"   Risk Level: {result.risk_level}")
    print(f"   Intent: {result.intent}")
    print(f"   Next Step: {result.next_step}")
    print(f"   Response Time: {elapsed:.0f}ms")
    
    # Cache hit should be MUCH faster (<50ms)
    if elapsed < 100:
        print(f"\n✅ CACHE HIT CONFIRMED (fast response: {elapsed:.0f}ms)")
        return True
    else:
        print(f"\n⚠️  Possible cache miss or slow Redis (response: {elapsed:.0f}ms)")
        return False


async def test_different_session(classifier: GeminiSTAClassifier):
    """Test 3: Different session ID should be cache MISS"""
    print("\n" + "="*80)
    print("TEST 3: Different Session (Cache Isolation)")
    print("="*80)
    
    test_msg = TEST_MESSAGES[0]
    different_session = "test_redis_cache_002"
    
    payload = STAClassifyRequest(
        session_id=different_session,
        text=test_msg["text"]
    )
    
    cache_key = generate_cache_key(different_session, test_msg["text"])
    print(f"📋 Test Message: {test_msg['text']}")
    print(f"🔑 Cache Key: {cache_key}")
    print(f"🎯 Expected: Cache MISS (different session_id)")
    
    # Clear this session's cache
    redis_client = await get_redis_client()
    await redis_client.delete(cache_key)
    
    # Make classification request
    print(f"\n⏳ Making classification request...")
    start_time = datetime.now()
    
    result = await classifier.classify(payload)
    
    elapsed = (datetime.now() - start_time).total_seconds() * 1000
    
    print(f"\n✅ Classification Result:")
    print(f"   Risk Level: {result.risk_level}")
    print(f"   Response Time: {elapsed:.0f}ms")
    
    # Should be slower (not cached)
    if elapsed > 200:
        print(f"\n✅ SESSION ISOLATION CONFIRMED (slow response: {elapsed:.0f}ms)")
        return True
    else:
        print(f"\n⚠️  Unexpectedly fast response: {elapsed:.0f}ms")
        return False


async def test_different_message(classifier: GeminiSTAClassifier):
    """Test 4: Different message should be cache MISS"""
    print("\n" + "="*80)
    print("TEST 4: Different Message (Cache Isolation)")
    print("="*80)
    
    test_msg = TEST_MESSAGES[1]  # Different message
    payload = STAClassifyRequest(
        session_id=TEST_SESSION_ID,
        text=test_msg["text"]
    )
    
    cache_key = generate_cache_key(TEST_SESSION_ID, test_msg["text"])
    print(f"📋 Test Message: {test_msg['text']}")
    print(f"🔑 Cache Key: {cache_key}")
    print(f"🎯 Expected: Cache MISS (different message)")
    
    # Clear this message's cache
    redis_client = await get_redis_client()
    await redis_client.delete(cache_key)
    
    # Make classification request
    print(f"\n⏳ Making classification request...")
    start_time = datetime.now()
    
    result = await classifier.classify(payload)
    
    elapsed = (datetime.now() - start_time).total_seconds() * 1000
    
    print(f"\n✅ Classification Result:")
    print(f"   Risk Level: {result.risk_level}")
    print(f"   Response Time: {elapsed:.0f}ms")
    
    # Check if cached
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        print(f"\n✅ CACHE WRITE SUCCESSFUL (new message cached)")
        return True
    else:
        print(f"\n⚠️  CACHE WRITE FAILED (might be high-risk)")
        return False


async def verify_redis_keys():
    """Verify cache keys in Redis"""
    print("\n" + "="*80)
    print("REDIS VERIFICATION")
    print("="*80)
    
    redis_client = await get_redis_client()
    
    # Get all cache keys
    pattern = f"{CACHE_KEY_PREFIX}:*"
    keys = await redis_client.keys(pattern)
    
    print(f"\n📊 Found {len(keys)} cache keys matching '{pattern}':")
    
    for key in keys[:10]:  # Limit to first 10
        key_str = key.decode() if isinstance(key, bytes) else key
        ttl = await redis_client.ttl(key_str)
        cached_data = await redis_client.get(key_str)
        
        if cached_data:
            cached = json.loads(cached_data)
            print(f"\n🔑 {key_str}")
            print(f"   Risk Level: {cached.get('risk_level')}")
            print(f"   Intent: {cached.get('intent')}")
            print(f"   Cached At: {cached.get('cached_at')}")
            print(f"   TTL: {ttl} seconds")
    
    if len(keys) > 10:
        print(f"\n... and {len(keys) - 10} more keys")


async def main():
    """Run all tests"""
    print("="*80)
    print("🧪 REDIS CACHING IMPLEMENTATION TEST SUITE")
    print("="*80)
    print(f"Test Session: {TEST_SESSION_ID}")
    print(f"Cache Prefix: {CACHE_KEY_PREFIX}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize classifier
    print("\n⏳ Initializing GeminiSTAClassifier...")
    classifier = GeminiSTAClassifier()
    
    results = {
        "test1_cache_miss": False,
        "test2_cache_hit": False,
        "test3_session_isolation": False,
        "test4_message_isolation": False
    }
    
    try:
        # Test 1: Cache MISS (first request)
        results["test1_cache_miss"] = await test_cache_miss(classifier)
        
        # Wait a bit for cache to settle
        await asyncio.sleep(1)
        
        # Test 2: Cache HIT (second request)
        results["test2_cache_hit"] = await test_cache_hit(classifier)
        
        # Wait a bit
        await asyncio.sleep(1)
        
        # Test 3: Different session (cache isolation)
        results["test3_session_isolation"] = await test_different_session(classifier)
        
        # Wait a bit
        await asyncio.sleep(1)
        
        # Test 4: Different message (cache isolation)
        results["test4_message_isolation"] = await test_different_message(classifier)
        
        # Verify Redis keys
        await verify_redis_keys()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_flag in results.items():
        status = "✅ PASS" if passed_flag else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n{'='*80}")
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ ALL TESTS PASSED - Redis caching is working correctly!")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED - Review implementation")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
