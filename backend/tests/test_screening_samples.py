"""Phase 1 (JITAI) unit tests: screening samples + self-report mapping."""
from __future__ import annotations

import pytest

from app.domains.mental_health.screening.engine import (
    DimensionScore,
    ScreeningDimension,
    ScreeningProfile,
    build_dimension_samples,
)
from app.services.self_report_service import build_self_report_samples


@pytest.mark.unit
def test_build_dimension_samples_maps_profile_dimensions() -> None:
    profile = ScreeningProfile(user_id=1)
    profile.dimension_scores["depression"] = DimensionScore(
        dimension=ScreeningDimension.DEPRESSION,
        current_score=0.5,
        protective_score=0.2,
        instrument="PHQ-9",
    )
    profile.dimension_scores["anxiety"] = DimensionScore(
        dimension=ScreeningDimension.ANXIETY,
        current_score=0.4,
        protective_score=0.0,
        instrument="GAD-7",
    )

    samples = build_dimension_samples(
        user_id=7,
        profile=profile,
        source="conversation",
        source_entity_id="conv-123",
        confidence=0.8,
    )

    assert len(samples) == 2
    by_dim = {s.dimension: s for s in samples}

    dep = by_dim["depression"]
    assert dep.user_id == 7
    assert abs(dep.net_score - (0.5 - 0.2 * 0.5)) < 1e-9
    assert dep.current_score == 0.5
    assert dep.protective_score == 0.2
    assert dep.instrument == "PHQ-9"
    assert dep.normalized_score == 0.5
    assert dep.source == "conversation"
    assert dep.source_entity_id == "conv-123"
    assert dep.confidence == 0.8

    anx = by_dim["anxiety"]
    assert abs(anx.net_score - 0.4) < 1e-9


@pytest.mark.unit
def test_build_dimension_samples_net_score_never_negative() -> None:
    profile = ScreeningProfile(user_id=1)
    profile.dimension_scores["anxiety"] = DimensionScore(
        dimension=ScreeningDimension.ANXIETY,
        current_score=0.1,
        protective_score=1.0,
    )
    (sample,) = build_dimension_samples(user_id=1, profile=profile)
    assert sample.net_score == 0.0


@pytest.mark.unit
def test_self_report_maps_to_dimensions_and_flags_positive() -> None:
    samples, result = build_self_report_samples(user_id=3, phq2=[1, 2], gad2=[0, 0])

    by_dim = {s.dimension: s for s in samples}
    assert set(by_dim) == {"depression", "anxiety"}

    dep = by_dim["depression"]
    assert dep.instrument == "PHQ-2"
    assert dep.raw_score == 3.0
    assert dep.max_score == 6.0
    assert abs(dep.normalized_score - 0.5) < 1e-9
    assert dep.source == "self_report"
    assert dep.confidence == 1.0

    assert result["phq2"]["raw"] == 3
    assert result["phq2"]["positive"] is True
    assert result["gad2"]["raw"] == 0
    assert result["gad2"]["positive"] is False
    assert result["positive_screen"] is True
    assert result["recommendation"] == "full_assessment"


@pytest.mark.unit
def test_self_report_negative_screen() -> None:
    samples, result = build_self_report_samples(user_id=3, phq2=[0, 1], gad2=[1, 0])
    assert result["positive_screen"] is False
    assert result["recommendation"] == "none"
    assert len(samples) == 2


@pytest.mark.unit
def test_self_report_requires_valid_input() -> None:
    with pytest.raises(ValueError):
        build_self_report_samples(user_id=1, phq2=[1])  # wrong item count
    with pytest.raises(ValueError):
        build_self_report_samples(user_id=1, phq2=[4, 0])  # out of range
    with pytest.raises(ValueError):
        build_self_report_samples(user_id=1)  # nothing provided


@pytest.mark.unit
def test_self_report_single_scale_only() -> None:
    samples, result = build_self_report_samples(user_id=9, gad2=[2, 2])
    assert len(samples) == 1
    assert samples[0].dimension == "anxiety"
    assert "phq2" not in result
    assert result["gad2"]["raw"] == 4
    assert result["positive_screen"] is True
