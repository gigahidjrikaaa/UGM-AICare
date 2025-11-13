"""
Shared Tools Module (Refactored with Decorator Pattern)

This module imports all tool definitions to ensure they are registered
in the global tool registry at startup.

All tools use the @register_tool decorator pattern for zero-redundancy architecture.

Architecture:
- registry.py: Core decorator pattern and tool registry
- agent_tools.py: Agent orchestration tools (STA, SCA, SDA, IA, general_query)
- scheduling_tools.py: Appointment scheduling tools
- Tool registry: Global _TOOL_REGISTRY dict with auto-generated Gemini schemas

Usage:
    from app.agents.shared.tools import generate_gemini_tools, execute_tool
    
    # Get Gemini-compatible tool schemas
    gemini_tools = generate_gemini_tools()
    
    # Execute a tool
    result = await execute_tool("book_appointment", args, db=db, user_id=user_id)
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Import registry first
from .registry import (
    register_tool,
    get_tool,
    get_all_tools,
    get_tools_by_category,
    generate_gemini_tools,
    execute_tool,
    validate_registry
)

# Import all tool modules to trigger registration
# These imports MUST happen after registry is imported
try:
    from . import agent_tools  # noqa: F401
    logger.info("✅ Loaded agent_tools (STA, SCA, SDA, IA, general_query)")
except ImportError as e:
    logger.error(f"❌ Could not load agent_tools: {e}")

try:
    from . import scheduling_tools  # noqa: F401
    logger.info("✅ Loaded scheduling_tools (book_appointment, get_available_counselors, etc.)")
except ImportError as e:
    logger.error(f"❌ Could not load scheduling_tools: {e}")

# Log registry stats after all imports
try:
    all_tools = get_all_tools()  # Returns Dict[str, Dict]
    tool_list = list(all_tools.values())  # Convert to List[Dict]
    logger.info(f"📊 Tool Registry Stats: {len(tool_list)} tools registered")
    logger.info(f"📝 Registered tools: {', '.join([t['name'] for t in tool_list])}")
except Exception as e:
    logger.error(f"❌ Failed to get registry stats: {e}")

__all__ = [
    # Tool modules
    "agent_tools",
    "scheduling_tools",
    
    # Registry functions (NEW)
    "register_tool",
    "get_tool",
    "get_all_tools",
    "get_tools_by_category",
    "generate_gemini_tools",
    "execute_tool",
    "validate_registry",
]
