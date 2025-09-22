import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, Cookie
from typing import Dict, Any, Optional
import json
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio
from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import AgentRun, AgentMessage, User
from app.auth_utils import decrypt_and_validate_token

ACTIVE_CONNECTIONS: Dict[str, WebSocket] = {}
RATE_LIMIT: Dict[int, list[float]] = {}  # user_id -> timestamps
MAX_COMMANDS_PER_MINUTE = 30
RUN_TASKS: Dict[int, asyncio.Task] = {}

# Future imports for when agents are implemented
# from fastapi import Depends, HTTPException
# from sqlalchemy.ext.asyncio import AsyncSession
# from app.database import get_db
# from app.core.auth import get_current_user, get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/agents", tags=["Admin - Agents"])

@router.get("/status", summary="Get the status of the agent system")
async def get_agent_system_status():
    """
    Provides a simple status check for the agent system API endpoints.
    """
    logger.info("Agent system status endpoint called.")
    return {"status": "ok", "message": "Agent system is running."}


@router.get("/runs", summary="List recent agent runs")
async def list_agent_runs(
    limit: int = 25,
    agent: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    q = select(AgentRun).order_by(AgentRun.started_at.desc()).limit(min(limit, 100))
    if agent:
        q = q.filter(AgentRun.agent_name == agent.lower())
    result = await db.execute(q)
    runs = result.scalars().all()
    return [
        {
            "id": r.id,
            "agent": r.agent_name,
            "action": r.action,
            "status": r.status,
            "correlationId": r.correlation_id,
            "startedAt": r.started_at.isoformat() if r.started_at else None,
            "completedAt": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in runs
    ]


@router.get("/metrics", summary="Aggregated agent run metrics")
async def agent_metrics(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    # Aggregate counts grouped by agent and status
    from sqlalchemy import func, and_
    # Counts per status
    counts_stmt = select(AgentRun.agent_name, AgentRun.status, func.count(AgentRun.id)).group_by(AgentRun.agent_name, AgentRun.status)
    counts_rows = (await db.execute(counts_stmt)).all()
    # Last completed (succeeded or failed) per agent
    # AgentRun has no updated_at; use max(completed_at) for finished runs.
    last_completed_subq = (
        select(
            AgentRun.agent_name.label("agent_name"),
            func.max(AgentRun.completed_at).label("last_completed")
        )
        .where(AgentRun.status.in_(["succeeded", "failed", "cancelled"]))
        .group_by(AgentRun.agent_name)
        .subquery()
    )
    last_completed_rows = (await db.execute(select(last_completed_subq.c.agent_name, last_completed_subq.c.last_completed))).all()
    last_completed_map = {r.agent_name or "unknown": r.last_completed for r in last_completed_rows}

    per_agent: dict[str, dict[str, object]] = {}
    global_totals: dict[str, int] = {"total": 0, "running": 0, "succeeded": 0, "failed": 0, "cancelled": 0}
    for agent_name, status, count in counts_rows:
        agent_key = agent_name or "unknown"
        agent_entry = per_agent.setdefault(agent_key, {"total": 0, "running": 0, "succeeded": 0, "failed": 0, "cancelled": 0, "lastCompleted": None})
        agent_entry["total"] += count
        global_totals["total"] += count
        if status in agent_entry:
            agent_entry[status] += count
            if status in global_totals:
                global_totals[status] += count
    # Fill lastCompleted
    for agent, ts in last_completed_map.items():
        if agent in per_agent:
            per_agent[agent]["lastCompleted"] = ts
        else:
            per_agent[agent] = {"total": 0, "running": 0, "succeeded": 0, "failed": 0, "cancelled": 0, "lastCompleted": ts}
    return {"perAgent": per_agent, "global": global_totals}


@router.get("/runs/{run_id}/messages", summary="List messages for a run")
async def list_run_messages(
    run_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    q = select(AgentMessage).where(AgentMessage.run_id == run_id).order_by(AgentMessage.created_at.asc())
    result = await db.execute(q)
    msgs = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "type": m.message_type,
            "content": m.content,
            "metadata": m.meta,
            "createdAt": m.created_at.isoformat() if m.created_at else None,
        }
        for m in msgs
    ]


async def _emit_event(payload: dict):
    dead = []
    encoded = json.dumps(payload)
    for cid, ws in ACTIVE_CONNECTIONS.items():
        try:
            await ws.send_text(encoded)
        except Exception:
            dead.append(cid)
    for cid in dead:
        ACTIVE_CONNECTIONS.pop(cid, None)


async def _simulate_triage_run(run_id: int, correlation_id: str, agent_name: str, action: str, db_factory):
    token_chunks = ["Assessing", " risk", " factors", " and", " severity..."]
    try:
        async with db_factory() as session:  # type: ignore
            for chunk in token_chunks:
                await asyncio.sleep(0.4)
                # Check for cancellation
                result = await session.execute(select(AgentRun).where(AgentRun.id == run_id))
                run_obj = result.scalar_one_or_none()
                if not run_obj or run_obj.status == "cancelled":
                    return
                msg = AgentMessage(
                    run_id=run_id,
                    agent_name=agent_name,
                    role="agent",
                    message_type="token",
                    content=chunk,
                    metadata={"correlation_id": correlation_id},
                )
                session.add(msg)
                await session.commit()
                await _emit_event({
                    "type": "token",
                    "runId": run_id,
                    "correlationId": correlation_id,
                    "agent": agent_name,
                    "action": action,
                    "token": chunk,
                    "ts": datetime.utcnow().isoformat(),
                })
            # Finalize if still running
            result = await session.execute(select(AgentRun).where(AgentRun.id == run_id))
            run_obj = result.scalar_one_or_none()
            if run_obj and run_obj.status != "cancelled":
                final_content = "Triage complete: classification=low_risk"
                final_msg = AgentMessage(
                    run_id=run_id,
                    agent_name=agent_name,
                    role="agent",
                    message_type="final",
                    content=final_content,
                    metadata={"correlation_id": correlation_id, "classification": "low_risk"},
                )
                session.add(final_msg)
                run_obj.status = "succeeded"
                run_obj.completed_at = datetime.utcnow()
                run_obj.output_payload = {"classification": "low_risk"}
                await session.commit()
                await _emit_event({
                    "type": "run_completed",
                    "runId": run_id,
                    "correlationId": correlation_id,
                    "agent": agent_name,
                    "action": action,
                    "status": "succeeded",
                    "result": {"classification": "low_risk"},
                    "ts": datetime.utcnow().isoformat(),
                })
    finally:
        RUN_TASKS.pop(run_id, None)


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
    await _emit_event(event)

    if agent_name == "triage" and action in {"classify", "run", "execute"}:
        from app.database import AsyncSessionLocal
        task = asyncio.create_task(_simulate_triage_run(run.id, correlation_id, agent_name, action, AsyncSessionLocal))
        RUN_TASKS[run.id] = task

    return {"runId": run.id, "correlationId": correlation_id, "status": run.status}


@router.post("/runs/{run_id}/cancel", summary="Cancel a running agent run")
async def cancel_run(
    run_id: int,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id))
    run_obj = result.scalar_one_or_none()
    if not run_obj:
        raise HTTPException(status_code=404, detail="Run not found")
    if run_obj.status not in {"running"}:
        return {"runId": run_obj.id, "status": run_obj.status}
    run_obj.status = "cancelled"
    run_obj.completed_at = datetime.utcnow()
    # Add cancellation message
    cancel_msg = AgentMessage(
        run_id=run_obj.id,
        agent_name=run_obj.agent_name,
        role="system",
        message_type="event",
        content="Run cancelled by user",
        metadata={"correlation_id": run_obj.correlation_id},
    )
    db.add(cancel_msg)
    await db.commit()
    # Cancel background task if exists
    task = RUN_TASKS.pop(run_id, None)
    if task and not task.done():
        task.cancel()
    await _emit_event({
        "type": "run_cancelled",
        "runId": run_obj.id,
        "correlationId": run_obj.correlation_id,
        "agent": run_obj.agent_name,
        "action": run_obj.action,
        "status": run_obj.status,
        "ts": datetime.utcnow().isoformat(),
    })
    return {"runId": run_obj.id, "status": run_obj.status}


@router.websocket("/ws")
async def agent_events_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
    access_token: Optional[str] = Cookie(default=None),
    generic_token: Optional[str] = Cookie(default=None, alias="token"),
    auth_cookie: Optional[str] = Cookie(default=None, alias="auth"),
    session_token: Optional[str] = Cookie(default=None, alias="next-auth.session-token"),
):
    # Attempt to authenticate: precedence query token > access_token > next-auth session > token > auth
    candidate = token or access_token or session_token or generic_token or auth_cookie
    if not candidate:
        await websocket.close(code=4401)
        return
    # Validate JWT or NextAuth session token
    try:
        payload = decrypt_and_validate_token(candidate)
    except HTTPException:
        await websocket.close(code=4401)
        return
    # Basic role check (admin / therapist only for viewing)
    if payload.role not in {"admin", "therapist"}:
        await websocket.close(code=4403)
        return
    await websocket.accept()
    connection_id = str(uuid.uuid4())
    ACTIVE_CONNECTIONS[connection_id] = websocket
    try:
        await websocket.send_text(json.dumps({"type": "welcome", "connectionId": connection_id, "userRole": payload.role}))
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
            except json.JSONDecodeError:
                parsed = {"raw": data}
            if isinstance(parsed, dict) and parsed.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "ts": datetime.utcnow().isoformat()}))
            else:
                await websocket.send_text(json.dumps({"type": "ack", "echo": parsed}))
    except WebSocketDisconnect:
        pass
    finally:
        ACTIVE_CONNECTIONS.pop(connection_id, None)
