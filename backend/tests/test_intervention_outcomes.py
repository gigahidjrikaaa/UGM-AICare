"""Phase 2 (JITAI) unit tests: targeting + outcome computation."""
from __future__ import annotations

import pytest

from app.services.intervention_outcome_service import compute_outcome
from app.services.intervention_targeting import (
    derive_intervention_key,
    derive_target_dimensions,
    dimensions_for_activity,
    primary_activity_id,
)


@pytest.mark.unit
def test_primary_activity_id_extracts_first_activity() -> None:
    plan_data = {
        "resource_cards": [
            {"resource_type": "link", "url": "https://x"},
            {"resource_type": "activity", "activity_id": "box-breathing"},
            {"resource_type": "activity", "activity_id": "four-seven-eight"},
        ]
    }
    assert primary_activity_id(plan_data) == "box-breathing"
    assert primary_activity_id({"resource_cards": []}) is None
    assert primary_activity_id(None) is None


@pytest.mark.unit
def test_dimensions_for_activity_maps_tags() -> None:
    dims = dimensions_for_activity("box-breathing")
    assert "anxiety" in dims
    assert "stress" in dims
    # Unknown / missing activities map to nothing.
    assert dimensions_for_activity("does-not-exist") == []
    assert dimensions_for_activity(None) == []


@pytest.mark.unit
def test_derive_target_dimensions_prefers_activity_then_concerns_then_default() -> None:
    plan_data = {"resource_cards": [{"resource_type": "activity", "activity_id": "four-seven-eight"}]}
    # four-seven-eight tags: sleep, relaxation, anxiety, calming, insomnia -> sleep, anxiety
    assert derive_target_dimensions(plan_data, ["depression"]) == ["sleep", "anxiety"]

    # No activity -> fall back to primary concerns.
    assert derive_target_dimensions({}, ["depression", "social"]) == ["depression", "social"]

    # Nothing to go on -> defaults.
    assert derive_target_dimensions({}, []) == ["anxiety", "depression"]


@pytest.mark.unit
def test_derive_intervention_key() -> None:
    assert derive_intervention_key({}, "box-breathing", 5) == "activity:box-breathing"
    assert derive_intervention_key({"intervention_type": "cbt"}, None, 5) == "plan_type:cbt"
    assert derive_intervention_key({}, None, 5) == "plan:5"


@pytest.mark.unit
def test_compute_outcome_improved_and_unchanged() -> None:
    baseline = {"anxiety": {"net": 0.6}, "depression": {"net": 0.5}}
    post = {"anxiety": {"net": 0.3}, "depression": {"net": 0.52}}

    outcome, label = compute_outcome(baseline, post)

    assert label == "improved"
    assert outcome["anxiety"]["direction"] == "improved"
    assert outcome["anxiety"]["delta"] == pytest.approx(0.3, abs=1e-6)
    # 0.5 -> 0.52 is within the change threshold => unchanged.
    assert outcome["depression"]["direction"] == "unchanged"


@pytest.mark.unit
def test_compute_outcome_worsened() -> None:
    baseline = {"anxiety": {"net": 0.2}}
    post = {"anxiety": {"net": 0.6}}
    outcome, label = compute_outcome(baseline, post)
    assert label == "worsened"
    assert outcome["anxiety"]["direction"] == "worsened"


@pytest.mark.unit
def test_compute_outcome_missing_data_is_unchanged() -> None:
    outcome, label = compute_outcome({}, {"anxiety": {"net": 0.4}})
    assert outcome == {}
    assert label == "unchanged"

    # A dimension present only in post is ignored.
    outcome, label = compute_outcome({"anxiety": {"net": 0.5}}, {})
    assert outcome == {}
    assert label == "unchanged"
