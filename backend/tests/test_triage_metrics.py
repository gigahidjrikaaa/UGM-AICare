import os
import sys
from pathlib import Path
from datetime import datetime, timedelta, date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.database import Base
from app.models import TriageAssessment
from app.services.triage_metrics import (
    SLA_TARGET_MS,
    build_risk_trend,
    build_sla_metrics,
    compute_triage_metrics,
)


def _make_rows(base: datetime) -> list[tuple[datetime, str, float, int | None]]:
    return [
        (base, "high", 0.92, 90_000),
        (base - timedelta(minutes=15), "critical", 0.88, 120_000),
        (base - timedelta(days=1, hours=2), "medium", 0.65, 240_000),
        (base - timedelta(days=1, hours=3), "low", 0.42, None),
        (base - timedelta(days=2, hours=1), "low", 0.35, 600_000),
    ]


def test_build_risk_trend_counts_and_average():
    reference = date(2025, 2, 3)
    rows = _make_rows(datetime(2025, 2, 3, 12, 0, 0))
    trend = build_risk_trend(
        [(created_at, severity, risk) for created_at, severity, risk, _ in rows],
        timeframe_days=3,
        reference_date=reference,
    )

    assert len(trend) == 3
    # Ensure chronological ordering
    assert [point.date for point in trend] == ["2025-02-01", "2025-02-02", "2025-02-03"]

    # Validate counts on final day
    today_metrics = trend[-1]
    assert today_metrics.total == 2
    assert today_metrics.high == 2  # high + critical bucketed
    assert today_metrics.medium == 0
    assert today_metrics.low == 0
    assert today_metrics.average_risk_score == pytest.approx((0.92 + 0.88) / 2, rel=1e-3)

    # Prior day includes medium & low entries
    prior_metrics = trend[-2]
    assert prior_metrics.total == 2
    assert prior_metrics.medium == 1
    assert prior_metrics.low == 1


def test_build_risk_trend_handles_empty_days():
    reference = date(2025, 2, 10)
    single_row = [
        (datetime(2025, 2, 10, 5, 0, 0), "low", 0.2, 30_000)
    ]
    trend = build_risk_trend(
        [(created_at, severity, risk) for created_at, severity, risk, _ in single_row],
        timeframe_days=4,
        reference_date=reference,
    )
    assert len(trend) == 4
    # Ensure zeros on days with no assessments
    for point in trend[:-1]:
        assert point.total == 0
        assert point.average_risk_score is None
    assert trend[-1].total == 1
    assert trend[-1].low == 1


def test_build_sla_metrics_basic_statistics():
    base = datetime(2025, 3, 1, 9, 0, 0)
    rows = [
        (base, "high", 0.9, 60_000),
        (base, "high", 0.8, 120_000),
        (base, "medium", 0.5, 600_000),
        (base, "low", 0.4, None),
    ]
    metrics = build_sla_metrics(rows, target_ms=300_000)
    assert metrics is not None
    assert metrics.records == 3
    assert metrics.average_ms == pytest.approx((60_000 + 120_000 + 600_000) / 3, rel=1e-6)
    assert metrics.p90_ms == 600_000
    assert metrics.p95_ms == 600_000
    assert metrics.within_target_percent == pytest.approx(66.67, rel=1e-3)


def test_build_sla_metrics_handles_empty_durations():
    rows = [
        (datetime.utcnow(), "high", 0.9, None)
    ]
    metrics = build_sla_metrics(rows, target_ms=SLA_TARGET_MS)
    assert metrics is None


@pytest.mark.asyncio
async def test_compute_triage_metrics_integration():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            base = datetime(2025, 2, 3, 12, 0, 0)
            assessments = [
                TriageAssessment(
                    risk_score=0.92,
                    confidence_score=0.71,
                    severity_level="high",
                    processing_time_ms=90_000,
                    created_at=base,
                ),
                TriageAssessment(
                    risk_score=0.88,
                    confidence_score=0.69,
                    severity_level="critical",
                    processing_time_ms=120_000,
                    created_at=base - timedelta(minutes=5),
                ),
                TriageAssessment(
                    risk_score=0.65,
                    confidence_score=0.55,
                    severity_level="medium",
                    processing_time_ms=240_000,
                    created_at=base - timedelta(days=1, hours=2),
                ),
                TriageAssessment(
                    risk_score=0.42,
                    confidence_score=0.5,
                    severity_level="low",
                    processing_time_ms=None,
                    created_at=base - timedelta(days=1, hours=3),
                ),
                TriageAssessment(
                    risk_score=0.35,
                    confidence_score=0.45,
                    severity_level="low",
                    processing_time_ms=600_000,
                    created_at=base - timedelta(days=2, hours=1),
                ),
            ]
            session.add_all(assessments)
            await session.commit()

            summary = await compute_triage_metrics(
                session,
                timeframe_days=3,
                since=datetime(2025, 2, 1, 0, 0, 0),
                reference_date=date(2025, 2, 3),
            )

            assert len(summary.risk_trend) == 3
            day_index = {point.date: point for point in summary.risk_trend}
            assert day_index["2025-02-03"].total == 2
            assert day_index["2025-02-03"].high == 2
            assert day_index["2025-02-02"].medium == 1
            assert day_index["2025-02-01"].low == 1

            assert summary.sla_metrics is not None
            sla = summary.sla_metrics
            assert sla.target_ms == SLA_TARGET_MS
            assert sla.records == 4  # excludes None duration but includes four
            assert sla.p95_ms == 600_000
            assert sla.within_target_percent == pytest.approx(75.0, rel=1e-3)
    finally:
        await engine.dispose()
