from __future__ import annotations

import logging
from datetime import datetime, timedelta

from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from langchain_core.runnables import RunnableConfig
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User as AppUser

from app.agents.graph_state import CMAState
from app.agents.execution_tracker import execution_tracker
from app.core.settings import get_settings
from app.domains.mental_health.models import Case, CaseSeverityEnum, CaseStatusEnum
from app.domains.mental_health.models.appointments import Counselor, Appointment
from app.models.system import CaseAssignment
from app.services.event_bus import EventType, publish_event
from app.core.langfuse_config import trace_agent

logger = logging.getLogger(__name__)
settings = get_settings()


@trace_agent("CMA_Ingest")
async def ingest_escalation_node(state: CMAState) -> CMAState:
    """Node: Ingest escalation signal from STA.
    
    Validates that this is a high/critical severity case requiring
    CMA intervention.
    
    Args:
        state: Current graph state with STA outputs
        
    Returns:
        Updated state with execution_path appended
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "cma::ingest_escalation", "cma")
    
    # Validate this should be escalated
    severity = state.get("sta_context", {}).get("severity", "low")
    if severity not in ("high", "critical"):
        errors = state.get("errors", [])
        errors.append(
            f"CMA should only handle high/critical cases, got severity={severity}"
        )
        state["errors"] = errors
        if execution_id:
            execution_tracker.fail_node(
                execution_id, 
                "cma::ingest_escalation", 
                f"Invalid severity: {severity}"
            )
        return state
    
    execution_path = state.get("execution_path", [])
    execution_path.append("ingest_escalation")
    state["execution_path"] = execution_path
    
    if execution_id:
        execution_tracker.complete_node(execution_id, "cma::ingest_escalation")
    
    logger.info(
        f"CMA ingested escalation: severity={severity}, "
        f"user_hash={state.get('user_hash')}"
    )
    return state


@trace_agent("CMA_CreateCase")
async def create_case_node(state: CMAState, config: RunnableConfig) -> CMAState:
    """Node: Create case record for manual intervention.
    
    Creates Case in database with appropriate severity and metadata.
    
    Args:
        state: Current graph state
        config: LangGraph runtime config carrying ``db`` under ``config["configurable"]["db"]``
        
    Returns:
        Updated state with case_id and case_created=True
    """
    db: AsyncSession = config["configurable"]["db"]
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "cma::create_case", "cma")
    
    try:
        # Map severity to CaseSeverityEnum
        severity_map = {
            "low": CaseSeverityEnum.low,
            "moderate": CaseSeverityEnum.med,
            "high": CaseSeverityEnum.high,
            "critical": CaseSeverityEnum.critical
        }
        case_severity = severity_map.get(
            state.get("sta_context", {}).get("severity", "high").lower(),
            CaseSeverityEnum.high
        )
        
        # Generate case summary
        risk_score = state.get("sta_context", {}).get("risk_score", 0.0)
        intent = state.get("sta_context", {}).get("intent", "unknown")
        severity = state.get("sta_context", {}).get("severity", "unknown")
        summary_redacted = (
            f"Risk score: {risk_score:.2f}, Intent: {intent}, "
            f"Severity: {severity}"
        )
        
        # Create case
        case = Case(
            status=CaseStatusEnum.new,
            severity=case_severity,
            user_hash=state.get("user_hash", ""),
            session_id=state.get("session_id", ""),
            conversation_id=state.get("conversation_id"),
            summary_redacted=summary_redacted,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(case)
        await db.flush()  # Get case.id
        await db.refresh(case)  # Ensure id is loaded
        
        state.setdefault("cma_context", {})["case_id"] = str(case.id)  # Cast UUID to string for state
        state.setdefault("cma_context", {})["case_severity"] = case_severity.value
        state.setdefault("cma_context", {})["case_created"] = True
        execution_path = state.get("execution_path", [])
        execution_path.append("create_case")
        state["execution_path"] = execution_path
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "cma::create_case",
                metrics={
                    "case_id": str(case.id),
                    "severity": case_severity.value
                }
            )
        
        logger.info(f"CMA created case: ID={case.id}, severity={case_severity.value}")
        
    except Exception as e:
        error_msg = f"Case creation failed: {str(e)}"
        errors = state.get("errors", [])
        errors.append(error_msg)
        state["errors"] = errors
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "cma::create_case", str(e))
    
    return state


@trace_agent("CMA_CalculateSLA")
async def calculate_sla_node(state: CMAState, config: RunnableConfig) -> CMAState:
    """Node: Calculate SLA breach time based on severity.
    
    Critical cases: 30 minutes (default from settings)
    High cases: 60 minutes
    
    Args:
        state: Current graph state
        config: LangGraph runtime config carrying ``db`` under ``config["configurable"]["db"]``
        
    Returns:
        Updated state with sla_breach_at timestamp
    """
    db: AsyncSession = config["configurable"]["db"]
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "cma::calculate_sla", "cma")
    
    try:
        if not state.get("cma_context", {}).get("case_id"):
            raise ValueError("No case_id found")
        
        severity = state.get("cma_context", {}).get("case_severity", "high")
        
        # Calculate SLA based on severity
        if severity == "critical":
            sla_minutes = settings.sda_sla_minutes  # From settings (default 30)
        else:
            sla_minutes = 60  # 1 hour for high severity
        
        sla_breach_at = datetime.now() + timedelta(minutes=sla_minutes)
        
        # Update case in DB
        case_id = state.get("cma_context", {}).get("case_id")
        if case_id:
            case = await db.get(Case, case_id)
            if case:
                case.sla_breach_at = sla_breach_at  # type: ignore[assignment]
                case.updated_at = datetime.now()  # type: ignore[assignment]
                db.add(case)
                await db.flush()
        
        state.setdefault("cma_context", {})["sla_breach_at"] = sla_breach_at.isoformat()
        execution_path = state.get("execution_path", [])
        execution_path.append("calculate_sla")
        state["execution_path"] = execution_path
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "cma::calculate_sla",
                metrics={"sla_minutes": sla_minutes}
            )
        
        logger.info(f"CMA calculated SLA: breach at {sla_breach_at} ({sla_minutes} min)")
        
    except Exception as e:
        error_msg = f"SLA calculation failed: {str(e)}"
        errors = state.get("errors", [])
        errors.append(error_msg)
        state["errors"] = errors
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "cma::calculate_sla", str(e))
    
    return state


@trace_agent("CMA_AutoAssign")
async def auto_assign_node(state: CMAState, config: RunnableConfig) -> CMAState:
    """Node: Auto-assign case to available counsellor with workload balancing.
    
    Assignment algorithm:
    1. Query all counsellors (role='counselor')
    2. Count active cases per counsellor (status in new/in_progress/waiting)
    3. Assign to counsellor with lowest workload
    4. Create CaseAssignment record for audit trail
    5. Update Case.assigned_to and status to 'in_progress'
    
    If no counsellors available, case remains in 'new' status for manual assignment.
    
    Args:
        state: Current graph state with case_id
        config: LangGraph runtime config carrying ``db`` under ``config["configurable"]["db"]``
        
    Returns:
        Updated state with assigned_to (if successful) and assignment_id
    """
    db: AsyncSession = config["configurable"]["db"]
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "cma::auto_assign", "cma")
    
    try:
        case_id = state.get("cma_context", {}).get("case_id")
        if not case_id:
            raise ValueError("No case_id found for assignment")
        
        # Step 1: Query all available counsellors from counselors table.
        # Guard: only include profiles whose linked User account is active with
        # a counselor or admin role. Profiles without a linked user_id are kept
        # to support legacy/standalone records — they should be rare in production.
        counsellors_stmt = (
            select(Counselor)
            .join(AppUser, AppUser.id == Counselor.user_id, isouter=True)
            .where(
                Counselor.is_available == True,  # noqa: E712
                or_(
                    Counselor.user_id.is_(None),
                    AppUser.role.in_(["counselor", "admin"]),
                ),
            )
        )
        counsellors_result = await db.execute(counsellors_stmt)
        counsellors = counsellors_result.scalars().all()
        
        if not counsellors:
            logger.warning("No counsellors available for auto-assignment")
            execution_path = state.get("execution_path", [])
            execution_path.append("auto_assign")
            state["execution_path"] = execution_path
            state.setdefault("cma_context", {})["assigned_to"] = None
            state.setdefault("cma_context", {})["assignment_reason"] = "no_counsellors_available"
            
            if execution_id:
                execution_tracker.complete_node(
                    execution_id, 
                    "cma::auto_assign",
                    metrics={
                        "assigned": False,
                        "reason": "no_counsellors_available"
                    }
                )
            return state
        
        # Step 2: Count active cases per counsellor
        # Active cases = status in (new, in_progress, waiting)
        active_statuses = [
            CaseStatusEnum.new,
            CaseStatusEnum.in_progress,
            CaseStatusEnum.waiting
        ]
        
        counsellor_workload = {}
        for counsellor in counsellors:
            # Convert counselor.id to string for comparison with Case.assigned_to (String field)
            counsellor_id_str = str(counsellor.id)
            workload_stmt = select(func.count(Case.id)).where(
                Case.assigned_to == counsellor_id_str,
                Case.status.in_(active_statuses)
            )
            workload_result = await db.execute(workload_stmt)
            workload_count = workload_result.scalar_one()
            counsellor_workload[counsellor.id] = workload_count
        
        # Step 3: Select counsellor with lowest workload
        # If tie, pick the first one (could be randomized or round-robin in future)
        assigned_counsellor_id = min(
            counsellor_workload.keys(),
            key=lambda cid: counsellor_workload[cid]
        )
        assigned_workload = counsellor_workload[assigned_counsellor_id]
        
        # Convert to string for storage (Case.assigned_to is String type)
        assigned_counsellor_id_str = str(assigned_counsellor_id)
        
        # Step 4-5: Create CaseAssignment + update Case inside a savepoint.
        # This prevents a single FK issue from poisoning the whole request session.
        async with db.begin_nested():
            # Ensure corresponding agent_users row exists.
            # Case.assigned_to references agent_users.id, but we store counselor.id as str.
            from app.models.agent_user import AgentUser, AgentRoleEnum

            agent_user = await db.get(AgentUser, assigned_counsellor_id_str)
            if agent_user is None:
                db.add(AgentUser(id=assigned_counsellor_id_str, role=AgentRoleEnum.counselor))
                await db.flush()

            assignment = CaseAssignment(
                case_id=case_id,
                assigned_to=assigned_counsellor_id_str,
                assigned_by=None,  # System auto-assignment (no user)
                assigned_at=datetime.now(),
                reassignment_reason=None,  # First assignment, not a reassignment
                previous_assignee=None,
            )
            db.add(assignment)
            await db.flush()  # Get assignment.id

            case = await db.get(Case, case_id)
            if case:
                case.assigned_to = assigned_counsellor_id_str  # type: ignore[assignment]
                case.status = CaseStatusEnum.in_progress  # type: ignore[assignment]
                case.updated_at = datetime.now()  # type: ignore[assignment]
                db.add(case)
                await db.flush()
        
        # Update state
        state.setdefault("cma_context", {})["assigned_to"] = assigned_counsellor_id_str
        state.setdefault("cma_context", {})["assignment_id"] = str(assignment.id)
        state.setdefault("cma_context", {})["assignment_reason"] = "auto_assigned_lowest_workload"
        state.setdefault("cma_context", {})["assigned_workload"] = assigned_workload

        await publish_event(
            event_type=EventType.CASE_ASSIGNED,
            source_agent="cma",
            data={
                "case_id": str(case_id),
                "assigned_to": assigned_counsellor_id_str,
                "assigned_by": None,
                "is_reassignment": False,
                "previous_assignee": None,
            },
        )

        # Record an immutable audit trail for this system-driven assignment.
        # AttestationRecord requires a human counselor_id, so the CMA tier uses
        # ComplianceAuditLog (actor_id=None, actor_role="cma") for the DB layer
        # and enqueues an AutopilotAction(publish_attestation) to anchor the
        # assignment hash on-chain — providing full traceability without
        # misattributing a system action to a human actor.
        try:
            from app.services.compliance_service import record_audit_event
            from app.domains.mental_health.services.autopilot_action_service import (
                enqueue_action,
                hash_payload,
                build_idempotency_key,
            )
            from app.domains.mental_health.models.autopilot_actions import (
                AutopilotActionType,
            )

            severity_val = state.get("cma_context", {}).get("case_severity", "high")
            att_payload: dict = {
                "schema": "aicare.case.auto_assignment.v1",
                "attestation_type": "case_auto_assignment",
                "case_id": str(case_id),
                "assigned_to": assigned_counsellor_id_str,
                "assignment_id": str(assignment.id),
                "severity": severity_val,
                "user_hash": state.get("user_hash", ""),
                "session_id": state.get("session_id"),
                "assigned_at": datetime.now().isoformat(),
                "assignment_reason": "auto_assigned_lowest_workload",
                "workload_at_assignment": int(assigned_workload),
                "agent": "cma",
            }
            payload_hash = hash_payload(att_payload)

            att_action = await enqueue_action(
                db,
                action_type=AutopilotActionType.publish_attestation,
                risk_level=severity_val,
                idempotency_key=build_idempotency_key(
                    f"cma-auto-assignment:{case_id}:{assignment.id}"
                ),
                payload_json={
                    **att_payload,
                    "payload_hash": f"0x{payload_hash}",
                    "metadata_uri": "",
                },
                commit=False,
            )

            await record_audit_event(
                db,
                actor_id=None,
                actor_role="cma",
                action="cma.case_auto_assigned",
                entity_type="case",
                entity_id=str(case_id),
                extra_data={
                    "assignment_id": str(assignment.id),
                    "assigned_to": assigned_counsellor_id_str,
                    "severity": severity_val,
                    "autopilot_action_id": int(att_action.id),
                    "payload_hash": payload_hash,
                },
            )

            state["assignment_attestation_action_id"] = int(att_action.id)
            logger.info(
                "CMA assignment audit + attestation action queued: action_id=%s, case=%s",
                att_action.id,
                case_id,
            )
        except Exception as att_err:
            # Attestation pipeline failure must never block the core assignment.
            logger.warning(
                "Failed to queue CMA assignment attestation for case %s: %s",
                case_id,
                att_err,
            )

        execution_path = state.get("execution_path", [])
        execution_path.append("auto_assign")
        state["execution_path"] = execution_path
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "cma::auto_assign",
                metrics={
                    "assigned": True,
                    "counsellor_id": assigned_counsellor_id,
                    "workload": assigned_workload,
                    "total_counsellors": len(counsellors)
                }
            )
        
        logger.info(
            f"CMA auto-assigned case {case_id} to counsellor {assigned_counsellor_id} "
            f"(workload: {assigned_workload} active cases)"
        )
        
    except Exception as e:
        error_msg = f"Auto-assignment failed: {str(e)}"
        errors = state.get("errors", [])
        errors.append(error_msg)
        state["errors"] = errors
        logger.error(error_msg, exc_info=True)

        # If an error happened after a flush attempt, the session may be in a
        # failed transaction state. Best-effort rollback keeps the outer request
        # usable (e.g., for saving the final conversation).
        try:
            await db.rollback()
        except Exception:
            pass
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "cma::auto_assign", str(e))
    
    return state


@trace_agent("CMA_NotifyCounsellor")
async def notify_counsellor_node(state: CMAState) -> CMAState:
    """Node: Emit event to notify counsellors of new case.
    
    Publishes event to event bus for real-time dashboard updates.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state after notification
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "cma::notify_counsellor", "cma")
    
    try:
        if not state.get("cma_context", {}).get("case_id"):
            raise ValueError("No case_id found")
        
        # Publish event for counsellor dashboard
        severity = state.get("cma_context", {}).get("case_severity", "high")
        event_type = (
            EventType.CRITICAL_RISK_DETECTED 
            if severity == "critical" 
            else EventType.HIGH_RISK_DETECTED
        )
        
        await publish_event(
            event_type=event_type,
            source_agent="cma",
            data={
                "case_id": str(state.get("cma_context", {}).get("case_id")),
                "assigned_to": state.get("cma_context", {}).get("assigned_to"),
                "severity": severity,
                "user_hash": state.get("user_hash"),
                "session_id": state.get("session_id"),
                "sla_breach_at": state.get("cma_context", {}).get("sla_breach_at"),
                "triage_assessment_id": state.get("sta_context", {}).get("triage_assessment_id")
            }
        )
        
        execution_path = state.get("execution_path", [])
        execution_path.append("notify_counsellor")
        state["execution_path"] = execution_path
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "cma::notify_counsellor")
        
        logger.info(
            "CMA notified counsellors of case %s",
            (state.get("cma_context") or {}).get("case_id"),
        )
        
    except Exception as e:
        error_msg = f"Counsellor notification failed: {str(e)}"
        errors = state.get("errors", [])
        errors.append(error_msg)
        state["errors"] = errors
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "cma::notify_counsellor", str(e))
    
    return state


