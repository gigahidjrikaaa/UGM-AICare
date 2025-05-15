# app/models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, Date, UniqueConstraint, Numeric, Time, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func # For server_default=func.now()
import enum
from app.database import Base
# from app.database.base import BaseModel # Assuming BaseModel provides created_at, updated_at if needed
from datetime import datetime
import hashlib # Import hashlib

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_sub = Column(String, unique=True, index=True, nullable=False) # Hashed version
    twitter_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(Text, unique=True, index=True, nullable=True)
    sentiment_score = Column(Float, default=0.0)
    wallet_address = Column(String, unique=True, index=True, nullable=True) # Optional EDU Chain wallet address

    # Streaks and activity tracking
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(Date, nullable=True) # Last date user had journal/chat activity
    allow_email_checkins = Column(Boolean, default=True, nullable=False) # Whether user wants email check-ins

    conversations = relationship("Conversation", back_populates="user") # Relationship name corrected
    journal_entries = relationship("JournalEntry", back_populates="user")
    awarded_badges = relationship("UserBadge", back_populates="user")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Link to User table's primary key
    session_id = Column(String, index=True, nullable=False) # Add session identifier
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

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    entry_date = Column(Date, nullable=False, index=True) # Date of the journal entry
    content = Column(Text, nullable=False) # The journal text
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    user = relationship("User") # Relationship to User

    # Add a unique constraint for user_id and entry_date to ensure one entry per user per day
    __table_args__ = (UniqueConstraint('user_id', 'entry_date', name='_user_entry_date_uc'),)



# # --- Counselor and Appointment Models ---
class Counselor(Base):
    __tablename__ = "counselors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=True)
    image_url = Column(String, nullable=True) # For counselor image
    lisk_address = Column(String, nullable=True, unique=True, index=True) # For LISK IDRX payouts
    is_generally_available = Column(Boolean, default=True) # General availability flag
    # For hackathon simplicity, store typical weekly availability as JSON-like string or Text.
    # Example: {"monday": ["09:00-12:00", "14:00-17:00"], "tuesday": [...]}
    # A more robust solution would be separate tables for availability rules.
    work_hours_json = Column(Text, nullable=True) 

    appointments = relationship("Appointment", back_populates="counselor")

class AppointmentType(Base):
    __tablename__ = "appointment_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False) # e.g., 45, 60, 90
    # Store price in its smallest unit (wei equivalent for IDRX) to avoid floating point issues
    # Numeric is good for precision. If IDRX has 18 decimals, (total_digits, decimal_places)
    # For simplicity, if IDRX is like Rupiah with 0-2 decimals effectively for display,
    # storing as integer (e.g. 100000 for Rp 1000.00 if 2 decimals tracked) is common.
    # Let's assume IDRX smallest unit.
    price_idrx_wei = Column(Numeric(30, 0), nullable=False) # Represents price in smallest IDRX unit

    appointments = relationship("Appointment", back_populates="appointment_type")

class AppointmentStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    CANCELLED_BY_USER = "CANCELLED_BY_USER"
    CANCELLED_BY_COUNSELOR = "CANCELLED_BY_COUNSELOR"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True) # Assuming your User model PK is Integer
    counselor_id = Column(Integer, ForeignKey("counselors.id"), nullable=False, index=True)
    appointment_type_id = Column(Integer, ForeignKey("appointment_types.id"), nullable=False, index=True)
    
    appointment_datetime = Column(DateTime(timezone=True), nullable=False) # Specific date and time of the appointment
    status = Column(SQLAlchemyEnum(AppointmentStatus), default=AppointmentStatus.PENDING_PAYMENT, nullable=False)
    
    notes_for_counselor = Column(Text, nullable=True) # From student
    counselor_notes = Column(Text, nullable=True) # Added by counselor after session (optional)

    # Lisk Payment Fields
    lisk_transaction_hash = Column(String, nullable=True, unique=True, index=True) # To verify payment
    price_paid_idrx_wei = Column(Numeric(30, 0), nullable=True) # Actual amount paid

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("User") # Assuming your User model is named "User"
    counselor = relationship("Counselor", back_populates="appointments")
    appointment_type = relationship("AppointmentType", back_populates="appointments")
