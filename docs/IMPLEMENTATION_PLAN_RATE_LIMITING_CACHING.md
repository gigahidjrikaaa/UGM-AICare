# Implementation Plan: Rate Limiting & Caching Layer

**Date:** October 25, 2025  
**Priority:** High (Cost Control & Performance)  
**Estimated Effort:** 6-8 hours  

---

## 📋 Overview

This document outlines the implementation of two critical Redis-based features:

1. **Rate Limiting** - Protect expensive LLM API calls and prevent abuse
2. **Caching Layer** - Reduce database load and improve response times

---

## 🎯 Goals

### Rate Limiting

- ✅ Protect Gemini API calls from abuse
- ✅ Control API costs with configurable limits
- ✅ Role-based limits (student < counsellor < admin)
- ✅ Multiple time windows (per-minute, per-hour, per-day)
- ✅ Graceful error messages with `Retry-After` headers
- ✅ Admin bypass capability

### Caching

- ✅ Cache frequently accessed DB queries
- ✅ 10-100x faster repeated queries
- ✅ Reduce PostgreSQL load
- ✅ Smart TTL strategies per data type
- ✅ Automatic cache invalidation on writes
- ✅ Cache hit/miss metrics

---

## 🏗️ Architecture

### Rate Limiting Flow

```
User Request → Rate Limit Check (Redis) → Allow/Deny
                     ↓
              Increment Counter
                     ↓
              Set TTL on Key
```

### Caching Flow

```
Query Request → Check Cache (Redis) → Hit? Return cached
                        ↓
                      Miss
                        ↓
                 Query Database
                        ↓
                 Store in Cache (with TTL)
                        ↓
                   Return Data
```

---

## 📦 Components to Create

### 1. Rate Limiter Service (`backend/app/core/rate_limiter.py`)

**Class: `RateLimiter`**

```python
class RateLimiter:
    """Redis-based rate limiter with sliding window counters."""
    
    async def check_rate_limit(
        self,
        user_id: int,
        endpoint: str,
        role: str = "student"
    ) -> tuple[bool, int, int]:
        """
        Check if request is within rate limit.
        
        Returns:
            (is_allowed, remaining_requests, reset_timestamp)
        """
        
    async def get_limit_for_role(self, role: str, window: str) -> int:
        """Get rate limit for role and time window."""
        
    async def reset_limit(self, user_id: int, endpoint: str):
        """Reset rate limit for testing/admin purposes."""
```

**Key Patterns:**

- Key: `rate_limit:{endpoint}:{user_id}:{window}` (e.g., `rate_limit:chat:123:hour`)
- TTL: Based on window (60s for minute, 3600s for hour, 86400s for day)
- Algorithm: Sliding window counter with INCR + EXPIRE

**Configuration (env.example):**

```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CHAT_PER_MINUTE_STUDENT=10
RATE_LIMIT_CHAT_PER_HOUR_STUDENT=100
RATE_LIMIT_CHAT_PER_DAY_STUDENT=500
RATE_LIMIT_CHAT_PER_MINUTE_COUNSELLOR=30
RATE_LIMIT_CHAT_PER_HOUR_COUNSELLOR=300
RATE_LIMIT_CHAT_PER_DAY_COUNSELLOR=2000
RATE_LIMIT_BYPASS_ADMIN=true
```

**FastAPI Dependency:**

```python
async def check_rate_limit_dependency(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
) -> None:
    """FastAPI dependency for rate limiting."""
    # Check if admin bypass enabled
    # Check rate limit
    # Raise HTTPException(429) if exceeded
```

---

### 2. Cache Service (`backend/app/core/cache.py`)

**Class: `CacheService`**

```python
class CacheService:
    """Redis-based caching service with TTL and invalidation."""
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value."""
        
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: int = 3600
    ) -> bool:
        """Set cached value with TTL."""
        
    async def delete(self, key: str) -> bool:
        """Delete cached value."""
        
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        
    async def get_stats(self) -> Dict[str, int]:
        """Get cache hit/miss statistics."""
```

