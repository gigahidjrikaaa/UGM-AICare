"""Service wrapper for SDA LangGraph execution.

This module provides a high-level interface for executing the Service Desk Agent
workflow via LangGraph, including execution tracking and error handling.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import SDAState
from app.agents.sda.sda_graph import create_sda_graph
from app.agents.execution_tracker import execution_tracker

logger = logging.getLogger(__name__)


class SDAGraphService:
    """Execute SDA workflow via LangGraph.
    
    This service wraps the SDA StateGraph and provides execution tracking,
    state initialization, and error handling for high-severity case escalations.
    
    Example:
        ```python
        async with get_async_db() as db:
            service = SDAGraphService(db)
            result = await service.execute(
                user_id=123,
                session_id="abc-123",
                user_hash="hash_456",
                message="I want to end my life",
                conversation_id=789,
                severity="critical",
                intent="crisis",
                risk_score=0.95,
                triage_assessment_id=456
            )
            print(f"Case ID: {result['case_id']}")
            print(f"SLA breach at: {result['sla_breach_at']}")
        ```
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize SDA graph service.
        
        Args:
            db: Database session for graph node operations
        """
        self.db = db
        self.graph = create_sda_graph(db)
    
    async def execute(
        self,
        user_id: int,
        session_id: str,
        user_hash: str,
        message: str,
        conversation_id: int | None = None,
        severity: str = "high",
        intent: str = "crisis",
        risk_score: float = 0.8,
        triage_assessment_id: int | None = None
    ) -> SDAState:
        """Execute SDA graph workflow for case creation.
        
        This method:
        1. Starts execution tracking
        2. Initializes graph state with STA triage outputs
        3. Executes the compiled StateGraph to create a case
        4. Completes execution tracking
        5. Returns final state with case details
        
        Args:
            user_id: User database ID
            session_id: Session identifier
            user_hash: Anonymized user identifier
            message: User message triggering escalation
            conversation_id: Optional conversation ID
            severity: Risk severity from STA (must be "high" or "critical")
            intent: Detected intent from STA (e.g., "crisis", "self_harm")
            risk_score: Numerical risk score from STA (0.0-1.0)
            triage_assessment_id: Database ID of STA triage assessment
            
        Returns:
            Final state after graph execution with case ID and SLA details
            
        Raises:
            Exception: If graph execution fails
            ValueError: If severity is not "high" or "critical"
        """
        # Validate severity
        if severity.lower() not in ("high", "critical"):
            raise ValueError(
                f"SDA only handles high/critical severity cases, got: {severity}"
            )
        
        # Start execution tracking
        execution_id = execution_tracker.start_execution(
            graph_id="sda",
            agent_name="Service Desk Agent",
            input_data={
                "message": message,
                "user_hash": user_hash,
                "session_id": session_id,
                "severity": severity,
                "intent": intent,
                "risk_score": risk_score
            }
        )
        
        # Initialize state with STA outputs
        initial_state: SDAState = {
            "user_id": user_id,
            "session_id": session_id,
            "user_hash": user_hash,
            "message": message,
            "conversation_id": conversation_id or 0,
            "execution_id": execution_id,
            "errors": [],
            "execution_path": [],
            "should_intervene": False,  # Not SCA intervention - case escalation
            "case_created": False,
            "started_at": datetime.now(),
            # STA outputs
            "severity": severity,
            "intent": intent,
            "risk_score": risk_score,
            "triage_assessment_id": triage_assessment_id
        }
        
        try:
            # Execute graph
            logger.info(
                f"Executing SDA graph for user_hash={user_hash}, "
                f"severity={severity}, risk_score={risk_score}, "
                f"execution_id={execution_id}"
            )
            
            final_state = await self.graph.ainvoke(initial_state)
            
            # Mark completion timestamp
            final_state["completed_at"] = datetime.now()
            
            # Track execution completion
            execution_success = len(final_state.get("errors", [])) == 0
            execution_tracker.complete_execution(execution_id, success=execution_success)
            
            logger.info(
                f"SDA graph execution completed: "
                f"case_created={final_state.get('case_created', False)}, "
                f"case_id={final_state.get('case_id', 'none')}, "
                f"errors={len(final_state.get('errors', []))}"
            )
            
            return final_state
            
        except Exception as e:
            logger.error(f"SDA graph execution failed: {e}", exc_info=True)
            execution_tracker.complete_execution(execution_id, success=False)
            
            # Return state with error
            initial_state["errors"].append(f"Graph execution failed: {str(e)}")
            initial_state["completed_at"] = datetime.now()
            
            raise


async def get_sda_graph_service(db: AsyncSession) -> SDAGraphService:
    """FastAPI dependency factory for SDAGraphService.
    
    Args:
        db: Database session
        
    Returns:
        Initialized SDAGraphService
    """
    return SDAGraphService(db)
