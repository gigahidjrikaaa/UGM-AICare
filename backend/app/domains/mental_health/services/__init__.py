"""
Mental Health Domain Services

This module aggregates all mental health-related services for the UGM-AICare platform.
Services are organized by functional area and can be imported from this single location.

Service Categories:
- AI Agents: agent_command, agent_integration, agent_orchestrator
- Chat & Context: dialogue_orchestrator_service, personal_context, tool_calling
- Clinical: intervention_plan_service, insights_service
- Gamification: quest_analytics_service, quest_engine_service, rewards_calculator_service, user_stats_service
- Campaigns: ai_campaign_generator, campaign_execution_service, campaign_service, campaign_trigger_evaluator

Note: chat_processing module is not yet implemented (stubbed for future development)
"""

# AI Agent services
from . import agent_command
from . import agent_integration
from . import agent_orchestrator

# Chat and context services
# from . import chat_processing  # TODO: Implement chat_processing module
from . import dialogue_orchestrator_service
from . import personal_context
from . import tool_calling

# Clinical services
from . import intervention_plan_service
from . import insights_service

# Gamification services
from . import quest_analytics_service
from . import quest_engine_service
from . import rewards_calculator_service
from . import user_stats_service

# Campaign services
from . import ai_campaign_generator
from . import campaign_execution_service
from . import campaign_service
from . import campaign_trigger_evaluator

__all__ = [
    # AI Agents
    "agent_command",
    "agent_integration",
    "agent_orchestrator",
    # Chat & Context
    # "chat_processing",  # TODO: Uncomment when implemented
    "dialogue_orchestrator_service",
    "personal_context",
    "tool_calling",
    # Clinical
    "intervention_plan_service",
    "insights_service",
    # Gamification
    "quest_analytics_service",
    "quest_engine_service",
    "rewards_calculator_service",
    "user_stats_service",
    # Campaigns
    "ai_campaign_generator",
    "campaign_execution_service",
    "campaign_service",
    "campaign_trigger_evaluator",
]
