# app/models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
# from app.database.base import BaseModel # Assuming BaseModel provides created_at, updated_at if needed
from datetime import datetime
import hashlib # Import hashlib

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # Add a field to store the hash of the identifier provided by the frontend
    hashed_identifier = Column(String, unique=True, index=True, nullable=False) # Hashed version
    twitter_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True) # Could be hashed too if used as identifier
    sentiment_score = Column(Float, default=0.0)

    conversations = relationship("Conversation", back_populates="user") # Relationship name corrected

    # Add a helper to set the hashed identifier
    def set_hashed_identifier(self, identifier: str):
        self.hashed_identifier = hashlib.sha256(identifier.encode()).hexdigest()

    # Optional: Helper to verify (cannot get original back, but can check if a new one matches)
    def check_identifier(self, identifier: str) -> bool:
        return self.hashed_identifier == hashlib.sha256(identifier.encode()).hexdigest()


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