**Decorator Pattern:**

```python
def cached(
    key_prefix: str,
    ttl: int = 3600,
    key_builder: Optional[Callable] = None
):
    """Decorator for caching function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            # Check cache
            # If miss, call function and cache result
            # Return result
        return wrapper
    return decorator
```

**Key Patterns:**

- User summaries: `cache:user_summary:{user_id}` (TTL: 30min)
- Journal entries: `cache:journals:{user_id}:{date_range_hash}` (TTL: 15min)
- Resource cards: `cache:resources:{resource_id}` (TTL: 24h)
- CBT modules: `cache:cbt_module:{module_id}` (TTL: 24h)
- User profile: `cache:user_profile:{user_id}` (TTL: 1h)

**Configuration (env.example):**

```env
# Caching
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600
CACHE_USER_SUMMARY_TTL=1800
CACHE_JOURNAL_TTL=900
CACHE_RESOURCE_TTL=86400
CACHE_CBT_MODULE_TTL=86400
```

---

## 🔌 Integration Points

### 1. Chat Endpoints (`backend/app/routes/chat.py`)

**Add rate limiting:**

```python
@router.post(
    "/chat",
    dependencies=[Depends(check_rate_limit_dependency)]  # ADD THIS
)
async def chat_endpoint(...):
    ...
```

**Add caching to tool queries** (in `tool_calling.py`):

```python
@cached(key_prefix="conversation_summaries", ttl=1800)
async def get_conversation_summaries(user_id: int, db: AsyncSession):
    ...
```

### 2. Personal Context Service (`backend/app/services/personal_context.py`)

**Cache user summaries:**

```python
async def _fetch_latest_user_summary(db: AsyncSession, user_id: int):
    cache_key = f"cache:user_summary:{user_id}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    # Query database
    result = await db.execute(...)
    summary = result.scalar_one_or_none()
    
    if summary:
        await cache_service.set(cache_key, summary, ttl=1800)
    
    return summary
```

### 3. Cache Invalidation on Writes

**Profile updates** (`backend/app/routes/profile.py`):

```python
async def update_profile(...):
    # Update database
    ...
    # Invalidate cache
    await cache_service.delete(f"cache:user_profile:{user_id}")
    await cache_service.delete(f"cache:user_summary:{user_id}")
```

**Journal entries** (`backend/app/routes/journal.py`):

```python
async def create_journal_entry(...):
    # Create entry
    ...
    # Invalidate journal caches
    await cache_service.delete_pattern(f"cache:journals:{user_id}:*")
```

---

## 📊 Monitoring & Metrics

### Health Check Updates (`backend/app/main.py`)

```python
@app.get("/health/redis")
async def redis_health_check():
    return {
        "status": "healthy",
        "redis_status": "connected",
        "rate_limiter": {
            "enabled": settings.rate_limit_enabled,
            "total_requests_today": await rate_limiter.get_total_requests()
        },
        "cache": {
            "enabled": settings.cache_enabled,
            "hit_rate": await cache_service.get_hit_rate(),
            "total_keys": await cache_service.count_keys()
        }
    }
```

### Logging Strategy

```python
# Rate limiting logs
logger.info(f"Rate limit check: user={user_id}, endpoint={endpoint}, allowed={is_allowed}")
logger.warning(f"Rate limit exceeded: user={user_id}, endpoint={endpoint}")

# Cache logs
logger.debug(f"Cache HIT: key={cache_key}")
logger.debug(f"Cache MISS: key={cache_key}")
logger.info(f"Cache invalidated: pattern={pattern}, keys_deleted={count}")
```

---

## 🧪 Testing Strategy

### Unit Tests (`backend/tests/test_rate_limiter.py`)

- ✅ Test basic rate limit enforcement
- ✅ Test sliding window behavior
- ✅ Test role-based limits
- ✅ Test admin bypass
- ✅ Test counter reset after TTL
- ✅ Test concurrent requests

