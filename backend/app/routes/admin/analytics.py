"""Analytics endpoints for admin panel."""
from __future__ import annotations

import logging
import csv
import json
from datetime import datetime
from io import BytesIO, StringIO
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
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
        "predictive_signals": trends.get("predictive_signals", []),
        "threshold_alerts": trends.get("threshold_alerts", []),
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


def _format_export_value(value: Any) -> str:
    if isinstance(value, float):
        return f"{value:.2f}" if not value.is_integer() else str(int(value))
    if isinstance(value, (int, bool)):
        return str(value)
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    if value is None:
        return ""
    return str(value)


def _build_csv_export(report: Dict[str, Any]) -> bytes:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Section", "Item", "Value"])

    metrics = report.get("metrics", {}) or {}
    for key, value in metrics.items():
        writer.writerow(["Metrics", key, _format_export_value(value)])

    for topic in report.get("topic_breakdown", []) or []:
        writer.writerow(["Topic Breakdown", topic.get("topic", ""), topic.get("total_mentions", 0)])

    for signal in report.get("predictive_signals", []) or []:
        label = signal.get("topic") or signal.get("metric") or "metric"
        description = f"{signal.get('direction', 'flat')} forecast {signal.get('forecast', 0)} (confidence {signal.get('confidence', 0)})"
        writer.writerow(["Predictive Signals", label, description])

    for alert in report.get("threshold_alerts", []) or []:
        detail = f"value {alert.get('value')} / threshold {alert.get('threshold')}"
        writer.writerow(["Threshold Alerts", alert.get("name", ""), f"{detail} [{alert.get('severity', 'Low')}]"])

    for hotspot in (report.get("distress_heatmap", []) or [])[:5]:
        writer.writerow(["Distress Heatmap", f"{hotspot.get('day')} {hotspot.get('block')}", hotspot.get('count')])

    for rec in report.get("recommendations", []) or []:
        writer.writerow(["Recommendations", "Action", rec])

    return buffer.getvalue().encode("utf-8")


def _render_pdf_from_lines(lines: List[str]) -> bytes:
    if not lines:
        lines = ['Analytics export is empty']

    width, height = 595, 842
    max_lines_per_page = max(1, int((height - 100) / 16))
    pages = [lines[i : i + max_lines_per_page] for i in range(0, len(lines), max_lines_per_page)]
    if not pages:
        pages = [lines]

    buffer = BytesIO()
    buffer.write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets: Dict[int, int] = {}

    def write_object(obj_id: int, payload: bytes) -> None:
        offsets[obj_id] = buffer.tell()
        buffer.write(f'{obj_id} 0 obj\n'.encode('latin-1'))
        buffer.write(payload)
        if not payload.endswith(b'\n'):
            buffer.write(b'\n')
        buffer.write(b'endobj\n')

    font_id = 3 + 2 * len(pages)
    page_ids: List[int] = []
    base_page_id = 3

    for index, page_lines in enumerate(pages):
        page_id = base_page_id + index * 2
        content_id = page_id + 1
        page_ids.append(page_id)
        text_rows = ['BT', '/F1 12 Tf']
        cursor = height - 60
        for line in page_lines:
            sanitized = line.replace('\\', '\\').replace('(', '\(').replace(')', '\)')
            text_rows.append(f'1 0 0 1 50 {cursor:.2f} Tm ({sanitized}) Tj')
            cursor -= 16
        text_rows.append('ET')
        stream_content = '\n'.join(text_rows).encode('latin-1')
        stream_payload = f'<< /Length {len(stream_content)} >>\nstream\n'.encode('latin-1') + stream_content + b'\nendstream\n'
        write_object(content_id, stream_payload)
        page_payload = (
            f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] '
            f'/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>\n'
        )
        write_object(page_id, ''.join(page_payload).encode('latin-1'))

    kids = ' '.join(f'{pid} 0 R' for pid in page_ids)
    pages_payload = f'<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>\n'.encode('latin-1')
    write_object(2, pages_payload)
    catalog_payload = b'<< /Type /Catalog /Pages 2 0 R >>\n'
    write_object(1, catalog_payload)
    font_payload = b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n'
    write_object(font_id, font_payload)

    xref_start = buffer.tell()
    total_objects = font_id
    buffer.write(f'xref\n0 {total_objects + 1}\n'.encode('latin-1'))
    buffer.write(b'0000000000 65535 f \n')
    for obj_id in range(1, total_objects + 1):
        offset = offsets.get(obj_id, 0)
        buffer.write(f'{offset:010d} 00000 n \n'.encode('latin-1'))
    buffer.write(f'trailer << /Size {total_objects + 1} /Root 1 0 R >>\n'.encode('latin-1'))
    buffer.write(f'startxref\n{xref_start}\n%%EOF'.encode('latin-1'))
    return buffer.getvalue()


