"""LangGraph state machine for Service Desk Agent (SDA).

This module implements the SDA workflow as a LangGraph StateGraph:
    ingest_escalation → create_case → calculate_sla → auto_assign → 
    notify_counsellor

The graph handles high/critical severity cases that require manual intervention
by licensed counsellors.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import SDAState
from app.agents.execution_tracker import execution_tracker
from app.core.settings import get_settings
from app.domains.mental_health.models import Case, CaseSeverityEnum, CaseStatusEnum
from app.services.event_bus import EventType, publish_event

logger = logging.getLogger(__name__)
settings = get_settings()


async def ingest_escalation_node(state: SDAState) -> SDAState:
    """Node: Ingest escalation signal from STA.
    
    Validates that this is a high/critical severity case requiring
    SDA intervention.
    
    Args:
        state: Current graph state with STA outputs
        
    Returns:
        Updated state with execution_path appended
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "sda::ingest_escalation", "sda")
    
    # Validate this should be escalated
    severity = state.get("severity", "low")
    if severity not in ("high", "critical"):
        state["errors"].append(
            f"SDA should only handle high/critical cases, got severity={severity}"
        )
        if execution_id:
            execution_tracker.fail_node(
                execution_id, 
                "sda::ingest_escalation", 
                f"Invalid severity: {severity}"
            )
        return state
    
    state["execution_path"].append("ingest_escalation")
    
    if execution_id:
        execution_tracker.complete_node(execution_id, "sda::ingest_escalation")
    
    logger.info(
        f"SDA ingested escalation: severity={severity}, "
        f"user_hash={state.get('user_hash')}"
    )
    return state


async def create_case_node(state: SDAState, db: AsyncSession) -> SDAState:
    """Node: Create case record for manual intervention.
    
    Creates Case in database with appropriate severity and metadata.
    
    Args:
        state: Current graph state
        db: Database session
        
    Returns:
        Updated state with case_id and case_created=True
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "sda::create_case", "sda")
    
    try:
        # Map severity to CaseSeverityEnum
        severity_map = {
            "low": CaseSeverityEnum.low,
            "moderate": CaseSeverityEnum.med,
            "high": CaseSeverityEnum.high,
            "critical": CaseSeverityEnum.critical
        }
        case_severity = severity_map.get(
            state.get("severity", "high").lower(),
            CaseSeverityEnum.high
        )
        
        # Generate case summary
        risk_score = state.get("risk_score", 0.0)
        intent = state.get("intent", "unknown")
        summary_redacted = (
            f"Risk score: {risk_score:.2f}, Intent: {intent}, "
            f"Severity: {state.get('severity', 'unknown')}"
        )
        
        # Create case
        case = Case(
            status=CaseStatusEnum.new,
            severity=case_severity,
            user_hash=state["user_hash"],
            session_id=state["session_id"],
            conversation_id=state.get("conversation_id"),
            summary_redacted=summary_redacted,
            triage_assessment_id=state.get("triage_assessment_id"),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(case)
        await db.flush()  # Get case.id
        
        state["case_id"] = case.id
        state["case_severity"] = case_severity.value
        state["case_created"] = True
        state["execution_path"].append("create_case")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "sda::create_case",
                metrics={
                    "case_id": str(case.id),
                    "severity": case_severity.value
                }
            )
        
        logger.info(f"SDA created case: ID={case.id}, severity={case_severity.value}")
        
    except Exception as e:
        error_msg = f"Case creation failed: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "sda::create_case", str(e))
    
    return state


async def calculate_sla_node(state: SDAState, db: AsyncSession) -> SDAState:
    """Node: Calculate SLA breach time based on severity.
    
    Critical cases: 30 minutes (default from settings)
    High cases: 60 minutes
    
    Args:
        state: Current graph state
        db: Database session
        
    Returns:
        Updated state with sla_breach_at timestamp
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "sda::calculate_sla", "sda")
    
    try:
        if not state.get("case_id"):
            raise ValueError("No case_id found")
        
        severity = state.get("case_severity", "high")
        
        # Calculate SLA based on severity
        if severity == "critical":
            sla_minutes = settings.sda_sla_minutes  # From settings (default 30)
        else:
            sla_minutes = 60  # 1 hour for high severity
        
        sla_breach_at = datetime.now() + timedelta(minutes=sla_minutes)
        
        # Update case in DB
        case = await db.get(Case, state["case_id"])
        if case:
            case.sla_breach_at = sla_breach_at  # type: ignore[assignment]
            case.updated_at = datetime.now()  # type: ignore[assignment]
            db.add(case)
            await db.flush()
        
        state["sla_breach_at"] = sla_breach_at.isoformat()
        state["execution_path"].append("calculate_sla")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "sda::calculate_sla",
                metrics={"sla_minutes": sla_minutes}
            )
        
        logger.info(f"SDA calculated SLA: breach at {sla_breach_at} ({sla_minutes} min)")
        
    except Exception as e:
        error_msg = f"SLA calculation failed: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "sda::calculate_sla", str(e))
    
    return state