@trace_agent("CMA_ScheduleAppointment")
async def schedule_appointment_node(state: CMAState, config: RunnableConfig) -> CMAState:
    """Node: Schedule appointment with counselor (LLM-powered).
    
    This node uses Gemini 2.5 Flash to intelligently schedule appointments
    based on student preferences, counselor availability, and case context.
    
    Workflow:
    1. Check if scheduling is requested (via state["schedule_appointment"])
    2. Use LLM to analyze scheduling preferences and context
    3. Find optimal counselor based on case severity and availability
    4. Query available time slots
    5. Use LLM to select best slot matching student preferences
    6. Create Appointment record
    7. Update state with appointment details
    
    Args:
        state: Current graph state with scheduling request
        config: LangGraph runtime config carrying ``db`` under ``config["configurable"]["db"]``
        
    Returns:
        Updated state with appointment_id and confirmation
    """
    db: AsyncSession = config["configurable"]["db"]
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "cma::schedule_appointment", "cma")
    
    try:
        # Check if scheduling is requested
        if not state.get("cma_context", {}).get("schedule_appointment", False):
            logger.info("Scheduling not requested, skipping appointment node")
            if execution_id:
                execution_tracker.complete_node(execution_id, "cma::schedule_appointment")
            return state
        
        user_id = state.get("user_id")
        assigned_counsellor_id = state.get("cma_context", {}).get("assigned_counsellor_id")
        severity = state.get("sta_context", {}).get("severity", "high")
        preferred_time = state.get("cma_context", {}).get("preferred_time")
        scheduling_context = state.get("cma_context", {}).get("scheduling_context", {})
        
        if not user_id:
            raise ValueError("user_id required for scheduling")
        
        # Step 1: Determine which counselor to book with
        # Priority: assigned counselor > LLM-selected based on availability
        counselor_id = state.get("cma_context", {}).get("counselor_id")
        
        if not counselor_id and assigned_counsellor_id:
            # Assigned counselor is a User row; Counselor.user_id references
            # users.id, so look the counselor profile up directly.
            psych_result = await db.execute(
                select(Counselor).where(Counselor.user_id == assigned_counsellor_id)
            )
            counselor = psych_result.scalar_one_or_none()
            if counselor:
                counselor_id = counselor.id

        # If no counselor found yet, deterministically select best available
        if not counselor_id:
            logger.info("No counselor assigned, selecting best available match")
            counselor_id = await _select_optimal_counselor(
                db=db,
                severity=severity,
                preferences=scheduling_context or {}
            )
        
        if not counselor_id:
            raise ValueError("No available counselor found for appointment")
        
        # Step 2: Get counselor details
        psych_result = await db.execute(
            select(Counselor).where(Counselor.id == counselor_id)
        )
        counselor = psych_result.scalar_one_or_none()
        
        if not counselor or not counselor.is_available:
            raise ValueError(f"Counselor {counselor_id} not available")
        
        # Step 3: Use LLM to find optimal appointment time
        appointment_datetime = await _find_optimal_appointment_time(
            db=db,
            counselor=counselor,
            preferred_time=preferred_time,
            severity=severity,
            scheduling_context=scheduling_context or {}
        )
        
        if not appointment_datetime:
            raise ValueError("No suitable appointment time found")
        
        # Step 4: Create appointment
        # Determine appointment type based on severity
        appointment_type_id = 3 if severity == "critical" else 1  # 3=Crisis, 1=Initial
        
        new_appointment = Appointment(
            user_id=user_id,
            counselor_id=counselor_id,
            appointment_type_id=appointment_type_id,
            appointment_datetime=appointment_datetime,
            notes="Auto-scheduled by CMA. Case severity: {}. Case ID: {}".format(
                severity, (state.get("cma_context") or {}).get("case_id")
            ),
            status="scheduled"
        )
        
        db.add(new_appointment)
        await db.commit()
        await db.refresh(new_appointment)
        
        # Update state
        state.setdefault("cma_context", {})["appointment_id"] = new_appointment.id
        state.setdefault("cma_context", {})["appointment_datetime"] = appointment_datetime.isoformat()
        state.setdefault("cma_context", {})["appointment_confirmed"] = True
        state.setdefault("cma_context", {})["counselor_id"] = counselor_id
        execution_path = state.get("execution_path", [])
        execution_path.append("schedule_appointment")
        state["execution_path"] = execution_path
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "cma::schedule_appointment")
        
        logger.info(
            f"CMA scheduled appointment {new_appointment.id} for user {user_id} "
            f"with counselor {counselor.name} at {appointment_datetime}"
        )
        
    except Exception as e:
        error_msg = f"Appointment scheduling failed: {str(e)}"
        errors = state.get("errors", [])
        errors.append(error_msg)
        state["errors"] = errors
        state.setdefault("cma_context", {})["appointment_confirmed"] = False
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "cma::schedule_appointment", str(e))
    
    return state


