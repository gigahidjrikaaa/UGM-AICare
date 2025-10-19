"""Event bus integration for SSE alerts broadcasting.

This module subscribes to critical events from the event bus and
broadcasts them to connected SSE clients as real-time alerts.
"""

import logging
from datetime import datetime
from uuid import UUID

from app.models.alerts import AlertSeverity, AlertType
from app.services.event_bus import Event, EventType, get_event_bus
from app.services.sse_broadcaster import get_broadcaster

logger = logging.getLogger(__name__)


async def handle_case_created_event(event: Event) -> None:
    """Handle CASE_CREATED event and broadcast alert.
    
    Args:
        event: The case creation event
    """
    try:
        broadcaster = get_broadcaster()
        
        # Extract case data from event
        case_id = event.data.get("case_id")
        severity = event.data.get("severity", "medium")
        title = event.data.get("title", "New Case Created")
        
        # Map case severity to alert severity
        severity_mapping = {
            "critical": AlertSeverity.CRITICAL,
            "high": AlertSeverity.HIGH,
            "medium": AlertSeverity.MEDIUM,
            "low": AlertSeverity.LOW
        }
        alert_severity = severity_mapping.get(severity, AlertSeverity.MEDIUM)
        
        # Broadcast to all connected admins
        await broadcaster.broadcast(
            event_type="alert_created",
            data={
                "alert_type": AlertType.CASE_CREATED.value,
                "severity": alert_severity.value,
                "title": title,
                "message": f"Case #{case_id} requires attention",
                "link": f"/admin/cases/{case_id}",
                "timestamp": datetime.utcnow().isoformat(),
                "case_id": case_id
            }
        )
        
        logger.info(f"Broadcasted case_created alert for case {case_id}")
        
    except Exception as e:
        logger.error(f"Failed to handle case_created event: {e}", exc_info=True)


async def handle_sla_breach_event(event: Event) -> None:
    """Handle SLA_BREACH event and broadcast critical alert.
    
    Args:
        event: The SLA breach event
    """
    try:
        broadcaster = get_broadcaster()
        
        case_id = event.data.get("case_id")
        assigned_to = event.data.get("assigned_to", "Unassigned")
        breach_time = event.data.get("breach_time")
        
        # SLA breaches are always critical
        await broadcaster.broadcast(
            event_type="sla_breach",
            data={
                "alert_type": AlertType.SLA_BREACH.value,
                "severity": AlertSeverity.CRITICAL.value,
                "title": "⚠️ SLA Breach Detected",
                "message": f"Case #{case_id} has breached SLA (Assigned to: {assigned_to})",
                "link": f"/admin/cases/{case_id}",
                "timestamp": datetime.utcnow().isoformat(),
                "case_id": case_id,
                "assigned_to": assigned_to,
                "breach_time": breach_time
            }
        )
        
        logger.warning(f"Broadcasted SLA breach alert for case {case_id}")
        
    except Exception as e:
        logger.error(f"Failed to handle sla_breach event: {e}", exc_info=True)


async def handle_ia_report_generated_event(event: Event) -> None:
    """Handle IA_REPORT_GENERATED event and broadcast notification.
    
    Args:
        event: The IA report generation event
    """
    try:
        broadcaster = get_broadcaster()
        
        report_id = event.data.get("report_id")
        report_type = event.data.get("report_type", "weekly")
        period_start = event.data.get("period_start")
        period_end = event.data.get("period_end")
        high_risk_count = event.data.get("high_risk_count", 0)
        
        # Determine severity based on high-risk count
        if high_risk_count > 10:
            severity = AlertSeverity.HIGH
        elif high_risk_count > 5:
            severity = AlertSeverity.MEDIUM
        else:
            severity = AlertSeverity.INFO
        
        await broadcaster.broadcast(
            event_type="ia_report_generated",
            data={
                "alert_type": AlertType.IA_REPORT_GENERATED.value,
                "severity": severity.value,
                "title": f"📊 New {report_type.capitalize()} IA Report",
                "message": f"Insights report generated ({high_risk_count} high-risk cases identified)",
                "link": f"/admin/insights/reports/{report_id}",
                "timestamp": datetime.utcnow().isoformat(),
                "report_id": report_id,
                "report_type": report_type,
                "period_start": period_start,
                "period_end": period_end,
                "high_risk_count": high_risk_count
            }
        )
        
        logger.info(f"Broadcasted IA report generated alert for report {report_id}")
        
    except Exception as e:
        logger.error(f"Failed to handle ia_report_generated event: {e}", exc_info=True)


