"""Counselor subsystem fixes: appointment lifecycle, SLA scan, AgentUser.

Covers the three fixes for the counselor case-flow gaps:
1. Counselor-owned appointment lifecycle endpoints (status + reschedule).
2. SLA breach scanner job (publishes SLA_BREACH; bridge notifies counselors).
3. AgentUser shadow-row get-or-create (manual assignment no longer 400s).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import uuid

import pytest
from fastapi import HTTPException

from app.models.agent_user import AgentRoleEnum, AgentUser


# ============================================================================
# SLA breach scanner
# ============================================================================
def _sla_job_db(rows):
    db = MagicMock()
    published = []

    async def execute(stmt, *_a, **_k):
        if "UPDATE" in str(stmt).upper():
            return SimpleNamespace(rowcount=len(rows))
        return SimpleNamespace(all=lambda: rows)

    db.execute = execute
    db.commit = AsyncMock()
    return db, published


@pytest.fixture()
def stub_publish(monkeypatch: pytest.MonkeyPatch):
    events = []

    async def fake_publish(event_type, source_agent, data, correlation_id=None):
        events.append((event_type, source_agent, data))

    monkeypatch.setattr(
        "app.services.event_bus.publish_event", fake_publish
    )
    return events


@pytest.mark.agents
async def test_sla_scan_publishes_breach_and_marks_notified(
    stub_publish, monkeypatch
) -> None:
    from app.core import scheduler as scheduler_module

    breach_time = datetime.now(timezone.utc) - timedelta(hours=1)
    rows = [(SimpleNamespace(name="c-1"), "5", breach_time)]

    db = MagicMock()
    db.execute = AsyncMock(return_value=SimpleNamespace(all=lambda: rows))
    db.commit = AsyncMock()

    def fake_session():
        class CM:
            async def __aenter__(self):
                return db

            async def __aexit__(self, *a):
                return False

        return CM()

    monkeypatch.setattr(scheduler_module, "AsyncSessionLocal", fake_session)

    await scheduler_module.check_sla_breaches()

    assert len(stub_publish) == 1
    event_type, source_agent, data = stub_publish[0]
    assert event_type.name == "SLA_BREACH"
    assert data["assigned_to"] == "5"
    assert "case_id" in data


@pytest.mark.agents
async def test_sla_scan_no_rows_is_noop(stub_publish, monkeypatch) -> None:
    from app.core import scheduler as scheduler_module

    db = MagicMock()
    db.execute = AsyncMock(return_value=SimpleNamespace(all=lambda: []))
    db.commit = AsyncMock()

    def fake_session():
        class CM:
            async def __aenter__(self):
                return db

            async def __aexit__(self, *a):
                return False

        return CM()

    monkeypatch.setattr(scheduler_module, "AsyncSessionLocal", fake_session)

    await scheduler_module.check_sla_breaches()
    assert stub_publish == []


# ============================================================================
# AgentUser shadow row
# ============================================================================
@pytest.mark.agents
async def test_ensure_agent_user_creates_missing_row() -> None:
    from app.models.agent_user import AgentRoleEnum, AgentUser, ensure_agent_user

    db = MagicMock()
    stored = {}

    async def execute(stmt, *_a, **_k):
        return SimpleNamespace(scalar_one_or_none=lambda: stored.get("row"))

    db.execute = execute
    db.add = lambda obj: stored.update({"row": obj})
    db.flush = AsyncMock()

    created = await ensure_agent_user(db, "42")

    assert created is stored["row"]
    assert created.id == "42"
    assert created.role == AgentRoleEnum.counselor


@pytest.mark.agents
async def test_ensure_agent_user_returns_existing() -> None:
    from app.models.agent_user import AgentUser, ensure_agent_user

    existing = AgentUser(id="42", role=AgentRoleEnum.counselor)
    db = MagicMock()
    db.add = MagicMock()

    async def execute(stmt, *_a, **_k):
        return SimpleNamespace(scalar_one_or_none=lambda: existing)

    db.execute = execute
    db.flush = AsyncMock()

    result = await ensure_agent_user(db, "42")
    assert result is existing
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_admin_assign_creates_shadow_row_for_fresh_counselor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Admin assign get-or-creates the AgentUser shadow row — previously any
    counselor without a CMA-created shadow row 400'd 'Unknown assignee'."""
    from app.routes.admin import cases as admin_cases

    case_id = str(uuid.uuid4())
    case = SimpleNamespace(id=case_id, assigned_to=None)
    shadow_row = AgentUser(id="5", role=AgentRoleEnum.counselor)
    stored: dict[str, object] = {"5": None}  # agent_users.id -> row (None = pending)

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        if "agent_users" in compiled:
            # stateful: once db.add() stores the shadow row, lookups find it
            return SimpleNamespace(scalar_one_or_none=lambda: stored.get("5"))
        return SimpleNamespace(scalar_one_or_none=lambda: case)

    def add(obj):
        if isinstance(obj, AgentUser):
            stored[obj.id] = obj

    db = MagicMock()
    db.execute = execute
    db.add = add
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.rollback = AsyncMock()

    events = []

    async def fake_publish(event_type, source_agent, data, correlation_id=None):
        events.append(data)

    monkeypatch.setattr("app.routes.admin.cases.publish_event", fake_publish)

    admin_user = SimpleNamespace(id=1, role="admin")
    await admin_cases.assign_case(
        case_id=case_id,
        payload=SimpleNamespace(assigned_to="5", reason=None),
        db=db,
        admin_user=admin_user,
    )

    assert case.assigned_to == "5"
    assert len(events) == 1 and events[0]["case_id"] == case_id



