"""LangGraph checkpointer initialization (Postgres-backed).

Goal:
- Use durable Postgres-backed checkpointing for LangGraph conversations.
- Create a single app-lifetime saver instance (avoid per-request MemorySaver).

Configuration:
- Uses `LANGGRAPH_CHECKPOINTER_URL` if set, else falls back to `DATABASE_URL`.
- Only initializes when using PostgreSQL.

Notes:
- The saver uses psycopg (v3) under the hood, separate from SQLAlchemy.
"""

from __future__ import annotations

import inspect
import logging
import os
from typing import Any, Optional

from app.database import DATABASE_URL

logger = logging.getLogger(__name__)

_checkpointer: Optional[Any] = None


def _to_postgres_dsn(url: str) -> str:
    """Convert a SQLAlchemy async URL to a psycopg-compatible Postgres DSN."""
    # SQLAlchemy async URLs like: postgresql+asyncpg://user:pass@host/db
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("postgresql+psycopg://"):
        return url.replace("postgresql+psycopg://", "postgresql://", 1)
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql://", 1)
    return url


async def init_langgraph_checkpointer() -> Optional[Any]:
    global _checkpointer

    if _checkpointer is not None:
        return _checkpointer

    raw_url = os.getenv("LANGGRAPH_CHECKPOINTER_URL") or DATABASE_URL
    dsn = _to_postgres_dsn(raw_url)

    if not dsn.startswith("postgresql://"):
        logger.info("LangGraph checkpointer not initialized (non-Postgres DATABASE_URL)")
        _checkpointer = None
        return None

    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver  # type: ignore[import-not-found]
    except Exception:
        logger.warning(
            "LangGraph Postgres saver not available. Install 'langgraph-checkpoint-postgres' and 'psycopg'.",
            exc_info=True,
        )
        _checkpointer = None
        return None

    try:
        saver = await AsyncPostgresSaver.from_conn_string(dsn)
        setup_result = saver.setup()
        if inspect.isawaitable(setup_result):
            await setup_result
        _checkpointer = saver
        logger.info("✅ LangGraph Postgres checkpointer initialized")
        return _checkpointer
    except Exception:
        logger.error("Failed to initialize LangGraph Postgres checkpointer", exc_info=True)
        _checkpointer = None
        return None


def get_langgraph_checkpointer() -> Optional[Any]:
    return _checkpointer


async def close_langgraph_checkpointer() -> None:
    global _checkpointer
    saver = _checkpointer
    _checkpointer = None

    if saver is None:
        return

    # Best-effort close (API varies by version)
    try:
        aclose = getattr(saver, "aclose", None)
        if aclose is not None:
            result = aclose()
            if inspect.isawaitable(result):
                await result
            return
    except Exception:
        logger.warning("Failed to close LangGraph checkpointer cleanly", exc_info=True)
