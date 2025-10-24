"""Models package for UGM-AICare backend.

This package contains database models organized by domain:
- user: User authentication and profile model
- conversations: Chat and conversation history
- journal: Journal entries and reflection models
- appointments: Appointment scheduling and psychologist management
- feedback: User feedback and survey models
- content: Educational content and CBT modules
- social: Social media and gamification models
- interventions: Automated intervention campaigns and plans
- agents: Agent execution tracking
- assessments: Risk assessment and triage
- scheduling: Therapist scheduling and session management
- langgraph_tracking: LangGraph execution tracking models
- events/messages/cases/resources/consents/users: Safety agent telemetry and RBAC
- insights: IA-generated insights reports for admin dashboard
- campaign: Proactive outreach campaigns for SCA control
- system: System settings and agent health monitoring
"""

# Core models
from .user import User

# Conversation and communication models
from .conversations import Conversation, UserSummary
from .journal import JournalPrompt, JournalEntry, JournalReflectionPoint
from .appointments import Psychologist, AppointmentType, Appointment
from .feedback import Feedback, Survey, SurveyQuestion, SurveyResponse, SurveyAnswer

# Content and learning models
from .content import ContentResource, CbtModule, CbtModuleStep
from .social import Tweet, UserBadge

# Intervention models
from .interventions import (
    InterventionCampaign,
    CampaignExecution as InterventionCampaignExecution,
    InterventionPlanRecord,
    InterventionPlanStepCompletion,
)
from .agents import AgentRun, AgentMessage
from .assessments import TriageAssessment
from .scheduling import TherapistSchedule, FlaggedSession

# LangGraph tracking models (Phase 2)
from .langgraph_tracking import (
    LangGraphExecution,
    LangGraphNodeExecution,
    LangGraphEdgeExecution,
    LangGraphPerformanceMetric,
    LangGraphAlert,
)

# Safety agent data models
from .events import Event, AgentNameEnum
from .messages import Message, MessageRoleEnum
from .consents import Consent, ConsentScopeEnum
from .cases import Case, CaseNote, CaseStatusEnum, CaseSeverityEnum
from .resources import Resource
from .agent_user import AgentUser, AgentRoleEnum

# Admin infrastructure models (Phase 1)
from .insights import InsightsReport
from .campaign import Campaign, CampaignTrigger, CampaignMetrics, SCACampaignExecution
from .system import SystemSettings, AgentHealthLog, CaseAssignment
from .quests import (
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
    # Core Models
    "User",

    # Conversation Models
    "Conversation",
    "UserSummary",

    # Journal Models
    "JournalPrompt",
    "JournalEntry",
    "JournalReflectionPoint",

    # Appointment Models
    "Psychologist",
    "AppointmentType",
    "Appointment",

    # Feedback Models
    "Feedback",
    "Survey",
    "SurveyQuestion",
    "SurveyResponse",
    "SurveyAnswer",

    # Content Models
    "ContentResource",
    "CbtModule",
    "CbtModuleStep",

    # Social Models
    "Tweet",
    "UserBadge",

    # Intervention Models
    "InterventionCampaign",
    "InterventionCampaignExecution",
    "InterventionPlanRecord",
    "InterventionPlanStepCompletion",

    # Agent Models
    "AgentRun",
    "AgentMessage",

    # Assessment Models
    "TriageAssessment",

    # Scheduling Models
    "TherapistSchedule",
    "FlaggedSession",

    # LangGraph tracking models (Phase 2)
    "LangGraphExecution",
    "LangGraphNodeExecution",
    "LangGraphEdgeExecution",
    "LangGraphPerformanceMetric",
    "LangGraphAlert",

    # Safety Agent Data Models
    "Event",
    "Message",
    "Consent",
    "Case",
    "CaseNote",
    "Resource",
    "AgentUser",
    "AgentNameEnum",
    "MessageRoleEnum",
    "ConsentScopeEnum",
    "CaseStatusEnum",
    "CaseSeverityEnum",
    "AgentRoleEnum",

    # Admin Infrastructure Models (Phase 1)
    "InsightsReport",
    "Campaign",
    "CampaignTrigger",
    "CampaignMetrics",
    "SCACampaignExecution",
    "SystemSettings",
   "AgentHealthLog",
    "CaseAssignment",

    # Quest & Wellness Models
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

    # Real-time Alert Models (Phase 4)
    "Alert",
    "AlertType",
    "AlertSeverity",
]