def _build_pdf_export(report: Dict[str, Any]) -> bytes:
    lines: List[str] = []
    period = report.get("report_period", "")
    generated_at = report.get("generated_at")
    lines.append("UGM AI Care - Analytics Export")
    if period:
        lines.append(f"Reporting window: {period}")
    if generated_at:
        lines.append(f"Generated at: {generated_at}")
    window_start = report.get("window_start")
    window_end = report.get("window_end")
    if window_start or window_end:
        lines.append(f"Window range: {window_start or 'n/a'} - {window_end or 'n/a'}")
    lines.append("")
    lines.append("Key Metrics")
    metrics = report.get("metrics", {}) or {}
    for key, value in metrics.items():
        lines.append(f"- {key}: {_format_export_value(value)}")
    lines.append("")
    lines.append("Predictive Signals")
    signals = report.get("predictive_signals", []) or []
    if not signals:
        lines.append("- None recorded")
    else:
        for signal in signals[:5]:
            title = signal.get("topic") or signal.get("metric")
            lines.append(
                f"- {title}: direction {signal.get('direction')} forecast {signal.get('forecast')} (confidence {signal.get('confidence')})"
            )
    lines.append("")
    lines.append("Threshold Alerts")
    alerts = report.get("threshold_alerts", []) or []
    if not alerts:
        lines.append("- No active alerts")
    else:
        for alert in alerts:
            lines.append(
                f"- {alert.get('name')}: {alert.get('severity')} - value {alert.get('value')} threshold {alert.get('threshold')}"
            )
    lines.append("")
    lines.append("Top Topics")
    topics = report.get("topic_breakdown", []) or []
    if not topics:
        lines.append("- No topics available")
    else:
        for entry in topics[:5]:
            lines.append(f"- {entry.get('topic')}: {entry.get('total_mentions')} mentions")
    lines.append("")
    recommendations = report.get("recommendations", []) or []
    if recommendations:
        lines.append("Recommendations")
        for idx, rec in enumerate(recommendations, start=1):
            lines.append(f"{idx}. {rec}")

    return _render_pdf_from_lines(lines)



@router.get("/{report_id}/export.csv")
async def export_report_csv(
    report_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    logger.info("Admin %s exporting analytics report %s as CSV", admin_user.id, report_id)
    report = await db.get(AnalyticsReport, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analytics report not found")

    payload = _serialize_report(report)
    csv_bytes = _build_csv_export(payload)
    generated_at = report.generated_at or datetime.utcnow()
    filename = f"analytics-report-{generated_at.strftime('%Y%m%d-%H%M%S')}.csv"
    return StreamingResponse(
        BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


@router.get("/{report_id}/export.pdf")
async def export_report_pdf(
    report_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    logger.info("Admin %s exporting analytics report %s as PDF", admin_user.id, report_id)
    report = await db.get(AnalyticsReport, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analytics report not found")

    payload = _serialize_report(report)
    pdf_bytes = _build_pdf_export(payload)
    generated_at = report.generated_at or datetime.utcnow()
    filename = f"analytics-report-{generated_at.strftime('%Y%m%d-%H%M%S')}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


