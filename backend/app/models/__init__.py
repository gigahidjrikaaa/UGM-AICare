"""Models package for UGM-AICare backend.

This package contains database models organized by domain:
- user: User authentication and profile model
- conversations: Chat and conversation history
- journal: Journal entries and reflection models
- appointments: Appointment scheduling and psychologist management
- feedback: User feedback and survey models
- content: Educational content and CBT modules
- email: Email system and template models
- social: Social media and gamification models
- analytics: System analytics and reporting
- interventions: Automated intervention campaigns
- agents: Agent execution tracking
- assessments: Risk assessment and triage
- scheduling: Therapist scheduling and session management
- clinical_analytics: Privacy-preserving clinical analytics models
- langgraph_tracking: LangGraph execution tracking models
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
from .email import EmailTemplate, EmailGroup, EmailRecipient, EmailLog
from .social import Tweet, UserBadge

# Analytics and reporting models
from .analytics import AnalyticsReport
from .interventions import InterventionCampaign, CampaignExecution, InterventionAgentSettings
from .agents import AgentRun, AgentMessage
from .assessments import TriageAssessment
from .scheduling import TherapistSchedule, FlaggedSession

# Clinical analytics models (Phase 2)
from .clinical_analytics import (
    ValidatedAssessment,
    ClinicalOutcome,
    ServiceUtilization,
    InterventionOutcome,
    SystemPerformanceMetric,
    ClinicalInsight
)

# LangGraph tracking models (Phase 2)
from .langgraph_tracking import (
    LangGraphExecution,
    LangGraphNodeExecution,
    LangGraphEdgeExecution,
    LangGraphPerformanceMetric,
    LangGraphAlert
)

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
    
    # Email Models
    "EmailTemplate",
    "EmailGroup",
    "EmailRecipient",
    "EmailLog",
    
    # Social Models
    "Tweet",
    "UserBadge",
    
    # Analytics Models
    "AnalyticsReport",
    
    # Intervention Models
    "InterventionCampaign",
    "CampaignExecution",
    "InterventionAgentSettings",
    
    # Agent Models
    "AgentRun",
    "AgentMessage",
    
    # Assessment Models
    "TriageAssessment",
    
    # Scheduling Models
    "TherapistSchedule",
    "FlaggedSession",
    
    # Clinical Analytics Models (Phase 2)
    "ValidatedAssessment",
    "ClinicalOutcome", 
    "ServiceUtilization",
    "InterventionOutcome",
    "SystemPerformanceMetric",
    "ClinicalInsight",
    
    # LangGraph Tracking Models (Phase 2)
    "LangGraphExecution",
    "LangGraphNodeExecution",
    "LangGraphEdgeExecution",
    "LangGraphPerformanceMetric",
    "LangGraphAlert"
]