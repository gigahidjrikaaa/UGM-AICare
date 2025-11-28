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


def get_aika_tools() -> List[Any]:
    """Return list of tools available to Aika.
    
    This function returns tools in the format expected by the Google GenAI SDK.
    It filters out agent-invoking tools to prevent conflicts with LangGraph routing.
    
    Returns:
        List[types.Tool]: Tool schemas for Gemini function calling
    """
    try:
        # Use NEW registry to get all tools in Gemini format
        all_gemini_tools = generate_gemini_tools()
        
        # Tools to exclude (agent runners that conflict with LangGraph routing)
        excluded_tools = {
            "run_safety_triage_agent",
            "run_support_coach_agent",
            "run_service_desk_agent",
            "run_insights_agent"
        }
        
        filtered_tools = []
        
        for tool in all_gemini_tools:
            # Each tool object has function_declarations list
            # We need to filter the declarations inside
            if not hasattr(tool, "function_declarations"):
                continue
                
            valid_decls = []
            for decl in tool.function_declarations:
                if decl.name not in excluded_tools:
                    valid_decls.append(decl)
            
            if valid_decls:
                # Create new Tool object with filtered declarations
                # We can't modify the existing one safely if it's shared
                from google.genai import types
                filtered_tools.append(types.Tool(function_declarations=valid_decls))
        
        logger.info(f"✅ Loaded {len(filtered_tools)} tool groups for Aika (filtered agent runners)")
        
        return filtered_tools
        
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
