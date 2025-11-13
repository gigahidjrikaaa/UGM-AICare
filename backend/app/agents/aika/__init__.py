"""
Aika - The Meta-Agent

Aika (愛佳) is the unified AI consciousness of UGM-AICare.
She orchestrates all four Safety Agent Suite agents based on user role and intent.

Architecture:
- Meta-agent that coordinates STA, SCA, SDA, and IA
- Role-based routing (student, counselor, admin)
- LangGraph-powered orchestration with direct invocation (agentic pattern)
- Unified personality across all interactions

Name meaning:
- 愛 (Ai) = Love, affection
- 佳 (Ka) = Excellent, beautiful

⚠️ IMPORTANT: Use the unified orchestrator, NOT the legacy one!
  from app.agents.aika_orchestrator_graph import create_aika_agent_with_checkpointing
"""

# ✅ REMOVED: Legacy AikaOrchestrator - use aika_orchestrator_graph.py instead
from .identity import AIKA_IDENTITY, AIKA_SYSTEM_PROMPTS, AIKA_GREETINGS, AIKA_CAPABILITIES
from .state import AikaState, AikaResponseMetadata
from .tools import get_aika_tools, execute_tool_call

__all__ = [
    # ❌ DEPRECATED: "AikaOrchestrator" - Use create_aika_agent_with_checkpointing instead
    "AIKA_IDENTITY",
    "AIKA_SYSTEM_PROMPTS",
    "AIKA_GREETINGS",
    "AIKA_CAPABILITIES",
    "AikaState",
    "AikaResponseMetadata",
    "get_aika_tools",
    "execute_tool_call",
]
