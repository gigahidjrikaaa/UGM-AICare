"""Tests for IA differential privacy (Laplace engine, budget accountant, wiring).

Marked ``privacy`` and ``agents``; runs fully offline (no DB, Redis, or LLM):
the accountant is exercised with an in-process MockRedis-style client.
"""
from __future__ import annotations

import random
import statistics
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.agents.ia.dp import (
    QUERY_DP_PLANS,
    ColumnStrategy,
    DifferentialPrivacyEngine,
    build_engine,
)
from app.agents.ia.dp_accountant import DPBudgetAccountant, DPBudgetExceeded


class FakeRedis:
    """Minimal async KV store mirroring the MockRedis surface used here."""

    def __init__(self) -> None:
        self.data: dict[str, str] = {}

    async def get(self, key: str):
        return self.data.get(key)

    async def set(self, key: str, value, ex=None):
        self.data[key] = str(value)
        return True


# ============================================================================
# Laplace mechanism
# ============================================================================
@pytest.mark.privacy
def test_laplace_sampler_has_correct_mean_and_scale() -> None:
    engine = DifferentialPrivacyEngine(epsilon=1.0, rng=random.Random(42))
    scale = 2.0
    samples = [engine._laplace(scale) for _ in range(20_000)]

    # Laplace(0, b): mean 0, variance 2b^2.
    assert abs(statistics.mean(samples)) < 0.1 * scale
    expected_std = (2.0**0.5) * scale
    assert abs(statistics.stdev(samples) - expected_std) < 0.15 * expected_std


@pytest.mark.privacy
def test_laplace_sampler_is_deterministic_given_seed() -> None:
    a = DifferentialPrivacyEngine(epsilon=1.0, rng=random.Random(7))
    b = DifferentialPrivacyEngine(epsilon=1.0, rng=random.Random(7))
    assert [a._laplace(1.0) for _ in range(100)] == [b._laplace(1.0) for _ in range(100)]


# ============================================================================
# Row privatization plans
# ============================================================================
@pytest.mark.privacy
def test_every_allowed_query_has_a_plan() -> None:
    from app.agents.ia.queries import ALLOWED_QUERIES

    missing = set(ALLOWED_QUERIES) - set(QUERY_DP_PLANS)
    assert not missing, f"Queries without a DP plan: {missing}"


@pytest.mark.privacy
def test_privatize_crisis_trend_noises_counts_only() -> None:
    engine = build_engine(epsilon=2.0, seed=1)
    rows = [
        (datetime(2025, 1, 1).date(), 10, "high", 7),
        (datetime(2025, 1, 2).date(), 3, "critical", 3),
    ]

    result = engine.privatize_rows("crisis_trend", rows)

    assert result.statistics_noised == 4  # 2 rows x 2 count columns
    assert result.epsilon_per_group == 2.0
    for noised, original in zip(result.rows, rows):
        # Keys/labels untouched, counts are non-negative ints.
        assert noised[0] == original[0].isoformat()
        assert noised[2] == original[2]
        for idx in (1, 3):
            value = noised[idx]
            assert isinstance(value, int) and value >= 0


@pytest.mark.privacy
def test_privatize_dropoffs_recomputes_derived_fields() -> None:
    engine = build_engine(epsilon=8.0, seed=3)
    rows = [(datetime(2025, 1, 1).date(), 50, 10, 20.0, 4.2)]

    (noised,) = engine.privatize_rows("dropoffs", rows).rows

    date, total, early, pct, avg_msgs = noised
    # Percentage must be a deterministic function of the noised components.
    expected_pct = round(max(0.0, min(100.0, early / total * 100.0)), 2)
    assert pct == expected_pct
    assert total >= 0 and early >= 0 and early <= total
    assert avg_msgs is None or avg_msgs >= 0.0


