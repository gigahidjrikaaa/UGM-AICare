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
from typing import Any, Dict, List, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession

# Import NEW registry functions (decorator pattern)
from app.agents.shared.tools import (
    generate_gemini_tools,
    execute_tool,
    get_all_tools,
    get_tools_by_category
)

logger = logging.getLogger(__name__)


_AIKA_ROLE_TOOL_ALLOWLISTS: Dict[str, Set[str]] = {
    "student": {
        "get_user_profile",
        "get_user_preferences",
        "update_user_profile",
        "get_journal_entries",
        "get_activity_streak",
        "get_intervention_plan_progress",
        "get_user_intervention_plan_progress",
        "create_intervention_plan",
        "get_available_counselors",
        "suggest_appointment_times",
        "book_appointment",
        "cancel_appointment",
        "reschedule_appointment",
        "get_user_appointments",
        "get_crisis_resources",
    },
    "counselor": {
        "get_case_details",
        "get_user_cases",
        "get_conversation_summary",
        "get_conversation_stats",
        "search_conversations",
        "get_active_safety_cases",
        "get_risk_assessment_history",
        "get_escalation_protocol",
    },
    "admin": {
        "get_conversation_stats",
        "search_conversations",
        "get_case_details",
        "get_user_cases",
        "get_active_safety_cases",
        "get_crisis_resources",
    },
}


def _normalize_role(user_role: Optional[str]) -> str:
    role = (user_role or "student").strip().lower()
    if role in {"user", "student"}:
        return "student"
    if role in {"counselor", "therapist"}:
        return "counselor"
    if role in {"admin", "administrator", "superadmin", "super-admin"}:
        return "admin"
    return "student"


def get_aika_tools(
    allowed_tool_names: Optional[Set[str]] = None,
    user_role: Optional[str] = None,
) -> List[Any]:
    """Return list of tools available to Aika.
    
    This function returns tools in the format expected by the Google GenAI SDK.
    It filters out agent-invoking tools to prevent conflicts with LangGraph routing.
    
    Args:
        allowed_tool_names: Optional whitelist of tool names. If provided,
            only matching tools are exposed to the model.
        user_role: Optional caller role used for role-based hard allowlisting.

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
            "run_insights_agent",
            "general_query",
        }

        normalized_role = _normalize_role(user_role)
        role_allowlist = _AIKA_ROLE_TOOL_ALLOWLISTS.get(normalized_role, _AIKA_ROLE_TOOL_ALLOWLISTS["student"])
        active_allowlist: Set[str] = set(role_allowlist)
        if allowed_tool_names is not None:
            active_allowlist &= set(allowed_tool_names)
        
        filtered_tools = []
        selected_declarations_count = 0
        
        for tool in all_gemini_tools:
            # Each tool object has function_declarations list
            # We need to filter the declarations inside
            if not hasattr(tool, "function_declarations"):
                continue
                
            valid_decls = []
            for decl in tool.function_declarations:
                if decl.name in excluded_tools:
                    continue
                if decl.name not in active_allowlist:
                    continue
                valid_decls.append(decl)
            
            if valid_decls:
                # Create new Tool object with filtered declarations
                # We can't modify the existing one safely if it's shared
                from google.genai import types
                filtered_tools.append(types.Tool(function_declarations=valid_decls))
                selected_declarations_count += len(valid_decls)
        
        if allowed_tool_names is None:
            logger.info(
                "✅ Loaded %d tool groups for Aika role=%s (%d declarations)",
                len(filtered_tools),
                normalized_role,
                selected_declarations_count,
            )
        else:
            logger.info(
                "✅ Loaded %d tool groups for Aika role=%s (%d declarations after role+intent allowlist)",
                len(filtered_tools),
                normalized_role,
                selected_declarations_count,
            )
        
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
