"""Tool definitions and handlers for Aika's function calling capabilities.

REFACTORED: This module now uses the NEW decorator-based registry system.

Changes (Latest):
- Updated to use @register_tool decorator pattern
- All tools registered via registry.py
- Zero redundancy architecture
- Auto-generated Gemini schemas

Architecture:
- agent_tools.py: STA, TCA, CMA, IA, general_query
- scheduling_tools.py: Appointment booking tools
- registry.py: Core decorator pattern and tool execution
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession

# Import NEW registry functions (decorator pattern)
from app.agents.shared.tools import (
    generate_gemini_tools,
    execute_tool,
    get_all_tools,
    get_tools_by_category
)

logger = logging.getLogger(__name__)


def get_aika_tools() -> List[Dict[str, Any]]:
    """Return list of tools available to Aika.
    
    This function is used by legacy code that expects a list of tool schemas.
    For new code, use generate_gemini_tools() directly from the registry.
    
    Returns:
        List[Dict]: Tool schemas for Gemini function calling
    """
    try:
        # Use NEW registry to get all tools
        # The registry contains:
        # - agent tools (STA, TCA, CMA, IA, general_query)
        # - scheduling tools (book_appointment, get_available_counselors, etc.)
        all_tools_dict = get_all_tools()  # Returns Dict[str, Dict]
        all_tools = list(all_tools_dict.values())  # Convert to List[Dict]
        
        logger.info(f"✅ Loaded {len(all_tools)} tools for Aika from registry")
        
        # Return list of tool configurations
        return all_tools
        
    except Exception as e:
        logger.error(f"Error loading Aika tools: {e}")
        return []


async def execute_tool_call(
    tool_name: str,
    args: Dict[str, Any],
    db: AsyncSession,
    user_id: str,
) -> Dict[str, Any]:
    """Execute a tool call through the NEW unified registry.
    
    This function is used by legacy code. For new code, use execute_tool()
    directly from the registry.
    
    Args:
        tool_name: Name of the tool to execute
        args: Tool arguments
        db: Database session
        user_id: Current user ID
        
    Returns:
        Dict with tool execution result
    """
    try:
        logger.info(f"🔧 Executing tool '{tool_name}' for user {user_id}")
        
        # Execute through NEW registry (decorator pattern)
        result = await execute_tool(
            tool_name=tool_name,
            args=args,
            db=db,
            user_id=int(user_id) if isinstance(user_id, str) else user_id
        )
        
        if result.get("success") or result.get("status") == "completed":
            logger.info(f"✅ Tool '{tool_name}' executed successfully")
        else:
            logger.warning(f"⚠️ Tool '{tool_name}' returned error: {result.get('error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing tool '{tool_name}': {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Tool execution failed: {str(e)}",
            "tool_name": tool_name
        }
