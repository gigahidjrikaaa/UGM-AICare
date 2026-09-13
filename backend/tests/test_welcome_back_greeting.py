"""Tests for the welcome-back greeting ("continue where you left off")."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.welcome_back_service import (
    DEFAULT_GREETING,
    _passes_greeting_guardrails,
    _time_ago_id,
    build_welcome_greeting,
)


NOW = datetime(2026, 9, 10, 11, 0, tzinfo=timezone.utc)


# ============================================================================
# Time-ago helper
# ============================================================================
class TestTimeAgo:
    def test_same_day(self) -> None:
        assert (
            _time_ago_id(datetime(2026, 9, 10, 8, 0, tzinfo=timezone.utc), NOW)
            == "tadi"
        )

    def test_yesterday(self) -> None:
        assert (
            _time_ago_id(datetime(2026, 9, 9, 8, 0, tzinfo=timezone.utc), NOW)
            == "kemarin"
        )

    def test_days_ago(self) -> None:
        assert (
            _time_ago_id(datetime(2026, 9, 6, 8, 0, tzinfo=timezone.utc), NOW)
            == "4 hari lalu"
        )

    def test_naive_datetime_treated_as_utc(self) -> None:
        assert _time_ago_id(datetime(2026, 9, 10, 5, 0), NOW) == "tadi"


# ============================================================================
# Guardrails
# ============================================================================
class TestGuardrails:
    def test_rejects_short_output(self) -> None:
        assert _passes_greeting_guardrails("Hai.") is False

    def test_rejects_overlong_output(self) -> None:
        assert _passes_greeting_guardrails("x" * 600) is False

    def test_rejects_clinical_or_surveillance_language(self) -> None:
        assert _passes_greeting_guardrails("Halo! Sistem mendeteksi kamu sedang cemas ya.") is False
        assert _passes_greeting_guardrails("Halo! Diagnosis kamu sepertinya benar.") is False

    def test_accepts_warm_casual_output(self) -> None:
        assert (
            _passes_greeting_guardrails(
                "Halo Budi! Kemarin kita ngobrol soal tugas. Gimana sekarang?"
            )
            is True
        )


# ============================================================================
# build_welcome_greeting matrix (db mocked per query order)
# ============================================================================
def _scripted_db(summary_text=None, assessment=None):
    db = MagicMock()

    results = [
        SimpleNamespace(scalar_one_or_none=lambda: summary_text),  # UserSummary
        SimpleNamespace(scalar_one_or_none=lambda: assessment),  # latest risk assessment
    ]

    async def execute(*_args, **_kwargs):
        return results.pop(0)

    db.execute = execute
    return db


def _user(name="Budi", user_id=7):
    return SimpleNamespace(id=user_id, preferred_name=name, first_name=None)


def _assessment(risk="moderate", concerns=("tugas kuliah",), created_at=None):
    return SimpleNamespace(
        overall_risk_level=risk,
        concerns=list(concerns),
        created_at=created_at or (datetime.now(timezone.utc) - timedelta(days=1)),
    )


@pytest.fixture()
def empty_cache(monkeypatch: pytest.MonkeyPatch):
    store: dict[str, str] = {}

    class FakeCache:
        async def get(self, key):
            return store.get(key)

        async def set(self, key, value, ttl=None):
            store[key] = value

    monkeypatch.setattr(
        "app.services.welcome_back_service.get_cache_service", lambda: FakeCache()
    )
    return store


@pytest.mark.asyncio
async def test_no_history_returns_default_greeting_without_llm(
    empty_cache, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import welcome_back_service as module

    async def boom(**_kwargs):  # must never be called
        raise AssertionError("LLM must not be called for users without history")

    monkeypatch.setattr(module, "generate_response", boom)
    db = _scripted_db(summary_text=None, assessment=None)

    result = await build_welcome_greeting(db, _user())
    assert result["source"] == "default"
    # The default greeting is name-aware but carries no clinical content.
    assert "Budi" in result["text"]
    assert "💙" in result["text"]


@pytest.mark.asyncio
async def test_high_risk_skips_llm_and_includes_hotline(
    empty_cache, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import welcome_back_service as module

    async def boom(**_kwargs):
        raise AssertionError("LLM must not be called for high/critical risk")

    monkeypatch.setattr(module, "generate_response", boom)
    db = _scripted_db(
        summary_text="User cerita tentang beban kuliah.",
        assessment=_assessment(risk="high"),
    )

    result = await build_welcome_greeting(db, _user())
    assert result["source"] == "crisis_gentle"
    assert "119" in result["text"]
    # No clinical labels in crisis-gentle wording.
    assert "risiko" not in result["text"].lower()


@pytest.mark.asyncio
async def test_llm_success_path_is_cached(
    empty_cache, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import welcome_back_service as module

    calls = {"n": 0}

    async def fake_llm(**_kwargs):
        calls["n"] += 1
        return "Halo Budi! Kemarin kita ngobrol soal tugas kuliah yang menumpuk. Gimana sekarang, udah mulai lega?"

    monkeypatch.setattr(module, "generate_response", fake_llm)
    # Fixed timestamp: the cache marker derives from the assessment time.
    fixed_ts = datetime.now(timezone.utc) - timedelta(days=1)
    db = _scripted_db(
        summary_text="User cerita soal tugas.",
        assessment=_assessment(risk="low", created_at=fixed_ts),
    )

    first = await build_welcome_greeting(db, _user())
    assert first["source"] == "personalized"
    assert calls["n"] == 1

    # Second call within TTL hits the cache: no additional LLM call.
    db2 = _scripted_db(
        summary_text="User cerita soal tugas.",
        assessment=_assessment(risk="low", created_at=fixed_ts),
    )
    second = await build_welcome_greeting(db2, _user())
    assert second["text"] == first["text"]
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_llm_error_falls_back_to_concern_template(
    empty_cache, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import welcome_back_service as module

    async def fake_llm(**_kwargs):
        return "Error: All Gemini models are currently unavailable."

    monkeypatch.setattr(module, "generate_response", fake_llm)
    db = _scripted_db(
        summary_text=None,
        assessment=_assessment(
            risk="moderate",
            concerns=("tugas kuliah",),
            created_at=datetime.now(timezone.utc) - timedelta(days=4),
        ),
    )

    result = await build_welcome_greeting(db, _user())
    assert result["source"] == "template"
    assert "tugas kuliah" in result["text"]
    assert "hari lalu" in result["text"]  # humanized recency


@pytest.mark.asyncio
async def test_llm_guardrail_violation_falls_back(
    empty_cache, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import welcome_back_service as module

    async def fake_llm(**_kwargs):
        return "Halo! Sistem mendeteksi tingkat risiko kamu meningkat ya."

    monkeypatch.setattr(module, "generate_response", fake_llm)
    db = _scripted_db(
        summary_text="User cerita soal tugas.",
        assessment=_assessment(risk="low", concerns=("tugas kuliah",)),
    )

    result = await build_welcome_greeting(db, _user())
    assert result["source"] in {"template", "default"}
    assert "sistem mendeteksi" not in result["text"]


@pytest.mark.asyncio
async def test_summary_only_uses_summary_template(
    empty_cache, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import welcome_back_service as module

    async def fake_llm(**_kwargs):
        return None  # generation unavailable

    monkeypatch.setattr(module, "generate_response", fake_llm)
    db = _scripted_db(
        summary_text="User sedang mempersiapkan sidang skripsi.",
        assessment=None,
    )

    result = await build_welcome_greeting(db, _user())
    assert result["source"] == "template"
    assert "sidang skripsi" in result["text"]


# ============================================================================
# Route
# ============================================================================
@pytest.mark.asyncio
async def test_greeting_route_returns_service_payload() -> None:
    from app.domains.mental_health.routes import chat as chat_module

    async def fake_build(db, user):
        return {
            "text": "Halo Budi!",
            "source": "personalized",
            "based_on": {"risk_level": None, "top_concern": "tugas kuliah"},
        }

    monkey = pytest.MonkeyPatch()
    monkey.setattr(
        "app.services.welcome_back_service.build_welcome_greeting", fake_build
    )
    try:
        result = await chat_module.get_welcome_greeting(
            db=MagicMock(), current_user=_user()
        )
    finally:
        monkey.undo()
    assert result["text"] == "Halo Budi!"
    assert result["based_on"]["top_concern"] == "tugas kuliah"


@pytest.mark.asyncio
async def test_greeting_route_never_fails_chat_open() -> None:
    from app.domains.mental_health.routes import chat as chat_module

    async def explode(db, user):
        raise RuntimeError("db down")

    monkey = pytest.MonkeyPatch()
    monkey.setattr(
        "app.services.welcome_back_service.build_welcome_greeting", explode
    )
    try:
        result = await chat_module.get_welcome_greeting(
            db=MagicMock(), current_user=_user()
        )
    finally:
        monkey.undo()
    assert result["source"] == "default"
    assert result["text"]
