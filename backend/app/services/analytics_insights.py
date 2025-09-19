"""Analytics insight aggregation services."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional, Sequence

from sqlalchemy import and_, func, or_, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CampaignExecution, InterventionCampaign, TriageAssessment, User
from app.schemas.admin.analytics import (
    CohortHotspot,
    CohortHotspotsResponse,
    InterventionSummary,
    SeverityDelta,
    TriageMetricsInsight,
)

from app.services.triage_metrics import SLA_TARGET_MS, compute_triage_metrics

HIGH_SEVERITY_LEVELS = {"high", "critical"}


@dataclass(frozen=True)
class _Window:
    current_start: datetime
    current_end: datetime
    previous_start: datetime
    previous_end: datetime

    @property
    def current_start_date(self) -> date:
        return self.current_start.date()

    @property
    def current_end_date(self) -> date:
        return (self.current_end - timedelta(microseconds=1)).date()


def _resolve_reference_date(reference: Optional[date]) -> date:
    return reference or datetime.utcnow().date()


def _build_window(reference_date: Optional[date], timeframe_days: int) -> _Window:
    if timeframe_days <= 0:
        raise ValueError("timeframe_days must be positive")

    resolved = _resolve_reference_date(reference_date)
    current_end = datetime.combine(resolved + timedelta(days=1), time.min)
    current_start = current_end - timedelta(days=timeframe_days)
    previous_end = current_start
    previous_start = previous_end - timedelta(days=timeframe_days)
    return _Window(
        current_start=current_start,
        current_end=current_end,
        previous_start=previous_start,
        previous_end=previous_end,
    )


def _normalize_severity(raw: Optional[str]) -> str:
    if not raw:
        return "unknown"
    value = raw.strip().lower()
    if value in HIGH_SEVERITY_LEVELS:
        return "high"
    if value in {"medium", "moderate"}:
        return "medium"
    if value == "low":
        return "low"
    return value



def _severity_counts_from_rows(rows: Sequence[tuple[str, int]]) -> Dict[str, int]:
    counts: Dict[str, int] = defaultdict(int)
    for severity, total in rows:
        counts[_normalize_severity(severity)] += int(total)
    return dict(counts)


async def _fetch_severity_counts(
    db: AsyncSession,
    start: datetime,
    end: datetime,
) -> Dict[str, int]:
    severity_col = func.lower(TriageAssessment.severity_level)
    stmt = (
        select(severity_col.label("severity"), func.count(TriageAssessment.id))
        .where(and_(TriageAssessment.created_at >= start, TriageAssessment.created_at < end))
        .group_by(severity_col)
    )
    result = await db.execute(stmt)
    return _severity_counts_from_rows(result.all())


def _compute_delta(
    current_counts: Dict[str, int],
    previous_counts: Dict[str, int],
) -> SeverityDelta:
    keys = set(current_counts) | set(previous_counts)
    current = {key: current_counts.get(key, 0) for key in keys}
    previous = {key: previous_counts.get(key, 0) for key in keys}

    delta: Dict[str, int] = {}
    delta_pct: Dict[str, Optional[float]] = {}
    for key in keys:
        current_value = current.get(key, 0)
        previous_value = previous.get(key, 0)
        delta_value = current_value - previous_value
        delta[key] = delta_value
        if previous_value:
            delta_pct[key] = round(delta_value / previous_value, 4)
        else:
            delta_pct[key] = None

    return SeverityDelta(current=current, previous=previous, delta=delta, delta_pct=delta_pct)


async def compute_triage_insights(
    db: AsyncSession,
    timeframe_days: int,
    *,
    reference_date: Optional[date] = None,
    target_ms: int = SLA_TARGET_MS,
) -> TriageMetricsInsight:
    window = _build_window(reference_date, timeframe_days)

    metrics_summary = await compute_triage_metrics(
        db,
        timeframe_days=timeframe_days,
        since=window.current_start,
        target_ms=target_ms,
        reference_date=window.current_end.date() - timedelta(days=1),
    )

    current_counts = await _fetch_severity_counts(db, window.current_start, window.current_end)
    previous_counts = await _fetch_severity_counts(db, window.previous_start, window.previous_end)
    severity_delta = _compute_delta(current_counts, previous_counts)

    risk_trend = list(metrics_summary.risk_trend)
    sla_metrics = metrics_summary.sla_metrics

    return TriageMetricsInsight(
        timeframe_days=timeframe_days,
        window_start=window.current_start.date().isoformat(),
        window_end=(window.current_end - timedelta(days=1)).date().isoformat(),
        risk_trend=risk_trend,
        severity_delta=severity_delta,
        sla_metrics=sla_metrics,
    )


async def compute_cohort_hotspots(
    db: AsyncSession,
    timeframe_days: int,
    *,
    reference_date: Optional[date],
    dimension: str,
    limit: int,
) -> CohortHotspotsResponse:
    if limit <= 0:
        raise ValueError("limit must be positive")

    window = _build_window(reference_date, timeframe_days)

    dimension_map = {
        "major": User.major,
        "year_of_study": User.year_of_study,
        "gender": User.gender,
        "city": User.city,
    }
    column = dimension_map.get(dimension)
    if column is None:
        raise ValueError(f"Unsupported cohort dimension: {dimension}")

    high_condition = or_(
        func.lower(TriageAssessment.severity_level).in_(tuple(HIGH_SEVERITY_LEVELS)),
        TriageAssessment.risk_score >= 0.8,
    )

    async def fetch_counts(start: datetime, end: datetime) -> Dict[str, Dict[str, float]]:
        stmt = (
            select(
                column.label("cohort"),
                func.count(TriageAssessment.id).label("total"),
                func.count(func.distinct(TriageAssessment.user_id)).label("users"),
            )
            .join(User, TriageAssessment.user_id == User.id)
            .where(
                and_(
                    TriageAssessment.created_at >= start,
                    TriageAssessment.created_at < end,
                    high_condition,
                    column.isnot(None),
                    func.trim(column) != "",
                )
            )
            .group_by(column)
        )
        result = await db.execute(stmt)
        payload: Dict[str, Dict[str, float]] = {}
        for label, total, users in result.all():
            if label is None:
                continue
            payload[str(label)] = {
                "count": float(total or 0),
                "users": float(users or 0),
            }
        return payload

    current_payload = await fetch_counts(window.current_start, window.current_end)
    previous_payload = await fetch_counts(window.previous_start, window.previous_end)

    items: List[CohortHotspot] = []
    for label, current in current_payload.items():
        count = int(current.get("count", 0))
        if count < 3:
            continue
        previous = previous_payload.get(label, {})
        previous_count = int(previous.get("count", 0))
        delta = count - previous_count
        delta_pct = (delta / previous_count) if previous_count else None
        items.append(
            CohortHotspot(
                label=label,
                current_high=count,
                previous_high=previous_count,
                delta=delta,
                delta_pct=round(delta_pct, 4) if delta_pct is not None else None,
                cohort_population=int(current.get("users", 0)),
            )
        )

    items.sort(key=lambda item: (item.delta, item.delta_pct or 0.0), reverse=True)
    return CohortHotspotsResponse(
        dimension=dimension,
        timeframe_days=timeframe_days,
        window_start=window.current_start.date().isoformat(),
        window_end=(window.current_end - timedelta(days=1)).date().isoformat(),
        items=items[:limit],
    )


async def compute_intervention_summary(
    db: AsyncSession,
    timeframe_days: int,
    *,
    reference_date: Optional[date],
    campaign_type: Optional[str],
    limit: int,
) -> InterventionSummary:
    window = _build_window(reference_date, timeframe_days)

    status_col = func.lower(CampaignExecution.status)
    base_stmt = (
        select(
            status_col.label("status"),
            func.count(CampaignExecution.id).label("count"),
            func.avg(CampaignExecution.engagement_score).label("engagement"),
        )
        .where(
            and_(
                CampaignExecution.created_at >= window.current_start,
                CampaignExecution.created_at < window.current_end,
            )
        )
    )

    if campaign_type:
        base_stmt = base_stmt.join(InterventionCampaign, CampaignExecution.campaign_id == InterventionCampaign.id)
        base_stmt = base_stmt.where(InterventionCampaign.campaign_type == campaign_type)

    base_stmt = base_stmt.group_by(status_col)
    result = await db.execute(base_stmt)

    totals: Dict[str, int] = {}
    engagement_values: List[float] = []
    for status, count, engagement in result.all():
        totals[str(status)] = int(count or 0)
        if engagement is not None:
            engagement_values.append(float(engagement))

    total_count = sum(totals.values())
    success_count = sum(totals.get(status, 0) for status in ("completed", "sent"))
    failure_count = sum(totals.get(status, 0) for status in ("failed", "cancelled", "error"))
    avg_engagement = round(sum(engagement_values) / len(engagement_values), 3) if engagement_values else None

    top_stmt = (
        select(
            InterventionCampaign.id,
            InterventionCampaign.title,
            func.count(CampaignExecution.id).label("executed"),
            func.sum(
                case((status_col.in_(("failed", "cancelled", "error")), 1), else_=0)
            ).label("failed"),
        )
        .join(InterventionCampaign, CampaignExecution.campaign_id == InterventionCampaign.id)
        .where(
            and_(
                CampaignExecution.created_at >= window.current_start,
                CampaignExecution.created_at < window.current_end,
            )
        )
        .group_by(InterventionCampaign.id, InterventionCampaign.title)
        .order_by(func.count(CampaignExecution.id).desc())
        .limit(limit)
    )
    if campaign_type:
        top_stmt = top_stmt.where(InterventionCampaign.campaign_type == campaign_type)

    top_rows = await db.execute(top_stmt)
    top_campaigns = []
    for campaign_id, title, executed, failed in top_rows.all():
        executed_count = int(executed or 0)
        failed_count = int(failed or 0)
        success_rate = (executed_count - failed_count) / executed_count if executed_count else None
        top_campaigns.append(
            {
                "campaign_id": campaign_id,
                "title": title,
                "executed": executed_count,
                "failed": failed_count,
                "success_rate": round(success_rate, 4) if success_rate is not None else None,
            }
        )

    success_rate = success_count / total_count if total_count else None
    failure_rate = failure_count / total_count if total_count else None

    return InterventionSummary(
        timeframe_days=timeframe_days,
        window_start=window.current_start.date().isoformat(),
        window_end=(window.current_end - timedelta(days=1)).date().isoformat(),
        totals={
            "overall": total_count,
            "by_status": totals,
            "success_rate": round(success_rate, 4) if success_rate is not None else None,
            "failure_rate": round(failure_rate, 4) if failure_rate is not None else None,
            "avg_engagement_score": avg_engagement,
        },
        top_campaigns=top_campaigns,
    )






