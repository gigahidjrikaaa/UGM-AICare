"""Tier-2 reliability: multi-worker scheduler locks."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest


class FakeRedis:
    """Per-'worker' independent store when a new instance is created."""

    def __init__(self, shared=None):
        self.data = shared if shared is not None else {}

    async def get(self, key):
        return self.data.get(key)

    async def set(self, key, value, nx=False, ex=None):
        if nx and key in self.data:
            return None  # redis-py: None when held
        self.data[key] = str(value)
        return True


def _worker(monkeypatch: pytest.MonkeyPatch, shared=None):
    from app.core import scheduler as module

    client = FakeRedis(shared)
    monkeypatch.setattr(
        "app.core.memory.get_redis_client", _async_return(client)
    )
    return module


def _async_return(value):
    async def _get():
        return value

    return _get


# ============================================================================
# Distributed job locks
# ============================================================================
@pytest.mark.asyncio
async def test_job_lock_lets_first_worker_run_and_blocks_second(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    shared = {}
    worker_a = _worker(monkeypatch, shared)
    ran = {"count": 0}

    @worker_a._with_distributed_lock("job-x", ttl_seconds=60)
    async def job():
        ran["count"] += 1

    await job()
    assert ran["count"] == 1
    # Same lock store (another worker, same Redis): skipped.
    await job()
    assert ran["count"] == 1


@pytest.mark.asyncio
async def test_job_lock_releases_after_ttl_window(monkeypatch: pytest.MonkeyPatch) -> None:
    # Simulate TTL expiry by clearing the shared store between fires.
    shared = {}
    worker = _worker(monkeypatch, shared)
    ran = {"count": 0}

    @worker._with_distributed_lock("job-y", ttl_seconds=60)
    async def job():
        ran["count"] += 1

    await job()
    shared.clear()  # lock expired
    await job()
    assert ran["count"] == 2


@pytest.mark.asyncio
async def test_job_lock_fail_open_without_redis(monkeypatch: pytest.MonkeyPatch) -> None:
    """If the lock store is unreachable, jobs still run (availability first)."""
    from app.core import scheduler as module

    async def broken():
        raise RuntimeError("redis down")

    monkeypatch.setattr("app.core.memory.get_redis_client", broken)
    ran = {"count": 0}

    @module._with_distributed_lock("job-z", ttl_seconds=60)
    async def job():
        ran["count"] += 1

    await job()
    assert ran["count"] == 1