async def auto_assign_node(state: SDAState, db: AsyncSession) -> SDAState:
    """Node: Auto-assign case to available counsellor (future enhancement).
    
    Currently a placeholder for future auto-assignment logic.
    Cases remain in 'new' status for manual assignment.
    
    Args:
        state: Current graph state
        db: Database session
        
    Returns:
        Updated state (no changes for now)
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "sda::auto_assign", "sda")
    
    try:
        # TODO: Implement auto-assignment logic
        # - Query available counsellors
        # - Check workload balancing
        # - Assign based on specialty/availability
        
        # For now, just log that auto-assignment is pending
        logger.info(
            f"SDA auto-assignment pending for case {state.get('case_id')} "
            f"(feature not yet implemented)"
        )
        
        state["execution_path"].append("auto_assign")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "sda::auto_assign",
                metrics={"assigned": False}
            )
        
    except Exception as e:
        error_msg = f"Auto-assignment failed: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "sda::auto_assign", str(e))
    
    return state


async def notify_counsellor_node(state: SDAState) -> SDAState:
    """Node: Emit event to notify counsellors of new case.
    
    Publishes event to event bus for real-time dashboard updates.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state after notification
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "sda::notify_counsellor", "sda")
    
    try:
        if not state.get("case_id"):
            raise ValueError("No case_id found")
        
        # Publish event for counsellor dashboard
        severity = state.get("case_severity", "high")
        event_type = (
            EventType.CRITICAL_RISK_DETECTED 
            if severity == "critical" 
            else EventType.HIGH_RISK_DETECTED
        )
        
        await publish_event(
            event_type=event_type,
            source_agent="sda",
            data={
                "case_id": str(state["case_id"]),
                "severity": severity,
                "user_hash": state.get("user_hash"),
                "session_id": state.get("session_id"),
                "sla_breach_at": state.get("sla_breach_at"),
                "triage_assessment_id": state.get("triage_assessment_id")
            }
        )
        
        state["execution_path"].append("notify_counsellor")
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "sda::notify_counsellor")
        
        logger.info(f"SDA notified counsellors of case {state['case_id']}")
        
    except Exception as e:
        error_msg = f"Counsellor notification failed: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "sda::notify_counsellor", str(e))
    
    return state


def create_sda_graph(db: AsyncSession) -> StateGraph:
    """Create the SDA LangGraph state machine.
    
    Graph structure:
        START → ingest_escalation → create_case → calculate_sla → 
        auto_assign → notify_counsellor → END
    
    Args:
        db: Database session for node operations
        
    Returns:
        Compiled StateGraph ready for execution
    """
    workflow = StateGraph(SDAState)
    
    # Add nodes
    workflow.add_node("ingest_escalation", ingest_escalation_node)
    workflow.add_node("create_case", lambda state: create_case_node(state, db))
    workflow.add_node("calculate_sla", lambda state: calculate_sla_node(state, db))
    workflow.add_node("auto_assign", lambda state: auto_assign_node(state, db))
    workflow.add_node("notify_counsellor", notify_counsellor_node)
    
    # Define linear flow
    workflow.set_entry_point("ingest_escalation")
    workflow.add_edge("ingest_escalation", "create_case")
    workflow.add_edge("create_case", "calculate_sla")
    workflow.add_edge("calculate_sla", "auto_assign")
    workflow.add_edge("auto_assign", "notify_counsellor")
    workflow.add_edge("notify_counsellor", END)
    
    return workflow.compile()
