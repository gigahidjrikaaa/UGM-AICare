"""Service wrapper for Master Orchestrator LangGraph execution.

This module provides a high-level interface for executing the complete
Safety Agent Suite workflow via the orchestrator graph, which coordinates
STA → SCA → SDA routing.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import OrchestratorState
from app.agents.orchestrator_graph import create_orchestrator_graph
from app.agents.execution_tracker import execution_tracker

logger = logging.getLogger(__name__)


class OrchestratorGraphService:
    """Execute full Safety Agent Suite workflow via LangGraph orchestrator.
    
    This service wraps the master orchestrator StateGraph and provides
    complete end-to-end execution from user message intake through
    appropriate agent workflows (STA → SCA/SDA).
    
    Example:
        ```python
        async with get_async_db() as db:
            service = OrchestratorGraphService(db)
            result = await service.execute(
                user_id=123,
                session_id="abc-123",
                user_hash="hash_456",
                message="I'm feeling really overwhelmed",
                conversation_id=789
            )
            
            print(f"Severity: {result['severity']}")
            print(f"SCA intervened: {result.get('should_intervene', False)}")
            print(f"SDA case created: {result.get('case_created', False)}")
        ```
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize orchestrator graph service.
        
        Args:
            db: Database session for all graph operations
        """
        self.db = db
        self.graph = create_orchestrator_graph(db)
    
    async def execute(
        self,
        user_id: int,
        session_id: str,
        user_hash: str,
        message: str,
        conversation_id: int | None = None
    ) -> OrchestratorState:
        """Execute orchestrator graph workflow.
        
        This method:
        1. Starts execution tracking
        2. Initializes orchestrator state
        3. Executes the compiled StateGraph (STA → SCA/SDA)
        4. Completes execution tracking
        5. Returns final state with all agent outputs
        
        Args:
            user_id: User database ID
            session_id: Session identifier
            user_hash: Anonymized user identifier
            message: User message to process
            conversation_id: Optional conversation ID
            
        Returns:
            Final state after complete workflow execution with outputs from
            STA and any invoked downstream agents (SCA/SDA)
            
        Raises:
            Exception: If orchestrator execution fails
        """
        # Start execution tracking
        execution_id = execution_tracker.start_execution(
            graph_id="orchestrator",
            agent_name="Safety Agent Suite Orchestrator",
            input_data={
                "message": message,
                "user_hash": user_hash,
                "session_id": session_id
            }
        )
        
        # Initialize orchestrator state
        initial_state: OrchestratorState = {
            "user_id": user_id,
            "session_id": session_id,
            "user_hash": user_hash,
            "message": message,
            "conversation_id": conversation_id or 0,
            "execution_id": execution_id,
            "errors": [],
            "execution_path": [],
            "should_intervene": False,
            "case_created": False,
            "started_at": datetime.now()
        }
        
        try:
            # Execute orchestrator graph
            logger.info(
                f"Executing orchestrator graph for user_hash={user_hash}, "
                f"execution_id={execution_id}"
            )
            
            final_state = await self.graph.ainvoke(initial_state)
            
            # Mark completion timestamp
            final_state["completed_at"] = datetime.now()
            
            # Track execution completion
            execution_success = len(final_state.get("errors", [])) == 0
            execution_tracker.complete_execution(execution_id, success=execution_success)
            
            logger.info(
                f"Orchestrator graph execution completed: "
                f"severity={final_state.get('severity', 'unknown')}, "
                f"sca_invoked={final_state.get('should_intervene', False)}, "
                f"sda_invoked={final_state.get('case_created', False)}, "
                f"errors={len(final_state.get('errors', []))}"
            )
            
            return final_state
            
        except Exception as e:
            logger.error(f"Orchestrator graph execution failed: {e}", exc_info=True)
            execution_tracker.complete_execution(execution_id, success=False)
            
            # Return state with error
            initial_state["errors"].append(f"Orchestrator execution failed: {str(e)}")
            initial_state["completed_at"] = datetime.now()
            initial_state["next_step"] = "end"
            
            raise


async def get_orchestrator_graph_service(db: AsyncSession) -> OrchestratorGraphService:
    """FastAPI dependency factory for OrchestratorGraphService.
    
    Args:
        db: Database session
        
    Returns:
        Initialized OrchestratorGraphService instance
    """
    return OrchestratorGraphService(db)
