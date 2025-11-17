"""LangGraph state machine for Therapeutic Coach Agent (TCA).

This module implements the TCA workflow as a LangGraph StateGraph:
    ingest_triage_signal → determine_intervention_type → generate_plan → 
    safety_review → persist_plan

The graph integrates with TherapeuticCoachService and uses Gemini AI for 
personalized intervention plan generation.
"""
from __future__ import annotations

import logging
from datetime import datetime

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import SCAState
from app.agents.tca.service import TherapeuticCoachService
from app.agents.tca.schemas import SCAInterveneRequest
from app.agents.execution_tracker import execution_tracker
from app.domains.mental_health.models import InterventionPlanRecord

logger = logging.getLogger(__name__)


async def ingest_triage_signal_node(state: SCAState) -> SCAState:
    """Node: Ingest triage signal from STA.
    
    Validates that STA has provided necessary risk assessment data
    and initializes TCA execution tracking.
    
    Args:
        state: Current graph state with STA outputs
        
    Returns:
        Updated state with execution_path appended
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "tca::ingest_triage_signal", "tca")
    
    # Validate STA outputs are present
    if not state.get("severity") or not state.get("intent"):
        state["errors"].append("Missing STA risk assessment data")
        if execution_id:
            execution_tracker.fail_node(
                execution_id, 
                "tca::ingest_triage_signal", 
                "Missing STA data"
            )
        return state
    
    state["execution_path"].append("ingest_triage_signal")
    
    if execution_id:
        execution_tracker.complete_node(execution_id, "tca::ingest_triage_signal")
    
    logger.info(
        f"TCA ingested triage signal: severity={state.get('severity')}, "
        f"intent={state.get('intent')}"
    )
    return state


async def determine_intervention_type_node(state: SCAState) -> SCAState:
    """Node: Determine appropriate intervention type.
    
    Maps intent and severity to intervention plan type:
        - High anxiety/panic → calm_down
        - Overwhelmed/stuck → break_down_problem
        - General stress → general_coping
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with intervention_type field
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "tca::determine_intervention_type", "tca")
    
    try:
        intent = state.get("intent", "").lower()
        severity = state.get("severity", "low").lower()
        
        # Map intent to intervention type
        if intent in ("crisis", "panic", "anxiety", "acute_stress"):
            intervention_type = "calm_down"
        elif intent in ("overwhelmed", "stuck", "confused", "academic_stress"):
            intervention_type = "break_down_problem"
        else:
            intervention_type = "general_coping"
        
        state["intervention_type"] = intervention_type
        state["should_intervene"] = True
        state["execution_path"].append("determine_intervention_type")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "tca::determine_intervention_type",
                metrics={"intervention_type": intervention_type}
            )
        
        logger.info(f"TCA determined intervention type: {intervention_type}")
        
    except Exception as e:
        error_msg = f"Failed to determine intervention type: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(
                execution_id, 
                "tca::determine_intervention_type", 
                str(e)
            )
    
    return state


async def generate_plan_node(state: SCAState) -> SCAState:
    """Node: Generate personalized intervention plan using Gemini AI.
    
    Uses TherapeuticCoachService with Gemini-powered plan generation to create
    hyper-personalized CBT-informed intervention plans.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with intervention_plan field
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "tca::generate_plan", "tca")
    
    try:
        # Get TCA service
        sca_service = TherapeuticCoachService()
        
        # Build intervention request
        request = SCAInterveneRequest(
            intent=state.get("intent", "general_support"),
            user_hash=state["user_hash"],
            session_id=state["session_id"],
            options={
                "risk_level": state.get("severity", "moderate"),  # Use severity from STA
                "severity": state.get("severity", "moderate")
            }
        )
        
        # Generate plan with Gemini AI
        response = await sca_service.intervene(
            payload=request,
            use_gemini_plan=True,
            plan_type=state.get("intervention_type", "general_coping"),
            user_message=state.get("message", ""),
            sta_context={
                "risk_level": state.get("risk_level"),
                "severity": state.get("severity"),
                "risk_score": state.get("risk_score")
            }
        )
        
        # Store plan in state
        state["intervention_plan"] = {
            "plan_steps": [
                {
                    "id": step.id,
                    "label": step.label,
                    "duration_min": step.duration_min
                }
                for step in response.plan_steps
            ],
            "resource_cards": [
                {
                    "resource_id": card.resource_id,
                    "title": card.title,
                    "summary": card.summary,
                    "url": card.url
                }
                for card in response.resource_cards
            ]
        }
        
        state["execution_path"].append("generate_plan")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "tca::generate_plan",
                metrics={
                    "num_steps": len(response.plan_steps),
                    "num_resources": len(response.resource_cards)
                }
            )
        
        logger.info(
            f"TCA generated plan: {len(response.plan_steps)} steps, "
            f"{len(response.resource_cards)} resources"
        )
        
    except Exception as e:
        error_msg = f"Plan generation failed: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "tca::generate_plan", str(e))
    
    return state


async def safety_review_node(state: SCAState) -> SCAState:
    """Node: Apply safety checks before plan activation.
    
    Ensures plans are appropriate for user's risk level and applies
    any necessary safety guardrails.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state after safety review
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "tca::safety_review", "tca")
    
    try:
        severity = state.get("severity", "low")
        
        # Safety check: High/critical severity should not use TCA
        # (should be routed to SDA instead)
        if severity in ("high", "critical"):
            state["should_intervene"] = False
            state["errors"].append(
                "Safety review: High/critical severity should route to SDA, not TCA"
            )
            logger.warning(f"TCA safety review blocked: severity={severity}")
        
        state["execution_path"].append("safety_review")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "tca::safety_review",
                metrics={"should_intervene": state.get("should_intervene", False)}
            )
        
        logger.info(f"TCA safety review passed: should_intervene={state.get('should_intervene')}")
        
    except Exception as e:
        error_msg = f"Safety review failed: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "tca::safety_review", str(e))
    
    return state