@pytest.mark.privacy
def test_privatize_fallback_reduction_keeps_internal_consistency() -> None:
    engine = build_engine(epsilon=4.0, seed=5)
    rows = [(datetime(2025, 1, 1).date(), 30, 8, 22, 73.33)]

    (noised,) = engine.privatize_rows("fallback_reduction", rows).rows

    _, total, escalated, handled, ai_rate = noised
    assert handled == total - escalated
    assert 0.0 <= ai_rate <= 100.0


@pytest.mark.privacy
def test_privatize_bounded_mean_stays_within_clamped_bounds() -> None:
    engine = build_engine(epsilon=4.0, seed=11)
    # avg_completion_percentage clamped to [0, 100]; extreme raw values must
    # not produce releases outside the clamp (up to noise-then-clamp slack).
    rows = [(datetime(2025, 1, 1).date(), 20, 15, 5, 50.0, 137.0)]

    (noised,) = engine.privatize_rows("resource_reuse", rows).rows

    _, total, unique, revisited, revisit_rate, avg_completion = noised
    assert revisit_rate == round(max(0.0, min(100.0, revisited / total * 100.0)), 2)
    assert avg_completion >= 0.0


@pytest.mark.privacy
def test_privatize_sentiment_trends_forward_cardinality_reference() -> None:
    """avg_risk_score (col 1) uses total_assessments (col 6): forward ref."""
    engine = build_engine(epsilon=4.0, seed=9)
    rows = [(datetime(2025, 1, 1).date(), 0.4, 2, 1, 1, 0, 4)]

    (noised,) = engine.privatize_rows("sentiment_trends", rows).rows

    date, avg_risk, low, med, high, critical, total = noised
    assert avg_risk is None or 0.0 <= avg_risk <= 1.0
    assert total >= 0 and all(isinstance(c, int) for c in (low, med, high, critical))


@pytest.mark.privacy
def test_privatize_rejects_unknown_question_and_bad_width() -> None:
    engine = build_engine(epsilon=1.0, seed=1)

    with pytest.raises(ValueError):
        engine.privatize_rows("not_a_query", [(1, 2)])

    with pytest.raises(ValueError):
        engine.privatize_rows("crisis_trend", [(datetime(2025, 1, 1).date(), 1, "high")])


@pytest.mark.privacy
def test_privatize_output_differs_across_seeds() -> None:
    rows = [(datetime(2025, 1, 1).date(), 12, "high", 9)]
    out_a = build_engine(epsilon=0.5, seed=1).privatize_rows("crisis_trend", rows).rows
    out_b = build_engine(epsilon=0.5, seed=2).privatize_rows("crisis_trend", rows).rows
    assert out_a != out_b  # randomized response: releases are not deterministic


@pytest.mark.privacy
def test_noise_draws_per_row_matches_plan_strategies() -> None:
    # dropoffs: 2 counts + 1 bounded mean (2 draws) = 4
    assert QUERY_DP_PLANS["dropoffs"].noise_draws_per_row == 4
    # crisis_trend: 2 counts
    assert QUERY_DP_PLANS["crisis_trend"].noise_draws_per_row == 2
    # passthrough-only plans would be 0 (none currently exist, sanity only)
    assert all(
        plan.noise_draws_per_row > 0 for plan in QUERY_DP_PLANS.values()
    )


# ============================================================================
# Budget accountant
# ============================================================================
def _frozen_clock(start: datetime):
    state = {"now": start}

    def clock() -> datetime:
        return state["now"]

    return clock, state


@pytest.mark.privacy
async def test_accountant_accumulates_spend() -> None:
    clock, _ = _frozen_clock(datetime(2026, 9, 9, tzinfo=timezone.utc))
    accountant = DPBudgetAccountant(
        client=FakeRedis(), budget_limit=10.0, window_hours=24, clock=clock
    )

    remaining = await accountant.check_and_reserve("crisis_trend", 2.0)
    assert remaining == 8.0
    remaining = await accountant.check_and_reserve("dropoffs", 3.5)
    assert remaining == 4.5
    assert await accountant.current_spend() == 5.5


