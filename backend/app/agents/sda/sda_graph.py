from __future__ import annotations

import logging
from datetime import datetime, timedelta
import json

from langgraph.graph import StateGraph, END
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import SDAState
from app.agents.execution_tracker import execution_tracker
from app.core.settings import get_settings
from app.core.llm import get_gemini_client, GEMINI_FLASH_MODEL
from app.domains.mental_health.models import Case, CaseSeverityEnum, CaseStatusEnum
from app.domains.mental_health.models.appointments import Psychologist, Appointment
from app.models.agent_user import AgentUser, AgentRoleEnum
from app.models.system import CaseAssignment
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
        db: Database session
        
    Returns:
        Updated state with assigned_to (if successful) and assignment_id
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "sda::auto_assign", "sda")
    
    try:
        case_id = state.get("case_id")
        if not case_id:
            raise ValueError("No case_id found for assignment")
        
        # Step 1: Query all counsellors
        counsellors_stmt = select(AgentUser).where(
            AgentUser.role == AgentRoleEnum.counselor
        )
        counsellors_result = await db.execute(counsellors_stmt)
        counsellors = counsellors_result.scalars().all()
        
        if not counsellors:
            logger.warning("No counsellors available for auto-assignment")
            state["execution_path"].append("auto_assign")
            state["assigned_to"] = None
            state["assignment_reason"] = "no_counsellors_available"
            
            if execution_id:
                execution_tracker.complete_node(
                    execution_id, 
                    "sda::auto_assign",
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
            workload_stmt = select(func.count(Case.id)).where(
                Case.assigned_to == counsellor.id,
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
        
        # Step 4: Create CaseAssignment record
        assignment = CaseAssignment(
            case_id=case_id,
            assigned_to=assigned_counsellor_id,
            assigned_by=None,  # System auto-assignment (no user)
            assigned_at=datetime.now(),
            reassignment_reason=None,  # First assignment, not a reassignment
            previous_assignee=None
        )
        db.add(assignment)
        await db.flush()  # Get assignment.id
        
        # Step 5: Update Case with assignment
        case = await db.get(Case, case_id)
        if case:
            case.assigned_to = assigned_counsellor_id  # type: ignore[assignment]
            case.status = CaseStatusEnum.in_progress  # type: ignore[assignment]
            case.updated_at = datetime.now()  # type: ignore[assignment]
            db.add(case)
            await db.flush()
        
        # Update state
        state["assigned_to"] = assigned_counsellor_id
        state["assignment_id"] = str(assignment.id)
        state["assignment_reason"] = "auto_assigned_lowest_workload"
        state["assigned_workload"] = assigned_workload
        state["execution_path"].append("auto_assign")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "sda::auto_assign",
                metrics={
                    "assigned": True,
                    "counsellor_id": assigned_counsellor_id,
                    "workload": assigned_workload,
                    "total_counsellors": len(counsellors)
                }
            )
        
        logger.info(
            f"SDA auto-assigned case {case_id} to counsellor {assigned_counsellor_id} "
            f"(workload: {assigned_workload} active cases)"
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


async def schedule_appointment_node(state: SDAState, db: AsyncSession) -> SDAState:
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
        db: Database session
        
    Returns:
        Updated state with appointment_id and confirmation
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "sda::schedule_appointment", "sda")
    
    try:
        # Check if scheduling is requested
        if not state.get("schedule_appointment", False):
            logger.info("Scheduling not requested, skipping appointment node")
            if execution_id:
                execution_tracker.complete_node(execution_id, "sda::schedule_appointment")
            return state
        
        user_id = state.get("user_id")
        assigned_counsellor_id = state.get("assigned_counsellor_id")
        severity = state.get("severity", "high")
        preferred_time = state.get("preferred_time")
        scheduling_context = state.get("scheduling_context", {})
        
        if not user_id:
            raise ValueError("user_id required for scheduling")
        
        # Step 1: Determine which psychologist to book with
        # Priority: assigned counselor > LLM-selected based on availability
        psychologist_id = state.get("psychologist_id")
        
        if not psychologist_id and assigned_counsellor_id:
            # Try to find psychologist profile for assigned counselor
            counselor_result = await db.execute(
                select(AgentUser).where(AgentUser.id == assigned_counsellor_id)
            )
            counselor = counselor_result.scalar_one_or_none()
            
            if counselor and counselor.user_id:
                # Check if counselor has psychologist profile
                psych_result = await db.execute(
                    select(Psychologist).where(Psychologist.user_id == counselor.user_id)
                )
                psychologist = psych_result.scalar_one_or_none()
                if psychologist:
                    psychologist_id = psychologist.id
        
        # If no psychologist found yet, use LLM to select best available
        if not psychologist_id:
            logger.info("No psychologist assigned, using LLM to select best match")
            psychologist_id = await _select_optimal_psychologist(
                db=db,
                severity=severity,
                preferences=scheduling_context
            )
        
        if not psychologist_id:
            raise ValueError("No available psychologist found for appointment")
        
        # Step 2: Get psychologist details
        psych_result = await db.execute(
            select(Psychologist).where(Psychologist.id == psychologist_id)
        )
        psychologist = psych_result.scalar_one_or_none()
        
        if not psychologist or not psychologist.is_available:
            raise ValueError(f"Psychologist {psychologist_id} not available")
        
        # Step 3: Use LLM to find optimal appointment time
        appointment_datetime = await _find_optimal_appointment_time(
            db=db,
            psychologist=psychologist,
            preferred_time=preferred_time,
            severity=severity,
            scheduling_context=scheduling_context
        )
        
        if not appointment_datetime:
            raise ValueError("No suitable appointment time found")
        
        # Step 4: Create appointment
        # Determine appointment type based on severity
        appointment_type_id = 3 if severity == "critical" else 1  # 3=Crisis, 1=Initial
        
        new_appointment = Appointment(
            user_id=user_id,
            psychologist_id=psychologist_id,
            appointment_type_id=appointment_type_id,
            appointment_datetime=appointment_datetime,
            notes=f"Auto-scheduled by SDA. Case severity: {severity}. Case ID: {state.get('case_id')}",
            status="scheduled"
        )
        
        db.add(new_appointment)
        await db.commit()
        await db.refresh(new_appointment)
        
        # Update state
        state["appointment_id"] = new_appointment.id
        state["appointment_datetime"] = appointment_datetime.isoformat()
        state["appointment_confirmed"] = True
        state["psychologist_id"] = psychologist_id
        state["execution_path"].append("schedule_appointment")
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "sda::schedule_appointment")
        
        logger.info(
            f"SDA scheduled appointment {new_appointment.id} for user {user_id} "
            f"with psychologist {psychologist.name} at {appointment_datetime}"
        )
        
    except Exception as e:
        error_msg = f"Appointment scheduling failed: {str(e)}"
        state["errors"].append(error_msg)
        state["appointment_confirmed"] = False
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "sda::schedule_appointment", str(e))
    
    return state


