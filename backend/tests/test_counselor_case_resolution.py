"""Counselor Resolve-flow tests: resolution persistence, un-collapsed list,
split stats, and status-change event parity with the admin route."""
from __future__ import annotations

import uuid
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.domains.mental_health.models import CaseSeverityEnum, CaseStatusEnum
from app.domains.mental_health.routes import counselor as counselor_module


def _case(status: CaseStatusEnum = CaseStatusEnum.in_progress) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        created_at=datetime(2026, 9, 1, 9, 0, 0),
        updated_at=datetime(2026, 9, 10, 9, 0, 0),
        status=status,
        severity=CaseSeverityEnum.high,
        assigned_to="5",
        user_hash="abcd1234",
        session_id=None,
        conversation_id=None,
        summary_redacted="redacted summary",
        sla_breach_at=None,
        resolution_notes=None,
        resolved_at=None,
    )


def _resolve_db(case: SimpleNamespace) -> MagicMock:
    # First execute: CounselorProfile lookup; second: the Case select.
    calls = {"n": 0}

    async def execute(stmt, *_a, **_k):
        calls["n"] += 1
        if calls["n"] == 1:
            return SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(id=5))
        return SimpleNamespace(scalar_one_or_none=lambda: case)

    db = MagicMock()
    db.execute = execute
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_resolve_persists_resolution_notes_and_timestamp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    case = _case(CaseStatusEnum.in_progress)
    db = _resolve_db(case)
    monkeypatch.setattr(
        "app.services.event_bus.publish_event", AsyncMock(), raising=False
    )

    result = await counselor_module.update_my_case_status(
        case_id=str(case.id),
        payload=counselor_module.CounselorCaseStatusUpdate(
            status="resolved",
            resolution_notes="Student completed 4 sessions; PHQ-9 down 12 points.",
        ),
        db=db,
        current_user=SimpleNamespace(id=9, role="counselor"),
    )

    assert case.status == CaseStatusEnum.resolved
    assert case.resolved_at is not None
    assert case.resolution_notes == (
        "Student completed 4 sessions; PHQ-9 down 12 points."
    )
    assert result["status"] == "resolved"


@pytest.mark.asyncio
async def test_resolve_without_notes_still_persists_timestamp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    case = _case(CaseStatusEnum.in_progress)
    db = _resolve_db(case)
    monkeypatch.setattr(
        "app.services.event_bus.publish_event", AsyncMock(), raising=False
    )

    await counselor_module.update_my_case_status(
        case_id=str(case.id),
        payload=counselor_module.CounselorCaseStatusUpdate(status="resolved"),
        db=db,
        current_user=SimpleNamespace(id=9, role="counselor"),
    )

    assert case.status == CaseStatusEnum.resolved
    assert case.resolved_at is not None
    assert case.resolution_notes is None


@pytest.mark.asyncio
async def test_resolve_publishes_case_status_changed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.event_bus import EventType

    case = _case(CaseStatusEnum.in_progress)
    db = _resolve_db(case)
    publish_mock = AsyncMock()
    monkeypatch.setattr(
        "app.services.event_bus.publish_event", publish_mock, raising=False
    )

    await counselor_module.update_my_case_status(
        case_id=str(case.id),
        payload=counselor_module.CounselorCaseStatusUpdate(status="resolved"),
        db=db,
        current_user=SimpleNamespace(id=9, role="counselor"),
    )

    assert publish_mock.await_count == 1
    kwargs = publish_mock.await_args.kwargs
    assert kwargs["event_type"] == EventType.CASE_STATUS_CHANGED
    assert kwargs["data"]["new_status"] == "resolved"
    assert kwargs["data"]["old_status"] == "in_progress"


@pytest.mark.asyncio
async def test_cannot_resolve_from_new_state(monkeypatch: pytest.MonkeyPatch) -> None:
    case = _case(CaseStatusEnum.new)
    db = _resolve_db(case)

    with pytest.raises(HTTPException) as exc_info:
        await counselor_module.update_my_case_status(
            case_id=str(case.id),
            payload=counselor_module.CounselorCaseStatusUpdate(status="resolved"),
            db=db,
            current_user=SimpleNamespace(id=9, role="counselor"),
        )
    assert exc_info.value.status_code == 400
    assert case.status == CaseStatusEnum.new


@pytest.mark.asyncio
async def test_get_my_cases_keeps_resolved_distinct() -> None:
    case = _case(CaseStatusEnum.resolved)
    case.resolution_notes = "Closed successfully after follow-up."
    case.resolved_at = datetime(2026, 9, 12, 10, 0, 0)

    call_count = {"n": 0}

    async def execute(stmt, *_a, **_k):
        call_count["n"] += 1
        if call_count["n"] == 1:
            # CounselorProfile lookup
            return SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(id=5))
        if call_count["n"] == 2:
            # Cases select
            return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [case]))
        if call_count["n"] == 3:
            # Conversation preload
            return SimpleNamespace(all=lambda: [])
        # User preload
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))

    db = MagicMock()
    db.execute = execute

    response = await counselor_module.get_my_cases(
        status=None,
        db=db,
        current_user=SimpleNamespace(id=9, role="counselor"),
    )

    assert len(response.cases) == 1
    item = response.cases[0]
    assert item.status == "resolved"  # NOT collapsed to closed
    assert item.resolution_notes == "Closed successfully after follow-up."
    assert item.resolved_at is not None


@pytest.mark.asyncio
async def test_case_stats_splits_resolved_from_closed() -> None:
    counts = [11, 2, 3, 4, 5, 1, 1]  # total, open, in_progress, resolved, closed, critical, high

    call_count = {"n": 0}

    async def execute(stmt, *_a, **_k):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(id=5))
        raise AssertionError("unexpected execute")

    db = MagicMock()
    db.execute = execute
    db.scalar = AsyncMock(side_effect=counts)

    stats = await counselor_module.get_my_case_stats(
        db=db,
        current_user=SimpleNamespace(id=9, role="counselor"),
    )

    assert stats["resolved_cases"] == 4
    assert stats["closed_cases"] == 5  # closed only, no longer merged
    assert stats["total_cases"] == 11