### Unit Tests (`backend/tests/test_cache.py`)

- ✅ Test cache get/set/delete
- ✅ Test TTL expiration
- ✅ Test cache decorator
- ✅ Test pattern-based deletion
- ✅ Test cache statistics
- ✅ Test serialization/deserialization

### Integration Tests

- ✅ Test rate limiting on actual chat endpoint
- ✅ Test cache invalidation on profile update
- ✅ Test cache warming on application startup

---

## 📝 Implementation Checklist

### Phase 1: Rate Limiting (Tasks 1-4)

- [ ] Create `backend/app/core/rate_limiter.py`
- [ ] Add rate limiting config to `backend/app/core/settings.py`
- [ ] Update `env.example` with rate limit settings
- [ ] Create `check_rate_limit_dependency()` function
- [ ] Apply to `POST /api/v1/chat` endpoint
- [ ] Apply to WebSocket `/ws/chat` endpoint
- [ ] Test with different roles

### Phase 2: Caching (Tasks 5-8)

- [ ] Create `backend/app/core/cache.py`
- [ ] Add caching config to `backend/app/core/settings.py`
- [ ] Update `env.example` with cache settings
- [ ] Implement `@cached()` decorator
- [ ] Cache user summaries in `personal_context.py`
- [ ] Cache journal queries in `personal_context.py`
- [ ] Add cache invalidation to profile routes
- [ ] Add cache invalidation to journal routes

### Phase 3: Monitoring (Task 9)

- [ ] Update `/health/redis` endpoint with metrics
- [ ] Add Prometheus metrics (optional)
- [ ] Add logging for rate limit events
- [ ] Add logging for cache hit/miss

### Phase 4: Testing (Task 10)

- [ ] Write unit tests for rate limiter
- [ ] Write unit tests for cache service
- [ ] Write integration tests
- [ ] Load test rate limiting effectiveness
- [ ] Verify cache invalidation logic

---

## 🚀 Deployment Notes

### Environment Variables to Set

```bash
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CHAT_PER_MINUTE_STUDENT=10
RATE_LIMIT_CHAT_PER_HOUR_STUDENT=100
RATE_LIMIT_CHAT_PER_DAY_STUDENT=500
RATE_LIMIT_BYPASS_ADMIN=true

# Caching
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600
CACHE_USER_SUMMARY_TTL=1800
CACHE_JOURNAL_TTL=900
```

### Redis Memory Considerations

- Estimated memory usage per user: ~10KB
- For 10,000 active users: ~100MB
- Monitor Redis memory with `INFO memory`
- Set max memory policy: `maxmemory-policy allkeys-lru`

### Rollout Strategy

1. Deploy with `RATE_LIMIT_ENABLED=false` and `CACHE_ENABLED=false`
2. Monitor Redis connectivity
3. Enable caching first (low risk)
4. Monitor cache hit rates for 24h
5. Enable rate limiting with high limits
6. Gradually reduce limits based on usage patterns

---

## 📚 References

- Redis Rate Limiting: <https://redis.io/glossary/rate-limiting/>
- LRU Cache Patterns: <https://redis.io/docs/manual/eviction/>
- FastAPI Dependencies: <https://fastapi.tiangolo.com/tutorial/dependencies/>
- LangGraph Checkpointing: <https://langchain-ai.github.io/langgraph/how-tos/persistence/>

---

## ✅ Success Criteria

### Rate Limiting

- ✅ 429 errors returned when limits exceeded
- ✅ Proper `Retry-After` headers
- ✅ Admin users can bypass limits
- ✅ Logs show rate limit enforcement
- ✅ No false positives (legitimate requests blocked)

### Caching

- ✅ Cache hit rate > 60% for user summaries
- ✅ Response time improvement > 50% for cached queries
- ✅ Cache invalidation works correctly on writes
- ✅ No stale data served to users
- ✅ Redis memory usage within acceptable range

---

**Ready to implement?** Let's start with Phase 1 (Rate Limiting)! 🚀
