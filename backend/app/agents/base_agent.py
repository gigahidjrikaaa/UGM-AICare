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

    def __init__(self, agent_type: AgentType, redis_client=None):
        self.agent_type = agent_type
        self.status = AgentStatus.IDLE
        self.redis_client = redis_client
        self.logger = logging.getLogger(f"agent.{self.agent_type.value}")

    @abstractmethod
    def execute(self, **kwargs) -> Dict[str, Any]:
        """Main execution method for the agent."""
        pass

    @abstractmethod
    def validate_input(self, **kwargs) -> bool:
        """Validate input parameters for the agent."""
        pass

    def get_status(self) -> AgentStatus:
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