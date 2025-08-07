# backend/app/models/__init__.py

# Import all models from the models directory to make them accessible through app.models

from .user import User, UserSummary, UserBadge
from .chat import Conversation
from .email import EmailTemplate, EmailGroup, EmailRecipient, EmailLog
from .social import Tweet, Feedback
from .journal import JournalPrompt, JournalEntry, JournalReflectionPoint
from .appointment import Psychologist, AppointmentType, Appointment
from .agents import (
    AnalyticsReport,
    InterventionCampaign,
    CampaignExecution,
    TriageAssessment,
    AgentSystemLog,
    AgentConfiguration
)

__all__ = [
    "User", "UserSummary", "UserBadge",
    "Conversation",
    "EmailTemplate", "EmailGroup", "EmailRecipient", "EmailLog",
    "Tweet", "Feedback",
    "JournalPrompt", "JournalEntry", "JournalReflectionPoint",
    "Psychologist", "AppointmentType", "Appointment",
    "AnalyticsReport",
    "InterventionCampaign",
    "CampaignExecution",
    "TriageAssessment",
    "AgentSystemLog",
    "AgentConfiguration"
]