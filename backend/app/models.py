# app/models.py
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, Date, UniqueConstraint
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship, Mapped
from app.database import Base
# from app.database.base import BaseModel # Assuming BaseModel provides created_at, updated_at if needed
from datetime import datetime
import hashlib # Import hashlib

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    twitter_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    city = Column(String, nullable=True)
    university = Column(String, nullable=True)
    major = Column(String, nullable=True)
    year_of_study = Column(String, nullable=True)
    sentiment_score = Column(Float, default=0.0)
    wallet_address = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, default="user", nullable=False)
    password_hash = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)
    last_login = Column(DateTime, nullable=True)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(Date, nullable=True)
    allow_email_checkins = Column(Boolean, default=True, nullable=False)

    conversations = relationship("Conversation", back_populates="user")
    journal_entries = relationship("JournalEntry", back_populates="user")
    awarded_badges = relationship("UserBadge", back_populates="user")
    appointments = relationship("Appointment", back_populates="user")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Link to User table's primary key
    session_id = Column(String, index=True, nullable=False) # Add session identifier

    conversation_id = Column(String, index=True, nullable=False) 
    message = Column(Text, nullable=False) # User's message
    response = Column(Text, nullable=False) # Chatbot's response
    timestamp = Column(DateTime, default=datetime.now, nullable=False) # Ensure timestamp is always set

    user = relationship("User", back_populates="conversations") # Relationship name corrected

# Removed incorrect relationship assignment outside the class definition
# User.conversations = relationship("Conversation", back_populates="user") # This should be inside User or handled by back_populates

class UserSummary(Base):
    __tablename__ = "user_summaries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    summarized_session_id = Column(String, index=True, nullable=True) # Session ID for the summary
    summary_text = Column(Text, nullable=False) # The actual summary content
    timestamp = Column(DateTime, default=datetime.now, nullable=False) # When the summary was created

    user = relationship("User") # Relationship to User (optional but good practice)

class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(Integer, nullable=False, index=True) # Your internal ID for the badge type (e.g., 1 for first entry, 3 for 7-day streak)
    contract_address = Column(String, nullable=False, index=True) # Store contract address for context
    transaction_hash = Column(String, unique=True, nullable=False) # Hash of the mint transaction
    awarded_at = Column(DateTime, default=datetime.now, nullable=False)

    user = relationship("User") # Relationship back to User

    # Optional: Ensure a user can only receive each specific badge ID once
    __table_args__ = (UniqueConstraint('user_id', 'badge_id', name='_user_badge_uc'),)

# Email
class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    logs = relationship("EmailLog", back_populates="template")

class EmailGroup(Base):
    __tablename__ = "email_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    recipients = relationship("EmailRecipient", back_populates="group")

class EmailRecipient(Base):
    __tablename__ = "email_recipients"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    group_id = Column(Integer, ForeignKey("email_groups.id"))
    
    group = relationship("EmailGroup", back_populates="recipients")

class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("email_templates.id"))
    recipients = Column(Text, nullable=False)  # Comma-separated list of emails
    status = Column(String(50), nullable=False)  # "sending", "sent", "failed", "scheduled"
    scheduled_time = Column(DateTime, nullable=True)
    sent_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    template = relationship("EmailTemplate", back_populates="logs")