async def _select_optimal_psychologist(
    db: AsyncSession,
    severity: str,
    preferences: dict
) -> int | None:
    """Use LLM to select optimal psychologist based on case context.
    
    Args:
        db: Database session
        severity: Case severity level
        preferences: Student preferences (specialization, language, etc.)
        
    Returns:
        Psychologist ID or None if not found
    """
    try:
        # Get available psychologists
        result = await db.execute(
            select(Psychologist).where(Psychologist.is_available == True)
        )
        psychologists = result.scalars().all()
        
        if not psychologists:
            return None
        
        # If only one available, return it
        if len(psychologists) == 1:
            return psychologists[0].id
        
        # Use LLM to select best match
        client = get_gemini_client()
        
        psych_profiles = []
        for p in psychologists:
            psych_profiles.append({
                "id": p.id,
                "name": p.name,
                "specialization": p.specialization,
                "experience_years": p.years_of_experience,
                "languages": p.languages,
                "rating": p.rating,
                "has_schedule": bool(p.availability_schedule)
            })
        
        prompt = f"""You are a mental health appointment coordinator. Select the BEST psychologist for this case.

Case Context:
- Severity: {severity}
- Student Preferences: {json.dumps(preferences)}

Available Psychologists:
{json.dumps(psych_profiles, indent=2)}

Selection Criteria:
1. For CRITICAL cases: Prioritize experience and high ratings
2. Match specialization if student has specific concerns
3. Consider language preferences
4. Prefer psychologists with defined availability schedules

Return ONLY the psychologist ID (integer) of your selection.
"""
        
        response = client.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,  # Lower temp for consistent selection
            }
        )
        
        # Extract ID from response
        selected_id = int(response.text.strip())
        
        # Validate selection
        if any(p.id == selected_id for p in psychologists):
            logger.info(f"LLM selected psychologist ID {selected_id}")
            return selected_id
        
        # Fallback to first available
        return psychologists[0].id
        
    except Exception as e:
        logger.error(f"Error selecting psychologist: {e}")
        # Fallback to first available psychologist
        result = await db.execute(
            select(Psychologist).where(Psychologist.is_available == True).limit(1)
        )
        psych = result.scalar_one_or_none()
        return psych.id if psych else None


