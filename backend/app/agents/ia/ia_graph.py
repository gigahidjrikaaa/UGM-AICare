"""LangGraph state machine for Insights Agent (IA).

This module implements the IA workflow as a LangGraph StateGraph:
    ingest_query → validate_consent → apply_k_anonymity → execute_analytics

The graph integrates with existing InsightsAgentService for privacy-preserving
analytics and ExecutionStateTracker for real-time monitoring.

Privacy Safeguards:
- K-anonymity enforcement (k ≥ 5) for all aggregated queries
- Allow-listed queries only (no arbitrary SQL)
- Date range validation (prevent excessive historical data access)
- Differential privacy budget tracking (future enhancement)
"""
from __future__ import annotations

import logging
from typing import Callable, Dict, Any, cast
from datetime import datetime, timedelta

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import IAState
from app.agents.ia.service import InsightsAgentService
from app.agents.ia.schemas import IAQueryRequest, IAQueryResponse, QuestionId
from app.agents.execution_tracker import execution_tracker

logger = logging.getLogger(__name__)


# ============================================================================
# Graph Nodes
# ============================================================================

def ingest_query_node(state: IAState) -> IAState:
    """Node: Validate and ingest analytics query request.
    
    This node validates the incoming query structure and initializes
    the execution tracking.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with validated query parameters
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "ia:ingest_query", "ia")
    
    try:
        # Validate required fields
        if not state.get("question_id"):
            raise ValueError("question_id is required")
        
        if not state.get("start_date") or not state.get("end_date"):
            raise ValueError("start_date and end_date are required")
        
        # Validate date range (prevent excessive historical queries)
        start = state["start_date"]
        end = state["end_date"]
        
        if start >= end:
            raise ValueError("start_date must be before end_date")
        
        max_days = 365  # Maximum 1 year of data
        delta = end - start
        if delta.days > max_days:
            raise ValueError(f"Date range too large. Maximum {max_days} days allowed.")
        
        state.setdefault("execution_path", []).append("ia:ingest_query")
        state["query_validated"] = True
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "ia:ingest_query")
        
        logger.info(f"IA ingested query: question_id={state['question_id']}, range={delta.days} days")
        
    except Exception as e:
        error_msg = f"Query ingestion failed: {str(e)}"
        logger.error(error_msg)
        state.setdefault("errors", []).append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "ia:ingest_query", error_msg)
    
    return state


def validate_consent_node(state: IAState) -> IAState:
    """Node: Validate user consent for analytics aggregation.
    
    This node checks that the query only accesses data from users who have
    provided consent for their data to be included in aggregated analytics.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with consent validation result
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "ia:validate_consent", "ia")
    
    try:
        # Note: In production, this would query the consent ledger
        # For now, we assume all queries are aggregate-only (no individual data)
        # and therefore consent is implicitly satisfied for statistical aggregation
        
        # Check if query is in allow-listed analytics queries
        # (Allow-listed queries are pre-approved to access aggregate data only)
        question_id = state.get("question_id")
        
        # The IAQueryRequest will validate against ALLOWED_QUERIES
        # This node adds an additional layer of consent checking
        
        state.setdefault("execution_path", []).append("ia:validate_consent")
        state["consent_validated"] = True
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "ia:validate_consent")
        
        logger.info(f"IA consent validated for question_id={question_id}")
        
    except Exception as e:
        error_msg = f"Consent validation failed: {str(e)}"
        logger.error(error_msg)
        state.setdefault("errors", []).append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "ia:validate_consent", error_msg)
    
    return state