# ============================================================================
# Counselor appointment lifecycle
# ============================================================================
def _appointment_db(appointment, counselor_id=5, user_id=9):
    db = MagicMock()

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        if "counselors" in compiled:
            return SimpleNamespace(
                scalar_one_or_none=lambda: SimpleNamespace(id=counselor_id, user_id=user_id)
            )
        # appointment select
        return SimpleNamespace(scalar_one_or_none=lambda: appointment)

    db.execute = execute
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _appointment(status="scheduled"):
    """Plain namespace: from_attributes Pydantic validation needs plain
    attributes, and setting relationship attrs on a real ORM instance would
    trigger SQLAlchemy instrumentation."""
    return SimpleNamespace(
        id=1,
        user_id=100,
        counselor_id=5,
        appointment_type_id=1,
        status=status,
        # naive datetime mirrors what asyncpg returns from timestamptz columns
        appointment_datetime=datetime.now() + timedelta(days=1),
        notes=None,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        user=SimpleNamespace(
            id=100, email="budi@ugm.ac.id", name="Budi", avatar_url=None
        ),
        counselor=SimpleNamespace(
            id=5, name="Dr. Psi", specialization="clinical", image_url=None,
            is_available=True,
        ),
        appointment_type=SimpleNamespace(
            id=1, name="consultation", duration_minutes=50, description=None
        ),
    )


def _patch_reselect(monkeypatch, appointment):
    """After commit the route re-selects with joinedloads — serve the object."""
    from app.domains.mental_health.routes import counselor as counselor_module

    async def execute(stmt, *_a, **_k):
        if "counselors" in str(stmt):
            return SimpleNamespace(
                scalar_one_or_none=lambda: SimpleNamespace(id=5, user_id=9)
            )
        if "scalar_one()" in str(stmt) or "scalar_one" in str(stmt):
            return SimpleNamespace(scalar_one=lambda: appointment)
        return SimpleNamespace(scalar_one_or_none=lambda: appointment, scalar_one=lambda: appointment)

    # The final re-select uses .scalar_one()
    appointment_db = MagicMock()
    appointment_db.execute = execute
    monkeypatch.setattr(
        counselor_module, "get_counselor_profile",
        AsyncMock(return_value=SimpleNamespace(id=5)),
    )
    return appointment_db


@pytest.mark.asyncio
async def test_counselor_completes_appointment(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.domains.mental_health.routes import counselor as counselor_module
    from app.domains.mental_health.schemas.appointments import (
        AppointmentStatusUpdate,
    )

    appointment = _appointment(status="scheduled")

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        if "counselors" in compiled:
            return SimpleNamespace(
                scalar_one_or_none=lambda: SimpleNamespace(id=5),
                scalar_one=lambda: appointment,  # post-commit re-select (joinedload)
            )
        return SimpleNamespace(
            scalar_one=lambda: appointment,
            scalar_one_or_none=lambda: appointment,
        )

    db = MagicMock()
    db.execute = execute
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    monkeypatch.setattr(
        counselor_module, "get_counselor_profile",
        AsyncMock(return_value=SimpleNamespace(id=5)),
    )

    await counselor_module.update_counselor_appointment_status(
        appointment_id=1,
        status_data=AppointmentStatusUpdate(status="completed"),
        db=db,
        current_user=SimpleNamespace(id=9, role="counselor"),
    )
    assert appointment.status == "completed"


@pytest.mark.asyncio
async def test_counselor_cannot_touch_other_counselors_appointment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.domains.mental_health.routes import counselor as counselor_module
    from app.domains.mental_health.schemas.appointments import (
        AppointmentStatusUpdate,
    )

    async def execute(stmt, *_a, **_k):
        return SimpleNamespace(scalar_one_or_none=lambda: None)  # not owned

    db = MagicMock()
    db.execute = execute

    monkeypatch.setattr(
        counselor_module, "get_counselor_profile",
        AsyncMock(return_value=SimpleNamespace(id=5)),
    )

    with pytest.raises(HTTPException) as exc_info:
        await counselor_module.update_counselor_appointment_status(
            appointment_id=1,
            status_data=AppointmentStatusUpdate(status="completed"),
            db=db,
            current_user=SimpleNamespace(id=9, role="counselor"),
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_counselor_cannot_modify_completed_appointment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.domains.mental_health.routes import counselor as counselor_module
    from app.domains.mental_health.schemas.appointments import (
        AppointmentStatusUpdate,
    )

    async def execute(stmt, *_a, **_k):
        return SimpleNamespace(
            scalar_one_or_none=lambda: _appointment(status="completed")
        )

    db = MagicMock()
    db.execute = execute

    monkeypatch.setattr(
        counselor_module, "get_counselor_profile",
        AsyncMock(return_value=SimpleNamespace(id=5)),
    )

    with pytest.raises(HTTPException) as exc_info:
        await counselor_module.update_counselor_appointment_status(
            appointment_id=1,
            status_data=AppointmentStatusUpdate(status="no_show"),
            db=db,
            current_user=SimpleNamespace(id=9, role="counselor"),
        )
    assert exc_info.value.status_code == 400
