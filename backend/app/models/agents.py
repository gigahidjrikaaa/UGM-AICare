# backend/app/models/agents.py
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class AnalyticsReport(Base):
    """Analytics Agent generated reports and insights"""
    __tablename__ = "analytics_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    report_period = Column(String(50), nullable=False)  # 'weekly', 'monthly', etc.
    status = Column(String(20), default='completed', nullable=False)  # 'pending', 'running', 'completed', 'failed'
    
    # Analysis data
    data_sources = Column(JSON)  # Which data was analyzed
    patterns_detected = Column(JSON)  # Identified patterns
    insights = Column(JSON, nullable=False)  # Key insights generated
    trends = Column(JSON)  # Trend analysis
    recommendations = Column(JSON)  # Action recommendations
    
    # Metrics
    users_analyzed = Column(Integer, default=0)
    conversations_analyzed = Column(Integer, default=0)
    execution_time_seconds = Column(Integer)
    
    # Relationships
    triggered_campaigns = relationship("InterventionCampaign", back_populates="triggered_by_report")

class InterventionCampaign(Base):
    """Intervention Agent campaigns and outreach"""
    __tablename__ = "intervention_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    triggered_by_report_id = Column(Integer, ForeignKey('analytics_reports.id'), nullable=True)
    
    # Campaign details
    campaign_name = Column(String(255), nullable=False)
    campaign_type = Column(String(100), nullable=False)  # 'email', 'notification', 'resource_push'
    status = Column(String(20), default='draft', nullable=False)  # 'draft', 'scheduled', 'active', 'completed', 'paused'
    
    # Targeting
    target_criteria = Column(JSON, nullable=False)  # Who to target
    target_audience_size = Column(Integer, default=0)
    
    # Content
    content = Column(JSON, nullable=False)  # Campaign content and messaging
    resources = Column(JSON)  # Related resources to share
    
    # Scheduling
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Performance metrics
    sent_count = Column(Integer, default=0)
    delivery_rate = Column(Integer, default=0)  # Percentage
    engagement_rate = Column(Integer, default=0)  # Percentage
    effectiveness_score = Column(Integer, default=0)  # 0-100 scale
    
    # Relationships
    triggered_by_report = relationship("AnalyticsReport", back_populates="triggered_campaigns")
    executions = relationship("CampaignExecution", back_populates="campaign")

class CampaignExecution(Base):
    """Individual campaign execution logs"""
    __tablename__ = "campaign_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey('intervention_campaigns.id'), nullable=False)
    
    executed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    execution_type = Column(String(50), nullable=False)  # 'email', 'push_notification', 'in_app'
    
    # Results
    target_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    
    # Details
    execution_details = Column(JSON)  # Detailed execution information
    error_log = Column(Text, nullable=True)
    
    # Relationships
    campaign = relationship("InterventionCampaign", back_populates="executions")

class TriageAssessment(Base):
    """Triage Agent conversation assessments"""
    __tablename__ = "triage_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Assessment details
    assessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    severity_level = Column(String(20), nullable=False)  # 'low', 'medium', 'high', 'crisis'
    confidence_score = Column(Integer, default=0)  # 0-100 confidence in assessment
    
    # Analysis
    crisis_indicators = Column(JSON)  # Detected crisis keywords/patterns
    risk_factors = Column(JSON)  # Identified risk factors
    protective_factors = Column(JSON)  # Identified protective factors
    sentiment_analysis = Column(JSON)  # Sentiment breakdown
    
    # Recommendations
    recommended_action = Column(String(100), nullable=False)  # 'self_help', 'counseling', 'emergency'
    recommended_resources = Column(JSON)  # Specific resources to recommend
    follow_up_required = Column(Boolean, default=False)
    escalation_needed = Column(Boolean, default=False)
    
    # Routing decisions
    routing_decision = Column(JSON)  # Where user was directed
    professional_referral = Column(Boolean, default=False)
    emergency_contact_triggered = Column(Boolean, default=False)
    
    # Performance tracking
    assessment_accuracy = Column(Integer, nullable=True)  # Post-assessment validation
    user_feedback = Column(JSON, nullable=True)  # User feedback on recommendations

class AgentSystemLog(Base):
    """System-wide agent activity and health monitoring"""
    __tablename__ = "agent_system_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_type = Column(String(50), nullable=False)  # 'analytics', 'intervention', 'triage'
    
    # Event details
    event_type = Column(String(50), nullable=False)  # 'started', 'completed', 'error', 'health_check'
    event_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Event data
    event_data = Column(JSON)  # Event-specific data
    performance_metrics = Column(JSON)  # Performance indicators
    
    # Status
    status = Column(String(20), nullable=False)  # 'success', 'warning', 'error'
    message = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)
    
    # System context
    system_load = Column(Integer, default=0)  # System load percentage
    memory_usage = Column(Integer, default=0)  # Memory usage percentage
    processing_time_ms = Column(Integer, default=0)

class AgentConfiguration(Base):
    """Agent configuration and settings"""
    __tablename__ = "agent_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_type = Column(String(50), nullable=False)  # 'analytics', 'intervention', 'triage'
    
    # Configuration
    config_name = Column(String(100), nullable=False)
    config_value = Column(JSON, nullable=False)
    config_type = Column(String(50), nullable=False)  # 'schedule', 'threshold', 'template', 'api_setting'
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Version control
    version = Column(String(20), default='1.0')
    description = Column(Text, nullable=True)