# Tweet
class Tweet(Base):
    __tablename__ = "tweets"
    
    id = Column(Integer, primary_key=True, index=True)
    tweet_id = Column(String(255), unique=True, index=True)
    text = Column(Text, nullable=False)
    sentiment_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    
    # Optional links for context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) 
    session_id = Column(String, nullable=True, index=True) # Can be omitted if not sending from frontend
    
    # --- Specific Feedback Fields ---
    # Scale Questions (Storing the numerical value)
    ease_of_use_rating = Column(Integer, nullable=True)         # Q1: 1-5 (Very Difficult to Very Easy)
    chatbot_understanding_rating = Column(Integer, nullable=True) # Q2: 1-5 (Not at all to Very Well)
    felt_understood_rating = Column(Integer, nullable=True)     # Q3: 1-5 (Not at all to Very Much)
    nps_rating = Column(Integer, nullable=True)                 # Q5: 0-10 (Likelihood to Recommend)
    
    # MCQ/Yes/No Question (Storing the selected option as string)
    goal_achieved = Column(String, nullable=True)               # Q4: 'Yes', 'No', 'Partially'
    
    # Open-Ended Question (Mandatory)
    improvement_suggestion = Column(Text, nullable=False)       # Q6: What to improve?
    
    # Optional General Category (from previous iteration, can keep or remove)
    category = Column(String, nullable=True) 
    
    timestamp = Column(DateTime, default=datetime.now, nullable=False)

    # Optional relationship back to User
    user = relationship("User") 

class JournalPrompt(Base):
    __tablename__ = "journal_prompts"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True, nullable=True) # e.g., "Gratitude", "Self-Reflection"
    text = Column(Text, nullable=False) # The prompt question itself
    is_active = Column(Boolean, default=True) # To enable/disable prompts

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    entry_date = Column(Date, nullable=False, index=True) # Date of the journal entry
    content = Column(Text, nullable=False) # The journal text
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    prompt_id = Column(Integer, ForeignKey("journal_prompts.id"), nullable=True) # Link to the prompt used

    user = relationship("User", back_populates="journal_entries") # Relationship to User
    prompt = relationship("JournalPrompt") # Relationship to JournalPrompt
    reflection_points = relationship("JournalReflectionPoint", back_populates="journal_entry", cascade="all, delete-orphan") # Relationship to JournalReflectionPoint

    # Add a unique constraint for user_id and entry_date to ensure one entry per user per day
    __table_args__ = (UniqueConstraint('user_id', 'entry_date', name='_user_entry_date_uc'),)

class JournalReflectionPoint(Base): # New Model
    __tablename__ = "journal_reflection_points"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) # Denormalize user_id for easier querying
    
    reflection_text = Column(Text, nullable=False) # The AI-generated insight
    # Optional: Add a category or type for the reflection if you plan to classify them
    # reflection_category = Column(String, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    journal_entry = relationship("JournalEntry", back_populates="reflection_points")
    user = relationship("User") # Relationship to User


class ContentResource(Base):
    __tablename__ = "content_resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String(255), nullable=True) # URL or file name
    type = Column(String(50), nullable=False, default="text") # 'text', 'pdf', 'url'
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)


# Psychology Appointments

class Psychologist(Base):
    __tablename__ = "psychologists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)

    appointments = relationship("Appointment", back_populates="psychologist")

class AppointmentType(Base):
    __tablename__ = "appointment_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)

    appointments = relationship("Appointment", back_populates="appointment_type")

    def __init__(self, name: str, duration_minutes: int, description: Optional[str] = None):
        self.name = name
        self.duration_minutes = duration_minutes
        self.description = description

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    psychologist_id = Column(Integer, ForeignKey("psychologists.id"), nullable=False)
    appointment_type_id = Column(Integer, ForeignKey("appointment_types.id"), nullable=False)
    
    appointment_datetime = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="scheduled", nullable=False)  # e.g., "scheduled", "completed", "cancelled"

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", back_populates="appointments")
    psychologist = relationship("Psychologist", back_populates="appointments")
    appointment_type = relationship("AppointmentType", back_populates="appointments")

# Agent Framework Models
# These models support the three-agent framework for proactive mental health support.

class AnalyticsReport(Base):
    __tablename__ = "analytics_reports"

    id = Column(Integer, primary_key=True, index=True)
    generated_at = Column(DateTime, default=datetime.now, nullable=False)
    report_period = Column(String(50), nullable=False) # e.g., 'weekly', 'monthly'
    insights = Column(JSON, nullable=False)
    trends = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    intervention_triggers = Column(JSON, nullable=True)

