# app/models.py
from typing import Optional, List
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, Date, UniqueConstraint
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from datetime import datetime
import hashlib

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    google_sub: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    twitter_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    university: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    major: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    year_of_study: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    wallet_address: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    role: Mapped[str] = mapped_column(String, default="user", nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    allow_email_checkins: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user")
    journal_entries: Mapped[List["JournalEntry"]] = relationship("JournalEntry", back_populates="user")
    awarded_badges: Mapped[List["UserBadge"]] = relationship("UserBadge", back_populates="user")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="user")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    conversation_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="conversations")

class UserSummary(Base):
    __tablename__ = "user_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    summarized_session_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    user: Mapped["User"] = relationship("User")

class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    contract_address: Mapped[str] = mapped_column(String, nullable=False, index=True)
    transaction_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    awarded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    user: Mapped["User"] = relationship("User")

    __table_args__ = (UniqueConstraint('user_id', 'badge_id', name='_user_badge_uc'),)

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    logs: Mapped[List["EmailLog"]] = relationship("EmailLog", back_populates="template")

class EmailGroup(Base):
    __tablename__ = "email_groups"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    recipients: Mapped[List["EmailRecipient"]] = relationship("EmailRecipient", back_populates="group")

class EmailRecipient(Base):
    __tablename__ = "email_recipients"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    group_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("email_groups.id"))
    
    group: Mapped["EmailGroup"] = relationship("EmailGroup", back_populates="recipients")

class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("email_templates.id"))
    recipients: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    scheduled_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    
    template: Mapped["EmailTemplate"] = relationship("EmailTemplate", back_populates="logs")

class Tweet(Base):
    __tablename__ = "tweets"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tweet_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    ease_of_use_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chatbot_understanding_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    felt_understood_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    nps_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    goal_achieved: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    improvement_suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    user: Mapped["User"] = relationship("User")

class JournalPrompt(Base):
    __tablename__ = "journal_prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    entry_date: Mapped[Date] = mapped_column(Date, nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    prompt_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("journal_prompts.id"), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="journal_entries")
    prompt: Mapped["JournalPrompt"] = relationship("JournalPrompt")
    reflection_points: Mapped[List["JournalReflectionPoint"]] = relationship("JournalReflectionPoint", back_populates="journal_entry", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint('user_id', 'entry_date', name='_user_entry_date_uc'),)

class JournalReflectionPoint(Base):
    __tablename__ = "journal_reflection_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    journal_entry_id: Mapped[int] = mapped_column(Integer, ForeignKey("journal_entries.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reflection_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    journal_entry: Mapped["JournalEntry"] = relationship("JournalEntry", back_populates="reflection_points")
    user: Mapped["User"] = relationship("User")

class ContentResource(Base):
    __tablename__ = "content_resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="text")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    resource_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON, default=dict)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    storage_backend: Mapped[str] = mapped_column(String(50), nullable=False, default="database")
    object_storage_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    object_storage_bucket: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    embedding_status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    embedding_last_processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

class Psychologist(Base):
    __tablename__ = "psychologists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    specialization: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="psychologist")

class AppointmentType(Base):
    __tablename__ = "appointment_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="appointment_type")

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    psychologist_id: Mapped[int] = mapped_column(Integer, ForeignKey("psychologists.id"), nullable=False)
    appointment_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("appointment_types.id"), nullable=False)
    
    appointment_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    user: Mapped["User"] = relationship("User", back_populates="appointments")
    psychologist: Mapped["Psychologist"] = relationship("Psychologist", back_populates="appointments")
    appointment_type: Mapped["AppointmentType"] = relationship("AppointmentType", back_populates="appointments")

class AnalyticsReport(Base):
    __tablename__ = "analytics_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    report_period: Mapped[str] = mapped_column(String(50), nullable=False)
    insights: Mapped[dict] = mapped_column(JSON, nullable=False)
    trends: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    intervention_triggers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

class InterventionCampaign(Base):
    __tablename__ = "intervention_campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    target_criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    target_audience_size: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[str] = mapped_column(String(50), default="medium")
    status: Mapped[str] = mapped_column(String(50), default="created", index=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    executions_delivered: Mapped[int] = mapped_column(Integer, default=0)
    executions_failed: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    executions: Mapped[List["CampaignExecution"]] = relationship("CampaignExecution", back_populates="campaign", cascade="all, delete-orphan")

class CampaignExecution(Base):
    __tablename__ = "campaign_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, ForeignKey("intervention_campaigns.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    status: Mapped[str] = mapped_column(String(50), default="scheduled", index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivery_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    engagement_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    trigger_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    campaign: Mapped["InterventionCampaign"] = relationship("InterventionCampaign", back_populates="executions")
    user: Mapped["User"] = relationship("User")

class TriageAssessment(Base):
    __tablename__ = "triage_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    severity_level: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    risk_factors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    recommended_action: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assessment_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    conversation: Mapped["Conversation"] = relationship("Conversation")
    user: Mapped["User"] = relationship("User")

class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    questions: Mapped[List["SurveyQuestion"]] = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan")
    responses: Mapped[List["SurveyResponse"]] = relationship("SurveyResponse", back_populates="survey", cascade="all, delete-orphan")

class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    survey_id: Mapped[int] = mapped_column(Integer, ForeignKey("surveys.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String, nullable=False)
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    survey: Mapped["Survey"] = relationship("Survey", back_populates="questions")
    answers: Mapped[List["SurveyAnswer"]] = relationship("SurveyAnswer", back_populates="question", cascade="all, delete-orphan")

class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    survey_id: Mapped[int] = mapped_column(Integer, ForeignKey("surveys.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    survey: Mapped["Survey"] = relationship("Survey", back_populates="responses")
    user: Mapped["User"] = relationship("User")
    answers: Mapped[List["SurveyAnswer"]] = relationship("SurveyAnswer", back_populates="response", cascade="all, delete-orphan")

class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    response_id: Mapped[int] = mapped_column(Integer, ForeignKey("survey_responses.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("survey_questions.id"), nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)

    response: Mapped["SurveyResponse"] = relationship("SurveyResponse", back_populates="answers")
    question: Mapped["SurveyQuestion"] = relationship("SurveyQuestion", back_populates="answers")

class TherapistSchedule(Base):
    __tablename__ = "therapist_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    therapist_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String, nullable=False)
    start_time: Mapped[str] = mapped_column(String, nullable=False)
    end_time: Mapped[str] = mapped_column(String, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    therapist: Mapped["User"] = relationship("User")

class FlaggedSession(Base):
    __tablename__ = "flagged_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open", index=True)
    flagged_by_admin_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

class CbtModule(Base):
    __tablename__ = "cbt_modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    steps: Mapped[List["CbtModuleStep"]] = relationship("CbtModuleStep", back_populates="module", cascade="all, delete-orphan")

class CbtModuleStep(Base):
    __tablename__ = "cbt_module_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("cbt_modules.id"), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    step_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    user_input_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_input_variable: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    feedback_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    tool_to_run: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_skippable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    delay_after_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("cbt_module_steps.id"), nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    module: Mapped["CbtModule"] = relationship("CbtModule", back_populates="steps")
    parent: Mapped[Optional["CbtModuleStep"]] = relationship("CbtModuleStep", remote_side=[id], back_populates="children")
    children: Mapped[List["CbtModuleStep"]] = relationship("CbtModuleStep", back_populates="parent")