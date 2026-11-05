"""Durable autopilot policy toggles.

The admin console's autopilot settings previously mutated ``os.environ`` in
the API process only — the change silently reverted on restart and never
reached other workers. This module stores policy values in Redis (shared by
all workers, survives restarts) with the environment variable as the default
fallback, so ``AUTOPILOT_ENABLED`` etc. keep their documented env-var
configuration while UI changes persist.

Enforcement points read through :func:`get_bool` (decision node) instead of
``os.getenv`` directly.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_PREFIX = "autopilot:policy:"
_TRUE = {"1", "true", "yes", "on"}


def _env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, "true" if default else "false").strip().lower() in _TRUE


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _coerce_bool(raw) -> Optional[bool]:
    if raw is None:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", "ignore")
    return str(raw).strip().lower() in _TRUE


def _coerce_int(raw) -> Optional[int]:
    if raw is None:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", "ignore")
    try:
        return int(str(raw).strip())
    except ValueError:
        return None


async def get_bool(name: str, default: bool) -> bool:
    """Read a boolean policy value: Redis override first, env fallback."""
    try:
        from app.core.memory import get_redis_client

        redis = await get_redis_client()
        raw = await redis.get(f"{_PREFIX}{name}")
        value = _coerce_bool(raw)
        if value is not None:
            return value
    except Exception:
        logger.debug("autopilot policy: Redis read failed for %s", name, exc_info=True)
    return _env_bool(name, default)


async def set_bool(name: str, value: bool) -> None:
    try:
        from app.core.memory import get_redis_client

        redis = await get_redis_client()
        await redis.set(f"{_PREFIX}{name}", "true" if value else "false")
    except Exception:
        logger.warning(
            "autopilot policy: Redis write failed for %s — change is "
            "process-local and will revert on restart",
            name,
            exc_info=True,
        )
        os.environ[name] = "true" if value else "false"


async def get_int(name: str, default: int) -> int:
    try:
        from app.core.memory import get_redis_client

        redis = await get_redis_client()
        raw = await redis.get(f"{_PREFIX}{name}")
        value = _coerce_int(raw)
        if value is not None:
            return value
    except Exception:
        logger.debug("autopilot policy: Redis read failed for %s", name, exc_info=True)
    return _env_int(name, default)


async def set_int(name: str, value: int) -> None:
    try:
        from app.core.memory import get_redis_client

        redis = await get_redis_client()
        await redis.set(f"{_PREFIX}{name}", str(value))
    except Exception:
        logger.warning(
            "autopilot policy: Redis write failed for %s — change is "
            "process-local and will revert on restart",
            name,
            exc_info=True,
        )
        os.environ[name] = str(value)