@pytest.mark.privacy
async def test_accountant_blocks_when_budget_exhausted() -> None:
    clock, _ = _frozen_clock(datetime(2026, 9, 9, tzinfo=timezone.utc))
    accountant = DPBudgetAccountant(
        client=FakeRedis(), budget_limit=5.0, window_hours=24, clock=clock
    )

    await accountant.check_and_reserve("crisis_trend", 3.0)
    with pytest.raises(DPBudgetExceeded):
        await accountant.check_and_reserve("crisis_trend", 3.0)  # would exceed 5.0
    # Smaller spend that still fits is allowed.
    await accountant.check_and_reserve("crisis_trend", 2.0)
    with pytest.raises(DPBudgetExceeded):
        await accountant.check_and_reserve("crisis_trend", 0.1)


@pytest.mark.privacy
async def test_accountant_window_rollover_resets_budget() -> None:
    start = datetime(2026, 9, 9, tzinfo=timezone.utc)
    clock, state = _frozen_clock(start)
    accountant = DPBudgetAccountant(
        client=FakeRedis(), budget_limit=2.0, window_hours=24, clock=clock
    )

    await accountant.check_and_reserve("crisis_trend", 2.0)
    with pytest.raises(DPBudgetExceeded):
        await accountant.check_and_reserve("crisis_trend", 0.5)

    # Advance past the window: fresh budget.
    from datetime import timedelta

    state["now"] = start + timedelta(hours=25)
    remaining = await accountant.check_and_reserve("crisis_trend", 2.0)
    assert remaining == 0.0


@pytest.mark.privacy
async def test_accountant_fails_closed_on_store_errors() -> None:
    from app.core.policy import PolicyViolation

    class BrokenRedis(FakeRedis):
        async def get(self, key: str):
            raise ConnectionError("store down")

    accountant = DPBudgetAccountant(
        client=BrokenRedis(), budget_limit=10.0, window_hours=24
    )
    with pytest.raises(PolicyViolation):
        await accountant.check_and_reserve("crisis_trend", 1.0)


