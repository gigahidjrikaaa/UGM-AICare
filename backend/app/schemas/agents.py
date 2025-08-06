# backend/app/schemas/agents.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Enums for better type safety
class AgentType(str, Enum):
    ANALYTICS = "analytics"
    INTERVENTION = "intervention" 
    TRIAGE = "triage"

class ReportStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRISIS = "crisis"

class ActionType(str, Enum):
    SELF_HELP = "self_help"
    COUNSELING = "counseling"
    EMERGENCY = "emergency"

# Analytics Agent Schemas
class AnalyticsReportBase(BaseModel):
    report_period: str = Field(..., description="Analysis period (weekly, monthly)")
    insights: Dict[str, Any] = Field(..., description="Generated insights")
    trends: Optional[Dict[str, Any]] = Field(None, description="Trend analysis")
    recommendations: Optional[Dict[str, Any]] = Field(None, description="Action recommendations")

class AnalyticsReportCreate(AnalyticsReportBase):
    data_sources: Optional[Dict[str, Any]] = None
    patterns_detected: Optional[Dict[str, Any]] = None
    users_analyzed: int = 0
    conversations_analyzed: int = 0

class AnalyticsReportResponse(AnalyticsReportBase):
    id: int
    generated_at: datetime
    status: ReportStatus
    data_sources: Optional[Dict[str, Any]] = None
    patterns_detected: Optional[Dict[str, Any]] = None
    users_analyzed: int
    conversations_analyzed: int
    execution_time_seconds: Optional[int] = None
    
    class Config:
        from_attributes = True

class AnalyticsReportSummary(BaseModel):
    id: int
    generated_at: datetime
    report_period: str
    status: ReportStatus
    users_analyzed: int
    conversations_analyzed: int
    key_insights_count: int
    triggered_campaigns_count: int
    
    class Config:
        from_attributes = True

# Intervention Agent Schemas
class InterventionCampaignBase(BaseModel):
    campaign_name: str = Field(..., max_length=255)
    campaign_type: str = Field(..., description="Type of campaign (email, notification, etc.)")
    target_criteria: Dict[str, Any] = Field(..., description="Targeting criteria")
    content: Dict[str, Any] = Field(..., description="Campaign content and messaging")
    resources: Optional[Dict[str, Any]] = Field(None, description="Related resources")

class InterventionCampaignCreate(InterventionCampaignBase):
    triggered_by_report_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None

class InterventionCampaignUpdate(BaseModel):
    campaign_name: Optional[str] = None
    status: Optional[CampaignStatus] = None
    scheduled_at: Optional[datetime] = None
    content: Optional[Dict[str, Any]] = None
    resources: Optional[Dict[str, Any]] = None

class InterventionCampaignResponse(InterventionCampaignBase):
    id: int
    triggered_by_report_id: Optional[int] = None
    status: CampaignStatus
    target_audience_size: int
    created_at: datetime
    scheduled_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    sent_count: int
    delivery_rate: int
    engagement_rate: int
    effectiveness_score: int
    
    class Config:
        from_attributes = True

class CampaignExecutionResponse(BaseModel):
    id: int
    campaign_id: int
    executed_at: datetime
    execution_type: str
    target_count: int
    success_count: int
    failure_count: int
    execution_details: Optional[Dict[str, Any]] = None
    error_log: Optional[str] = None
    
    class Config:
        from_attributes = True

# Triage Agent Schemas
class TriageAssessmentCreate(BaseModel):
    conversation_id: int
    user_id: int
    severity_level: SeverityLevel
    confidence_score: int = Field(..., ge=0, le=100)
    crisis_indicators: Optional[Dict[str, Any]] = None
    risk_factors: Optional[Dict[str, Any]] = None
    protective_factors: Optional[Dict[str, Any]] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None
    recommended_action: ActionType
    recommended_resources: Optional[Dict[str, Any]] = None
    follow_up_required: bool = False
    escalation_needed: bool = False

class TriageAssessmentResponse(TriageAssessmentCreate):
    id: int
    assessed_at: datetime
    routing_decision: Optional[Dict[str, Any]] = None
    professional_referral: bool
    emergency_contact_triggered: bool
    assessment_accuracy: Optional[int] = None
    user_feedback: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class TriageClassificationRequest(BaseModel):
    conversation_id: int
    user_id: int
    messages: List[Dict[str, Any]] = Field(..., description="Recent conversation messages")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class TriageClassificationResponse(BaseModel):
    severity_level: SeverityLevel
    confidence_score: int
    recommended_action: ActionType
    recommended_resources: List[Dict[str, Any]]
    crisis_indicators: List[str]
    follow_up_required: bool
    escalation_needed: bool
    assessment_id: int

# Agent System Schemas
class AgentSystemLogCreate(BaseModel):
    agent_type: AgentType
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    performance_metrics: Optional[Dict[str, Any]] = None
    status: str = Field(..., description="success, warning, error")
    message: Optional[str] = None
    error_details: Optional[str] = None

class AgentSystemLogResponse(AgentSystemLogCreate):
    id: int
    event_timestamp: datetime
    system_load: int
    memory_usage: int
    processing_time_ms: int
    
    class Config:
        from_attributes = True

class AgentConfigurationBase(BaseModel):
    agent_type: AgentType
    config_name: str = Field(..., max_length=100)
    config_value: Dict[str, Any]
    config_type: str = Field(..., description="schedule, threshold, template, api_setting")
    description: Optional[str] = None

class AgentConfigurationCreate(AgentConfigurationBase):
    version: str = "1.0"

class AgentConfigurationUpdate(BaseModel):
    config_value: Optional[Dict[str, Any]] = None
    config_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class AgentConfigurationResponse(AgentConfigurationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    version: str
    
    class Config:
        from_attributes = True

# Dashboard and Analytics Schemas
class AgentDashboardStats(BaseModel):
    analytics_reports_count: int
    active_campaigns_count: int
    triage_assessments_today: int
    crisis_alerts_count: int
    avg_assessment_confidence: float
    last_analytics_run: Optional[datetime]
    next_analytics_scheduled: Optional[datetime]
    system_health_status: str

class AgentPerformanceMetrics(BaseModel):
    agent_type: AgentType
    success_rate: float
    avg_processing_time_ms: int
    total_executions: int
    last_execution: Optional[datetime]
    error_count_24h: int
    health_status: str

class AgentTrendAnalysis(BaseModel):
    time_period: str
    trend_data: List[Dict[str, Any]]
    insights: List[str]
    recommendations: List[str]

# Bulk Operations
class BulkCampaignUpdate(BaseModel):
    campaign_ids: List[int]
    status: Optional[CampaignStatus] = None
    scheduled_at: Optional[datetime] = None

class BulkTriageReview(BaseModel):
    assessment_ids: List[int]
    accuracy_scores: Dict[int, int]  # assessment_id -> accuracy_score
    feedback: Optional[Dict[int, str]] = None  # assessment_id -> feedback

# API Response Wrappers
class AgentApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None

class PaginatedAnalyticsReports(BaseModel):
    items: List[AnalyticsReportSummary]
    total: int
    page: int
    size: int
    pages: int

class PaginatedCampaigns(BaseModel):
    items: List[InterventionCampaignResponse]
    total: int
    page: int
    size: int
    pages: int

class PaginatedTriageAssessments(BaseModel):
    items: List[TriageAssessmentResponse]
    total: int
    page: int 
    size: int
    pages: int
