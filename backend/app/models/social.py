# backend/app/models/social.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

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