"""Phase 4 (JITAI) unit tests: adaptive selector + experiment bucketing."""
from __future__ import annotations

import random

import pytest

from app.services.adaptive_selection_service import (
    _merge_priors,
    activity_id_from_key,
    candidate_activities,
)
from app.services.adaptive_selector import bucketed_arm, select_activity


@pytest.mark.unit
def test_bucketed_arm_is_deterministic_and_valid() -> None:
    arms = ("control", "adaptive")
    first = bucketed_arm(12345, "exp_v1", arms)
    assert first == bucketed_arm(12345, "exp_v1", arms)
    assert first in arms


@pytest.mark.unit
def test_bucketed_arm_distributes_across_arms() -> None:
    arms = ("control", "adaptive")
    seen = {bucketed_arm(uid, "exp_v1", arms) for uid in range(200)}
    assert seen == set(arms)


@pytest.mark.unit
def test_select_activity_explores_when_forced() -> None:
    selection = select_activity(
        ["a", "b", "c"], {}, exploration_rate=1.0, rng=random.Random(0)
    )
    assert selection.method == "explore"
    assert selection.activity_id in {"a", "b", "c"}


@pytest.mark.unit
def test_select_activity_prefers_high_posterior() -> None:
    posteriors = {"a": (20.0, 1.0), "b": (1.0, 20.0)}
    selection = select_activity(
        ["a", "b"], posteriors, exploration_rate=0.0, rng=random.Random(7)
    )
    assert selection.activity_id == "a"
    assert selection.method == "adaptive"


@pytest.mark.unit
def test_select_activity_cold_start_without_data() -> None:
    selection = select_activity(
        ["a", "b"], {}, exploration_rate=0.0, rng=random.Random(1)
    )
    assert selection.method == "cold_start"
    assert selection.activity_id in {"a", "b"}


@pytest.mark.unit
def test_select_activity_empty_candidates() -> None:
    selection = select_activity([], {}, exploration_rate=0.0)
    assert selection.activity_id is None
    assert selection.method == "cold_start"


@pytest.mark.unit
def test_activity_id_from_key() -> None:
    assert activity_id_from_key("activity:box-breathing") == "box-breathing"
    assert activity_id_from_key("plan_type:cbt") is None
    assert activity_id_from_key(None) is None


@pytest.mark.unit
def test_merge_priors_blends_population_and_user() -> None:
    merged = _merge_priors({"a": (3.0, 1.0)}, {"a": (1.0, 0.0)})
    assert merged["a"] == (5.0, 2.0)
    # An activity only seen in the population still gets the Beta(1,1) prior.
    merged2 = _merge_priors({"b": (0.0, 2.0)}, {})
    assert merged2["b"] == (1.0, 3.0)


@pytest.mark.unit
def test_candidate_activities_filters_by_dimension() -> None:
    all_ids = candidate_activities()
    assert "box-breathing" in all_ids
    sleep_ids = candidate_activities(["sleep"])
    assert sleep_ids == ["four-seven-eight"]
