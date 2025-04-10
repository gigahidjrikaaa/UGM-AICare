# backend/app/routes/summary.py (New File)
from fastapi import APIRouter, Depends, HTTPException, Query, status # type: ignore
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
    currentStreak: int = 0 # Streak count. At least 1 day of activity is needed to count as a streak.
    longestStreak: int = 0 # Longest streak count. At least 1 day of activity is needed to count as a streak.

# --- API Endpoint ---

@router.get("/", response_model=ActivitySummaryResponse)
async def get_activity_summary(
    # Get month as query parameter, e.g., ?month=2025-04
    month: str = Query(..., regex=r"^\d{4}-\d{2}$"), # Validate format
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Provides a summary of user activity (journal entries, conversations)
    for a given month, calculates the current activity streak, updates streak
    data in the database, and returns the summary along with streak info.
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
        logger.warning(f"Invalid month format received: {month}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid month format. Use YYYY-MM.")

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
        logger.debug(f"Journal Dates Set for {month}: {journal_dates}")

        conversation_dates: Set[date] = set() # Initialize empty set for conversation dates

        all_activity_dates = journal_dates.union(conversation_dates)
        logger.debug(f"All Activity Dates Set (Union): {all_activity_dates}")

        # --- Conversation Dates (fetch timestamps, extract date in Python) ---
        conversation_timestamps_query = db.query(Conversation.timestamp)\
            .filter(
                Conversation.user_id == current_user.id,
                Conversation.timestamp >= start_datetime, # Use datetime for comparison
                Conversation.timestamp < next_month_start_datetime # Exclusive end
            )\
            .distinct() # Get distinct full timestamps

        # Extract unique dates from the timestamps
        conversation_dates: Set[date] = {
            result[0].date() # Call .date() on the datetime object
            for result in conversation_timestamps_query.all()
            if result[0] is not None and isinstance(result[0], datetime) # Check type
        }
        logger.debug(f"Conversation Dates Set for {month} (from Timestamps): {conversation_dates}")

        all_activity_dates_this_month = journal_dates.union(conversation_dates)
        logger.debug(f"All Activity Dates Set for {month} (Union): {all_activity_dates_this_month}")

        # --- Streak Calculation and DB Update ---
        today = date.today()
        yesterday = today - timedelta(days=1)
        needs_db_update = False

        current_db_streak = current_user.current_streak
        longest_db_streak = current_user.longest_streak
        last_activity_db = current_user.last_activity_date

        # We need to know if *any* activity happened today, regardless of the requested month
        # A simple check: Fetch if today has journal OR conversation entry (could be optimized)
        activity_today = db.query(JournalEntry).filter(JournalEntry.user_id == current_user.id, JournalEntry.entry_date == today).first() is not None or \
                         db.query(Conversation).filter(Conversation.user_id == current_user.id, cast(Conversation.timestamp, Date) == today).first() is not None
        logger.debug(f"Activity today ({today})? {activity_today}. Last recorded activity date: {last_activity_db}")

        new_streak = current_db_streak # Start with current value
        new_last_activity = last_activity_db

        if activity_today:
            if last_activity_db == yesterday:
                # Continued streak
                new_streak += 1
            elif last_activity_db != today: # Start new streak only if last activity wasn't also today
                new_streak = 1
            # Update last activity date if activity happened today
            new_last_activity = today
        else: # No activity today
            # Break streak if last activity was before yesterday
            if last_activity_db is not None and last_activity_db < yesterday:
                new_streak = 0
            # If last activity was yesterday, streak stays same (until tomorrow check). If None, stays 0.

        # Update longest streak if current is greater
        new_longest_streak = max(longest_db_streak, new_streak)

        # Determine if an update to the User record is needed
        if (new_streak != current_db_streak or
            new_longest_streak != longest_db_streak or
            new_last_activity != last_activity_db):
            needs_db_update = True
            current_user.current_streak = new_streak
            current_user.longest_streak = new_longest_streak
            current_user.last_activity_date = new_last_activity
            logger.info(f"User {current_user.id} streak data updated: Current={new_streak}, Longest={new_longest_streak}, LastActivity={new_last_activity}")

        # --- Create Summary Data Dictionary ---
        summary_data: Dict[str, ActivityData] = {}
        for activity_date in all_activity_dates_this_month:
             # Ensure processing only date objects
            if isinstance(activity_date, date):
                date_str = activity_date.isoformat() # Format as "YYYY-MM-DD"
                summary_data[date_str] = ActivityData(
                    hasJournal=(activity_date in journal_dates),
                    hasConversation=(activity_date in conversation_dates)
                )
            else:
                logger.error(f"Skipped non-date item during summary creation: {repr(activity_date)}")

        # --- Commit DB changes if any streak fields were modified ---
        if needs_db_update:
            try:
                db.add(current_user)
                db.commit()
                db.refresh(current_user) # Ensure the object reflects the saved state
                logger.info(f"Successfully saved updated streak data for user {current_user.id}")
            except Exception as e:
                db.rollback()
                logger.error(f"Database error updating streak data for user {current_user.id}: {e}", exc_info=True)
                # Decide: should this fail the request? Or just log and return potentially stale streak data?
                # For now, let's log and continue, returning the calculated (but maybe not saved) streak
                # raise HTTPException(status_code=500, detail="Failed to update user streak data")

        logger.debug(f"Final summary_data for {month}: {summary_data}")
        logger.debug(f"Returning streaks: Current={current_user.current_streak}, Longest={current_user.longest_streak}")

        # --- Return Final Response ---
        return ActivitySummaryResponse(
            summary=summary_data,
            currentStreak=current_user.current_streak, # Return the potentially updated value
            longestStreak=current_user.longest_streak # Return the potentially updated value
        )

    except Exception as e:
        logger.error(f"Error during activity summary generation for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate activity summary")