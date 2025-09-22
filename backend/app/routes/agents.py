import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import Dict, Any, Optional
import json
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import AgentRun, AgentMessage, User

ACTIVE_CONNECTIONS: Dict[str, WebSocket] = {}
RATE_LIMIT: Dict[int, list[float]] = {}  # user_id -> timestamps
MAX_COMMANDS_PER_MINUTE = 30

# Future imports for when agents are implemented
# from fastapi import Depends, HTTPException
# from sqlalchemy.ext.asyncio import AsyncSession
# from app.database import get_db
# from app.core.auth import get_current_user, get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["Agents"])

@router.get("/status", summary="Get the status of the agent system")
async def get_agent_system_status():
    """
    Provides a simple status check for the agent system API endpoints.
    """
    logger.info("Agent system status endpoint called.")
    return {"status": "ok", "message": "Agent system is running."}


@router.post("/command", summary="Dispatch an agent command")
async def dispatch_agent_command(
    payload: Dict[str, Any],
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_db),
):
    required = {"agent", "action"}
    if not required.issubset(payload):
        raise HTTPException(status_code=400, detail=f"Missing required fields: {required - set(payload.keys())}")

    correlation_id = payload.get("correlationId") or str(uuid.uuid4())
    agent_name = payload["agent"].lower()
    action = payload["action"].lower()
    input_payload = payload.get("data") or {}

    # Simple rate limiting
    import time
    now = time.time()
    window_start = now - 60
    user_events = RATE_LIMIT.setdefault(admin_user.id, [])
    # prune old
    RATE_LIMIT[admin_user.id] = [t for t in user_events if t >= window_start]
    if len(RATE_LIMIT[admin_user.id]) >= MAX_COMMANDS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Rate limit exceeded (30 commands/minute)")
    RATE_LIMIT[admin_user.id].append(now)

    run = AgentRun(
        agent_name=agent_name,
        action=action,
        status="running",
        correlation_id=correlation_id,
        input_payload=input_payload,
        triggered_by_user_id=admin_user.id,
    )
    db.add(run)
    await db.flush()

    # Initial message
    msg = AgentMessage(
        run_id=run.id,
        agent_name=agent_name,
        role="system",
        message_type="event",
        content=f"Command accepted: {agent_name}.{action}",
        metadata={"correlation_id": correlation_id},
    )
    db.add(msg)
    await db.commit()
    await db.refresh(run)

    # Broadcast to all active websocket connections (admin viewers)
    event = {
        "type": "run_started",
        "correlationId": correlation_id,
        "runId": run.id,
        "agent": agent_name,
        "action": action,
        "status": run.status,
        "timestamp": datetime.utcnow().isoformat(),
    }
    dead = []
    for cid, ws in ACTIVE_CONNECTIONS.items():
        try:
            await ws.send_text(json.dumps(event))
        except Exception:
            dead.append(cid)
    for cid in dead:
        ACTIVE_CONNECTIONS.pop(cid, None)

    # TODO: enqueue actual agent execution (Phase 2)
    return {"runId": run.id, "correlationId": correlation_id, "status": run.status}


@router.websocket("/ws")
async def agent_events_ws(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    # Minimal token validation (reuse existing session cookie fallback); future: JWT parse
    # If token provided but empty/invalid length, reject.
    if token is not None and len(token) < 8:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    connection_id = str(uuid.uuid4())
    ACTIVE_CONNECTIONS[connection_id] = websocket
    try:
        await websocket.send_text(json.dumps({"type": "welcome", "connectionId": connection_id}))
        while True:
            # Keep the loop to allow receiving pings/heartbeats from client; minimal echo for now
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
            except json.JSONDecodeError:
                parsed = {"raw": data}
            # Heartbeat handling
            if isinstance(parsed, dict) and parsed.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "ts": datetime.utcnow().isoformat()}))
            else:
                await websocket.send_text(json.dumps({"type": "ack", "echo": parsed}))
    except WebSocketDisconnect:
        pass
    finally:
        ACTIVE_CONNECTIONS.pop(connection_id, None)