async def _select_optimal_counselor(
    db: AsyncSession,
    severity: str,
    preferences: dict
) -> int | None:
    """Deterministically select the best available counselor.

    Replaced an LLM round-trip (Gemini Flash) that ranked counselors with
    rules that are trivially expressible as a scoring function. Ranking:
    language match, specialization overlap, having a defined availability
    schedule, then rating / experience (weighted higher for urgent cases).

    Args:
        db: Database session
        severity: Case severity level
        preferences: Student preferences (specialization, language, etc.)

    Returns:
        Counselor ID or None if not found
    """
    result = await db.execute(
        select(Counselor).where(Counselor.is_available).order_by(Counselor.id)
    )
    counselors = result.scalars().all()

    if not counselors:
        return None
    if len(counselors) == 1:
        return counselors[0].id

    urgent = severity.lower() in {"high", "critical"}

    # Normalise preference keys defensively — callers pass scheduling_context
    # with an unguaranteed shape.
    lang_pref = (
        preferences.get("language")
        or preferences.get("preferred_language")
        or preferences.get("languages")
    )
    if isinstance(lang_pref, list):
        lang_pref = [str(x).lower() for x in lang_pref if str(x).strip()]
    elif lang_pref:
        lang_pref = str(lang_pref).lower()
    else:
        lang_pref = []

    spec_pref = preferences.get("specialization") or preferences.get("concerns")
    if isinstance(spec_pref, list):
        spec_pref = [str(x).lower() for x in spec_pref if str(x).strip()]
    elif spec_pref:
        spec_pref = [str(spec_pref).lower()]
    else:
        spec_pref = []

    def _langs(counselor: Counselor) -> list[str]:
        raw = counselor.languages or []
        if isinstance(raw, str):
            raw = [raw]
        return [str(x).lower() for x in raw if str(x).strip()]

    def _score(counselor: Counselor) -> tuple[float, ...]:
        score = 0.0
        langs = _langs(counselor)

        # 1. Language match (exact overlap).
        if lang_pref and any(lp in langs or langs and any(l in lp for l in langs) for lp in lang_pref):
            score += 3.0

        # 2. Specialization / concern overlap.
        spec = str(counselor.specialization or "").lower()
        if spec_pref and any(p in spec for p in spec_pref):
            score += 2.0

        # 3. Defined availability schedule.
        if counselor.availability_schedule:
            score += 1.0

        # 4. Experience & rating — weighted more for urgent cases.
        exp = float(counselor.years_of_experience or 0)
        rating = float(counselor.rating or 0)
        exp_w = 1.5 if urgent else 0.5
        score += exp_w * min(exp, 25.0) / 25.0
        score += rating / 5.0

        # Sort key: score desc, rating desc, experience desc, id asc.
        return (-score, -rating, -exp, counselor.id)

    return min(counselors, key=_score).id