async def handle_case_status_changed_event(event: Event) -> None:
    """Handle CASE_STATUS_CHANGED event and broadcast update.
    
    Args:
        event: The case status change event
    """
    try:
        broadcaster = get_broadcaster()
        
        case_id = event.data.get("case_id")
        old_status = event.data.get("old_status")
        new_status = event.data.get("new_status")
        changed_by = event.data.get("changed_by")
        
        # Only broadcast for significant status changes
        significant_changes = {
            ("new", "in_progress"),
            ("in_progress", "closed"),
            ("waiting", "in_progress"),
            ("new", "closed")
        }
        
        if (old_status, new_status) in significant_changes:
            await broadcaster.broadcast(
                event_type="case_updated",
                data={
                    "alert_type": AlertType.CASE_CREATED.value,  # Reuse case_created type
                    "severity": AlertSeverity.INFO.value,
                    "title": "Case Status Updated",
                    "message": f"Case #{case_id} status changed: {old_status} → {new_status}",
                    "link": f"/admin/cases/{case_id}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "case_id": case_id,
                    "old_status": old_status,
                    "new_status": new_status,
                    "changed_by": changed_by
                }
            )
            
            logger.info(f"Broadcasted case status change for case {case_id}")
        
    except Exception as e:
        logger.error(f"Failed to handle case_status_changed event: {e}", exc_info=True)


async def handle_high_risk_detected_event(event: Event) -> None:
    """Handle HIGH_RISK_DETECTED event and broadcast alert.
    
    Args:
        event: The high-risk detection event
    """
    try:
        broadcaster = get_broadcaster()
        
        user_hash = event.data.get("user_hash")
        risk_factors = event.data.get("risk_factors", [])
        severity = event.data.get("severity", "high")
        
        await broadcaster.broadcast(
            event_type="alert_created",
            data={
                "alert_type": AlertType.SYSTEM_NOTIFICATION.value,
                "severity": AlertSeverity.HIGH.value,
                "title": "⚠️ High-Risk User Detected",
                "message": f"High-risk indicators detected: {', '.join(risk_factors[:3])}",
                "link": "/admin/dashboard",
                "timestamp": datetime.utcnow().isoformat(),
                "user_hash": user_hash,
                "risk_factors": risk_factors,
                "severity": severity
            }
        )
        
        logger.warning(f"Broadcasted high-risk detection alert for user {user_hash}")
        
    except Exception as e:
        logger.error(f"Failed to handle high_risk_detected event: {e}", exc_info=True)


async def handle_critical_risk_detected_event(event: Event) -> None:
    """Handle CRITICAL_RISK_DETECTED event and broadcast urgent alert.
    
    Args:
        event: The critical-risk detection event
    """
    try:
        broadcaster = get_broadcaster()
        
        user_hash = event.data.get("user_hash")
        risk_factors = event.data.get("risk_factors", [])
        case_id = event.data.get("case_id")
        
        await broadcaster.broadcast(
            event_type="alert_created",
            data={
                "alert_type": AlertType.SYSTEM_NOTIFICATION.value,
                "severity": AlertSeverity.CRITICAL.value,
                "title": "🚨 CRITICAL: Immediate Intervention Required",
                "message": f"Critical risk detected: {', '.join(risk_factors[:3])}",
                "link": f"/admin/cases/{case_id}" if case_id else "/admin/dashboard",
                "timestamp": datetime.utcnow().isoformat(),
                "user_hash": user_hash,
                "risk_factors": risk_factors,
                "case_id": case_id
            }
        )
        
        logger.critical(f"Broadcasted critical-risk alert for user {user_hash}")
        
    except Exception as e:
        logger.error(f"Failed to handle critical_risk_detected event: {e}", exc_info=True)


async def initialize_event_subscriptions() -> None:
    """Initialize all event bus subscriptions for SSE broadcasting.
    
    This should be called during application startup to set up all
    event handlers that broadcast to SSE clients.
    """
    try:
        bus = get_event_bus()
        
        # Subscribe to all relevant events
        await bus.subscribe(EventType.CASE_CREATED, handle_case_created_event)
        await bus.subscribe(EventType.SLA_BREACH, handle_sla_breach_event)
        await bus.subscribe(EventType.IA_REPORT_GENERATED, handle_ia_report_generated_event)
        await bus.subscribe(EventType.CASE_STATUS_CHANGED, handle_case_status_changed_event)
        await bus.subscribe(EventType.HIGH_RISK_DETECTED, handle_high_risk_detected_event)
        await bus.subscribe(EventType.CRITICAL_RISK_DETECTED, handle_critical_risk_detected_event)
        
        logger.info("✅ Event bus subscriptions initialized for SSE broadcasting")
        logger.info(f"   - Subscribed to {EventType.CASE_CREATED.value}")
        logger.info(f"   - Subscribed to {EventType.SLA_BREACH.value}")
        logger.info(f"   - Subscribed to {EventType.IA_REPORT_GENERATED.value}")
        logger.info(f"   - Subscribed to {EventType.CASE_STATUS_CHANGED.value}")
        logger.info(f"   - Subscribed to {EventType.HIGH_RISK_DETECTED.value}")
        logger.info(f"   - Subscribed to {EventType.CRITICAL_RISK_DETECTED.value}")
        
    except Exception as e:
        logger.error(f"Failed to initialize event subscriptions: {e}", exc_info=True)
        raise
