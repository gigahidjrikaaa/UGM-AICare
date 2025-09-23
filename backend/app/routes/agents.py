import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query, Depends
from typing import Dict, Any, Optional
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import asyncio
from app.database import get_async_db
from app.models import AgentRun, AgentMessage, User
from app.agents.qa_handlers import answer_triage_question, answer_analytics_question
from app.schemas.analytics import AnalyticsQuerySpec, AnalyticsRunResult
from app.services.analytics_service import (
    interpret_question_to_spec,
    run_analytics_spec,
    explain_analytics_result,
)
from app.agents.orchestrator import AdminOrchestrator

router = APIRouter(prefix="/api/v1/admin/agents", tags=["Admin - Agents"])

@router.post("/ask", summary="Ask an agent a natural language question")
async def ask_agent(payload: Dict[str, Any], db: AsyncSession = Depends(get_async_db)):
    agent = (payload.get("agent") or "").lower().strip()
    question = (payload.get("question") or payload.get("q") or "").strip()
    if not agent or not question:
        raise HTTPException(status_code=400, detail="Fields 'agent' and 'question' are required")

    correlation_id = str(uuid.uuid4())
    run = AgentRun(
        agent_name=agent,
        action="ask",
        status="running",
        correlation_id=correlation_id,
        input_payload={"question": question},
        triggered_by_user_id=None,
    )
    db.add(run)
    await db.flush()

    # Initial message (system)
    start_msg = AgentMessage(
        run_id=run.id,
        agent_name=agent,
        role="system",
        message_type="event",
        content=f"Question received for {agent}: {question}",
        metadata={"correlation_id": correlation_id},
    )
    db.add(start_msg)
    await db.commit()
    await db.refresh(run)

    await _emit_event({
        "type": "run_started",
        "runId": run.id,
        "correlationId": correlation_id,
        "agent": agent,
        "action": "ask",
        "status": run.status,
        "question": question,
        "timestamp": datetime.utcnow().isoformat(),
    })

    try:
        if agent == "triage":
            result = await answer_triage_question(db, question)
        elif agent == "analytics":
            result = await answer_analytics_question(db, question)
        else:
            raise HTTPException(status_code=400, detail="Unsupported agent for /ask")
        answer_text = result["answer"]
        final_msg = AgentMessage(
            run_id=run.id,
            agent_name=agent,
            role="agent",
            message_type="final",
            content=answer_text,
            metadata={"correlation_id": correlation_id, "metrics": result.get("metrics")},
        )
        db.add(final_msg)
        run.status = "succeeded"
        run.completed_at = datetime.utcnow()
        run.output_payload = result
        await db.commit()
        await _emit_event({
            "type": "run_completed",
            "runId": run.id,
            "correlationId": correlation_id,
            "agent": agent,
            "action": "ask",
            "status": run.status,
            "result": result,
            "ts": datetime.utcnow().isoformat(),
        })
        return {"runId": run.id, "answer": answer_text, "metrics": result.get("metrics")}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("/ask failure: %s", exc)
        run.status = "failed"
        run.completed_at = datetime.utcnow()
        run.output_payload = {"error": str(exc)}
        fail_msg = AgentMessage(
            run_id=run.id,
            agent_name=agent,
            role="agent",
            message_type="error",
            content="Error processing question",
            metadata={"correlation_id": correlation_id, "error": str(exc)},
        )
        db.add(fail_msg)
        await db.commit()
        await _emit_event({
            "type": "run_completed",
            "runId": run.id,
            "correlationId": correlation_id,
            "agent": agent,
            "action": "ask",
            "status": run.status,
            "error": str(exc),
            "ts": datetime.utcnow().isoformat(),
        })
        raise HTTPException(status_code=500, detail="Agent failed to answer question")

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
    # Previously rate-limited per user; now global anonymized rate limiting disabled.
    user_events = RATE_LIMIT.setdefault(0, [])
    # prune old
    RATE_LIMIT[0] = [t for t in user_events if t >= window_start]
    if len(RATE_LIMIT[0]) >= MAX_COMMANDS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Rate limit exceeded (30 commands/minute)")
    RATE_LIMIT[0].append(now)

    run = AgentRun(
        agent_name=agent_name,
        action=action,
        status="running",
        correlation_id=correlation_id,
        input_payload=input_payload,
        triggered_by_user_id=None,
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

_orchestrator = AdminOrchestrator()

@router.post("/orchestrate", summary="Natural language orchestrator (Phase 1 routing)")
async def orchestrate_question(payload: Dict[str, Any], db: AsyncSession = Depends(get_async_db)):
    question = (payload.get("question") or payload.get("q") or "").strip()
    explicit_agent = (payload.get("agent") or payload.get("targetAgent") or None)
    if not question:
        raise HTTPException(status_code=400, detail="Field 'question' is required")
    correlation_id = str(uuid.uuid4())
    # Decide route
    try:
        result = await _orchestrator.route(db, question, explicit_agent)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    run = AgentRun(
        agent_name="orchestrator",
        action="orchestrate",
        status="running",
        correlation_id=correlation_id,
        input_payload={"question": question, "resolved_agent": result.agent},
        triggered_by_user_id=None,
    )
    db.add(run)
    await db.flush()
    start_msg = AgentMessage(
        run_id=run.id,
        agent_name="orchestrator",
        role="system",
        message_type="event",
        content=f"Routing question to {result.agent} agent",
        metadata={"correlation_id": correlation_id, "question": question, "route": result.route},
    )
    db.add(start_msg)
    await db.commit()
    await db.refresh(run)
    await _emit_event({
        "type": "run_started",
        "runId": run.id,
        "correlationId": correlation_id,
        "agent": "orchestrator",
        "action": "orchestrate",
        "status": run.status,
        "question": question,
        "resolvedAgent": result.agent,
        "timestamp": datetime.utcnow().isoformat(),
    })

    # Complete immediately (Phase 1 is single-step)
    final_msg = AgentMessage(
        run_id=run.id,
        agent_name="orchestrator",
        role="agent",
        message_type="final",
        content=result.answer,
        metadata={"correlation_id": correlation_id, "metrics": result.metrics, "routed_agent": result.agent},
    )
    db.add(final_msg)
    run.status = "succeeded"
    run.completed_at = datetime.utcnow()
    # Compute metrics hash for traceability
    import hashlib, json
    metrics_hash = hashlib.sha256(json.dumps(result.metrics, sort_keys=True, default=str).encode('utf-8')).hexdigest()
    run.output_payload = {"answer": result.answer, "metrics": result.metrics, "agent": result.agent, "route": result.route, "metricsHash": metrics_hash}
    await db.commit()
    await _emit_event({
        "type": "run_completed",
        "runId": run.id,
        "correlationId": correlation_id,
        "agent": "orchestrator",
        "action": "orchestrate",
        "status": run.status,
        "result": {"answer": result.answer, "metrics": result.metrics, "agent": result.agent, "route": result.route, "metricsHash": metrics_hash},
        "ts": datetime.utcnow().isoformat(),
    })
    return {"runId": run.id, "answer": result.answer, "metrics": result.metrics, "agent": result.agent, "route": result.route, "metricsHash": metrics_hash}

# --- Analytics Structured Pipeline Endpoints ---

@router.post("/analytics/interpret", summary="Interpret analytics question into structured spec")
async def interpret_analytics_question(payload: Dict[str, Any]):
    question = (payload.get("question") or payload.get("q") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Field 'question' is required")
    spec = await interpret_question_to_spec(question)
    return {"spec": spec.dict(), "hash": spec.hash()}

@router.post("/analytics/run", summary="Execute analytics spec deterministically")
async def run_analytics(payload: Dict[str, Any], db: AsyncSession = Depends(get_async_db)):
    try:
        spec = AnalyticsQuerySpec(**payload.get("spec", {}))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid spec: {e}") from e
    result = await run_analytics_spec(db, spec)
    # Hash metrics (excluding answer) for traceability
    import hashlib, json
    metrics_hash = hashlib.sha256(json.dumps(result.metrics, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    return {"spec": spec.dict(), "metrics": result.metrics, "empty": result.empty, "metricsHash": metrics_hash}

@router.post("/analytics/explain", summary="Generate natural language explanation for analytics result")
async def explain_analytics(payload: Dict[str, Any]):
    try:
        spec = AnalyticsQuerySpec(**payload.get("spec", {}))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid spec: {e}") from e
    metrics = payload.get("metrics") or {}
    result = AnalyticsRunResult(spec=spec, metrics=metrics, empty=bool(payload.get("empty")))
    explained = await explain_analytics_result(result)
    import hashlib, json
    metrics_hash = hashlib.sha256(json.dumps(metrics, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    return {"spec": spec.dict(), "answer": explained.answer, "metrics": metrics, "empty": explained.empty, "metricsHash": metrics_hash}


@router.websocket("/ws")
async def agent_events_ws(websocket: WebSocket):
    # Unauthenticated public websocket (use cautiously)
    await websocket.accept()
    connection_id = str(uuid.uuid4())
    ACTIVE_CONNECTIONS[connection_id] = websocket
    try:
        await websocket.send_text(json.dumps({"type": "welcome", "connectionId": connection_id}))
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
