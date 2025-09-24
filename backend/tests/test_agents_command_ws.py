import json
import asyncio
import pytest # type: ignore
from httpx import AsyncClient
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.database import get_async_db, AsyncSessionLocal
from app.models import User
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator  # <-- Add this import

# NOTE: Assuming a dependency override for get_admin_user similar to existing tests pattern.
from app.dependencies import get_admin_user

@pytest.fixture()
async def session() -> AsyncGenerator[AsyncSession, None]:  # <-- Fix return type
    async with AsyncSessionLocal() as s:  # type: ignore
        yield s

class DummyAdmin:
    id = 1
    role = "admin"
    email = "admin@example.com"

async def _override_admin():
    return DummyAdmin()

app.dependency_overrides[get_admin_user] = _override_admin

@pytest.mark.anyio
async def test_dispatch_command_creates_run_and_streams_tokens(monkeypatch):
    """Full flow: dispatch triage classify -> expect run_started then token sequence then run_completed."""
    received = []

    # Prepare fake token for websocket auth: monkeypatch decrypt_and_validate_token
    from app import auth_utils
    def fake_decrypt(token: str):
        class P:
            role = 'admin'
            email = 'admin@example.com'
        return P()
    monkeypatch.setattr(auth_utils, 'decrypt_and_validate_token', fake_decrypt)

    async with AsyncClient(app=app, base_url="http://test") as client:
        # Open websocket
        from fastapi.testclient import TestClient as SyncClient
        # Use sync client for websocket context manager
        sync_client = SyncClient(app=app, base_url="http://test")
        with sync_client.websocket_connect(f"/api/v1/agents/ws?token=faketoken") as ws:
            # Dispatch command
            resp = await client.post("/api/v1/agents/command", json={"agent":"triage","action":"classify","data":{"text":"Hello"}})
            assert resp.status_code == 200
            payload = resp.json()
            run_id = payload["runId"]
            corr = payload["correlationId"]
            assert run_id and corr
            # Collect events until run_completed
            done = False
            token_chunks = []
            for _ in range(30):  # up to ~12s worst case
                msg = ws.receive_text()
                data = json.loads(msg)
                received.append(data)
                if data.get('type') == 'token' and data.get('correlationId') == corr:
                    token_chunks.append(data.get('token'))
                if data.get('type') == 'run_completed' and data.get('runId') == run_id:
                    done = True
                    break
            assert done, f"Did not receive run_completed. Events: {received}"
            assert any(e.get('type')=='run_started' for e in received)
            assert token_chunks, "No token chunks received"
            assert any(e.get('type')=='run_completed' for e in received)

@pytest.mark.anyio
async def test_cancellation_flow(monkeypatch):
    from app import auth_utils
    def fake_decrypt(token: str):
        class P:
            role = 'admin'
            email = 'admin@example.com'
        return P()
    monkeypatch.setattr(auth_utils, 'decrypt_and_validate_token', fake_decrypt)

    from fastapi.testclient import TestClient as SyncClient
    sync_client = SyncClient(app=app, base_url="http://test")

    async with AsyncClient(app=app, base_url="http://test") as client:
        with sync_client.websocket_connect(f"/api/v1/agents/ws?token=faketoken") as ws:
            resp = await client.post("/api/v1/agents/command", json={"agent":"triage","action":"classify"})
            assert resp.status_code == 200
            run_id = resp.json()['runId']
            # Issue cancel quickly
            cancel = await client.post(f"/api/v1/agents/runs/{run_id}/cancel")
            assert cancel.status_code == 200
            # Expect run_cancelled event
            cancelled = False
            for _ in range(10):
                data = json.loads(ws.receive_text())
                if data.get('type') == 'run_cancelled' and data.get('runId') == run_id:
                    cancelled = True
                    break
            assert cancelled, 'Did not receive run_cancelled event'
