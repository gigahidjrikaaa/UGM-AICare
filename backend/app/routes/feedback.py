# app/routes/feedback.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import Feedback, User
# Import the user lookup function if needed and adjust path
from app.routes.chat import get_or_create_user 

import logging # Optional: for logging feedback submissions

logger = logging.getLogger(__name__)

# --- Pydantic Schemas ---

class FeedbackCreate(BaseModel):
    # Match fields you want the frontend to send
    user_identifier: Optional[str] = None # Hashed ID from frontend (optional)
    session_id: Optional[str] = None      # Session ID from frontend (optional)
    
    rating: Optional[int] = Field(None, ge=1, le=5) # Optional rating 1-5
    comment: str = Field(..., min_length=10)       # Mandatory comment, min 10 chars
    category: Optional[str] = None
    page_context: Optional[str] = None

    class Config:
        orm_mode = True # Or from_attributes = True for Pydantic V2

class FeedbackResponse(BaseModel):
    id: int
    message: str = "Feedback submitted successfully."
    timestamp: datetime
    
    class Config:
        orm_mode = True # Or from_attributes = True for Pydantic V2

# --- Router Setup ---
router = APIRouter(
    prefix="/api/v1/feedback", # Define a prefix for feedback routes
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
    logger.info(f"Received feedback submission: rating={feedback_data.rating}, category='{feedback_data.category}'")
    
    db_user = None
    # Optionally find the user if identifier is provided
    if feedback_data.user_identifier:
        try:
            # Use the same lookup logic as your chat endpoint
            db_user = get_or_create_user(db, feedback_data.user_identifier) 
        except Exception as e:
            # Log the error but don't necessarily fail the feedback submission
            logger.warning(f"Could not link feedback to user for identifier {feedback_data.user_identifier[:8]}...: {e}")
            # You could choose to raise HTTPException here if linking is mandatory

    try:
        new_feedback = Feedback(
            user_id=db_user.id if db_user else None, # Link user ID if found
            session_id=feedback_data.session_id,
            rating=feedback_data.rating,
            comment=feedback_data.comment,
            category=feedback_data.category,
            page_context=feedback_data.page_context
            # timestamp is handled by default in the model
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
            detail="An error occurred while saving feedback."
        )