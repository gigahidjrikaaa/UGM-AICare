"""Services for triage analytics metrics."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
import math
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import TriageAssessment
from app.schemas.admin.triage import RiskTrendPoint, SlaMetrics

SLA_TARGET_MS = 5 * 60 * 1000
_HIGH_SEVERITY_LEVELS = {"high", "critical"}
_MEDIUM_SEVERITY_LEVELS = {"medium", "moderate"}


@dataclass(slots=True)
class TriageMetricsSummary:
    """Container for aggregated triage metrics."""

    risk_trend: list[RiskTrendPoint]
    sla_metrics: SlaMetrics | None


def _severity_bucket(value: str | None) -> str:
    if not value:
        return "low"
    level = value.lower()
    if level in _HIGH_SEVERITY_LEVELS:
        return "high"
    if level in _MEDIUM_SEVERITY_LEVELS:
        return "medium"
    return "low"


def _build_date_range(days: int, reference: date) -> list[date]:
    if days <= 0:
        return []
    start = reference - timedelta(days=days - 1)
    return [start + timedelta(days=offset) for offset in range(days)]


def build_risk_trend(
    rows: Sequence[tuple[datetime, str | None, float | None]],
    timeframe_days: int,
    reference_date: date | None = None,
) -> list[RiskTrendPoint]:
    """Aggregate daily risk counts and averages for the requested window."""

    if timeframe_days <= 0:
        return []
    if reference_date is None:
        reference_date = datetime.utcnow().date()

    date_range = _build_date_range(timeframe_days, reference_date)
    buckets: dict[date, dict[str, float]] = {
        day: {
            "total": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "risk_sum": 0.0,
            "risk_count": 0,
        }
        for day in date_range
    }

    for created_at, severity, risk_score in rows:
        if created_at is None:
            continue
        day = created_at.date()
        bucket = buckets.get(day)
        if bucket is None:
            continue
        bucket["total"] += 1
        bucket[_severity_bucket(severity)] += 1
        if risk_score is not None:
            bucket["risk_sum"] += float(risk_score)
            bucket["risk_count"] += 1

    trend: list[RiskTrendPoint] = []
    for day in date_range:
        bucket = buckets[day]
        average = None
        if bucket["risk_count"]:
            average = round(bucket["risk_sum"] / bucket["risk_count"], 4)
        trend.append(
            RiskTrendPoint(
                date=day.isoformat(),
                total=int(bucket["total"]),
                high=int(bucket["high"]),
                medium=int(bucket["medium"]),
                low=int(bucket["low"]),
                average_risk_score=average,
            )
        )
    return trend


def _percentile(sorted_values: Sequence[int], percentile: float) -> int | None:
    if not sorted_values:
        return None
    percentile = max(0.0, min(float(percentile), 1.0))
    if percentile == 0.0:
        return int(sorted_values[0])
    if percentile == 1.0:
        return int(sorted_values[-1])
    index = math.ceil(percentile * len(sorted_values)) - 1
    index = max(0, min(index, len(sorted_values) - 1))
    return int(sorted_values[index])


def build_sla_metrics(
    rows: Sequence[tuple[datetime, str | None, float | None, int | None]],
    target_ms: int,
) -> SlaMetrics | None:
    """Compute SLA summaries from triage processing durations."""

    durations = [
        int(duration)
        for *_, duration in rows
        if duration is not None and duration >= 0
    ]
    if not durations:
        return None
    durations.sort()
    count = len(durations)
    average = sum(durations) / count
    within_target = sum(1 for duration in durations if duration <= target_ms)
    within_percent = round((within_target / count) * 100, 2)

    return SlaMetrics(
        target_ms=target_ms,
        records=count,
        average_ms=round(average, 2),
        p90_ms=_percentile(durations, 0.9),
        p95_ms=_percentile(durations, 0.95),
        within_target_percent=within_percent,
    )


async def compute_triage_metrics(
    db: AsyncSession,
    timeframe_days: int,
    *,
    since: datetime | None = None,
    target_ms: int = SLA_TARGET_MS,
    reference_date: date | None = None,
) -> TriageMetricsSummary:
    """Fetch triage assessments and compute risk trend and SLA metrics."""

    if timeframe_days <= 0:
        raise ValueError("timeframe_days must be positive")

    if reference_date is None:
        reference_date = datetime.utcnow().date()

    if since is None:
        since = datetime.combine(reference_date, datetime.min.time()) - timedelta(days=timeframe_days - 1)

    stmt = select(
        TriageAssessment.created_at,
        TriageAssessment.severity_level,
        TriageAssessment.risk_score,
        TriageAssessment.processing_time_ms,
    ).where(TriageAssessment.created_at >= since)

    result = await db.execute(stmt)
    rows = result.all()

    risk_trend = build_risk_trend(
        [(created_at, severity, risk) for created_at, severity, risk, _ in rows],
        timeframe_days=timeframe_days,
        reference_date=reference_date,
    )
    sla_metrics = build_sla_metrics(rows, target_ms=target_ms)

    return TriageMetricsSummary(risk_trend=risk_trend, sla_metrics=sla_metrics)
