"""Phase 3 (JITAI) unit tests: effectiveness aggregation + DP plan."""
from __future__ import annotations

import pytest

from app.agents.ia.dp import build_engine
from app.services.intervention_effectiveness_service import (
    AssignmentOutcome,
    _mean_delta,
    aggregate_outcomes,
    build_user_insights,
)


@pytest.mark.unit
def test_mean_delta_averages_dimension_deltas() -> None:
    outcome = {"anxiety": {"delta": 0.4}, "depression": {"delta": 0.2}}
    assert _mean_delta(outcome) == pytest.approx(0.3)
    assert _mean_delta({}) is None
    assert _mean_delta(None) is None


@pytest.mark.unit
def test_aggregate_outcomes_groups_and_counts() -> None:
    items = [
        AssignmentOutcome("activity:box-breathing", "improved", 0.3),
        AssignmentOutcome("activity:box-breathing", "improved", 0.2),
        AssignmentOutcome("activity:box-breathing", "worsened", -0.4),
        AssignmentOutcome("activity:box-breathing", "unchanged", 0.02),
        AssignmentOutcome("plan_type:cbt", "improved", 0.15),
    ]
    rows = aggregate_outcomes(items)
    by_key = {r["intervention_key"]: r for r in rows}

    box = by_key["activity:box-breathing"]
    assert box["n"] == 4
    assert box["improved"] == 2
    assert box["worsened"] == 1
    assert box["unchanged"] == 1
    assert box["mcid_met"] == 2  # 0.3 and 0.2 meet the 0.10 MCID threshold
    assert box["mean_improvement_magnitude"] == pytest.approx((0.3 + 0.2 + 0.0 + 0.02) / 4, abs=1e-6)

    cbt = by_key["plan_type:cbt"]
    assert cbt["n"] == 1
    assert cbt["improved"] == 1
    assert cbt["mcid_met"] == 1

    # Sorted by n desc.
    assert rows[0]["intervention_key"] == "activity:box-breathing"


@pytest.mark.unit
def test_aggregate_outcomes_handles_missing_delta() -> None:
    rows = aggregate_outcomes([AssignmentOutcome("k", "unchanged", None)])
    assert rows[0]["n"] == 1
    assert rows[0]["mcid_met"] == 0
    assert rows[0]["mean_improvement_magnitude"] == 0.0


@pytest.mark.unit
def test_intervention_effectiveness_dp_plan_releases_expected_shape() -> None:
    engine = build_engine(epsilon=2.0, seed=42)
    raw = [
        # key, n, improved, worsened, (unchanged derived), mcid_met, rates..., mean_magnitude
        ("activity:box-breathing", 12, 8, 1, None, 6, None, None, None, 0.3),
    ]
    result = engine.privatize_rows("intervention_effectiveness", raw)
    assert len(result.rows) == 1
    row = result.rows[0]
    assert len(row) == 10
    assert row[0] == "activity:box-breathing"
    assert row[1] >= 0  # noisy n, clamped
    assert 0.0 <= row[6] <= 100.0  # improvement_rate
    assert 0.0 <= row[8] <= 100.0  # mcid_rate
    assert 0.0 <= row[9] <= 1.0    # bounded mean


@pytest.mark.unit
def test_build_user_insights_orders_by_improvement_rate() -> None:
    items = [
        AssignmentOutcome("activity:box-breathing", "improved", 0.2),
        AssignmentOutcome("activity:box-breathing", "improved", 0.3),
        AssignmentOutcome("activity:four-seven-eight", "worsened", -0.2),
    ]
    insights = build_user_insights(items)
    assert insights[0]["intervention_key"] == "activity:box-breathing"
    assert insights[0]["n"] == 2
    assert insights[0]["improvement_rate"] == 100.0
    assert insights[1]["intervention_key"] == "activity:four-seven-eight"
    assert insights[1]["improvement_rate"] == 0.0
