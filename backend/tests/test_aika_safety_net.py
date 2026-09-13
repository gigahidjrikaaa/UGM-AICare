"""Phase 1 safety-net tests: canonical crisis lexicon, rate-limit fallback,
smalltalk gate defense, and the crisis-resources tool contract."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.agents.shared.crisis_lexicon import (
    CRISIS_KEYWORDS,
    detect_crisis_keywords,
    has_crisis_signal,
    render_keywords_for_prompt,
)


# ============================================================================
# Canonical crisis lexicon
# ============================================================================
@pytest.mark.security
class TestCrisisLexicon:
    def test_detects_hanging_phrase_id(self) -> None:
        assert has_crisis_signal("kepikiran gantung diri terus")

    def test_detects_cutting_en(self) -> None:
        assert has_crisis_signal("I want to keep cutting myself")

    def test_detects_jumping_id(self) -> None:
        assert has_crisis_signal("loncat dari gedung kayaknya lega")
        assert has_crisis_signal("meloncat dari gedung")  # substring inside meloncat

    def test_detects_wanna_die_pattern(self) -> None:
        assert has_crisis_signal("some days I just wanna die")
        assert has_crisis_signal("aku pengen mati aja")

    def test_detects_method_patterns_en(self) -> None:
        assert has_crisis_signal("I want to die tonight")
        assert has_crisis_signal("I can't take this anymore")

    def test_no_false_positive_on_benign_text(self) -> None:
        benign = [
            "halo apa kabar?",
            "aku sedih karena nilai ujianku jelek",
            "aku capek kuliah banget",
            "kucingku kemarin mati, aku sedih banget",  # pet death, not self-directed
            "terima kasih banyak ya",
        ]
        for text in benign:
            assert not has_crisis_signal(text), f"false positive on: {text}"

    def test_constants_alias_matches_canonical_registry(self) -> None:
        from app.agents.aika.constants import CRISIS_KEYWORDS as ALIASED

        assert ALIASED is CRISIS_KEYWORDS

    def test_detect_returns_matched_signals(self) -> None:
        assert detect_crisis_keywords("aku mau bunuh diri") == ["bunuh diri"]
        hits = detect_crisis_keywords("aku mau mati aja")
        assert "mau mati" in hits and "mati aja" in hits
        assert any(h.startswith("pattern:") for h in hits)

    def test_prompt_sample_includes_new_vocabulary(self) -> None:
        sample = render_keywords_for_prompt()
        assert "gantung diri" in sample
        assert "cutting myself" in sample


# ============================================================================
# STA prescreen uses the canonical lexicon
# ============================================================================
@pytest.mark.agents
async def test_sta_rule_classifier_escalates_hanging_phrase() -> None:
    from app.agents.sta.classifiers import SafetyTriageClassifier
    from app.agents.sta.schemas import STAClassifyRequest

    result = await SafetyTriageClassifier().classify(
        STAClassifyRequest(session_id="sess-test", text="kepikiran gantung diri")
    )
    assert int(result.risk_level) == 3
    assert result.handoff is True


# ============================================================================
# Rate-limit fallback fail-safety (the quota crisis black hole)
# ============================================================================
@pytest.mark.agents
class TestRateLimitFallback:
    def test_without_crisis_signals_returns_busy_response(self) -> None:
        from app.agents.aika.decision_node import _build_rate_limit_fallback

        patch = _build_rate_limit_fallback("429 RESOURCE_EXHAUSTED", [])
        assert patch["immediate_risk_level"] == "none"
        assert patch["needs_agents"] is False
        assert patch["fallback_type"] == "rate_limit"

    def test_with_crisis_signals_escalates_instead_of_busy(self) -> None:
        from app.agents.aika.decision_node import _build_rate_limit_fallback

        patch = _build_rate_limit_fallback(
            "429 RESOURCE_EXHAUSTED", ["bunuh diri"]
        )
        assert patch["immediate_risk_level"] == "high"
        assert patch["needs_agents"] is True
        assert patch["next_step"] == "cma"
        assert patch["intent"] == "crisis_intervention"
        # The user sees the crisis holding line, not "system busy".
        assert patch["aika_direct_response"] != (
            "Maaf ya, saat ini aku sedang melayani banyak teman-teman lain. "
            "Boleh coba kirim pesan lagi dalam 1 menit? "
            "Kalau kamu butuh bantuan darurat, jangan ragu hubungi Crisis Centre UGM."
        )

    def test_fallback_defaults_to_no_hits(self) -> None:
        from app.agents.aika.decision_node import _build_rate_limit_fallback

        patch = _build_rate_limit_fallback("boom")
        assert patch["immediate_risk_level"] == "none"


# ============================================================================
# Smalltalk gate defense
# ============================================================================
@pytest.mark.agents
class TestSmalltalkGateDefense:
    def test_plain_smalltalk_allowed(self) -> None:
        from app.agents.aika.decision_node import _smalltalk_blocked_by_crisis

        blocked, hits = _smalltalk_blocked_by_crisis("iya", [])
        assert blocked is False
        assert hits == []

    def test_smalltalk_blocked_by_crisis_history(self) -> None:
        from app.agents.aika.decision_node import _smalltalk_blocked_by_crisis

        history = [
            {"role": "user", "content": "Aku mau bunuh diri"},
            {"role": "assistant", "content": "Aku dengar kamu..."},
        ]
        blocked, hits = _smalltalk_blocked_by_crisis("iya", history)
        assert blocked is True
        assert any("bunuh diri" in h for h in hits)

    def test_crisis_message_is_blocked_even_if_smalltalk_like(self) -> None:
        from app.agents.aika.decision_node import _smalltalk_blocked_by_crisis

        # "oke" would be smalltalk, but the message contains a crisis word.
        blocked, _ = _smalltalk_blocked_by_crisis("oke deh mau gantung diri", [])
        assert blocked is True

    def test_history_tail_only_scanned(self) -> None:
        from app.agents.aika.decision_node import _smalltalk_blocked_by_crisis

        # Crisis mention deep outside the 6-message tail must not block.
        history = [{"role": "user", "content": f"turn {i}"} for i in range(20)]
        history[0] = {"role": "user", "content": "aku mau bunuh diri dulu"}
        blocked, _ = _smalltalk_blocked_by_crisis("halo", history)
        assert blocked is False


# ============================================================================
# Crisis resources tool contract
# ============================================================================
@pytest.mark.agents
async def test_get_crisis_resources_serves_static_list_on_empty_db() -> None:
    from app.agents.shared.tools.safety_tools import get_crisis_resources

    db = MagicMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=lambda: MagicMock(all=lambda: []))
    )

    result = await get_crisis_resources(db=db)

    assert result["success"] is True
    assert result["total_resources"] >= 3
    titles = {r["title"] for r in result["resources"]}
    assert any("SEJIWA" in t or "119" in t for t in titles)


@pytest.mark.agents
async def test_get_crisis_resources_survives_db_error() -> None:
    from app.agents.shared.tools.safety_tools import get_crisis_resources

    db = MagicMock()
    db.execute = AsyncMock(side_effect=RuntimeError("db down"))

    result = await get_crisis_resources(db=db)

    assert result["success"] is True
    assert result["total_resources"] >= 3
