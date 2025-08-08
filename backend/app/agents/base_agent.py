"""
Base Agent Class for UGM-AICare Three-Agent Framework

This module provides the foundational class for all AI agents in the system,
ensuring consistent interface and logging across Analytics, Intervention, and Triage agents.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from enum import Enum
import json
from sqlalchemy.orm import Session
from sqlalchemy import text

# Configure logging
logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    """Agent operational status"""
    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"
    DISABLED = "disabled"


class AgentType(Enum):
    """Agent types in the three-agent framework"""
    ANALYTICS = "analytics"
    INTERVENTION = "intervention"  
    TRIAGE = "triage"


class BaseAgent(ABC):
    """
    Abstract base class for all UGM-AICare AI agents.
    
    Provides common functionality including:
    - Status management
    - Logging infrastructure
    - Error handling
    - Performance metrics
    - Database integration
    """

    def __init__(self, agent_type: AgentType, db: Session, redis_client=None):
        self.agent_type = agent_type
        self.status = AgentStatus.IDLE
        self.db = db
        self.redis_client = redis_client
        self.start_time = None
        self.execution_metrics = {}
        
        logger.info(f"{self.agent_type.value.title()} Agent initialized")

    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute the agent's primary function.
        Must be implemented by each specific agent.
        """
        pass

    @abstractmethod
    def validate_input(self, **kwargs) -> bool:
        """
        Validate input parameters before execution.
        Must be implemented by each specific agent.
        """
        pass

    async def run(self, **kwargs) -> Dict[str, Any]:
        """
        Main execution wrapper with error handling and metrics.
        """
        self.start_time = datetime.utcnow()
        self.status = AgentStatus.RUNNING
        
        try:
            logger.info(f"Starting {self.agent_type.value} agent execution")
            
            # Validate input
            if not self.validate_input(**kwargs):
                raise ValueError("Input validation failed")
            
            # Log start event
            await self._log_event("started", {"input_params": kwargs})
            
            # Execute main logic
            result = await self.execute(**kwargs)
            
            # Calculate metrics
            execution_time = (datetime.utcnow() - self.start_time).total_seconds()
            self.execution_metrics = {
                "execution_time_seconds": execution_time,
                "success": True,
                "timestamp": self.start_time.isoformat()
            }
            
            # Log completion
            await self._log_event("completed", {
                "result_summary": self._summarize_result(result),
                "metrics": self.execution_metrics
            })
            
            self.status = AgentStatus.IDLE
            logger.info(f"{self.agent_type.value} agent execution completed successfully")
            
            return result
            
        except Exception as e:
            self.status = AgentStatus.ERROR
            execution_time = (datetime.utcnow() - self.start_time).total_seconds() if self.start_time else 0
            
            error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "execution_time_seconds": execution_time
            }
            
            logger.error(f"{self.agent_type.value} agent execution failed: {e}", exc_info=True)
            await self._log_event("error", error_details)
            
            raise

    async def _log_event(self, event_type: str, event_data: Dict[str, Any]):
        """Log agent events to database"""
        try:
            from app.models.agents import AgentSystemLog
            
            log_entry = AgentSystemLog(
                agent_type=self.agent_type.value,
                event_type=event_type,
                event_data=event_data,
                status="success" if event_type != "error" else "error",
                message=f"{self.agent_type.value} agent {event_type}",
                processing_time_ms=int(self.execution_metrics.get("execution_time_seconds", 0) * 1000)
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to log event: {e}")

    def _summarize_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of execution result for logging"""
        summary = {
            "result_type": type(result).__name__,
            "keys_present": list(result.keys()) if isinstance(result, dict) else None,
            "success": True
        }
        
        # Add agent-specific result summaries
        if self.agent_type == AgentType.ANALYTICS:
            summary.update({
                "insights_count": len(result.get("insights", [])),
                "patterns_detected": len(result.get("patterns", [])),
                "data_points_analyzed": result.get("data_points_analyzed", 0)
            })
        elif self.agent_type == AgentType.INTERVENTION:
            summary.update({
                "campaigns_created": len(result.get("campaigns", [])),
                "target_audience_size": result.get("target_audience_size", 0),
                "campaign_type": result.get("campaign_type", "unknown")
            })
        elif self.agent_type == AgentType.TRIAGE:
            summary.update({
                "severity_level": result.get("severity_level", "unknown"),
                "confidence_score": result.get("confidence_score", 0),
                "action_recommended": result.get("recommended_action", "unknown")
            })
        
        return summary

    def get_status(self) -> Dict[str, Any]:
        """Get current agent status and metrics"""
        return {
            "agent_type": self.agent_type.value,
            "status": self.status.value,
            "last_execution": self.start_time.isoformat() if self.start_time else None,
            "metrics": self.execution_metrics
        }

    async def health_check(self) -> Dict[str, Any]:
        """Perform agent health check"""
        try:
            # Basic connectivity checks
            db_healthy = await self._check_database_connection()
            redis_healthy = await self._check_redis_connection() if self.redis_client else True
            
            health_status = "healthy" if db_healthy and redis_healthy else "unhealthy"
            
            return {
                "agent_type": self.agent_type.value,
                "status": health_status,
                "database_connection": db_healthy,
                "redis_connection": redis_healthy,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed for {self.agent_type.value} agent: {e}")
            return {
                "agent_type": self.agent_type.value,
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

    async def _check_database_connection(self) -> bool:
        """Check database connectivity"""
        try:
            # Simple query to test connection
            self.db.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return False

    async def _check_redis_connection(self) -> bool:
        """Check Redis connectivity"""
        try:
            if self.redis_client:
                # For sync redis client
                if hasattr(self.redis_client, 'ping'):
                    self.redis_client.ping()
                return True
            return True
        except Exception as e:
            logger.error(f"Redis connection check failed: {e}")
            return False
