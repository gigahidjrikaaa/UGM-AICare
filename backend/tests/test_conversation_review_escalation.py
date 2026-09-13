"""End-to-end tests for the conversation review + escalation pipeline:

    farewell/inactivity → autopilot action enqueued → worker runs the STA
    conversation analysis → assessment stored → case + counselor alert when
    the review says escalation is needed.

LLM and DB are mocked; the orchestration logic is what's under test.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest


def _assessment(risk="critical", cma=True, trend="escalating"):
    return SimpleNamespace(
        overall_risk_level=risk,
        risk_trend=trend,
        should_invoke_cma=cma,
        reasoning="Explicit suicidal ideation with plan near the end.",
        crisis_detected=True,
        conversation_duration_seconds=420.0,
        conversation_summary="User expressed suicidal ideation with a plan.",
        screening=None,  # screening update skipped in these tests
        model_dump=lambda: {
            "overall_risk_level": risk,
            "risk_trend": trend,
            "should_invoke_cma": cma,
        },
    )


@pytest.fixture()
def mocks(monkeypatch: pytest.MonkeyPatch):
    """Patch the analyzer, persistence, alert service, and event bus."""
    captured = {"assessment": None, "cases": [], "alerts": [], "events": [], "enqueued": []}

    async def fake_analyze(**_kwargs):
        return captured["assessment"]

    async def fake_upsert(db, **kwargs):
        return SimpleNamespace(id=42, session_id=kwargs.get("session_id"))

    class FakeAlertService:
        async def create_alert(self, **kwargs):
            captured["alerts"].append(kwargs)
            return SimpleNamespace(id="alert-1")

    async def fake_publish(**kwargs):
        captured["events"].append(kwargs)

    async def fake_enqueue(db, **kwargs):
        captured["enqueued"].append(kwargs)
        return SimpleNamespace(id=99)

    monkeypatch.setattr(
        "app.agents.sta.conversation_analyzer.analyze_conversation_risk", fake_analyze
    )
    monkeypatch.setattr(
        "app.domains.mental_health.services.conversation_assessments.upsert_conversation_assessment",
        fake_upsert,
    )
    monkeypatch.setattr(
        "app.services.alert_service.get_alert_service",
        lambda db: FakeAlertService(),
    )
    monkeypatch.setattr("app.services.event_bus.publish_event", fake_publish)
    monkeypatch.setattr(
        "app.domains.mental_health.services.autopilot_action_service.enqueue_action",
        fake_enqueue,
    )
    captured["fakes"] = {
        "analyze": fake_analyze,
        "enqueue": fake_enqueue,
    }
    return captured


def _scripted_db(open_case=None, extra_results=None):
    db = MagicMock()
    results = [
        SimpleNamespace(scalars=lambda: SimpleNamespace(first=lambda: None)),  # existing assessment
        SimpleNamespace(scalar_one_or_none=lambda: open_case),  # open case check
    ]
    if extra_results:
        results.extend(extra_results)

    async def execute(*_args, **_kwargs):
        if results:
            return results.pop(0)
        return SimpleNamespace(
            scalars=lambda: SimpleNamespace(first=lambda: None),
            scalar_one_or_none=lambda: None,
        )

    db.execute = execute
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.add = MagicMock()
    return db


# ============================================================================
# Leg 1: conversation end enqueues the durable review
# ============================================================================
@pytest.mark.asyncio
async def test_farewell_enqueues_conversation_review(mocks) -> None:
    from app.agents.aika.decision_node import _maybe_enqueue_conversation_end_sta

    db = MagicMock()
    db.flush = AsyncMock()

    state = {
        "user_id": 7,
        "session_id": "sess-1",
        "message": "bye",
        "conversation_history": [
            {"role": "user", "content": "Aku mau bunuh diri"},
            {"role": "assistant", "content": "Aku di sini..."},
        ],
        "preferred_model": None,
        "immediate_risk_level": "critical",
    }

    await _maybe_enqueue_conversation_end_sta(state, db, "bye", recompute=True)

    assert mocks["enqueued"], "a sta_conversation_analysis action must be enqueued"
    action = mocks["enqueued"][0]
    # idempotency_key = sha256(raw key); recompute the expected value.
    from app.domains.mental_health.services.autopilot_action_service import (
        build_idempotency_key,
    )

    expected = build_idempotency_key("sta-analysis:sess-1:7")
    assert action["idempotency_key"] == expected
    assert action["payload_json"]["user_id"] == 7


# ============================================================================
# Leg 2: the review runs and escalates
# ============================================================================
@pytest.mark.asyncio
async def test_critical_review_creates_case_and_alert(mocks) -> None:
    from app.agents.aika.background_tasks import (
        trigger_sta_conversation_analysis_background,
    )
    from app.domains.mental_health.models.cases import Case

    mocks["assessment"] = _assessment(risk="critical", cma=True)
    db = _scripted_db(open_case=None)

    state = {
        "conversation_id": "conv-1",
        "user_id": 7,
        "session_id": "sess-1",
        "message": "bye",
        "conversation_history": [{"role": "user", "content": "aku mau bunuh diri"}],
        "personal_context": {},
        "sta_analysis_completed": False,
    }

    await trigger_sta_conversation_analysis_background(state, db)

    # Assessment stored + state marked complete.
    assert state.get("sta_analysis_completed") is True
    assert state["conversation_assessment"]["overall_risk_level"] == "critical"

    # ESCALATION: a Case was persisted...
    cases = [c for c in mocks["cases"]]  # noqa (clarity)
    added_cases = [
        call.args[0] for call in db.add.call_args_list
        if type(call.args[0]).__name__ == "Case"
    ]
    assert added_cases, "an open case must be created for critical reviews"
    case = added_cases[0]
    assert case.status.value == "new"
    assert case.severity.value == "critical"
    assert case.user_hash  # pseudonymized owner
    # ...redacted summary (no raw content)
    assert "bunuh diri" not in (case.summary_redacted or "")

    # CASE_CREATED event fired for the SSE bridge.
    assert mocks["events"] and mocks["events"][0]["event_type"].name == "CASE_CREATED"

    # Counselor/admin alert with the conversation pointer.
    assert mocks["alerts"], "an alert must be created"
    assert mocks["alerts"][0]["severity"].name == "CRITICAL"
    assert mocks["alerts"][0]["alert_metadata"]["conversation_id"] == "conv-1"


@pytest.mark.asyncio
async def test_low_risk_review_does_not_escalate(mocks) -> None:
    from app.agents.aika.background_tasks import (
        trigger_sta_conversation_analysis_background,
    )

    mocks["assessment"] = _assessment(risk="low", cma=False)
    db = _scripted_db(open_case=None)

    state = {
        "conversation_id": "conv-2",
        "user_id": 7,
        "session_id": "sess-2",
        "message": "makasih ya",
        "conversation_history": [{"role": "user", "content": "hari ini oke"}],
        "personal_context": {},
        "sta_analysis_completed": False,
    }

    await trigger_sta_conversation_analysis_background(state, db)

    assert state.get("sta_analysis_completed") is True
    added_cases = [
        call.args[0] for call in db.add.call_args_list
        if type(call.args[0]).__name__ == "Case"
    ]
    assert not added_cases
    assert not mocks["alerts"]


@pytest.mark.asyncio
async def test_escalation_dedupes_when_open_case_exists(mocks) -> None:
    from app.agents.aika.background_tasks import (
        trigger_sta_conversation_analysis_background,
    )

    mocks["assessment"] = _assessment(risk="high", cma=True)
    existing_case = SimpleNamespace(id=1, assigned_to="5")
    # scripted results: existing assessment, open-case check, counselor lookup
    db = _scripted_db(open_case=existing_case, extra_results=[
        SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(id=5, user_id=9))
    ])


    state = {
        "conversation_id": "conv-3",
        "user_id": 7,
        "session_id": "sess-3",
        "message": "bye",
        "conversation_history": [],
        "personal_context": {},
        "sta_analysis_completed": False,
    }

    await trigger_sta_conversation_analysis_background(state, db)

    # No duplicate case, but the counselor alert still fires.
    added_cases = [
        call.args[0] for call in db.add.call_args_list
        if type(call.args[0]).__name__ == "Case"
    ]
    assert not added_cases
    assert mocks["alerts"] and mocks["alerts"][0]["severity"].name == "HIGH"


@pytest.mark.asyncio
async def test_review_is_idempotent_per_conversation(mocks) -> None:
    from app.agents.aika.background_tasks import (
        trigger_sta_conversation_analysis_background,
    )

    mocks["assessment"] = _assessment(risk="critical", cma=True)
    db = MagicMock()

    class FakeScalars:
        def first(self):
            return SimpleNamespace(id=1)  # assessment already exists

    async def execute(*_a, **_k):
        return SimpleNamespace(scalars=FakeScalars)

    db.execute = execute

    state = {
        "conversation_id": "conv-dup",
        "user_id": 7,
        "session_id": "sess-dup",
        "message": "bye",
        "conversation_history": [],
        "sta_analysis_completed": False,
    }

    await trigger_sta_conversation_analysis_background(state, db)

    # Early return: no re-analysis, no state mutation beyond the initial check.
    assert "sta_analysis_completed" not in state or state.get("sta_analysis_completed") is False
    assert mocks["fakes"]["analyze"] and not mocks["alerts"]


# ============================================================================
# Leg 3: the worker handler rebuilds state and persists
# ============================================================================
@pytest.mark.asyncio
async def test_worker_handler_runs_analysis_and_commits(mocks, monkeypatch) -> None:
    from app.domains.mental_health.services import autopilot_worker as worker

    mocks["assessment"] = _assessment(risk="high", cma=True)

    captured_state = {}

    async def fake_trigger(state, db):
        captured_state.update(state)
        state["sta_analysis_completed"] = True
        state["conversation_assessment"] = _assessment().model_dump()

    monkeypatch.setattr(
        "app.agents.aika.background_tasks.trigger_sta_conversation_analysis_background",
        fake_trigger,
    )

    db_handle = AsyncMock()
    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=db_handle)
    session_cm.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(worker, "AsyncSessionLocal", lambda: session_cm)

    action = SimpleNamespace(
        payload_json={
            "conversation_id": "conv-9",
            "user_id": 7,
            "session_id": "sess-9",
            "message": "bye",
            "conversation_history": [],
            "started_at_ts": datetime.now(timezone.utc).timestamp(),
        },
        next_retry_at=datetime.now(timezone.utc),
    )

    result = await worker._handle_sta_conversation_analysis(action)

    assert captured_state["conversation_id"] == "conv-9"
    assert result["risk_level"] == "critical"
    assert result["cma_recommended"] is True


# ============================================================================
# Auto-assignment: escalated cases reach a counselor + notify via bridge
# ============================================================================
@pytest.mark.asyncio
async def test_escalation_auto_assigns_case_to_counselor(mocks, monkeypatch) -> None:
    from app.agents.aika.background_tasks import (
        trigger_sta_conversation_analysis_background,
    )

    async def fake_pick(db, severity, preferences):
        return 5  # Counselor.id = 5

    monkeypatch.setattr(
        "app.agents.cma.cma_graph._select_optimal_counselor", fake_pick
    )
    mocks["assessment"] = _assessment(risk="critical", cma=True)
    db = _scripted_db(open_case=None)

    state = {
        "conversation_id": "conv-10",
        "user_id": 7,
        "session_id": "sess-10",
        "message": "bye",
        "conversation_history": [],
        "personal_context": {},
        "sta_analysis_completed": False,
    }

    await trigger_sta_conversation_analysis_background(state, db)

    added_cases = [
        call.args[0] for call in db.add.call_args_list
        if type(call.args[0]).__name__ == "Case"
    ]
    assert added_cases and added_cases[0].assigned_to == "5"

    # CASE_ASSIGNED published → event bridge creates the counselor-scoped alert.
    event_types = [e["event_type"].name for e in mocks["events"]]
    assert "CASE_CREATED" in event_types
    assert "CASE_ASSIGNED" in event_types
    assigned_event = next(e for e in mocks["events"] if e["event_type"].name == "CASE_ASSIGNED")
    assert assigned_event["data"]["assigned_to"] == "5"


@pytest.mark.asyncio
async def test_escalation_without_available_counselor_stays_unassigned(mocks, monkeypatch) -> None:
    from app.agents.aika.background_tasks import (
        trigger_sta_conversation_analysis_background,
    )

    async def no_one(db, severity, preferences):
        return None

    monkeypatch.setattr(
        "app.agents.cma.cma_graph._select_optimal_counselor", no_one
    )
    mocks["assessment"] = _assessment(risk="high", cma=True)
    db = _scripted_db(open_case=None)

    state = {
        "conversation_id": "conv-11",
        "user_id": 7,
        "session_id": "sess-11",
        "message": "bye",
        "conversation_history": [],
        "personal_context": {},
        "sta_analysis_completed": False,
    }

    await trigger_sta_conversation_analysis_background(state, db)

    added_cases = [
        call.args[0] for call in db.add.call_args_list
        if type(call.args[0]).__name__ == "Case"
    ]
    assert added_cases and added_cases[0].assigned_to is None
    event_types = [e["event_type"].name for e in mocks["events"]]
    assert "CASE_CREATED" in event_types
    assert "CASE_ASSIGNED" not in event_types


# ============================================================================
# get_my_assigned_cases: assigned list with patient identity
# ============================================================================
@pytest.mark.asyncio
async def test_get_my_assigned_cases_returns_patient_details(mocks, monkeypatch) -> None:
    from app.agents.shared.tools.case_management_tools import get_my_assigned_cases

    case_row = SimpleNamespace(
        id="case-uuid-1",
        status=SimpleNamespace(value="new"),
        severity=SimpleNamespace(value="critical"),
        created_at=datetime.now(timezone.utc),
        summary_redacted="Ringkasan teredaksi",
        session_id="sess-10",
        conversation_id=3,
        user_hash="h",
    )

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        if "counselors" in compiled:
            return SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(id=5, user_id=9))
        if "conversations" in compiled:
            return SimpleNamespace(all=lambda: [(3, 7, "sess-10")])
        if "users" in compiled:
            return SimpleNamespace(
                scalars=lambda: SimpleNamespace(all=lambda: [
                    SimpleNamespace(
                        id=7, email="budi@ugm.ac.id", preferred_name="Budi",
                        first_name=None, name="Budi S", phone=None,
                        profile=SimpleNamespace(phone="0812", alternate_phone=None, telegram_username="@budi"),
                    )
                ])
            )
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [case_row]))

    db = MagicMock()
    db.execute = execute

    result = await get_my_assigned_cases(db=db, user_id=9)

    assert result["success"] is True
    assert result["total_cases"] == 1
    entry = result["cases"][0]
    assert entry["case_id"] == "case-uuid-1"
    assert entry["patient"]["email"] == "budi@ugm.ac.id"
    assert entry["patient"]["preferred_name"] == "Budi"
    assert entry["patient"]["telegram_username"] == "@budi"


@pytest.mark.asyncio
async def test_get_my_assigned_cases_no_counselor_profile() -> None:
    from app.agents.shared.tools.case_management_tools import get_my_assigned_cases

    db = MagicMock()

    async def execute(*_a, **_k):
        return SimpleNamespace(scalar_one_or_none=lambda: None)

    db.execute = execute

    result = await get_my_assigned_cases(db=db, user_id=3)
    assert result["success"] is True
    assert result["cases"] == []
    assert "Counselor" in result["note"]


@pytest.mark.asyncio
async def test_get_case_details_hides_patient_from_non_assignee() -> None:
    from app.agents.shared.tools.case_management_tools import get_case_details

    case_row = SimpleNamespace(
        id="case-1",
        user_hash="h",
        session_id="s",
        conversation_id=1,
        severity=SimpleNamespace(value="high"),
        status=SimpleNamespace(value="new"),
        summary_redacted=None,
        assigned_to="999",  # someone else
        sla_breach_at=None,
        closure_reason=None,
        created_at=None,
        updated_at=None,
    )

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        if "counselors" in compiled:
            return SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(id=5, user_id=9))
        return SimpleNamespace(scalar_one_or_none=lambda: case_row)

    db = MagicMock()
    db.execute = execute

    result = await get_case_details(db=db, case_id="case-1", user_id=9)
    assert result["success"] is True
    assert result["patient"] is None
    assert "counselor lain" in result["patient_access"]