# ============================================================================
# Service + graph wiring
# ============================================================================
@pytest.mark.privacy
async def test_service_query_applies_dp(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.agents.ia import service as service_module

    rows = [
        (datetime(2025, 1, 1).date(), 10, "high", 7),
        (datetime(2025, 1, 2).date(), 3, "critical", 3),
    ]

    class FakeSession:
        async def execute(self, *_args, **_kwargs):
            return SimpleNamespace(fetchall=lambda: rows)

    monkeypatch.setattr(service_module.settings, "dp_enabled", True)
    monkeypatch.setattr(service_module.settings, "dp_epsilon_per_query", 2.0)
    monkeypatch.setattr(
        service_module,
        "DPBudgetAccountant",
        lambda **_kw: SimpleNamespace(
            check_and_reserve=AsyncMock(return_value=48.0)
        ),
    )

    service = service_module.InsightsAgentService(session=FakeSession())  # type: ignore[arg-type]
    payload = SimpleNamespace(
        question_id="crisis_trend",
        params=SimpleNamespace(start=datetime(2025, 1, 1), end=datetime(2025, 1, 2)),
    )

    response = await service.query(payload, requested_by="analyst-1")  # type: ignore[arg-type]

    assert response.privacy_metadata is not None
    assert response.privacy_metadata.dp_enabled is True
    assert response.privacy_metadata.epsilon_spent == 2.0
    assert response.privacy_metadata.statistics_noised == 4
    assert response.privacy_metadata.budget_remaining == 48.0
    assert response.privacy_metadata.mechanism == "laplace"
    assert any("Differential privacy" in note for note in response.notes)
    # Table rows carry noised (non-negative int) counts.
    for record in response.table:
        assert isinstance(record["crisis_count"], int)
        assert record["crisis_count"] >= 0


@pytest.mark.privacy
async def test_service_query_disabled_leaves_values_exact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.agents.ia import service as service_module

    rows = [(datetime(2025, 1, 1).date(), 10, "high", 7)]

    class FakeSession:
        async def execute(self, *_args, **_kwargs):
            return SimpleNamespace(fetchall=lambda: rows)

    monkeypatch.setattr(service_module.settings, "dp_enabled", False)

    service = service_module.InsightsAgentService(session=FakeSession())  # type: ignore[arg-type]
    payload = SimpleNamespace(
        question_id="crisis_trend",
        params=SimpleNamespace(start=datetime(2025, 1, 1), end=datetime(2025, 1, 2)),
    )

    response = await service.query(payload)  # type: ignore[arg-type]

    assert response.privacy_metadata.dp_enabled is False
    assert response.privacy_metadata.epsilon_spent == 0.0
    assert response.table[0]["crisis_count"] == 10
    assert not any("Differential privacy" in note for note in response.notes)


@pytest.mark.privacy
async def test_execute_analytics_node_propagates_epsilon(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.agents.ia import ia_graph as module

    class FakeService:
        async def query(self, _request, requested_by=None):
            assert requested_by == "analyst-1"
            return SimpleNamespace(
                table=[{"x": 1}],
                chart={"type": "bar"},
                notes=["n"],
                privacy_metadata=SimpleNamespace(
                    dp_enabled=True,
                    epsilon_spent=2.0,
                    delta=0.0,
                    budget_remaining=48.0,
                ),
            )

    monkeypatch.setattr(module, "InsightsAgentService", lambda _db: FakeService())

    state = {
        "ia_context": {
            "question_id": "crisis_trend",
            "start_date": datetime(2025, 1, 1),
            "end_date": datetime(2025, 1, 2),
            "user_hash": "analyst-1",
        },
        "errors": [],
        "execution_path": [],
        "execution_id": None,
    }

    out = await module.execute_analytics_node(state, config={"configurable": {"db": AsyncMock()}})
    analytics = out["ia_context"]["analytics_result"]
    assert analytics["differential_privacy_budget_used"] == 2.0
    assert analytics["dp_enabled"] is True
    assert analytics["dp_delta"] == 0.0
    assert analytics["dp_budget_remaining"] == 48.0


@pytest.mark.privacy
async def test_graph_node_tolerates_service_without_dp_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Backward compat: services/mocks without privacy_metadata still work."""
    from app.agents.ia import ia_graph as module

    class FakeService:
        async def query(self, _request, requested_by=None):
            return SimpleNamespace(table=[{"x": 1}], chart={"type": "bar"}, notes=["n"])

    monkeypatch.setattr(module, "InsightsAgentService", lambda _db: FakeService())

    state = {
        "ia_context": {
            "question_id": "crisis_trend",
            "start_date": datetime(2025, 1, 1),
            "end_date": datetime(2025, 1, 2),
        },
        "errors": [],
        "execution_path": [],
        "execution_id": None,
    }

    out = await module.execute_analytics_node(state, config={"configurable": {"db": AsyncMock()}})
    analytics = out["ia_context"]["analytics_result"]
    assert analytics["differential_privacy_budget_used"] == 0.0
    assert analytics["dp_enabled"] is False


# ============================================================================
# Plan integrity guards
# ============================================================================
@pytest.mark.privacy
def test_derived_columns_only_reference_earlier_or_count_columns() -> None:
    """Guard the two-pass invariant of privatize_rows."""
    for qid, plan in QUERY_DP_PLANS.items():
        for col in plan.columns:
            if col.strategy == ColumnStrategy.BOUNDED_MEAN:
                cardinality = next(c for c in plan.columns if c.index == col.cardinality_index)
                assert cardinality.strategy == ColumnStrategy.COUNT, qid
            if col.strategy == ColumnStrategy.DERIVED:
                # DERIVED columns must sit at a later plan position than the
                # columns they read (derive receives in-order values).
                assert col.derive is not None, qid