async def _find_optimal_appointment_time(
    db: AsyncSession,
    counselor: Counselor,
    preferred_time: str | None,
    severity: str,
    scheduling_context: dict
) -> datetime | None:
    """Deterministically pick the earliest conflict-free appointment slot.

    Replaced an LLM round-trip (Gemini Flash) that "chose" a slot from a list
    that was already generated in urgency order (critical cases only generate
    the next 3 days). Selecting the earliest available slot is the optimal,
    deterministic choice for that ordering and removes a generation + the
    parse/validation fallback path.

    Args:
        db: Database session
        counselor: Counselor model
        preferred_time: Student's time preference (unused — reserved)
        severity: Case severity
        scheduling_context: Additional context (unused — reserved)

    Returns:
        Earliest conflict-free datetime, or None
    """
    schedule = counselor.availability_schedule or {}
    start_date = datetime.now()
    end_date = start_date + timedelta(days=14)

    # For critical cases, prefer ASAP (next 3 days).
    if severity == "critical":
        end_date = start_date + timedelta(days=3)

    # Generate simple slots 9 AM - 5 PM hourly (naive but deterministic).
    available_slots: list[datetime] = []
    current = start_date
    while current < end_date:
        for hour in range(9, 17):
            slot_time = current.replace(hour=hour, minute=0, second=0, microsecond=0)
            if slot_time > datetime.now():  # Only future slots
                available_slots.append(slot_time)
        current += timedelta(days=1)

    if not available_slots:
        logger.warning("No slots available for counselor %s", counselor.id)
        return None

    # Drop slots already booked for this counselor.
    conflicts_result = await db.execute(
        select(Appointment.appointment_datetime).where(
            Appointment.counselor_id == counselor.id,
            Appointment.appointment_datetime >= start_date,
            Appointment.appointment_datetime <= end_date,
            Appointment.status.in_(["scheduled", "confirmed"])
        )
    )
    booked_times = {apt.replace(minute=0, second=0, microsecond=0) for apt in conflicts_result.scalars().all()}
    available_slots = [slot for slot in available_slots if slot not in booked_times]

    if not available_slots:
        logger.warning("All slots are booked for counselor %s", counselor.id)
        return None

    # Slots are generated earliest-first and the horizon already encodes
    # severity urgency (critical => next 3 days). Earliest free slot is the
    # optimal deterministic pick.
    return available_slots[0]


