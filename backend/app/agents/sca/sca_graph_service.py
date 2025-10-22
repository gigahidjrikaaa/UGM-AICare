"""Service wrapper for SCA LangGraph execution.

This module provides a high-level interface for executing the Support Coach Agent
workflow via LangGraph, including execution tracking and error handling.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import SCAState
from app.agents.sca.sca_graph import create_sca_graph
from app.agents.execution_tracker import execution_tracker

logger = logging.getLogger(__name__)


class SCAGraphService:
    """Execute SCA workflow via LangGraph.
    
    This service wraps the SCA StateGraph and provides execution tracking,
    state initialization, and error handling.
    
    Example:
        ```python
        async with get_async_db() as db:
            service = SCAGraphService(db)
            result = await service.execute(
                user_id=123,
                session_id="abc-123",
                user_hash="hash_456",
                message="I'm feeling really stressed",
                conversation_id=789,
                severity="moderate",
                intent="anxiety",
                triage_assessment_id=456
            )
            print(f"Intervention type: {result['intervention_type']}")
            print(f"Plan ID: {result['intervention_plan_id']}")
        ```
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize SCA graph service.
        
        Args:
            db: Database session for graph node operations
        """
        self.db = db
        self.graph = create_sca_graph(db)
    
    async def execute(
        self,
        user_id: int,
        session_id: str,
        user_hash: str,
        message: str,
        conversation_id: int | None = None,
        severity: str = "moderate",
        intent: str = "general",
        triage_assessment_id: int | None = None
    ) -> SCAState:
        """Execute SCA graph workflow.
        
        This method:
        1. Starts execution tracking
        2. Initializes graph state with STA triage outputs
        3. Executes the compiled StateGraph
        4. Completes execution tracking
        5. Returns final state with intervention plan
        
        Args:
            user_id: User database ID
            session_id: Session identifier
            user_hash: Anonymized user identifier
            message: User message for coaching
            conversation_id: Optional conversation ID
            severity: Risk severity from STA (low/moderate/high/critical)
            intent: Detected intent from STA (e.g., "anxiety", "overwhelmed")
            triage_assessment_id: Database ID of STA triage assessment
            
        Returns:
            Final state after graph execution with intervention plan
            
        Raises:
            Exception: If graph execution fails
        """
        # Start execution tracking
        execution_id = execution_tracker.start_execution(
            graph_id="sca",
            agent_name="Support Coach Agent",
            input_data={
                "message": message,
                "user_hash": user_hash,
                "session_id": session_id,
                "severity": severity,
                "intent": intent
            }
        )
        
        # Initialize state with STA outputs
        initial_state: SCAState = {
            "user_id": user_id,
            "session_id": session_id,
            "user_hash": user_hash,
            "message": message,
            "conversation_id": conversation_id or 0,
            "execution_id": execution_id,
            "errors": [],
            "execution_path": [],
            "should_intervene": True,  # SCA is invoked because intervention is needed
            "case_created": False,
            "started_at": datetime.now(),
            # STA outputs
            "severity": severity,
            "intent": intent,
            "triage_assessment_id": triage_assessment_id
        }
        
        try:
            # Execute graph
            logger.info(
                f"Executing SCA graph for user_hash={user_hash}, "
                f"severity={severity}, intent={intent}, "
                f"execution_id={execution_id}"
            )
            
            final_state = await self.graph.ainvoke(initial_state)
            
            # Mark completion timestamp
            final_state["completed_at"] = datetime.now()
            
            # Track execution completion
            execution_success = len(final_state.get("errors", [])) == 0
            execution_tracker.complete_execution(execution_id, success=execution_success)
            
            logger.info(
                f"SCA graph execution completed: "
                f"intervention_type={final_state.get('intervention_type', 'unknown')}, "
                f"plan_id={final_state.get('intervention_plan_id', 'none')}, "
                f"errors={len(final_state.get('errors', []))}"
            )
            
            return final_state
            
        except Exception as e:
            logger.error(f"SCA graph execution failed: {e}", exc_info=True)
            execution_tracker.complete_execution(execution_id, success=False)
            
            # Return state with error
            initial_state["errors"].append(f"Graph execution failed: {str(e)}")
            initial_state["completed_at"] = datetime.now()
            
            raise


async def get_sca_graph_service(db: AsyncSession) -> SCAGraphService:
    """FastAPI dependency factory for SCAGraphService.
    
    Args:
        db: Database session
        
    Returns:
        Initialized SCAGraphService
    """
    return SCAGraphService(db)
