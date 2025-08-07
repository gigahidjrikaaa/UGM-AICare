# backend/app/models/journal.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

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