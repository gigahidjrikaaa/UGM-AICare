# backend/app/routes/summary.py (New File)
from fastapi import APIRouter, Depends, HTTPException, Query # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import func, Date, cast, DateTime
from pydantic import BaseModel, Field
from datetime import date, timedelta, datetime, time
from typing import Dict, List, Set

from app.database import get_db
from app.models import User, JournalEntry, Conversation # Import needed models
from app.dependencies import get_current_active_user # Your auth dependency
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/activity-summary",
    tags=["Activity Summary"],
    dependencies=[Depends(get_current_active_user)] # Protect this route
)

# Response Model
class ActivityData(BaseModel):
    hasJournal: bool = False
    hasConversation: bool = False

class ActivitySummaryResponse(BaseModel):
    # Dictionary where key is "YYYY-MM-DD" string
    summary: Dict[str, ActivityData]

@router.get("/", response_model=ActivitySummaryResponse)
async def get_activity_summary(
    # Get month as query parameter, e.g., ?month=2025-04
    month: str = Query(..., regex=r"^\d{4}-\d{2}$"), # Validate format
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Provides a summary of user activity (journal entries, conversations)
    for a given month.
    """
    logger.info(f"Fetching activity summary for user {current_user.id}, month: {month}")
    try:
        year, month_num = map(int, month.split('-'))
        start_date = date(year, month_num, 1)
        start_datetime = datetime.combine(start_date, time.min)
        next_month_start = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
        next_month_start_datetime = datetime.combine(next_month_start, time.min)
        end_date = next_month_start - timedelta(days=1)
        logger.debug(f"Date range: {start_datetime} to {next_month_start_datetime}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")

    try:
        # --- Get distinct journal dates ---
        journal_dates_query = db.query(func.distinct(JournalEntry.entry_date))\
            .filter(
                JournalEntry.user_id == current_user.id,
                JournalEntry.entry_date >= start_date,
                JournalEntry.entry_date <= end_date
            )
        # Ensure results are date objects
        journal_dates: Set[date] = {
            result[0] for result in journal_dates_query.all()
            if result[0] is not None and isinstance(result[0], date) # Explicitly check type
        }
        logger.debug(f"Journal Dates Set: {journal_dates}")

        # --- Get distinct conversation dates ---
        conversation_timestamps_query = db.query(Conversation.timestamp)\
            .filter(
                Conversation.user_id == current_user.id,
                Conversation.timestamp >= start_datetime,
                Conversation.timestamp < next_month_start_datetime
            )\
            .distinct()

        conversation_dates: Set[date] = {
            result[0].date() # Extract date part
            for result in conversation_timestamps_query.all()
            if result[0] is not None and isinstance(result[0], datetime) # Check type is datetime
        }
        logger.debug(f"Conversation Dates Set (from Timestamps): {conversation_dates}")

        # --- Combine and Process ---
        # Union should now only contain date objects
        all_dates = journal_dates.union(conversation_dates)
        logger.debug(f"All Dates Set (Union): {all_dates}")

        summary_data: Dict[str, ActivityData] = {}
        processed_count = 0
        for activity_date in all_dates:
            # We expect only date objects here now, but keep check as safety
            if isinstance(activity_date, date):
                date_str = activity_date.isoformat() # "YYYY-MM-DD"
                # Perform 'in' check using the guaranteed date object
                has_journal = activity_date in journal_dates
                has_convo = activity_date in conversation_dates
                summary_data[date_str] = ActivityData(
                    hasJournal=has_journal,
                    hasConversation=has_convo
                )
                processed_count += 1
            else:
                 # This error should ideally not happen anymore
                 logger.error(f"Skipped non-date item in final loop: {repr(activity_date)}")

        logger.info(f"Processed {processed_count} activity dates for summary.")
        logger.debug(f"Final summary_data: {summary_data}")
        return ActivitySummaryResponse(summary=summary_data)

    except Exception as e:
        logger.error(f"Error during activity summary generation for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate activity summary")