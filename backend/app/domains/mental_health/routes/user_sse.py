"""User-scoped Server-Sent Events (SSE) endpoint.

Mirrors the admin SSE mount (`app/routes/admin/sse.py`) but authenticated as
the *student*: the broadcaster already supports per-user event targeting, so
this is the in-app proactive channel transport — `proactive_message` events
reach only the intended user's open tabs.
"""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database import get_async_db
from app.models.user import User
from app.services.sse_broadcaster import get_broadcaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sse", tags=["SSE"])


@router.get("/events")
async def stream_user_events(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> StreamingResponse:
    """Stream user-scoped Server-Sent Events.

    Events include:
    - `proactive_message` — Aika initiated a chat (closed-loop plan follow-ups)
    - `ping` — heartbeat

    Example client:
    ```javascript
    const es = new EventSource('/api/v1/sse/events', {
      headers: { Authorization: 'Bearer TOKEN' },
    });
    es.addEventListener('proactive_message', (e) => console.log(JSON.parse(e.data)));
    ```
    """
    broadcaster = get_broadcaster()
    connection = await broadcaster.add_connection(current_user.id)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            yield (
                "event: connected\n"
                "data: {\"message\": \"SSE connection established\", "
                f"\"user_id\": {current_user.id}}}\n\n"
            )
            async for event in connection.get_events():
                if await request.is_disconnected():
                    logger.info("User SSE client disconnected: user %s", current_user.id)
                    break
                yield event
        except Exception as e:
            logger.error(
                "Error in user SSE stream for user %s: %s",
                current_user.id,
                e,
                exc_info=True,
            )
        finally:
            await broadcaster.remove_connection(connection.connection_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
