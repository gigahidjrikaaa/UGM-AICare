"""Unified Admin Dashboard endpoints."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select, text, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import InsightsReport  # Core infrastructure model
from app.domains.mental_health.models import (
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
    TrendsResponse,
    HistoricalDataPoint,
)


router = APIRouter(prefix="/dashboard", tags=["Admin - Dashboard"])
logger = logging.getLogger(__name__)


@router.get("/overview", response_model=DashboardOverview)
async def get_overview(
    time_range: int = Query(7, description="Time range in days (7, 30, 90)"),
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> DashboardOverview:
    """
    Get comprehensive dashboard overview with KPIs, insights, and alerts.
    
    Supports time range filtering: 7d, 30d, 90d for trend analysis.
    """
    now = datetime.utcnow()
    start_week = now - timedelta(days=now.weekday())
    end_week = start_week + timedelta(days=7)
    
    # Time window for trends (user-configurable)
    window_days = min(max(time_range, 1), 365)  # Clamp between 1-365 days
    start = now - timedelta(days=window_days)
    prev_start = start - timedelta(days=window_days)

    # ===== KPI 1: Active critical cases =====
    active_critical_stmt = select(func.count()).where(
        and_(
            Case.status != CaseStatusEnum.closed,
            Case.severity.in_((CaseSeverityEnum.high, CaseSeverityEnum.critical)),
        )
    )
    active_critical = int((await db.execute(active_critical_stmt)).scalar() or 0)

    # ===== KPI 2: Cases opened this week =====
    cases_opened_stmt = (
        select(func.count())
        .select_from(Case)
        .where(Case.created_at >= start_week)
        .where(Case.created_at < end_week)
    )
    cases_opened_this_week = int((await db.execute(cases_opened_stmt)).scalar() or 0)

    # ===== KPI 3: Cases closed this week =====
    cases_closed_stmt = (
        select(func.count())
        .select_from(Case)
        .where(Case.status == CaseStatusEnum.closed)
        .where(Case.updated_at >= start_week)
        .where(Case.updated_at < end_week)
    )
    cases_closed_this_week = int((await db.execute(cases_closed_stmt)).scalar() or 0)

    # ===== KPI 4: Appointments this week =====
    appt_stmt = (
        select(func.count())
        .select_from(Appointment)
        .where(Appointment.appointment_datetime >= start_week)
        .where(Appointment.appointment_datetime < end_week)
    )
    appointments_this_week = int((await db.execute(appt_stmt)).scalar() or 0)

    # ===== KPI 5: Average case resolution time (in hours) =====
    # Calculate for cases closed in the selected time range
    resolution_time_stmt = select(
        func.avg(
            func.extract('epoch', Case.updated_at - Case.created_at) / 3600.0
        )
    ).where(
        and_(
            Case.status == CaseStatusEnum.closed,
            Case.updated_at >= start,
            Case.updated_at <= now,
        )
    )
    avg_resolution_hours = (await db.execute(resolution_time_stmt)).scalar()
    avg_case_resolution_time = round(float(avg_resolution_hours), 2) if avg_resolution_hours else None

    # ===== KPI 6: SLA breach count =====
    # Cases where sla_breach_at < now and status != closed
    sla_breach_stmt = select(func.count()).where(
        and_(
            Case.sla_breach_at < now,
            Case.status != CaseStatusEnum.closed,
        )
    )
    sla_breach_count = int((await db.execute(sla_breach_stmt)).scalar() or 0)

    # ===== KPI 7: Active campaigns count =====
    # TODO: Implement when campaigns table exists (Phase 5)
    active_campaigns_count = 0

    # ===== Sentiment calculation (proxy from triage risk) =====
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
        cases_opened_this_week=cases_opened_this_week,
        cases_closed_this_week=cases_closed_this_week,
        avg_case_resolution_time=avg_case_resolution_time,
        sla_breach_count=sla_breach_count,
        active_campaigns_count=active_campaigns_count,
    )

    # ===== Insights Panel: Use stored IA reports =====
    # Try to get the latest insights report from database
    latest_report_stmt = (
        select(InsightsReport)
        .order_by(desc(InsightsReport.generated_at))
        .limit(1)
    )
    latest_report = (await db.execute(latest_report_stmt)).scalar_one_or_none()

    if latest_report:
        # Use stored IA report data
        ia_summary = latest_report.summary or "No summary available"
        
        # Extract trending topics from stored report
        trending = []
        if latest_report.trending_topics and isinstance(latest_report.trending_topics, dict):
            topics_list = latest_report.trending_topics.get("topics", [])
            trending = [
                TrendingTopic(topic=t.get("topic", ""), count=t.get("count", 0))
                for t in topics_list
            ]
    else:
        # Fallback: Generate on-the-fly trending topics (old behavior)
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

        # Generate summary from current data
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

    insights = InsightsPanel(
        trending_topics=trending,
        ia_summary=ia_summary,
        report_generated_at=latest_report.generated_at if latest_report else None,
        report_period=f"{latest_report.period_start.strftime('%Y-%m-%d')} to {latest_report.period_end.strftime('%Y-%m-%d')}" if latest_report else None,
    )

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


@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    time_range: int = Query(30, description="Time range in days (7, 30, 90)"),
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> TrendsResponse:
    """
    Get historical trend data for dashboard charts.
    
    Returns time-series data for:
    - Sentiment trends over time
    - Case volume (opened/closed) over time
    - Trending topics over time
    
    Time range: 7d, 30d, or 90d
    """
    now = datetime.utcnow()
    window_days = min(max(time_range, 1), 365)  # Clamp between 1-365 days
    start = now - timedelta(days=window_days)
    
    # Determine bucket size based on time range
    if window_days <= 7:
        bucket_size_days = 1  # Daily buckets
    elif window_days <= 30:
        bucket_size_days = 3  # 3-day buckets
    else:
        bucket_size_days = 7  # Weekly buckets
    
    # ===== Sentiment Trends =====
    sentiment_data: List[HistoricalDataPoint] = []
    
    # Group by date buckets and calculate average sentiment
    current_date = start
    while current_date < now:
        bucket_end = current_date + timedelta(days=bucket_size_days)
        
        avg_risk_stmt = (
            select(func.avg(TriageAssessment.risk_score))
            .where(TriageAssessment.created_at >= current_date)
            .where(TriageAssessment.created_at < bucket_end)
        )
        avg_risk = (await db.execute(avg_risk_stmt)).scalar()
        
        sentiment_score = None
        if avg_risk is not None:
            sentiment_score = round(max(0.0, min(1.0, 1.0 - float(avg_risk))) * 100, 2)
        
        sentiment_data.append(
            HistoricalDataPoint(
                date=current_date.date(),
                value=sentiment_score,
            )
        )
        
        current_date = bucket_end
    
    # ===== Case Volume Trends =====
    cases_opened_data: List[HistoricalDataPoint] = []
    cases_closed_data: List[HistoricalDataPoint] = []
    
    current_date = start
    while current_date < now:
        bucket_end = current_date + timedelta(days=bucket_size_days)
        
        # Cases opened in this bucket
        opened_stmt = (
            select(func.count())
            .select_from(Case)
            .where(Case.created_at >= current_date)
            .where(Case.created_at < bucket_end)
        )
        opened_count = int((await db.execute(opened_stmt)).scalar() or 0)
        
        # Cases closed in this bucket
        closed_stmt = (
            select(func.count())
            .select_from(Case)
            .where(Case.status == CaseStatusEnum.closed)
            .where(Case.updated_at >= current_date)
            .where(Case.updated_at < bucket_end)
        )
        closed_count = int((await db.execute(closed_stmt)).scalar() or 0)
        
        cases_opened_data.append(
            HistoricalDataPoint(date=current_date.date(), value=opened_count)
        )
        cases_closed_data.append(
            HistoricalDataPoint(date=current_date.date(), value=closed_count)
        )
        
        current_date = bucket_end
    
    # ===== Topic Trends (top 5 topics over time) =====
    # Get top 5 topics overall for the period
    try:
        bind = db.get_bind()
        dialect_name = getattr(getattr(bind, "dialect", None), "name", None)
    except Exception:
        dialect_name = None
    
    top_topics: List[str] = []
    if dialect_name == "postgresql":
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
            top_topics = [str(t).strip('"') for t, _ in rows]
        except Exception as e:
            logger.warning(f"Failed to extract top topics: {e}")
            await db.rollback()
    
    # Now get counts for each topic over time (simplified for MVP)
    topic_trends = {}
    for topic in top_topics:
        topic_data: List[HistoricalDataPoint] = []
        current_date = start
        
        while current_date < now:
            bucket_end = current_date + timedelta(days=bucket_size_days)
            
            # Count occurrences of this topic in this time bucket
            if dialect_name == "postgresql":
                sql = text(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM (
                      SELECT jsonb_array_elements_text(
                        CASE 
                          WHEN jsonb_typeof(triage_assessments.risk_factors::jsonb) = 'array' 
                          THEN triage_assessments.risk_factors::jsonb
                          ELSE '[]'::jsonb
                        END
                      ) AS elem
                      FROM triage_assessments
                      WHERE triage_assessments.created_at >= :start_date
                        AND triage_assessments.created_at < :end_date
                        AND triage_assessments.risk_factors IS NOT NULL
                    ) t
                    WHERE lower(trim(elem)) = :topic
                    """
                )
                try:
                    count_result = (await db.execute(
                        sql,
                        {"start_date": current_date, "end_date": bucket_end, "topic": topic}
                    )).scalar()
                    count = int(count_result or 0)
                except Exception:
                    count = 0
            else:
                count = 0
            
            topic_data.append(
                HistoricalDataPoint(date=current_date.date(), value=count)
            )
            
            current_date = bucket_end
        
        topic_trends[topic] = topic_data
    
    return TrendsResponse(
        sentiment_trend=sentiment_data,
        cases_opened_trend=cases_opened_data,
        cases_closed_trend=cases_closed_data,
        topic_trends=topic_trends,
        time_range_days=window_days,
        bucket_size_days=bucket_size_days,
    )