class InterventionCampaign(Base):
    __tablename__ = "intervention_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    campaign_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(JSON, nullable=False)
    target_criteria = Column(JSON, nullable=True)
    target_audience_size = Column(Integer, default=0)
    priority = Column(String(50), default="medium")
    status = Column(String(50), default="created", index=True) # e.g., created, active, completed, failed
    start_date = Column(DateTime, default=datetime.now)
    end_date = Column(DateTime, nullable=True)
    
    executions_delivered = Column(Integer, default=0)
    executions_failed = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    executions = relationship("CampaignExecution", back_populates="campaign", cascade="all, delete-orphan")

class CampaignExecution(Base):
    __tablename__ = "campaign_executions"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("intervention_campaigns.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    status = Column(String(50), default="scheduled", index=True) # e.g., scheduled, delivered, failed, engaged
    scheduled_at = Column(DateTime, default=datetime.now)
    executed_at = Column(DateTime, nullable=True)
    delivery_method = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    engagement_score = Column(Float, nullable=True)
    trigger_data = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    campaign = relationship("InterventionCampaign", back_populates="executions")
    user = relationship("User")

class TriageAssessment(Base):
    __tablename__ = "triage_assessments"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    risk_score = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    severity_level = Column(String(50), nullable=False, index=True) # e.g., low, medium, high, critical
    risk_factors = Column(JSON, nullable=True) # Storing list of strings as JSON array for compatibility
    recommended_action = Column(String(100), nullable=True) # e.g., immediate, urgent, standard, routine
    assessment_data = Column(JSON, nullable=True) # Store the full assessment dict from the agent
    processing_time_ms = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    conversation = relationship("Conversation")
    user = relationship("User")

class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan")
    responses = relationship("SurveyResponse", back_populates="survey", cascade="all, delete-orphan")

class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)  # "text", "multiple-choice", "rating"
    options = Column(JSON, nullable=True)  # For multiple-choice questions
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    survey = relationship("Survey", back_populates="questions")
    answers = relationship("SurveyAnswer", back_populates="question", cascade="all, delete-orphan")

class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    survey = relationship("Survey", back_populates="responses")
    user = relationship("User")
    answers = relationship("SurveyAnswer", back_populates="response", cascade="all, delete-orphan")

class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("survey_responses.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("survey_questions.id"), nullable=False)
    answer_text = Column(Text, nullable=False)

    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="answers")

class TherapistSchedule(Base):
    __tablename__ = "therapist_schedules"

    id = Column(Integer, primary_key=True, index=True)
    therapist_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    reason = Column(String, nullable=True)

    therapist = relationship("User")

# --- Admin Flags ---
class FlaggedSession(Base):
    __tablename__ = "flagged_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    status = Column(String, default="open", index=True)  # open, reviewing, resolved
    flagged_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    user = relationship("User", foreign_keys=[user_id])

class CbtModule(Base):
    __tablename__ = "cbt_modules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    steps = relationship("CbtModuleStep", back_populates="module", cascade="all, delete-orphan")


class CbtModuleStep(Base):
    __tablename__ = "cbt_module_steps"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("cbt_modules.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    step_type = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    user_input_type = Column(String(50), nullable=True)
    user_input_variable = Column(String(100), nullable=True)
    feedback_prompt = Column(Text, nullable=True)
    options = Column(JSON, nullable=True)
    tool_to_run = Column(String(100), nullable=True)
    is_skippable = Column(Boolean, default=False, nullable=False)
    delay_after_ms = Column(Integer, default=0, nullable=False)
    parent_id = Column(Integer, ForeignKey("cbt_module_steps.id"), nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    module = relationship("CbtModule", back_populates="steps")
    parent = relationship("CbtModuleStep", remote_side=[id], back_populates="children")
    children = relationship("CbtModuleStep", back_populates="parent")
