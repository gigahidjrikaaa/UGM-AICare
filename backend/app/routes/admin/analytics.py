"""Analytics endpoints for admin panel."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.analytics_agent import AnalyticsAgent
from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import AnalyticsReport, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Admin - Analytics"])


def _serialize_report(model: AnalyticsReport) -> dict:
    trends = model.trends or {}
    comparisons = model.baseline_snapshot if isinstance(model.baseline_snapshot, dict) else {}
    resource_payload: Dict[str, Any]
    raw_resource = model.resource_engagement or {}
    if isinstance(raw_resource, list):
        resource_payload = {"timeframe": model.report_period, "items": raw_resource}
    else:
        resource_payload = raw_resource or {"timeframe": model.report_period, "items": []}

    intervention_payload: Dict[str, Any]
    raw_interventions = model.intervention_outcomes or {}
    if isinstance(raw_interventions, list):
        intervention_payload = {"timeframe": model.report_period, "items": raw_interventions}
    else:
        intervention_payload = raw_interventions or {"timeframe": model.report_period, "items": []}

    topic_excerpts = model.topic_excerpts or []
    return {
        "id": model.id,
        "generated_at": model.generated_at,
        "report_period": model.report_period,
        "window_start": model.window_start,
        "window_end": model.window_end,
        "insights": model.insights or [],
        "patterns": trends.get("patterns", []),
        "recommendations": model.recommendations or [],
        "metrics": trends.get("metrics", {}),
        "topic_breakdown": trends.get("topic_breakdown", []),
        "theme_trends": trends.get("theme_trends", []),
        "distress_heatmap": trends.get("distress_heatmap", []),
        "segment_alerts": trends.get("segment_alerts", []),
        "high_risk_users": trends.get("high_risk_users", []),
        "resource_engagement": resource_payload,
        "intervention_outcomes": intervention_payload,
        "comparison_snapshot": comparisons,
        "topic_excerpts": topic_excerpts,
    }

def _report_history_item(model: AnalyticsReport) -> dict:
    trends = model.trends or {}
    topic_breakdown = trends.get("topic_breakdown", []) or []
    comparisons = model.baseline_snapshot if isinstance(model.baseline_snapshot, dict) else {}
    return {
        "id": model.id,
        "generated_at": model.generated_at,
        "report_period": model.report_period,
        "window_start": model.window_start,
        "window_end": model.window_end,
        "insight_count": len(model.insights or []),
        "topic_count": len(topic_breakdown),
        "top_topics": [entry.get("topic") for entry in topic_breakdown[:3] if isinstance(entry, dict)],
        "comparison_keys": list(comparisons.keys()) if isinstance(comparisons, dict) else [],
    }



@router.post("/run")
async def run_analytics_agent(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Trigger the analytics agent to generate a new report."""
    logger.info("Admin %s triggered analytics agent", admin_user.id)
    try:
        agent = AnalyticsAgent(db)
        report = await agent.analyze_trends(timeframe_days=7)
        return {
            "message": "Analytics report generated successfully",
            "report": report.model_dump(),
        }
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.error("Error running analytics agent: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to run analytics agent",
        ) from exc


@router.get("")
async def get_analytics(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Return the most recent analytics report if available."""
    logger.info("Admin %s requesting analytics data", admin_user.id)
    try:
        stmt = select(AnalyticsReport).order_by(desc(AnalyticsReport.generated_at)).limit(1)
        result = await db.execute(stmt)
        latest_report = result.scalars().first()
        if not latest_report:
            return {"message": "No analytics report found. Please run the agent first."}
        return _serialize_report(latest_report)
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.error("Error fetching analytics data for admin %s: %s", admin_user.id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics data",
        ) from exc


@router.get("/history")
async def list_analytics_history(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Return paginated summaries of historical analytics reports."""
    logger.info("Admin %s requesting analytics report history", admin_user.id)
    try:
        total_stmt = select(func.count(AnalyticsReport.id))
        total = await db.scalar(total_stmt) or 0

        stmt = (
            select(AnalyticsReport)
            .order_by(desc(AnalyticsReport.generated_at))
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(stmt)
        reports = result.scalars().all()
        items = [_report_history_item(report) for report in reports]
        return {
            "items": items,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": int(total),
            },
        }
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.error(
            "Error listing analytics history for admin %s: %s", admin_user.id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics history",
        ) from exc


@router.get("/{report_id}")
async def get_analytics_report(
    report_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Fetch a specific analytics report by identifier."""
    logger.info("Admin %s requesting analytics report %s", admin_user.id, report_id)
    try:
        report = await db.get(AnalyticsReport, report_id)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analytics report not found")
        return _serialize_report(report)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.error(
            "Error fetching analytics report %s for admin %s: %s", report_id, admin_user.id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics report",
        ) from exc


@router.get("/{report_id}/comparisons")
async def get_comparison_slices(
    report_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Return stored comparison slices (previous and baseline) for a report."""
    logger.info("Admin %s requesting comparison slices for report %s", admin_user.id, report_id)
    try:
        report = await db.get(AnalyticsReport, report_id)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analytics report not found")

        comparisons = report.baseline_snapshot if isinstance(report.baseline_snapshot, dict) else {}
        if not comparisons:
            return {"report_id": report_id, "comparisons": {}}

        payload: Dict[str, Any] = {
            "report_id": report_id,
            "generated_at": report.generated_at,
            "comparisons": {},
        }
        for key, slice_payload in comparisons.items():
            if not isinstance(slice_payload, dict):
                continue
            normalized = dict(slice_payload)
            reference_id = normalized.get("reference_report_id")
            if reference_id:
                reference_report = await db.get(AnalyticsReport, reference_id)
                if reference_report:
                    normalized["reference_summary"] = _report_history_item(reference_report)
            payload["comparisons"][key] = normalized
        return payload
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.error(
            "Error fetching comparison slices for admin %s report %s: %s",
            admin_user.id,
            report_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch comparison slices",
        ) from exc


@router.get("/{report_id}/excerpts")
async def get_topic_excerpts(
    report_id: int,
    topic: Optional[str] = Query(None, description="Filter excerpts for a specific topic"),
    limit: int = Query(3, ge=1, le=10),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Return anonymised topic excerpts captured in an analytics report."""
    logger.info(
        "Admin %s requesting topic excerpts for report %s (topic=%s, limit=%s)",
        admin_user.id,
        report_id,
        topic,
        limit,
    )
    try:
        report = await db.get(AnalyticsReport, report_id)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analytics report not found")

        groups = report.topic_excerpts or []
        if not isinstance(groups, list):
            groups = []

        def _normalize(group: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            topic_name = group.get("topic")
            if not topic_name:
                return None
            samples = group.get("samples") or []
            trimmed = samples[:limit]
            return {"topic": topic_name, "samples": trimmed}

        if topic:
            topic_lower = topic.lower()
            for group in groups:
                if isinstance(group, dict) and group.get("topic", "").lower() == topic_lower:
                    normalized = _normalize(group)
                    return normalized or {"topic": topic, "samples": []}
            return {"topic": topic, "samples": []}

        topics_payload = []
        for group in groups:
            if isinstance(group, dict):
                normalized = _normalize(group)
                if normalized:
                    topics_payload.append(normalized)
        return {"topics": topics_payload, "limit": limit}
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.error(
            "Error fetching topic excerpts for admin %s report %s: %s",
            admin_user.id,
            report_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch topic excerpts",
        ) from exc
