# app/routes/feedback.py
from fastapi import APIRouter, Depends, HTTPException, status, Body # type: ignore
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal, Optional
from datetime import datetime

from app.database import get_db
from app.models import Feedback, User
from app.routes.chat import get_or_create_user 
from app.schemas import FeedbackCreate, FeedbackResponse
import logging

logger = logging.getLogger(__name__)

# --- Router Setup ---
router = APIRouter(
    prefix="/feedback", # Define a prefix for feedback routes
    tags=["Feedback"]           # Tag for API documentation
)

# --- API Endpoint ---
@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    feedback_data: FeedbackCreate = Body(...), 
    db: Session = Depends(get_db)
):
    """
    Receives feedback submission from the frontend and saves it to the database.
    Optionally links feedback to a user based on the provided user_identifier hash.
    """
    logger.info(f"Received feedback: ease={feedback_data.ease_of_use_rating}, understand={feedback_data.chatbot_understanding_rating}, felt_heard={feedback_data.felt_understood_rating}, nps={feedback_data.nps_rating}, goal='{feedback_data.goal_achieved}', improvement='{feedback_data.improvement_suggestion[:50]}...'")
    
    db_user = None
    # Link to user if identifier provided and function is available
    if feedback_data.user_identifier and get_or_create_user:
        try:
            db_user = get_or_create_user(db, feedback_data.user_identifier) 
        except Exception as e:
            logger.warning(f"Could not link feedback to user: {e}")
            # Decide if this should be a fatal error (HTTPException) or just a warning

    try:
        new_feedback = Feedback(
            user_id=db_user.id if db_user else None, 
            session_id=feedback_data.session_id, # Will be null if frontend sends null
            
            # Map data from request to model columns
            ease_of_use_rating=feedback_data.ease_of_use_rating,
            chatbot_understanding_rating=feedback_data.chatbot_understanding_rating,
            felt_understood_rating=feedback_data.felt_understood_rating,
            nps_rating=feedback_data.nps_rating,
            goal_achieved=feedback_data.goal_achieved,
            improvement_suggestion=feedback_data.improvement_suggestion, # Mandatory field
            category=feedback_data.category 
            # timestamp handled by default
        )
        db.add(new_feedback)
        db.commit()
        db.refresh(new_feedback)
        
        logger.info(f"Successfully saved feedback with ID: {new_feedback.id}")
        
        return FeedbackResponse(id=new_feedback.id, timestamp=new_feedback.timestamp)

    except Exception as e:
        db.rollback()
        logger.error(f"Database error saving feedback: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving your feedback. Please try again later."
        )
