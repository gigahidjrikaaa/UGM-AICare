"""Unit tests for cache service.

Run tests with:
    pytest backend/tests/test_cache.py -v
"""
import pytest
from unittest.mock import AsyncMock, patch
import json

from app.core.cache import CacheService, cached, get_cache_service, invalidate_user_cache


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.setex = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.keys = AsyncMock(return_value=[])
    mock.exists = AsyncMock(return_value=0)
    mock.ttl = AsyncMock(return_value=-2)
    return mock


@pytest.fixture
def cache_service():
    """Create cache service instance."""
    service = CacheService()
    service.enabled = True  # Ensure enabled for tests
    return service


@pytest.mark.asyncio
async def test_cache_set_and_get(cache_service, mock_redis):
    """Test setting and getting cached values."""
    test_data = {"name": "Test User", "id": 123}
    
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        # Set cache
        mock_redis.setex.return_value = True
        success = await cache_service.set("test_key", test_data, ttl=3600)
        assert success is True
        
        # Get cache (mock return serialized data)
        mock_redis.get.return_value = json.dumps(test_data)
        result = await cache_service.get("test_key")
        assert result == test_data


@pytest.mark.asyncio
async def test_cache_miss(cache_service, mock_redis):
    """Test cache miss returns None."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.get.return_value = None
        
        result = await cache_service.get("nonexistent_key")
        assert result is None


@pytest.mark.asyncio
async def test_cache_delete(cache_service, mock_redis):
    """Test deleting cached values."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.delete.return_value = 1
        
        success = await cache_service.delete("test_key")
        assert success is True


@pytest.mark.asyncio
async def test_cache_delete_pattern(cache_service, mock_redis):
    """Test deleting cached values by pattern."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.keys.return_value = [
            "cache:user:123:summary",
            "cache:user:123:profile"
        ]
        mock_redis.delete.return_value = 2
        
        deleted = await cache_service.delete_pattern("cache:user:123:*")
        assert deleted == 2


@pytest.mark.asyncio
async def test_cache_exists(cache_service, mock_redis):
    """Test checking if key exists."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.exists.return_value = 1
        
        exists = await cache_service.exists("test_key")
        assert exists is True


@pytest.mark.asyncio
async def test_cache_get_ttl(cache_service, mock_redis):
    """Test getting TTL for key."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.ttl.return_value = 3600
        
        ttl = await cache_service.get_ttl("test_key")
        assert ttl == 3600


@pytest.mark.asyncio
async def test_cache_clear_all(cache_service, mock_redis):
    """Test clearing all cache keys."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.keys.return_value = [
            "cache:key1",
            "cache:key2",
            "cache:key3"
        ]
        mock_redis.delete.return_value = 3
        
        deleted = await cache_service.clear_all()
        assert deleted == 3


@pytest.mark.asyncio
async def test_cache_count_keys(cache_service, mock_redis):
    """Test counting cache keys."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.keys.return_value = ["cache:key1", "cache:key2"]
        
        count = await cache_service.count_keys()
        assert count == 2


@pytest.mark.asyncio
async def test_cache_stats(cache_service):
    """Test getting cache statistics."""
    cache_service._hit_count = 80
    cache_service._miss_count = 20
    cache_service._error_count = 5
    
    stats = await cache_service.get_stats()
    
    assert stats["enabled"] is True
    assert stats["total_requests"] == 100
    assert stats["hits"] == 80
    assert stats["misses"] == 20
    assert stats["hit_rate"] == 80.0
    assert stats["errors"] == 5


def test_cache_reset_stats(cache_service):
    """Test resetting cache statistics."""
    cache_service._hit_count = 100
    cache_service._miss_count = 50
    cache_service._error_count = 10
    
    cache_service.reset_stats()
    
    assert cache_service._hit_count == 0
    assert cache_service._miss_count == 0
    assert cache_service._error_count == 0


@pytest.mark.asyncio
async def test_cache_disabled(cache_service):
    """Test that cache operations return appropriate values when disabled."""
    cache_service.enabled = False
    
    result = await cache_service.get("test_key")
    assert result is None
    
    success = await cache_service.set("test_key", "value")
    assert success is False


@pytest.mark.asyncio
async def test_cached_decorator_hit(mock_redis):
    """Test cached decorator with cache hit."""
    call_count = 0
    
    @cached(key_prefix="test_func", ttl=3600)
    async def expensive_function(user_id: int):
        nonlocal call_count
        call_count += 1
        return {"user_id": user_id, "name": "Test"}
    
    test_data = {"user_id": 123, "name": "Test"}
    
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        # First call - cache miss, function executes
        mock_redis.get.return_value = None
        result1 = await expensive_function(123)
        assert call_count == 1
        assert result1 == test_data
        
        # Second call - cache hit, function not executed
        mock_redis.get.return_value = json.dumps(test_data)
        result2 = await expensive_function(123)
        assert call_count == 1  # Should not increment
        assert result2 == test_data


@pytest.mark.asyncio
async def test_cached_decorator_disabled():
    """Test cached decorator when caching is disabled."""
    call_count = 0
    
    @cached(key_prefix="test_func", ttl=3600)
    async def expensive_function(user_id: int):
        nonlocal call_count
        call_count += 1
        return {"user_id": user_id, "name": "Test"}
    
    # Disable caching
    with patch('app.core.cache.get_cache_service') as mock_get_service:
        mock_service = CacheService()
        mock_service.enabled = False
        mock_get_service.return_value = mock_service
        
        result1 = await expensive_function(123)
        result2 = await expensive_function(123)
        
        # Function should be called both times
        assert call_count == 2


@pytest.mark.asyncio
async def test_cached_decorator_with_different_args(mock_redis):
    """Test cached decorator caches separately for different arguments."""
    @cached(key_prefix="test_func", ttl=3600)
    async def get_user(user_id: int):
        return {"user_id": user_id, "name": f"User{user_id}"}
    
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.get.return_value = None
        
        result1 = await get_user(123)
        result2 = await get_user(456)
        
        # Different args should create different cache keys
        assert result1["user_id"] == 123
        assert result2["user_id"] == 456


@pytest.mark.asyncio
async def test_invalidate_user_cache(mock_redis):
    """Test invalidating all cache for a user."""
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        mock_redis.keys.side_effect = [
            ["cache:user_summary:123"],
            ["cache:user_profile:123"],
            ["cache:journals:123:key1"],
            ["cache:conversation_summaries:123"]
        ]
        mock_redis.delete.return_value = 1
        
        deleted = await invalidate_user_cache(123)
        
        # Should delete from all patterns
        assert deleted >= 0


@pytest.mark.asyncio
async def test_cache_connection_error_fails_gracefully(cache_service, mock_redis):
    """Test that cache fails gracefully on Redis connection errors."""
    mock_redis.get.side_effect = ConnectionError("Redis connection failed")
    
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        result = await cache_service.get("test_key")
        
        # Should return None on connection error
        assert result is None


@pytest.mark.asyncio
async def test_cache_invalid_json_handles_gracefully(cache_service, mock_redis):
    """Test that cache handles invalid JSON gracefully."""
    mock_redis.get.return_value = "invalid json {{{{"
    
    with patch('app.core.cache.get_redis_client', return_value=mock_redis):
        result = await cache_service.get("test_key")
        
        # Should return None and delete corrupted data
        assert result is None
        mock_redis.delete.assert_called_once()


def test_get_cache_service_singleton():
    """Test that get_cache_service returns the same instance."""
    service1 = get_cache_service()
    service2 = get_cache_service()
    assert service1 is service2
