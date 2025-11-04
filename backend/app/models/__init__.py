"""Models package for UGM-AICare backend.

Core/Shared Models Only
========================

This module contains only core models used across all domains:
- User authentication and authorization
- Revenue reporting (shared finance model)
- System administration and infrastructure
- Social features (tweets, badges)
- LangGraph tracking and monitoring

Domain-specific models have been migrated:
- Mental Health: app.domains.mental_health.models
- Finance: app.domains.finance.models
- Blockchain: app.domains.blockchain.models

Always import from domain modules directly:
    from app.domains.mental_health.models import Conversation, JournalEntry
"""

# ============================================================================
# CORE MODELS (Cross-Domain / Infrastructure)
# ============================================================================

# Authentication and authorization
from .user import User
from .agent_user import AgentUser, AgentRoleEnum

# Revenue reporting - imported directly from models file to avoid loading blockchain dependencies
from app.domains.finance.models import RevenueReport, RevenueApproval, ReportStatus

# Social features
from .social import Tweet, UserBadge

# Clinical scheduling
from .scheduling import TherapistSchedule, FlaggedSession

# LangGraph tracking infrastructure (Phase 2)
from .langgraph_tracking import (
    LangGraphExecution,
    LangGraphNodeExecution,
    LangGraphEdgeExecution,
    LangGraphPerformanceMetric,
    LangGraphAlert,
)

# Admin infrastructure models (Phase 1)
from .insights import InsightsReport
from .campaign import Campaign, CampaignTrigger, CampaignMetrics, SCACampaignExecution
from .system import SystemSettings, AgentHealthLog, CaseAssignment

# Quest models (re-exported from mental_health domain)
from app.domains.mental_health.models.quests import (
    QuestTemplate,
    QuestInstance,
    QuestCategoryEnum,
    QuestDifficultyEnum,
    QuestStatusEnum,
    PlayerWellnessState,
    RewardLedgerEntry,
    AttestationRecord,
    AttestationStatusEnum,
    ComplianceAuditLog,
    QuestAnalyticsEvent,
)

# Real-time alert models (Phase 4)
from .alerts import Alert, AlertType, AlertSeverity

__all__ = [
    # Core Authentication Models
    "User",
    "AgentUser",
    "AgentRoleEnum",
    
    # Revenue Models (Shared)
    "RevenueReport",
    "RevenueApproval",
    "ReportStatus",
    
    # Social Models
    "Tweet",
    "UserBadge",
    
    # Scheduling Models
    "TherapistSchedule",
    "FlaggedSession",
    
    # LangGraph Tracking Infrastructure
    "LangGraphExecution",
    "LangGraphNodeExecution",
    "LangGraphEdgeExecution",
    "LangGraphPerformanceMetric",
    "LangGraphAlert",
    
    # Admin Infrastructure Models
    "InsightsReport",
    "Campaign",
    "CampaignTrigger",
    "CampaignMetrics",
    "SCACampaignExecution",
    "SystemSettings",
    "AgentHealthLog",
    "CaseAssignment",
    
    # Quest Models (still exported for compatibility)
    "QuestTemplate",
    "QuestInstance",
    "QuestCategoryEnum",
    "QuestDifficultyEnum",
    "QuestStatusEnum",
    "PlayerWellnessState",
    "RewardLedgerEntry",
    "AttestationRecord",
    "AttestationStatusEnum",
    "ComplianceAuditLog",
    "QuestAnalyticsEvent",
    
    # Real-time Alert Models
    "Alert",
    "AlertType",
    "AlertSeverity",
]

