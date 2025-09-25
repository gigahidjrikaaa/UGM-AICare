"""Clinical analytics models for privacy-preserving, evidence-based mental health analytics."""

from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ValidatedAssessment(Base):
    """Validated clinical assessment data - the foundation of ethical analytics."""
    __tablename__ = "validated_assessments"
    
    # Primary identification
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Clinical assessment details
    instrument_type = Column(String(20), nullable=False)  # PHQ9, GAD7, PSS, DASS21
    raw_score = Column(Integer, nullable=False)
    severity_level = Column(String(20), nullable=False)  # low, moderate, high, severe
    percentile_score = Column(Float)  # Normalized score (0-100)
    
    # Administration metadata
    administration_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    administered_by = Column(Integer, ForeignKey("users.id"))
    administration_context = Column(String(50))  # intake, followup, crisis, routine
    
    # Privacy and consent - CRITICAL for ethical analytics
    consent_for_analytics = Column(Boolean, default=False, nullable=False)
    consent_date = Column(DateTime)
    consent_withdrawn_date = Column(DateTime)
    anonymization_level = Column(String(20), default="full")  # full, partial, none
    
    # Follow-up tracking
    follow_up_scheduled = Column(Boolean, default=False)
    follow_up_date = Column(DateTime)
    follow_up_completed = Column(Boolean, default=False)
    
    # Clinical notes (encrypted, not for analytics)
    clinical_notes = Column(Text)  # Only for clinical use, never analyzed
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="validated_assessments")
    administered_by_user = relationship("User", foreign_keys=[administered_by])
    baseline_outcomes = relationship("ClinicalOutcome", foreign_keys="ClinicalOutcome.baseline_assessment_id", back_populates="baseline_assessment")
    followup_outcomes = relationship("ClinicalOutcome", foreign_keys="ClinicalOutcome.followup_assessment_id", back_populates="followup_assessment")
    
    def __repr__(self):
        return f"<ValidatedAssessment {self.instrument_type}:{self.raw_score} user:{self.user_id}>"


class ClinicalOutcome(Base):
    """Clinical treatment outcomes - the gold standard for measuring effectiveness."""
    __tablename__ = "clinical_outcomes"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Assessment pairing (baseline and follow-up)
    baseline_assessment_id = Column(PG_UUID(as_uuid=True), ForeignKey("validated_assessments.id"), nullable=False)
    followup_assessment_id = Column(PG_UUID(as_uuid=True), ForeignKey("validated_assessments.id"), nullable=False)
    
    # Time metrics
    days_between_assessments = Column(Integer, nullable=False)
    assessment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Outcome metrics
    score_improvement = Column(Float)  # Positive = improvement, negative = deterioration
    percentage_improvement = Column(Float)  # Percentage change
    
    # Statistical measures
    effect_size = Column(Float)  # Cohen's d
    minimal_clinically_important_difference = Column(Boolean)  # MCID threshold met
    reliable_change_index = Column(Float)  # RCI score
    
    # Clinical interpretation
    clinical_improvement = Column(Boolean)  # Clinically significant improvement
    deterioration_flag = Column(Boolean, default=False)  # Clinical deterioration
    maintained_improvement = Column(Boolean)  # Sustained improvement
    
    # Statistical confidence
    confidence_interval_lower = Column(Float)  # 95% CI lower bound
    confidence_interval_upper = Column(Float)  # 95% CI upper bound
    statistical_significance = Column(Boolean)  # p < 0.05
    p_value = Column(Float)
    
    # Relationships
    baseline_assessment = relationship("ValidatedAssessment", foreign_keys=[baseline_assessment_id], back_populates="baseline_outcomes")
    followup_assessment = relationship("ValidatedAssessment", foreign_keys=[followup_assessment_id], back_populates="followup_outcomes")
    
    def __repr__(self):
        return f"<ClinicalOutcome improvement:{self.score_improvement} significant:{self.clinical_improvement}>"


class ServiceUtilization(Base):
    """Service utilization tracking - focus on system performance, not surveillance."""
    __tablename__ = "service_utilization"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Service details
    service_type = Column(String(50), nullable=False)  # counseling, group_therapy, crisis, assessment
    appointment_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer)
    service_provider_id = Column(Integer, ForeignKey("users.id"))
    
    # Access and quality metrics
    request_date = Column(DateTime)  # When service was requested
    wait_time_days = Column(Integer)  # Days between request and service
    cancellation_reason = Column(String(100))  # If cancelled
    no_show = Column(Boolean, default=False)
    reschedule_count = Column(Integer, default=0)
    
    # Outcomes and follow-up
    completion_status = Column(String(20))  # completed, partial, cancelled, no_show
    follow_up_recommended = Column(Boolean, default=False)
    follow_up_scheduled = Column(Boolean, default=False)
    client_satisfaction_score = Column(Integer)  # 1-5 scale
    
    # Anonymized demographics for equity analysis
    geographic_region = Column(String(20))  # Anonymized location
    demographic_cohort = Column(String(50))  # Anonymized grouping
    academic_year = Column(String(10))  # For temporal analysis
    
    # Privacy consent
    consent_for_analytics = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    service_provider = relationship("User", foreign_keys=[service_provider_id])
    
    def __repr__(self):
        return f"<ServiceUtilization {self.service_type} {self.appointment_date}>"


