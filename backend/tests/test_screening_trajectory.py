"""Trajectory early-warning unit tests: pure classification, point mapping,
dedupe window, and the screening-profile persistence shape."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.domains.mental_health.models import (
    ConversationRiskAssessment,
    FormalScreeningSubmission,
)
from app.services.screening_trajectory_service import (
    ALERT_COOLDOWN_DAYS,
    MIN_POINTS,
    _assessment_points,
    _has_recent_alert,
    _submission_points,
    compute_trajectory,
)

UTC = timezone.utc


def _points_from(days_ago_values: list[tuple[int, float]]) -> list[tuple[datetime, float]]:
    now = datetime.now(UTC)
    return [
        (now - timedelta(days=days), value) for days, value in days_ago_values
    ]


@pytest.mark.unit
def test_insufficient_points_is_not_worsening() -> None:
    trajectory = compute_trajectory(_points_from([(30, 1.0), (20, 1.0), (10, 3.0)]))
    assert trajectory["direction"] == "insufficient"
    assert trajectory["n"] < MIN_POINTS


@pytest.mark.unit
def test_flat_series_is_stable() -> None:
    trajectory = compute_trajectory(
        _points_from([(40, 2.0), (30, 2.0), (20, 2.0), (10, 2.0), (2, 2.0)])
    )
    assert trajectory["direction"] == "stable"
    assert trajectory["delta"] == 0.0


@pytest.mark.unit
def test_clear_deterioration_is_worsening() -> None:
    trajectory = compute_trajectory(
        _points_from([(45, 0.0), (35, 1.0), (25, 2.0), (15, 3.0), (5, 3.0)])
    )
    assert trajectory["direction"] == "worsening"
    assert trajectory["delta"] >= 0.5


@pytest.mark.unit
def test_gradual_slope_alone_triggers_worsening() -> None:
    # Small half-delta but a consistent upward slope.
    trajectory = compute_trajectory(
        _points_from([(56, 0.5), (42, 1.0), (28, 1.5), (14, 2.0), (2, 2.5)])
    )
    assert trajectory["direction"] == "worsening"
    assert trajectory["slope_per_week"] > 0


@pytest.mark.unit
def test_improvement_is_improving() -> None:
    trajectory = compute_trajectory(
        _points_from([(45, 3.0), (35, 3.0), (25, 1.5), (15, 1.0), (5, 0.5)])
    )
    assert trajectory["direction"] == "improving"


@pytest.mark.unit
def test_points_order_does_not_matter() -> None:
    ascending = compute_trajectory(_points_from([(40, 0.0), (30, 1.0), (20, 2.0), (10, 3.0)]))
    descending_input = list(reversed(_points_from([(40, 0.0), (30, 1.0), (20, 2.0), (10, 3.0)])))
    shuffled = compute_trajectory(descending_input)
    assert ascending["direction"] == shuffled["direction"] == "worsening"


def test_assessment_points_map_risk_levels() -> None:
    now = datetime.now(UTC)
    rows = [
        ConversationRiskAssessment(
            user_id=1,
            overall_risk_level="moderate",
            conversation_summary="",
            reasoning="",
            message_count=4,
            created_at=now - timedelta(days=2),
        ),
        ConversationRiskAssessment(
            user_id=1,
            overall_risk_level="unknown-level",
            conversation_summary="",
            reasoning="",
            message_count=4,
            created_at=now - timedelta(days=1),
        ),
    ]
    points = _assessment_points(rows)
    assert len(points) == 1  # unknown level skipped
    assert points[0][1] == 2.0


def test_naive_timestamps_treated_as_utc() -> None:
    naive_row = ConversationRiskAssessment(
        user_id=1,
        overall_risk_level="severe",
        conversation_summary="",
        reasoning="",
        message_count=4,
        created_at=datetime(2026, 9, 1, 12, 0, 0),  # naive (asyncpg returns naive)
    )
    points = _assessment_points([naive_row])
    assert points[0][0].tzinfo is UTC
    assert points[0][1] == 3.0


def test_submission_points_scale_to_risk_ladder() -> None:
    now = datetime.now(UTC)
    submission = FormalScreeningSubmission(
        user_id=1,
        instrument="PHQ-9",
        responses=[3] * 9,
        total_score=27,
        max_score=27,
        normalized_score=1.0,
        severity_band="severe",
        severity_label="Berat",
        created_at=now,
    )
    points = _submission_points([submission])
    assert points[0][1] == 4.0  # max-score submission tops the ladder


def test_has_recent_alert_dedupes_within_cooldown() -> None:
    now = datetime.now(UTC)
    recent = {"last_alerted_at": (now - timedelta(days=ALERT_COOLDOWN_DAYS - 1)).isoformat()}
    stale = {"last_alerted_at": (now - timedelta(days=ALERT_COOLDOWN_DAYS + 1)).isoformat()}
    naive = {
        "last_alerted_at": (now - timedelta(days=1)).replace(tzinfo=None).isoformat()
    }
    assert _has_recent_alert(recent) is True
    assert _has_recent_alert(stale) is False
    assert _has_recent_alert(naive) is True  # naive treated as UTC
    assert _has_recent_alert(None) is False
    assert _has_recent_alert({}) is False
