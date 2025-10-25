"""Unit tests for rate limiter service.

Run tests with:
    pytest backend/tests/test_rate_limiter.py -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.core.rate_limiter import RateLimiter, get_rate_limiter


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.incr = AsyncMock(return_value=1)
    mock.expire = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.keys = AsyncMock(return_value=[])
    return mock


@pytest.fixture
def rate_limiter():
    """Create rate limiter instance."""
    limiter = RateLimiter()
    limiter.enabled = True  # Ensure enabled for tests
    return limiter


@pytest.mark.asyncio
async def test_rate_limiter_allows_within_limit(rate_limiter, mock_redis):
    """Test that requests within limit are allowed."""
    with patch('app.core.rate_limiter.get_redis_client', return_value=mock_redis):
        # First request
        mock_redis.get.return_value = None
        mock_redis.incr.return_value = 1
        
        is_allowed, remaining, reset_ts = await rate_limiter.check_rate_limit(
            user_id=123,
            endpoint="chat",
            role="student"
        )
        
        assert is_allowed is True
        assert remaining >= 0
        assert reset_ts > 0


@pytest.mark.asyncio
async def test_rate_limiter_blocks_when_exceeded(rate_limiter, mock_redis):
    """Test that requests are blocked when limit is exceeded."""
    with patch('app.core.rate_limiter.get_redis_client', return_value=mock_redis):
        # Simulate limit exceeded (student minute limit is 10)
        mock_redis.get.return_value = "10"
        
        is_allowed, remaining, reset_ts = await rate_limiter.check_rate_limit(
            user_id=123,
            endpoint="chat",
            role="student"
        )
        
        assert is_allowed is False
        assert remaining == 0
        assert reset_ts > 0


@pytest.mark.asyncio
async def test_rate_limiter_admin_bypass(rate_limiter, mock_redis):
    """Test that admin users can bypass rate limiting."""
    rate_limiter.enabled = True
    
    with patch('app.core.settings.settings') as mock_settings:
        mock_settings.rate_limit_bypass_admin = True
        
        is_allowed, remaining, reset_ts = await rate_limiter.check_rate_limit(
            user_id=1,
            endpoint="chat",
            role="admin"
        )
        
        assert is_allowed is True
        assert remaining == 999999


@pytest.mark.asyncio
async def test_rate_limiter_disabled(rate_limiter):
    """Test that rate limiter allows all requests when disabled."""
    rate_limiter.enabled = False
    
    is_allowed, remaining, reset_ts = await rate_limiter.check_rate_limit(
        user_id=123,
        endpoint="chat",
        role="student"
    )
    
    assert is_allowed is True
    assert remaining == 999999


@pytest.mark.asyncio
async def test_rate_limiter_different_roles(rate_limiter, mock_redis):
    """Test different limits for different roles."""
    with patch('app.core.rate_limiter.get_redis_client', return_value=mock_redis):
        # Student request
        mock_redis.get.return_value = None
        mock_redis.incr.return_value = 1
        
        is_allowed_student, _, _ = await rate_limiter.check_rate_limit(
            user_id=123,
            endpoint="chat",
            role="student"
        )
        
        # Counsellor request (higher limit)
        is_allowed_counsellor, _, _ = await rate_limiter.check_rate_limit(
            user_id=456,
            endpoint="chat",
            role="counsellor"
        )
        
        assert is_allowed_student is True
        assert is_allowed_counsellor is True


@pytest.mark.asyncio
async def test_rate_limiter_reset(rate_limiter, mock_redis):
    """Test resetting rate limit for a user."""
    with patch('app.core.rate_limiter.get_redis_client', return_value=mock_redis):
        mock_redis.keys.return_value = [
            "rate_limit:chat:123:minute",
            "rate_limit:chat:123:hour",
            "rate_limit:chat:123:day"
        ]
        mock_redis.delete.return_value = 3
        
        deleted = await rate_limiter.reset_limit(
            user_id=123,
            endpoint="chat"
        )
        
        assert deleted == 3


@pytest.mark.asyncio
async def test_rate_limiter_stats(rate_limiter):
    """Test getting rate limiter statistics."""
    rate_limiter._hit_count = 100
    rate_limiter._block_count = 10
    
    stats = await rate_limiter.get_stats()
    
    assert stats["enabled"] is True
    assert stats["total_checks"] == 110
    assert stats["allowed"] == 100
    assert stats["blocked"] == 10
    assert stats["block_rate"] == pytest.approx(9.09, rel=0.1)


@pytest.mark.asyncio
async def test_rate_limiter_key_building(rate_limiter):
    """Test Redis key building."""
    key = rate_limiter._build_key("chat", 123, "hour")
    assert key == "rate_limit:chat:123:hour"


def test_rate_limiter_ttl_calculation(rate_limiter):
    """Test TTL calculation for different windows."""
    assert rate_limiter._get_window_ttl("minute") == 60
    assert rate_limiter._get_window_ttl("hour") == 3600
    assert rate_limiter._get_window_ttl("day") == 86400


def test_rate_limiter_limit_for_role(rate_limiter):
    """Test getting limits for different roles."""
    # Student limits
    limit_student = rate_limiter._get_limit_for_role("student", "chat", "minute")
    assert limit_student == 10
    
    # Counsellor limits
    limit_counsellor = rate_limiter._get_limit_for_role("counsellor", "chat", "minute")
    assert limit_counsellor == 30


@pytest.mark.asyncio
async def test_rate_limiter_connection_error_fails_open(rate_limiter, mock_redis):
    """Test that rate limiter fails open on Redis connection errors."""
    mock_redis.get.side_effect = ConnectionError("Redis connection failed")
    
    with patch('app.core.rate_limiter.get_redis_client', return_value=mock_redis):
        is_allowed, remaining, _ = await rate_limiter.check_rate_limit(
            user_id=123,
            endpoint="chat",
            role="student"
        )
        
        # Should fail open (allow request)
        assert is_allowed is True


def test_get_rate_limiter_singleton():
    """Test that get_rate_limiter returns the same instance."""
    limiter1 = get_rate_limiter()
    limiter2 = get_rate_limiter()
    assert limiter1 is limiter2
