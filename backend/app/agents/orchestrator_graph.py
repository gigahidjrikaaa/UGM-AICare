"""Master orchestrator graph coordinating STA → SCA → SDA workflows.

This module implements the top-level orchestration logic for the Safety Agent Suite,
routing user messages through the appropriate agent workflows based on risk assessment.

Workflow:
    STA (assess risk) → 
        - High/Critical → SDA (create case)
        - Moderate + needs support → SCA (intervention plan) → (optionally SDA if escalated)
        - Low → END (normal conversation)
"""
from __future__ import annotations

import logging
from datetime import datetime

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import OrchestratorState
from app.agents.sta.sta_graph import create_sta_graph
from app.agents.sca.sca_graph import create_sca_graph
from app.agents.sda.sda_graph import create_sda_graph
from app.agents.execution_tracker import execution_tracker

logger = logging.getLogger(__name__)


async def execute_sta_subgraph(state: OrchestratorState, db: AsyncSession) -> OrchestratorState:
    """Execute STA as a subgraph.
    
    Runs the Safety Triage Agent workflow to assess message risk level
    and determine routing decision.
    
    Args:
        state: Current orchestrator state
        db: Database session
        
    Returns:
        State updated with STA outputs (risk_level, severity, next_step, etc.)
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "orchestrator::sta", "orchestrator")
    
    try:
        # Create and execute STA subgraph
        sta_graph = create_sta_graph(db)
        sta_result = await sta_graph.ainvoke(state)
        
        # Merge STA outputs into orchestrator state
        state.update(sta_result)
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "orchestrator::sta",
                metrics={
                    "severity": sta_result.get("severity", "unknown"),
                    "next_step": sta_result.get("next_step", "unknown")
                }
            )
        
        logger.info(
            f"Orchestrator completed STA: severity={sta_result.get('severity')}, "
            f"next_step={sta_result.get('next_step')}"
        )
        
    except Exception as e:
        error_msg = f"STA subgraph failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state["errors"].append(error_msg)
        state["next_step"] = "end"  # Safe fallback
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "orchestrator::sta", str(e))
    
    return state


async def execute_sca_subgraph(state: OrchestratorState, db: AsyncSession) -> OrchestratorState:
    """Execute SCA as a subgraph.
    
    Runs the Support Coach Agent workflow to generate personalized
    intervention plans for moderate-severity cases.
    
    Args:
        state: Current orchestrator state with STA outputs
        db: Database session
        
    Returns:
        State updated with SCA outputs (intervention_plan, intervention_plan_id, etc.)
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "orchestrator::sca", "orchestrator")
    
    try:
        # Create and execute SCA subgraph
        sca_graph = create_sca_graph(db)
        sca_result = await sca_graph.ainvoke(state)
        
        # Merge SCA outputs into orchestrator state
        state.update(sca_result)
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "orchestrator::sca",
                metrics={
                    "should_intervene": sca_result.get("should_intervene", False),
                    "plan_id": sca_result.get("intervention_plan_id")
                }
            )
        
        logger.info(
            f"Orchestrator completed SCA: "
            f"should_intervene={sca_result.get('should_intervene')}, "
            f"plan_id={sca_result.get('intervention_plan_id')}"
        )
        
    except Exception as e:
        error_msg = f"SCA subgraph failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state["errors"].append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "orchestrator::sca", str(e))
    
    return state