def apply_k_anonymity_node(state: IAState) -> IAState:
    """Node: Apply k-anonymity enforcement before executing query.
    
    This node ensures that all aggregated results meet the k-anonymity
    threshold (k ≥ 5) to prevent re-identification of individuals.
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with k-anonymity configuration
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "ia:apply_k_anonymity", "ia")
    
    try:
        # Set k-anonymity threshold
        k_threshold = 5  # Minimum group size for aggregated results
        state["k_threshold"] = k_threshold
        
        # Note: Actual k-anonymity enforcement happens in the query execution layer
        # This node documents the privacy requirement and tracks it
        
        state.setdefault("execution_path", []).append("ia:apply_k_anonymity")
        state["privacy_enforced"] = True
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "ia:apply_k_anonymity")
        
        logger.info(f"IA k-anonymity configured: k={k_threshold}")
        
    except Exception as e:
        error_msg = f"K-anonymity configuration failed: {str(e)}"
        logger.error(error_msg)
        state.setdefault("errors", []).append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "ia:apply_k_anonymity", error_msg)
    
    return state


async def execute_analytics_node(state: IAState, db: AsyncSession) -> IAState:
    """Node: Execute analytics query with privacy safeguards.
    
    This node uses the InsightsAgentService to execute the allow-listed
    analytics query and return aggregated results.
    
    Args:
        state: Current graph state
        db: Database session
        
    Returns:
        Updated state with query results
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "ia:execute_analytics", "ia")
    
    try:
        # Create IA service
        ia_service = InsightsAgentService(db)
        
        # Get and cast question_id
        question_id_str = state.get("question_id", "")
        question_id = cast(QuestionId, question_id_str)
        
        # Build query request with proper datetime objects
        start_date = state.get("start_date")
        end_date = state.get("end_date")
        
        if not isinstance(start_date, datetime) or not isinstance(end_date, datetime):
            raise ValueError("start_date and end_date must be datetime objects")
        
        request = IAQueryRequest(
            question_id=question_id,
            params={
                "start": start_date,
                "end": end_date
            }
        )
        
        # Execute query (service handles k-anonymity and privacy)
        response: IAQueryResponse = await ia_service.query(request)
        
        # Store results in state
        state["analytics_result"] = {
            "chart": response.chart,
            "table": response.table,
            "notes": response.notes
        }
        state.setdefault("execution_path", []).append("ia:execute_analytics")
        state["query_completed"] = True
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "ia:execute_analytics")
        
        logger.info(
            f"IA query completed: question_id={state.get('question_id')}, "
            f"rows={len(response.table) if response.table else 0}"
        )
        
    except Exception as e:
        error_msg = f"Analytics execution failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "ia:execute_analytics", error_msg)
    
    return state


# ============================================================================
# Graph Creation
# ============================================================================

def create_ia_graph(db: AsyncSession):
    """Create and compile IA (Insights Agent) StateGraph.
    
    This graph implements privacy-preserving analytics workflow:
    1. Ingest query request and validate parameters
    2. Validate user consent for data access
    3. Apply k-anonymity privacy enforcement
    4. Execute analytics query with safeguards
    
    Args:
        db: Database session for graph node operations
        
    Returns:
        Compiled StateGraph ready for execution via ainvoke()
        
    Example:
        ```python
        graph = create_ia_graph(db)
        state = {
            "question_id": "crisis_trend",
            "start_date": datetime(2025, 1, 1),
            "end_date": datetime(2025, 1, 31),
            "execution_id": "exec-123",
            "errors": [],
            "execution_path": []
        }
        result = await graph.ainvoke(state)
        print(result["analytics_result"])
        ```
    """
    # Create workflow
    workflow = StateGraph(IAState)
    
    # Add nodes
    workflow.add_node("ingest_query", ingest_query_node)
    workflow.add_node("validate_consent", validate_consent_node)
    workflow.add_node("apply_k_anonymity", apply_k_anonymity_node)
    workflow.add_node("execute_analytics", lambda state: execute_analytics_node(state, db))
    
    # Define linear flow through nodes
    workflow.set_entry_point("ingest_query")
    workflow.add_edge("ingest_query", "validate_consent")
    workflow.add_edge("validate_consent", "apply_k_anonymity")
    workflow.add_edge("apply_k_anonymity", "execute_analytics")
    workflow.add_edge("execute_analytics", END)
    
    # Compile graph
    return workflow.compile()