def _build_cma_graph() -> CompiledStateGraph:
    """Build and compile the CMA LangGraph state machine.

    Graph structure:
        START → ingest_escalation → create_case → calculate_sla →
        auto_assign → schedule_appt (conditional) → notify_counsellor → END

    The schedule_appt node is conditional based on state["schedule_appointment"] flag.
    If scheduling is not requested, it passes through without creating appointment.

    Returns:
        Compiled StateGraph ready for execution
    """
    workflow = StateGraph(CMAState)

    # Add nodes (no wrappers needed — nodes read db from config)
    workflow.add_node("ingest_escalation", ingest_escalation_node)
    workflow.add_node("create_case", create_case_node)
    workflow.add_node("calculate_sla", calculate_sla_node)
    workflow.add_node("auto_assign", auto_assign_node)
    workflow.add_node("schedule_appt", schedule_appointment_node)
    workflow.add_node("notify_counsellor", notify_counsellor_node)

    # Define flow with conditional scheduling
    workflow.set_entry_point("ingest_escalation")
    workflow.add_edge("ingest_escalation", "create_case")
    workflow.add_edge("create_case", "calculate_sla")
    workflow.add_edge("calculate_sla", "auto_assign")
    workflow.add_edge("auto_assign", "schedule_appt")
    workflow.add_edge("schedule_appt", "notify_counsellor")
    workflow.add_edge("notify_counsellor", END)

    return workflow.compile()  # type: ignore[return-value]


# Module-level cached compiled graph
_cma_graph: CompiledStateGraph | None = None


def get_cma_graph() -> CompiledStateGraph:
    """Return the cached CMA compiled graph, building it on first call."""
    global _cma_graph
    if _cma_graph is None:
        _cma_graph = _build_cma_graph()
    return _cma_graph
