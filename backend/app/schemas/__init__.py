# backend/app/schemas/__init__.py

# Import all schemas from the schemas directory to make them accessible through app.schemas

# backend/app/schemas/__init__.py

# Import all schemas from the schemas directory to make them accessible through app.schemas

from .chat import (
    ChatEvent, ChatRequest, ChatResponse, ConversationHistoryItem, SummarizeRequest
)
from .docs import (
    EndpointExample, EndpointDoc, ModuleDoc
)
from .email import (
    EmailRecipient, CreateEmailTemplate, EmailRequest, EmailGroupCreate, ScheduleEmailRequest
)

# Import agent schemas
from .agents import (
    AgentType, ReportStatus, CampaignStatus, SeverityLevel, ActionType,
    AnalyticsReportBase, AnalyticsReportCreate, AnalyticsReportResponse, AnalyticsReportSummary,
    InterventionCampaignBase, InterventionCampaignCreate, InterventionCampaignUpdate, InterventionCampaignResponse,
    CampaignExecutionResponse, TriageAssessmentCreate, TriageAssessmentResponse,
    TriageClassificationRequest, TriageClassificationResponse,
    AgentSystemLogCreate, AgentSystemLogResponse,
    AgentConfigurationBase, AgentConfigurationCreate, AgentConfigurationUpdate, AgentConfigurationResponse,
    AgentDashboardStats, AgentPerformanceMetrics, AgentTrendAnalysis,
    BulkCampaignUpdate, BulkTriageReview, AgentApiResponse,
    PaginatedAnalyticsReports, PaginatedCampaigns, PaginatedTriageAssessments
)

__all__ = [
    "ChatEvent", "ChatRequest", "ChatResponse", "ConversationHistoryItem", "SummarizeRequest",
    "EndpointExample", "EndpointDoc", "ModuleDoc",
    "EmailRecipient", "CreateEmailTemplate", "EmailRequest", "EmailGroupCreate", "ScheduleEmailRequest",
    "AgentType", "ReportStatus", "CampaignStatus", "SeverityLevel", "ActionType",
    "AnalyticsReportBase", "AnalyticsReportCreate", "AnalyticsReportResponse", "AnalyticsReportSummary",
    "InterventionCampaignBase", "InterventionCampaignCreate", "InterventionCampaignUpdate", "InterventionCampaignResponse",
    "CampaignExecutionResponse", "TriageAssessmentCreate", "TriageAssessmentResponse",
    "TriageClassificationRequest", "TriageClassificationResponse",
    "AgentSystemLogCreate", "AgentSystemLogResponse",
    "AgentConfigurationBase", "AgentConfigurationCreate", "AgentConfigurationUpdate", "AgentConfigurationResponse",
    "AgentDashboardStats", "AgentPerformanceMetrics", "AgentTrendAnalysis",
    "BulkCampaignUpdate", "BulkTriageReview", "AgentApiResponse",
    "PaginatedAnalyticsReports", "PaginatedCampaigns", "PaginatedTriageAssessments"
]