async def _find_optimal_appointment_time(
    db: AsyncSession,
    psychologist: Psychologist,
    preferred_time: str | None,
    severity: str,
    scheduling_context: dict
) -> datetime | None:
    """Use LLM to find optimal appointment time.
    
    Args:
        db: Database session
        psychologist: Psychologist model
        preferred_time: Student's time preference
        severity: Case severity
        scheduling_context: Additional context
        
    Returns:
        Optimal datetime or None
    """
    try:
        # Generate available slots
        from app.agents.shared.tools.scheduling_tools import _generate_time_slots
        
        schedule = psychologist.availability_schedule or {}
        start_date = datetime.now()
        end_date = start_date + timedelta(days=14)
        
        # For critical cases, prefer ASAP (next 3 days)
        if severity == "critical":
            end_date = start_date + timedelta(days=3)
        
        available_slots = _generate_time_slots(
            schedule=schedule,
            start_date=start_date,
            end_date=end_date,
            preferred_time=None  # Don't pre-filter, let LLM decide
        )
        
        if not available_slots:
            logger.warning(f"No slots available for psychologist {psychologist.id}")
            return None
        
        # Check for conflicts
        conflicts_result = await db.execute(
            select(Appointment.appointment_datetime).where(
                Appointment.psychologist_id == psychologist.id,
                Appointment.appointment_datetime >= start_date,
                Appointment.appointment_datetime <= end_date,
                Appointment.status.in_(["scheduled", "confirmed"])
            )
        )
        booked_times = {apt.strftime("%Y-%m-%dT%H:%M:%S") for apt in conflicts_result.scalars().all()}
        
        # Filter out booked slots
        available_slots = [
            slot for slot in available_slots
            if slot["datetime"] not in booked_times
        ]
        
        if not available_slots:
            logger.warning("All slots are booked")
            return None
        
        # Use LLM to select best slot
        client = get_gemini_client()
        
        slots_text = "\n".join([
            f"{i+1}. {slot['display']} ({slot['datetime']})"
            for i, slot in enumerate(available_slots[:20])  # Limit to 20 for tokens
        ])
        
        urgency_text = ""
        if severity == "critical":
            urgency_text = "\n⚠️ CRITICAL CASE: Select the EARLIEST available slot (within next 24-48 hours if possible)."
        elif severity == "high":
            urgency_text = "\n⚠️ HIGH PRIORITY: Prefer slots within next 3-5 days."
        
        prompt = f"""You are scheduling an urgent mental health appointment.

Case Severity: {severity}
{urgency_text}
Student Preferences: {preferred_time or 'None specified'}
Additional Context: {json.dumps(scheduling_context)}

Available Slots:
{slots_text}

Select the SINGLE BEST time slot that balances:
1. Urgency (critical cases need ASAP)
2. Student preferences (if specified)
3. Optimal timing (avoid very late evening unless necessary)

Return ONLY the datetime string in ISO format (YYYY-MM-DDTHH:MM:SS) from the list above.
"""
        
        response = client.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 50  # Just need datetime string
            }
        )
        
        selected_datetime_str = response.text.strip()
        
        # Validate and parse
        selected_datetime = datetime.fromisoformat(selected_datetime_str)
        
        # Verify it's in our available slots
        if any(slot["datetime"] == selected_datetime_str for slot in available_slots):
            logger.info(f"LLM selected appointment time: {selected_datetime}")
            return selected_datetime
        
        # Fallback to first available slot
        fallback = datetime.fromisoformat(available_slots[0]["datetime"])
        logger.warning(f"LLM selection invalid, using fallback: {fallback}")
        return fallback
        
    except Exception as e:
        logger.error(f"Error finding optimal time: {e}", exc_info=True)
        # Last resort: return earliest slot
        if available_slots:
            return datetime.fromisoformat(available_slots[0]["datetime"])
        return None


def create_sda_graph(db: AsyncSession) -> StateGraph:
    """Create the SDA LangGraph state machine.
    
    Graph structure:
        START → ingest_escalation → create_case → calculate_sla → 
        auto_assign → schedule_appt (conditional) → notify_counsellor → END
    
    The schedule_appt node is conditional based on state["schedule_appointment"] flag.
    If scheduling is not requested, it passes through without creating appointment.
    
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
    workflow.add_node("schedule_appt", lambda state: schedule_appointment_node(state, db))  # Renamed to avoid conflict with state key
    workflow.add_node("notify_counsellor", notify_counsellor_node)
    
    # Define flow with conditional scheduling
    workflow.set_entry_point("ingest_escalation")
    workflow.add_edge("ingest_escalation", "create_case")
    workflow.add_edge("create_case", "calculate_sla")
    workflow.add_edge("calculate_sla", "auto_assign")
    workflow.add_edge("auto_assign", "schedule_appt")  # Always run, but conditionally executes
    workflow.add_edge("schedule_appt", "notify_counsellor")
    workflow.add_edge("notify_counsellor", END)
    
    return workflow.compile()
