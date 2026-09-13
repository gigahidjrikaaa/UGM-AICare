"""Per-IP rate limiting for unauthenticated endpoints.

The existing role-aware limiter (``core/rate_limiter.py``) is keyed by
authenticated user id, which is useless on login/register/password-reset —
exactly the endpoints that need brute-force and email-bombing protection.
This module provides a small fixed-window counter keyed by client IP:

    await enforce_ip_rate_limit(request, bucket="login", limit=5, window_seconds=60)

Raises HTTP 429 with a Retry-After header when the window is exceeded.
Uses the shared Redis client (MockRedis in-process fallback keeps it
functional without Redis). ``X-Forwarded-For`` is honored (first entry) since
deployments run behind a reverse proxy; a spoofed XFF only lets an attacker
throttle-bypass their own requests, not attack others.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import HTTPException, Request, status

from app.core.memory import get_redis_client

logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "unknown"


def _coerce_int(value: Optional[str]) -> Optional[int]:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


async def enforce_ip_rate_limit(
    request: Request,
    *,
    bucket: str,
    limit: int,
    window_seconds: int,
) -> None:
    """Count this request against ``limit`` per ``window_seconds`` per IP.

    Fail-open on store errors: availability of the auth endpoint outranks
    throttling when Redis itself is down (the in-process fallback usually
    covers this anyway).
    """
    ip = _client_ip(request)
    key = f"iprl:{bucket}:{ip}"

    try:
        client = await get_redis_client()
        current = await client.get(key)
        count = _coerce_int(current if isinstance(current, str) else None) or 0
        if count >= limit:
            import inspect

            retry_after = window_seconds
            if hasattr(client, "ttl"):
                ttl_value = client.ttl(key)
                if inspect.isawaitable(ttl_value):
                    ttl_value = await ttl_value
                if isinstance(ttl_value, int) and ttl_value > 0:
                    retry_after = ttl_value
            logger.warning(
                "IP rate limit exceeded: bucket=%s ip=%s count=%d limit=%d",
                bucket,
                ip,
                count,
                limit,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Terlalu banyak percobaan. Coba lagi nanti.",
                headers={"Retry-After": str(retry_after)},
            )
        await client.set(key, str(count + 1), ex=window_seconds)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("IP rate limiter unavailable (%s); allowing request.", exc)