async def persist_plan_node(state: SCAState, db: AsyncSession) -> SCAState:
    """Node: Persist intervention plan to database.
    
    Creates InterventionPlan record for tracking and follow-up.
    
    Args:
        state: Current graph state
        db: Database session
        
    Returns:
        Updated state with intervention_plan_id
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "tca::persist_plan", "tca")
    
    try:
        # Only persist if intervention should proceed
        if not state.get("should_intervene"):
            logger.info("TCA skipping plan persistence (should_intervene=False)")
            state["execution_path"].append("persist_plan")
            if execution_id:
                execution_tracker.complete_node(execution_id, "tca::persist_plan")
            return state
        
        # Get intervention_type string and plan data
        intervention_type = state.get("intervention_type", "general_coping")
        plan_data = state.get("intervention_plan", {})
        
        # Ensure intervention_type is stored in plan_data
        if plan_data and "intervention_type" not in plan_data:
            plan_data["intervention_type"] = intervention_type
        
        # Calculate total_steps from plan_data
        plan_steps = plan_data.get("plan_steps", []) if plan_data else []
        total_steps = len(plan_steps)
        
        # Create InterventionPlanRecord
        # Note: conversation_id is expected to be int (FK to conversations table), not string
        # Skip conversation_id if it's a string, 0, or invalid
        conv_id = state.get("conversation_id")
        if isinstance(conv_id, str) or conv_id == 0 or not conv_id:
            conv_id = None  # Only use valid int FK references
        
        plan = InterventionPlanRecord(
            user_id=state.get("user_id"),
            session_id=state.get("session_id"),
            conversation_id=conv_id,
            plan_title=f"{intervention_type.replace('_', ' ').title() if intervention_type else 'General'} Intervention Plan",
            risk_level=state.get("risk_level", 0),
            plan_data=plan_data or {},
            total_steps=total_steps,
            completed_steps=0,
            completion_tracking={},
            status="active"
        )
        
        db.add(plan)
        await db.flush()
        
        # DEBUG: Log plan creation details
        logger.info(f"📋 TCA persisted intervention plan: ID={plan.id}, user_id={plan.user_id}, is_active={plan.is_active}, status={plan.status}")
        
        state["intervention_plan_id"] = plan.id
        state["execution_path"].append("persist_plan")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "tca::persist_plan",
                metrics={"plan_id": plan.id}
            )
        
        logger.info(f"TCA persisted intervention plan: ID={plan.id}")
        
    except Exception as e:
        error_msg = f"Plan persistence failed: {str(e)}"
        state["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "tca::persist_plan", str(e))
    
    return state


def create_tca_graph(db: AsyncSession) -> StateGraph:
    """Create the TCA LangGraph state machine.
    
    Graph structure:
        START → ingest_triage_signal → determine_intervention_type → 
        generate_plan → safety_review → persist_plan → END
    
    Args:
        db: Database session for node operations
        
    Returns:
        Compiled StateGraph ready for execution
    """
    workflow = StateGraph(SCAState)
    
    # Create async wrapper for persist_plan_node with db dependency
    async def persist_plan_with_db(state: SCAState) -> SCAState:
        return await persist_plan_node(state, db)
    
    # Add nodes
    workflow.add_node("ingest_triage_signal", ingest_triage_signal_node)
    workflow.add_node("determine_intervention_type", determine_intervention_type_node)
    workflow.add_node("generate_plan", generate_plan_node)
    workflow.add_node("safety_review", safety_review_node)
    workflow.add_node("persist_plan", persist_plan_with_db)
    
    # Define linear flow
    workflow.set_entry_point("ingest_triage_signal")
    workflow.add_edge("ingest_triage_signal", "determine_intervention_type")
    workflow.add_edge("determine_intervention_type", "generate_plan")
    workflow.add_edge("generate_plan", "safety_review")
    workflow.add_edge("safety_review", "persist_plan")
    workflow.add_edge("persist_plan", END)
    
    return workflow.compile()
