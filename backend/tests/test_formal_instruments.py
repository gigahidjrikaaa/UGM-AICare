"""Formal instrument (PHQ-9 / GAD-7) unit tests: scoring, bands, crisis flag,
and the screening-profile integration."""
from __future__ import annotations

from datetime import datetime

import pytest

from app.domains.mental_health.screening.engine import (
    IndicatorSeverity,
    ScreeningProfile,
)
from app.domains.mental_health.screening.formal_instruments import (
    GAD7,
    PHQ9,
    get_instrument,
    list_instruments,
    score_responses,
)
from app.services.formal_instrument_service import _apply_to_profile


@pytest.mark.unit
def test_instrument_shape() -> None:
    assert PHQ9.max_score == 27
    assert len(PHQ9.items) == 9
    assert GAD7.max_score == 21
    assert len(GAD7.items) == 7
    codes = {instrument.code for instrument in list_instruments()}
    assert codes == {"PHQ-9", "GAD-7"}
    assert get_instrument("phq-9").code == "PHQ-9"


@pytest.mark.unit
def test_phq9_bands() -> None:
    cases = {
        0: "minimal",
        4: "minimal",
        5: "mild",
        9: "mild",
        10: "moderate",
        14: "moderate",
        15: "moderately_severe",
        19: "moderately_severe",
        20: "severe",
        27: "severe",
    }
    for total, expected_band in cases.items():
        # Spread the total across 9 items so each individual answer stays in 0-3.
        responses = [0] * 9
        remaining = total
        for index in range(9):
            take = min(3, remaining)
            responses[index] = take
            remaining -= take
        assert remaining == 0
        scored = score_responses(PHQ9, responses)
        assert scored["total"] == total
        assert scored["band"].band == expected_band, f"total {total}"


@pytest.mark.unit
def test_gad7_bands() -> None:
    assert score_responses(GAD7, [0] * 7)["band"].band == "minimal"
    assert score_responses(GAD7, [1] * 7)["band"].band == "mild"
    assert score_responses(GAD7, [2] * 7)["band"].band == "moderate"
    assert score_responses(GAD7, [3] * 7)["band"].band == "severe"


@pytest.mark.unit
def test_crisis_gateway_item() -> None:
    # PHQ-9 item 9 non-zero flags crisis even at a minimal total.
    responses = [0] * 9
    responses[8] = 1
    scored = score_responses(PHQ9, responses)
    assert scored["total"] == 1
    assert scored["band"].band == "minimal"
    assert scored["crisis_flag"] is True
    assert scored["crisis_item_indices"] == [8]

    # Zero everywhere → no flag.
    assert score_responses(PHQ9, [0] * 9)["crisis_flag"] is False

    # GAD-7 has no crisis item.
    assert score_responses(GAD7, [3] * 7)["crisis_flag"] is False


@pytest.mark.unit
def test_validation_errors() -> None:
    with pytest.raises(ValueError):
        score_responses(PHQ9, [0] * 8)  # too few
    with pytest.raises(ValueError):
        score_responses(PHQ9, [0] * 10)  # too many
    with pytest.raises(ValueError):
        score_responses(PHQ9, [4] + [0] * 8)  # out of range
    with pytest.raises(ValueError):
        score_responses(PHQ9, [-1] + [0] * 8)  # negative
    with pytest.raises(ValueError):
        score_responses(PHQ9, ["x"] + [0] * 8)  # non-integer
    with pytest.raises(KeyError):
        get_instrument("PHQ-5")


@pytest.mark.unit
def test_normalized_score_matches_engine_scale() -> None:
    scored = score_responses(PHQ9, [2] * 9)  # 18/27
    assert scored["normalized"] == round(18 / 27, 4)


def _make_profile() -> ScreeningProfile:
    return ScreeningProfile(user_id=1)


def test_apply_to_profile_sets_dimension_and_floor() -> None:
    profile = _make_profile()
    _apply_to_profile(
        profile,
        instrument=PHQ9,
        normalized=round(18 / 27, 4),
        band_key="moderately_severe",
        band_label="Sedang–Berat",
    )

    dim = profile.dimension_scores["depression"]
    assert dim.instrument == "PHQ-9"
    assert dim.current_score == round(18 / 27, 4)
    assert dim.severity_label == "moderately_severe"
    assert dim.indicator_count == 1

    # moderately_severe band maps to SEVERE → overall risk floor is SEVERE.
    assert profile.overall_risk_level == IndicatorSeverity.SEVERE
    assert profile.requires_attention is True
    assert "depression" in profile.primary_concerns


def test_apply_to_profile_mild_does_not_require_attention() -> None:
    profile = _make_profile()
    _apply_to_profile(
        profile,
        instrument=GAD7,
        normalized=round(7 / 21, 4),
        band_key="mild",
        band_label="Ringan",
    )
    assert profile.overall_risk_level == IndicatorSeverity.MILD
    assert profile.requires_attention is False


def test_apply_to_profile_raises_overall_to_band_floor() -> None:
    profile = _make_profile()
    # A single moderate dimension would average out to MILD on the engine's
    # weighted scale (0.407 * 2.0 / 2.0 → MILD band); the formal instrument's
    # own band must set the floor at MODERATE instead.
    _apply_to_profile(
        profile,
        instrument=PHQ9,
        normalized=round(11 / 27, 4),
        band_key="moderate",
        band_label="Sedang",
    )
    assert profile.overall_risk_level == IndicatorSeverity.MODERATE
    assert profile.requires_attention is True


def test_apply_to_profile_accumulates_on_resubmission() -> None:
    profile = _make_profile()
    _apply_to_profile(
        profile, instrument=PHQ9, normalized=0.3, band_key="mild", band_label="Ringan"
    )
    first_count = profile.dimension_scores["depression"].indicator_count
    _apply_to_profile(
        profile, instrument=PHQ9, normalized=0.6, band_key="moderate", band_label="Sedang"
    )
    dim = profile.dimension_scores["depression"]
    assert dim.indicator_count == first_count + 1
    # Score moves up to the newest formal result (floor semantics, not decay).
    assert dim.current_score == 0.6
    assert dim.severity_label == "moderate"