class InterventionOutcome(Base):
    """Intervention effectiveness tracking - evidence-based program evaluation."""
    __tablename__ = "intervention_outcomes"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Intervention details
    intervention_type = Column(String(50), nullable=False)  # CBT, DBT, mindfulness, psychoeducation
    intervention_name = Column(String(100))  # Specific program name
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    planned_sessions = Column(Integer)
    completed_sessions = Column(Integer, default=0)
    
    # Outcome assessments
    pre_intervention_assessment_id = Column(PG_UUID(as_uuid=True), ForeignKey("validated_assessments.id"))
    post_intervention_assessment_id = Column(PG_UUID(as_uuid=True), ForeignKey("validated_assessments.id"))
    followup_assessment_id = Column(PG_UUID(as_uuid=True), ForeignKey("validated_assessments.id"))  # 3-month follow-up
    
    # Effectiveness metrics
    completion_rate = Column(Float)  # Percentage of planned sessions completed
    engagement_score = Column(Float)  # 0-1 scale based on participation
    dropout_session = Column(Integer)  # Session number if dropped out
    dropout_reason = Column(String(100))
    
    # Clinical outcomes
    clinical_improvement = Column(Boolean)
    symptom_reduction_percentage = Column(Float)
    functional_improvement = Column(Boolean)
    skills_mastery_score = Column(Float)  # If applicable (e.g., DBT skills)
    relapse_prevention_plan_completed = Column(Boolean, default=False)
    
    # Long-term tracking
    three_month_followup_completed = Column(Boolean, default=False)
    six_month_followup_completed = Column(Boolean, default=False)
    sustained_improvement = Column(Boolean)  # Improvement maintained at follow-up
    
    # Relationships
    user = relationship("User")
    pre_assessment = relationship("ValidatedAssessment", foreign_keys=[pre_intervention_assessment_id])
    post_assessment = relationship("ValidatedAssessment", foreign_keys=[post_intervention_assessment_id])
    followup_assessment = relationship("ValidatedAssessment", foreign_keys=[followup_assessment_id])
    
    def __repr__(self):
        return f"<InterventionOutcome {self.intervention_type} improvement:{self.clinical_improvement}>"


class SystemPerformanceMetric(Base):
    """System-level performance metrics - focus on service delivery optimization."""
    __tablename__ = "system_performance_metrics"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Temporal tracking
    measurement_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    measurement_period_days = Column(Integer, nullable=False)  # Period covered
    
    # Access metrics
    average_wait_time_days = Column(Float)
    median_wait_time_days = Column(Float)
    wait_time_95th_percentile = Column(Float)
    capacity_utilization_rate = Column(Float)  # 0-1 scale
    
    # Quality metrics
    appointment_completion_rate = Column(Float)
    no_show_rate = Column(Float)
    client_satisfaction_average = Column(Float)
    follow_up_adherence_rate = Column(Float)
    
    # Equity metrics
    demographic_equity_score = Column(Float)  # Measure of equitable access
    geographic_coverage_score = Column(Float)  # Geographic access equity
    
    # Crisis prevention
    crisis_intervention_count = Column(Integer)
    crisis_prevention_rate = Column(Float)  # Successful early interventions
    emergency_referral_count = Column(Integer)
    
    # Resource optimization
    counselor_utilization_rate = Column(Float)
    service_efficiency_score = Column(Float)
    cost_per_successful_outcome = Column(Float)
    
    # Privacy protection metrics
    consent_rate = Column(Float)  # Percentage of users who consent to analytics
    privacy_incident_count = Column(Integer, default=0)
    data_retention_compliance = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<SystemPerformanceMetric {self.measurement_date} wait_time:{self.average_wait_time_days}>"


class ClinicalInsight(Base):
    """Clinical insights generated by licensed professionals - not AI surveillance."""
    __tablename__ = "clinical_insights"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Insight metadata
    insight_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    insight_type = Column(String(50), nullable=False)  # population_trend, service_optimization, outcome_analysis
    
    # Clinical professional who generated/validated the insight
    clinician_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Insight content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    clinical_significance = Column(String(20))  # high, moderate, low
    
    # Evidence base
    sample_size = Column(Integer)
    statistical_confidence = Column(Float)  # Confidence level
    evidence_quality = Column(String(20))  # strong, moderate, weak
    
    # Recommendations
    actionable_recommendations = Column(Text)
    resource_implications = Column(Text)
    timeline_for_action = Column(String(50))
    
    # Follow-up
    implementation_status = Column(String(20), default="pending")  # pending, in_progress, completed
    effectiveness_measured = Column(Boolean, default=False)
    
    # Relationships
    clinician = relationship("User")
    
    def __repr__(self):
        return f"<ClinicalInsight {self.title} by {self.clinician_id}>"