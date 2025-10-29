"""Shared agent tools - Central registry and utilities.

This module provides a unified tool system for all agents (STA, SCA, SDA, IA, Aika).
Tools are organized by category for better maintainability and reusability.

Architecture:
- ToolRegistry: Central registration and execution system
- Tool categories: user, progress, conversation, safety, intervention, case_management, external, analytics
- Each category file registers its tools with the global registry

Usage:
    from app.agents.shared.tools import tool_registry
    
    # Get tool schemas for Gemini function calling
    schemas = tool_registry.get_schemas(categories=["user_context", "safety"])
    
    # Execute a tool
    result = await tool_registry.execute("get_user_profile", db, user_id=123)
"""
from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Central registry for all agent tools.
    
    Provides:
    - Tool registration with schemas
    - Category-based filtering
    - Unified execution dispatcher
    - Error handling and logging
    """
    
    def __init__(self):
        """Initialize empty tool registry."""
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Dict[str, Any]] = {}
        self._categories: Dict[str, List[str]] = {}
        logger.info("🔧 ToolRegistry initialized")
    
    def register(
        self,
        name: str,
        func: Callable,
        schema: Dict[str, Any],
        category: str
    ) -> None:
        """Register a tool function with its schema.
        
        Args:
            name: Tool name (must match schema["name"])
            func: Async function that implements the tool
            schema: Gemini function calling schema
            category: Tool category (e.g., "user_context", "safety")
        
        Raises:
            ValueError: If tool name already registered or name mismatch
        """
        if name in self._tools:
            logger.warning(f"⚠️  Tool '{name}' already registered, overwriting")
        
        if schema.get("name") != name:
            raise ValueError(f"Schema name '{schema.get('name')}' doesn't match tool name '{name}'")
        
        self._tools[name] = func
        self._schemas[name] = {**schema, "category": category}
        
        # Track category membership
        if category not in self._categories:
            self._categories[category] = []
        if name not in self._categories[category]:
            self._categories[category].append(name)
        
        logger.debug(f"✅ Registered tool '{name}' in category '{category}'")
    
    async def execute(
        self,
        name: str,
        db: AsyncSession,
        **kwargs: Any
    ) -> Any:
        """Execute a registered tool.
        
        Args:
            name: Tool name to execute
            db: Database session
            **kwargs: Tool-specific arguments
        
        Returns:
            Tool execution result
        
        Raises:
            ValueError: If tool not found
            Exception: If tool execution fails
        """
        if name not in self._tools:
            available = ", ".join(sorted(self._tools.keys()))
            raise ValueError(
                f"Tool '{name}' not found. "
                f"Available tools: {available}"
            )
        
        try:
            logger.debug(f"🔧 Executing tool '{name}' with args: {kwargs}")
            result = await self._tools[name](db, **kwargs)
            logger.debug(f"✅ Tool '{name}' executed successfully")
            return result
        except Exception as e:
            logger.error(f"❌ Tool '{name}' execution failed: {e}", exc_info=True)
            # Return error dict instead of raising for graceful degradation
            return {
                "error": str(e),
                "tool": name,
                "message": f"Tool execution failed: {e}"
            }
    
    def get_schemas(
        self,
        categories: Optional[List[str]] = None,
        names: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get tool schemas for Gemini function calling.
        
        Args:
            categories: Optional list of categories to include
            names: Optional list of specific tool names to include
        
        Returns:
            List of tool schemas for Gemini
        """
        if names:
            # Return specific tools by name
            return [
                self._schemas[name]
                for name in names
                if name in self._schemas
            ]
        
        if categories:
            # Return tools in specified categories
            tool_names = []
            for category in categories:
                tool_names.extend(self._categories.get(category, []))
            return [
                self._schemas[name]
                for name in tool_names
                if name in self._schemas
            ]
        
        # Return all tools
        return list(self._schemas.values())
    
    def get_tool_names(
        self,
        category: Optional[str] = None
    ) -> List[str]:
        """Get list of registered tool names.
        
        Args:
            category: Optional category to filter by
        
        Returns:
            List of tool names
        """
        if category:
            return sorted(self._categories.get(category, []))
        return sorted(self._tools.keys())
    
    def get_categories(self) -> List[str]:
        """Get list of all registered categories.
        
        Returns:
            List of category names
        """
        return sorted(self._categories.keys())
    
    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics.
        
        Returns:
            Dict with tool counts by category
        """
        return {
            "total_tools": len(self._tools),
            "categories": len(self._categories),
            "tools_by_category": {
                cat: len(tools)
                for cat, tools in self._categories.items()
            }
        }


# Global tool registry instance
tool_registry = ToolRegistry()


# Import tool modules to register their tools
# Note: Tool modules will register themselves when imported
try:
    from . import user_tools  # noqa: F401
    logger.info("✅ Loaded user_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load user_tools: {e}")

try:
    from . import progress_tools  # noqa: F401
    logger.info("✅ Loaded progress_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load progress_tools: {e}")

try:
    from . import safety_tools  # noqa: F401
    logger.info("✅ Loaded safety_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load safety_tools: {e}")

try:
    from . import conversation_tools  # noqa: F401
    logger.info("✅ Loaded conversation_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load conversation_tools: {e}")

try:
    from . import intervention_tools  # noqa: F401
    logger.info("✅ Loaded intervention_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load intervention_tools: {e}")

try:
    from . import case_management_tools  # noqa: F401
    logger.info("✅ Loaded case_management_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load case_management_tools: {e}")

try:
    from . import external_tools  # noqa: F401
    logger.info("✅ Loaded external_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load external_tools: {e}")

try:
    from . import analytics_tools  # noqa: F401
    logger.info("✅ Loaded analytics_tools")
except ImportError as e:
    logger.warning(f"⚠️  Could not load analytics_tools: {e}")


# Log registry stats after all imports
logger.info(f"📊 Tool Registry Stats: {tool_registry.get_stats()}")


__all__ = ["tool_registry", "ToolRegistry"]
