"""Analytics endpoints for admin panel."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.analytics_agent import AnalyticsAgent
from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import AnalyticsReport, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Admin - Analytics"])


def _serialize_report(model: AnalyticsReport) -> dict:
    trends = model.trends or {}
    return {
        "id": model.id,
        "generated_at": model.generated_at,
        "report_period": model.report_period,
        "insights": model.insights or [],
        "patterns": trends.get("patterns", []),
        "recommendations": model.recommendations or [],
        "metrics": trends.get("metrics", {}),
        "topic_breakdown": trends.get("topic_breakdown", []),
        "theme_trends": trends.get("theme_trends", []),
        "distress_heatmap": trends.get("distress_heatmap", []),
        "segment_alerts": trends.get("segment_alerts", []),
        "high_risk_users": trends.get("high_risk_users", []),
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