async def execute_sda_subgraph(state: OrchestratorState, db: AsyncSession) -> OrchestratorState:
    """Execute SDA as a subgraph.
    
    Runs the Service Desk Agent workflow to create cases for high/critical
    severity situations requiring manual counsellor intervention.
    
    Args:
        state: Current orchestrator state with STA (and optionally SCA) outputs
        db: Database session
        
    Returns:
        State updated with SDA outputs (case_id, case_created, etc.)
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "orchestrator::sda", "orchestrator")
    
    try:
        # Create and execute SDA subgraph
        sda_graph = create_sda_graph(db)
        sda_result = await sda_graph.ainvoke(state)
        
        # Merge SDA outputs into orchestrator state
        state.update(sda_result)
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id, 
                "orchestrator::sda",
                metrics={
                    "case_created": sda_result.get("case_created", False),
                    "case_id": str(sda_result.get("case_id")) if sda_result.get("case_id") else None
                }
            )
        
        logger.info(
            f"Orchestrator completed SDA: case_id={sda_result.get('case_id')}, "
            f"case_created={sda_result.get('case_created')}"
        )
        
    except Exception as e:
        error_msg = f"SDA subgraph failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state["errors"].append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "orchestrator::sda", str(e))
    
    return state


def should_route_to_sca(state: OrchestratorState) -> str:
    """Conditional edge: Should we invoke SCA?
    
    Routing logic:
        - High/Critical severity → Skip SCA, go straight to SDA
        - Moderate + next_step='sca' → Invoke SCA
        - Otherwise → END (normal conversation)
    
    Args:
        state: Current orchestrator state
        
    Returns:
        Target node: "invoke_sca", "route_sda", or "end"
    """
    execution_id = state.get("execution_id")
    
    next_step = state.get("next_step", "end")
    severity = state.get("severity", "low")
    
    # Track edge decision
    if execution_id:
        execution_tracker.trigger_edge(
            execution_id,
            f"orchestrator::route_after_sta->{next_step}",
            condition_result=True
        )
    
    logger.info(
        f"Orchestrator routing after STA: severity={severity}, next_step={next_step}"
    )
    
    # High/critical skip SCA and go straight to SDA
    if severity in ("high", "critical"):
        return "route_sda"
    
    # Moderate with next_step=sca
    if next_step == "sca":
        return "invoke_sca"
    
    return "end"


def should_route_to_sda_after_sca(state: OrchestratorState) -> str:
    """Conditional edge: Should we create a case after SCA?
    
    SCA typically handles moderate cases, but if there's escalation logic
    in the future, this conditional allows routing to SDA after SCA.
    
    Args:
        state: Current orchestrator state
        
    Returns:
        Target node: "invoke_sda" or "end"
    """
    execution_id = state.get("execution_id")
    
    severity = state.get("severity", "low")
    
    # Track edge decision
    if execution_id:
        execution_tracker.trigger_edge(
            execution_id,
            "orchestrator::route_after_sca->end",
            condition_result=True
        )
    
    # Future: Could check if SCA escalated to SDA
    # For now, SCA cases don't route to SDA
    logger.info(f"Orchestrator routing after SCA: severity={severity} -> END")
    
    return "end"


def create_orchestrator_graph(db: AsyncSession) -> StateGraph:
    """Create master orchestrator graph.
    
    Graph structure:
        START → execute_sta → 
            [conditional: severity check]
                - High/Critical → execute_sda → END
                - Moderate + support → execute_sca → END
                - Low → END
    
    This orchestrator coordinates the three main agents (STA, SCA, SDA)
    and routes user messages through the appropriate workflows based on
    risk assessment.
    
    Args:
        db: Database session for all subgraph operations
        
    Returns:
        Compiled StateGraph ready for execution
    """
    workflow = StateGraph(OrchestratorState)
    
    # Add subgraph nodes
    workflow.add_node("execute_sta", lambda state: execute_sta_subgraph(state, db))
    workflow.add_node("execute_sca", lambda state: execute_sca_subgraph(state, db))
    workflow.add_node("execute_sda", lambda state: execute_sda_subgraph(state, db))
    
    # Start with STA (always runs first)
    workflow.set_entry_point("execute_sta")
    
    # Conditional routing after STA
    workflow.add_conditional_edges(
        "execute_sta",
        should_route_to_sca,
        {
            "invoke_sca": "execute_sca",
            "route_sda": "execute_sda",
            "end": END
        }
    )
    
    # Conditional routing after SCA (currently always END)
    workflow.add_conditional_edges(
        "execute_sca",
        should_route_to_sda_after_sca,
        {
            "invoke_sda": "execute_sda",
            "end": END
        }
    )
    
    # SDA is always terminal
    workflow.add_edge("execute_sda", END)
    
    return workflow.compile()
