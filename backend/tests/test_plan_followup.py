"""Tests for proactive Aika: closed-loop plan follow-ups + proactive messages.

Fully offline: DB sessions are mocked, SSE broadcast is stubbed.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import ProactiveMessageSource, ProactiveMessageStatus
from app.services.plan_followup_service import (
    RECENT_ACTIVITY_WINDOW,
    adjust_for_quiet_hours,
    deliver_plan_followup,
    parse_timeframe_id,
    schedule_plan_followup,
)


# ============================================================================
# Timeframe parser
# ============================================================================
class TestParseTimeframe:
    def test_days(self) -> None:
        assert parse_timeframe_id("3 hari") == timedelta(days=3)

    def test_weeks(self) -> None:
        assert parse_timeframe_id("1 minggu") == timedelta(days=7)

    def test_hours(self) -> None:
        assert parse_timeframe_id("2 jam") == timedelta(hours=2)

    def test_besok_and_lusa(self) -> None:
        assert parse_timeframe_id("besok") == timedelta(days=1)
        assert parse_timeframe_id("besok pagi") == timedelta(days=1)
        assert parse_timeframe_id("lusa") == timedelta(days=2)

    def test_garbage_falls_back_to_three_days(self) -> None:
        assert parse_timeframe_id("kapan saja") == timedelta(days=3)
        assert parse_timeframe_id("") == timedelta(days=3)
        assert parse_timeframe_id(None) == timedelta(days=3)

    def test_clamps_to_30_days(self) -> None:
        assert parse_timeframe_id("99 hari") == timedelta(days=30)


# ============================================================================
# Quiet hours
# ============================================================================
class TestQuietHours:
    TZ = "Asia/Jakarta"  # UTC+7, no DST

    def test_overnight_window_before_midnight_local(self) -> None:
        # 15:30 UTC = 22:30 WIB -> inside 22:00-06:00 -> next 06:00 WIB
        due = datetime(2026, 9, 12, 15, 30, tzinfo=timezone.utc)
        out = adjust_for_quiet_hours(
            due, quiet_start=time(22, 0), quiet_end=time(6, 0), tz_name=self.TZ
        )
        assert out == datetime(2026, 9, 12, 23, 0, tzinfo=timezone.utc)

    def test_overnight_window_after_midnight_local(self) -> None:
        # 17:00 UTC = 00:00 WIB (next day) -> same local day 06:00 WIB
        due = datetime(2026, 9, 12, 17, 0, tzinfo=timezone.utc)
        out = adjust_for_quiet_hours(
            due, quiet_start=time(22, 0), quiet_end=time(6, 0), tz_name=self.TZ
        )
        assert out == datetime(2026, 9, 12, 23, 0, tzinfo=timezone.utc)

    def test_outside_window_unchanged(self) -> None:
        due = datetime(2026, 9, 12, 4, 0, tzinfo=timezone.utc)  # 11:00 WIB
        out = adjust_for_quiet_hours(
            due, quiet_start=time(22, 0), quiet_end=time(6, 0), tz_name=self.TZ
        )
        assert out == due

    def test_no_window_unchanged(self) -> None:
        due = datetime(2026, 9, 12, 15, 30, tzinfo=timezone.utc)
        assert adjust_for_quiet_hours(due, quiet_start=None, quiet_end=None) == due


# ============================================================================
# Scheduling
# ============================================================================
def _make_plan(plan_id: int = 42, user_id: int = 7) -> SimpleNamespace:
    return SimpleNamespace(
        id=plan_id,
        user_id=user_id,
        plan_title="Mengelola Stres Akademik",
        plan_data={
            "next_check_in": {"timeframe": "3 hari", "method": "chat"},
            "plan_steps": [
                {"title": "Tarik napas", "description": "..."},
                {"title": "Journaling", "description": "..."},
            ],
        },
        total_steps=2,
        completed_steps=0,
        completion_tracking={"completed_steps": []},
        status="active",
        is_active=True,
        last_viewed_at=None,
    )


@pytest.mark.asyncio
async def test_schedule_plan_followup_sets_due_time_and_is_idempotent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services import plan_followup_service as module

    captured: dict = {}

    async def fake_enqueue(db, **kwargs):
        captured.update(kwargs)
        return SimpleNamespace(id=99, next_retry_at=None)

    monkeypatch.setattr(module, "enqueue_action", fake_enqueue)
    # No UserPreferences row -> no quiet-hours adjustment.
    db = MagicMock()
    db.execute = AsyncMock(
        return_value=SimpleNamespace(scalar_one_or_none=lambda: None)
    )
    db.commit = AsyncMock()

    plan = _make_plan()
    action = await module.schedule_plan_followup(db, plan, commit=True)

    assert action is not None
    assert captured["action_type"] == module.AutopilotActionType.plan_followup
    from app.domains.mental_health.services.autopilot_action_service import (
        build_idempotency_key,
    )

    expected_key = build_idempotency_key("plan_followup:7:42")
    assert captured["idempotency_key"] == expected_key
    assert action.next_retry_at is not None
    # "3 hari" from now, with a small tolerance.
    delta = action.next_retry_at - datetime.now(timezone.utc)
    assert timedelta(days=2, hours=23) < delta < timedelta(days=3, hours=1)
    assert db.commit.await_count == 1

    # Idempotency: the enqueue key is derived from (user, plan) — a second
    # call produces the SAME key, so the unique constraint dedupes.
    await module.schedule_plan_followup(db, plan, commit=True)
    assert captured["idempotency_key"] == expected_key


# ============================================================================
# Delivery guardrail matrix
# ============================================================================
def _scripted_db(user=None, plan=None, last_conversation_ts=None, recent_proactive_id=None):
    db = MagicMock()
    results = []

    results.append(
        SimpleNamespace(scalar_one_or_none=lambda: user)  # user select
    )
    results.append(
        SimpleNamespace(scalar_one_or_none=lambda: plan)  # plan select
    )
    results.append(
        SimpleNamespace(scalar=lambda: last_conversation_ts)  # max conversation ts
    )
    results.append(
        SimpleNamespace(scalar_one_or_none=lambda: recent_proactive_id)  # cap check
    )

    async def execute(*_args, **_kwargs):
        return results.pop(0)

    db.execute = execute
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


def _user(consent=True, last_checkin_sent_at=None):
    return SimpleNamespace(
        id=7,
        consent_proactive_chat=consent,
        last_checkin_sent_at=last_checkin_sent_at,
    )


def _active_action():
    return SimpleNamespace(
        id=5,
        payload_json={"user_id": 7, "plan_id": 42, "session_id": "proactive-42"},
        next_retry_at=datetime.now(timezone.utc) - timedelta(days=1),
    )


@pytest.fixture()
def stub_broadcast(monkeypatch: pytest.MonkeyPatch):
    calls = []

    class StubBroadcaster:
        async def broadcast(self, event_type, data, user_id=None):
            calls.append((event_type, data, user_id))
            return 1

    monkeypatch.setattr(
        "app.services.sse_broadcaster.get_broadcaster", lambda: StubBroadcaster()
    )
    return calls


@pytest.mark.agents
async def test_deliver_happy_path_creates_message_and_broadcasts(
    stub_broadcast, monkeypatch: pytest.MonkeyPatch
) -> None:
    plan = _make_plan()
    plan.completed_steps = 1  # 1/2 done
    plan.completion_tracking = {"completed_steps": [0]}
    db = _scripted_db(user=_user(), plan=plan)

    result = await deliver_plan_followup(db, _active_action())

    assert result.get("delivered") is True
    db.add.assert_called_once()
    message = db.add.call_args[0][0]
    assert "Mengelola Stres Akademik" in message.content_redacted
    assert "1/2" in message.content_redacted
    assert "Journaling" in message.content_redacted  # next unfinished step
    assert message.session_id == "proactive-42"
    assert stub_broadcast and stub_broadcast[0][0] == "proactive_message"
    assert stub_broadcast[0][2] == 7


@pytest.mark.agents
@pytest.mark.parametrize(
    "kwargs, expected_reason",
    [
        ({"consent": False}, "consent_not_granted"),
        ({"user": None}, "user_not_found"),
        ({"plan": None}, "plan_inactive"),
    ],
)
async def test_deliver_skip_consent_and_missing_entities(
    stub_broadcast, kwargs, expected_reason
) -> None:
    user = kwargs.get("user", _user(consent=kwargs.get("consent", True)))
    plan = kwargs.get("plan", _make_plan())
    db = _scripted_db(user=user, plan=plan)

    result = await deliver_plan_followup(db, _active_action())
    assert result == {"skipped": expected_reason}
    db.add.assert_not_called()


@pytest.mark.agents
async def test_deliver_skips_completed_plan(stub_broadcast) -> None:
    plan = _make_plan()
    plan.completed_steps = 2  # all done
    db = _scripted_db(user=_user(), plan=plan)

    result = await deliver_plan_followup(db, _active_action())
    assert result == {"skipped": "plan_completed"}


@pytest.mark.agents
async def test_deliver_skips_recently_active_user(stub_broadcast) -> None:
    recent_ts = datetime.now(timezone.utc) - timedelta(hours=2)
    db = _scripted_db(user=_user(), plan=_make_plan(), last_conversation_ts=recent_ts)

    result = await deliver_plan_followup(db, _active_action())
    assert result == {"skipped": "user_recently_active"}


@pytest.mark.agents
async def test_deliver_skips_on_frequency_cap(stub_broadcast) -> None:
    db = _scripted_db(
        user=_user(),
        plan=_make_plan(),
        recent_proactive_id="existing-message-id",
    )

    result = await deliver_plan_followup(db, _active_action())
    assert result == {"skipped": "frequency_cap_proactive"}


@pytest.mark.agents
async def test_deliver_skips_on_recent_email_checkin(stub_broadcast) -> None:
    db = _scripted_db(
        user=_user(last_checkin_sent_at=datetime.now(timezone.utc) - timedelta(hours=4)),
        plan=_make_plan(),
    )

    result = await deliver_plan_followup(db, _active_action())
    assert result == {"skipped": "frequency_cap_checkin"}


@pytest.mark.agents
async def test_deliver_message_template_for_plan_without_steps(stub_broadcast) -> None:
    plan = _make_plan()
    plan.plan_data = {"next_check_in": {"timeframe": "3 hari"}}
    plan.total_steps = 0
    db = _scripted_db(user=_user(), plan=plan)

    result = await deliver_plan_followup(db, _active_action())
    assert result.get("delivered") is True
    message = db.add.call_args[0][0]
    assert "Mengelola Stres Akademik" in message.content_redacted


# ============================================================================
# Policy engine
# ============================================================================
@pytest.mark.agents
def test_policy_engine_allows_plan_followup() -> None:
    from app.domains.mental_health.models.autopilot_actions import AutopilotActionType
    from app.domains.mental_health.services.autopilot_policy_engine import (
        AutopilotPolicyDecision,
        evaluate_action_policy,
    )

    for level in ("none", "low", "moderate", "high", "critical"):
        result = evaluate_action_policy(
            risk_level=level, action_type=AutopilotActionType.plan_followup
        )
        assert result.decision == AutopilotPolicyDecision.allow, level


# ============================================================================
# Proactive-messages routes
# ============================================================================
@pytest.mark.asyncio
async def test_list_pending_returns_only_own_pending() -> None:
    from app.domains.mental_health.routes import proactive_messages as pm

    msg = SimpleNamespace(
        id="11111111-1111-1111-1111-111111111111",
        source=ProactiveMessageSource.plan_followup,
        source_entity_id=42,
        session_id="proactive-42",
        content_redacted="Hai!",
        status=ProactiveMessageStatus.pending,
        created_at=datetime.now(timezone.utc),
        delivered_at=datetime.now(timezone.utc),
    )
    db = MagicMock()
    db.execute = AsyncMock(
        return_value=SimpleNamespace(
            scalars=lambda: SimpleNamespace(all=lambda: [msg])
        )
    )

    user = SimpleNamespace(id=7)
    response = await pm.list_pending_proactive_messages(current_user=user, db=db)  # type: ignore[arg-type]
    assert response["unread_count"] == 1
    assert response["messages"][0]["session_id"] == "proactive-42"


@pytest.mark.asyncio
async def test_mark_read_flips_status_and_stamps_time() -> None:
    from app.domains.mental_health.routes import proactive_messages as pm

    msg = SimpleNamespace(
        id="11111111-1111-1111-1111-111111111111",
        user_id=7,
        status=ProactiveMessageStatus.pending,
        read_at=None,
    )
    db = MagicMock()
    db.execute = AsyncMock(
        return_value=SimpleNamespace(scalar_one_or_none=lambda: msg)
    )
    db.commit = AsyncMock()

    user = SimpleNamespace(id=7)
    response = await pm.mark_proactive_message_read(
        "11111111-1111-1111-1111-111111111111", current_user=user, db=db  # type: ignore[arg-type]
    )
    assert response["success"] is True
    assert msg.status == ProactiveMessageStatus.read
    assert msg.read_at is not None
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_mark_read_rejects_foreign_message() -> None:
    import pytest as _pytest
    from fastapi import HTTPException

    from app.domains.mental_health.routes import proactive_messages as pm

    db = MagicMock()
    db.execute = AsyncMock(
        return_value=SimpleNamespace(scalar_one_or_none=lambda: None)
    )
    user = SimpleNamespace(id=7)
    with _pytest.raises(HTTPException) as exc_info:
        await pm.mark_proactive_message_read(
            "22222222-2222-2222-2222-222222222222", current_user=user, db=db  # type: ignore[arg-type]
        )
    assert exc_info.value.status_code == 404
