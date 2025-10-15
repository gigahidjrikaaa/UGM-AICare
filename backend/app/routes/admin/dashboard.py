"""Unified Admin Dashboard endpoints."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, date
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import (
    Appointment,
    Case,
    CaseSeverityEnum,
    CaseStatusEnum,
    TriageAssessment,
)
from app.schemas.admin.dashboard import (
    AlertItem,
    DashboardKPIs,
    DashboardOverview,
    InsightsPanel,
    TrendingTopic,
)


router = APIRouter(prefix="/dashboard", tags=["Admin - Dashboard"])
logger = logging.getLogger(__name__)


@router.get("/overview", response_model=DashboardOverview)
async def get_overview(
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> DashboardOverview:
    now = datetime.utcnow()
    start_week = now - timedelta(days=now.weekday())
    end_week = start_week + timedelta(days=7)

    # Active critical cases
    active_critical_stmt = select(func.count()).where(
        and_(
            Case.status != CaseStatusEnum.closed,
            Case.severity.in_((CaseSeverityEnum.high, CaseSeverityEnum.critical)),
        )
    )
    active_critical = int((await db.execute(active_critical_stmt)).scalar() or 0)

    # Appointments this week
    appt_stmt = (
        select(func.count())
        .select_from(Appointment)
        .where(Appointment.appointment_datetime >= start_week)
        .where(Appointment.appointment_datetime < end_week)
    )
    appointments_this_week = int((await db.execute(appt_stmt)).scalar() or 0)

    # Sentiment proxy from triage risk (1 - avg_risk) over last 7 days
    window_days = 7
    start = now - timedelta(days=window_days)
    prev_start = start - timedelta(days=window_days)

    avg_risk_stmt = (
        select(func.avg(TriageAssessment.risk_score))
        .where(TriageAssessment.created_at >= start)
        .where(TriageAssessment.created_at <= now)
    )
    prev_avg_risk_stmt = (
        select(func.avg(TriageAssessment.risk_score))
        .where(TriageAssessment.created_at >= prev_start)
        .where(TriageAssessment.created_at < start)
    )
    avg_risk = (await db.execute(avg_risk_stmt)).scalar()
    prev_avg_risk = (await db.execute(prev_avg_risk_stmt)).scalar()

    overall_sentiment = None
    sentiment_delta = None
    if avg_risk is not None:
        overall_sentiment = round(max(0.0, min(1.0, 1.0 - float(avg_risk))) * 100, 2)
    if avg_risk is not None and prev_avg_risk is not None:
        curr_idx = 1.0 - float(avg_risk)
        prev_idx = 1.0 - float(prev_avg_risk)
        sentiment_delta = round((curr_idx - prev_idx) * 100, 2)

    kpis = DashboardKPIs(
        active_critical_cases=active_critical,
        overall_sentiment=overall_sentiment,
        sentiment_delta=sentiment_delta,
        appointments_this_week=appointments_this_week,
    )

    # Trending topics refined: prefer Postgres JSONB unnest, fallback to severity mix
    trending: List[TrendingTopic] = []
    try:
        bind = db.get_bind()
        dialect_name = getattr(getattr(bind, "dialect", None), "name", None)
    except Exception:
        dialect_name = None

    if dialect_name == "postgresql":
        # Try to extract trending topics from risk_factors JSON array
        sql = text(
            """
            SELECT lower(trim(elem)) AS topic, COUNT(*) AS cnt
            FROM (
              SELECT jsonb_array_elements_text(
                CASE 
                  WHEN jsonb_typeof(triage_assessments.risk_factors::jsonb) = 'array' 
                  THEN triage_assessments.risk_factors::jsonb
                  ELSE '[]'::jsonb
                END
              ) AS elem
              FROM triage_assessments
              WHERE triage_assessments.created_at >= :start 
                AND triage_assessments.created_at <= :end
                AND triage_assessments.risk_factors IS NOT NULL
            ) t
            WHERE elem IS NOT NULL AND trim(elem) != ''
            GROUP BY lower(trim(elem))
            ORDER BY cnt DESC
            LIMIT 5
            """
        )
        try:
            rows = (await db.execute(sql, {"start": start, "end": now})).all()
            trending = [TrendingTopic(topic=str(t).strip('"'), count=int(c or 0)) for t, c in rows]
        except Exception as e:
            # Fallback if JSON parsing fails - rollback and use empty list
            logger.warning(f"Failed to extract trending topics from risk_factors: {e}")
            await db.rollback()
            trending = []
    else:
        hc_stmt = (
            select(TriageAssessment.severity_level, func.count())
            .where(TriageAssessment.created_at >= start)
            .where(TriageAssessment.created_at <= now)
            .group_by(TriageAssessment.severity_level)
            .order_by(func.count().desc())
            .limit(5)
        )
        rows = (await db.execute(hc_stmt)).all()
        trending = [TrendingTopic(topic=str(level), count=int(count)) for level, count in rows]

    # IA summary surrogate
    high_crit_stmt = (
        select(func.count())
        .select_from(TriageAssessment)
        .where(TriageAssessment.created_at >= start)
        .where(TriageAssessment.created_at <= now)
        .where(TriageAssessment.severity_level.in_(("high", "critical")))
    )
    high_crit = int((await db.execute(high_crit_stmt)).scalar() or 0)
    trend_dir = "up" if (sentiment_delta or 0) >= 0 else "down"
    sentiment_txt = (
        f"Sentiment {trend_dir} by {abs(sentiment_delta or 0):.2f} points; current {overall_sentiment:.2f}%"
        if overall_sentiment is not None
        else "Sentiment unavailable"
    )
    top_topics = ", ".join([t.topic.strip('"') for t in trending]) if trending else "no dominant topics"
    ia_summary = (
        f"Past {window_days} days: {high_crit} high/critical triage findings; "
        f"{sentiment_txt}. Active critical cases: {active_critical}. Trending: {top_topics}."
    )

    insights = InsightsPanel(trending_topics=trending, ia_summary=ia_summary)

    # Recent alerts from cases
    alerts_stmt = (
        select(Case)
        .where(Case.severity.in_((CaseSeverityEnum.high, CaseSeverityEnum.critical)))
        .where(Case.status != CaseStatusEnum.closed)
        .order_by(Case.created_at.desc())
        .limit(10)
    )
    alerts_rows = (await db.execute(alerts_stmt)).scalars().all()
    alerts = [
        AlertItem(
            case_id=str(item.id),
            severity=item.severity.value if hasattr(item.severity, "value") else str(item.severity),
            created_at=item.created_at,  # type: ignore[arg-type]
            session_id=getattr(item, "session_id", None),
            user_hash=getattr(item, "user_hash", ""),
            summary=getattr(item, "summary_redacted", None),
        )
        for item in alerts_rows
    ]

    return DashboardOverview(kpis=kpis, insights=insights, alerts=alerts)
