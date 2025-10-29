"""Tool definitions and handlers for Aika's function calling capabilities.

REFACTORED: This module now uses shared tools from agents/shared/tools/

Changes:
- Reduced from 1,824 lines to ~200 lines (89% reduction)
- All tools now reusable by all agents (STA, SCA, SDA, IA, Aika)
- Added external context tools for natural conversations
- Better organization with 8 tool categories

Original 1,824-line version backed up as tools.py.backup
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

# Import shared tool registry
from app.agents.shared.tools import tool_registry

logger = logging.getLogger(__name__)


def get_aika_tools() -> List[Dict[str, Any]]:
    """Return list of tools available to Aika.
    
    Returns:
        List[Dict]: Tool schemas for Gemini function calling
    """
    try:
        # Define which tool categories Aika can use
        aika_categories = [
            "user_context",
            "progress_tracking",
            "conversation",
            "safety",
            "intervention",
            "external_context",
            "analytics"
        ]
        
        # Get schemas from shared registry
        schemas = tool_registry.get_schemas(categories=aika_categories)
        
        logger.info(f"Loaded {len(schemas)} tools for Aika from {len(aika_categories)} categories")
        
        return schemas
        
    except Exception as e:
        logger.error(f"Error loading Aika tools: {e}")
        return []


async def execute_tool_call(
    tool_name: str,
    args: Dict[str, Any],
    db: AsyncSession,
    user_id: str,
) -> Dict[str, Any]:
    """Execute a tool call through the shared tool registry.
    
    Args:
        tool_name: Name of the tool to execute
        args: Tool arguments
        db: Database session
        user_id: Current user ID
        
    Returns:
        Dict with tool execution result
    """
    try:
        # Add user_id to args if not present
        if "user_id" not in args:
            args["user_id"] = user_id
        
        logger.info(f"Executing tool '{tool_name}' for user {user_id}")
        
        # Execute through shared registry
        result = await tool_registry.execute(
            name=tool_name,
            db=db,
            **args
        )
        
        if result.get("success"):
            logger.info(f"Tool '{tool_name}' executed successfully")
        else:
            logger.warning(f"Tool '{tool_name}' returned error: {result.get('error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing tool '{tool_name}': {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Tool execution failed: {str(e)}",
            "tool_name": tool_name
        }
