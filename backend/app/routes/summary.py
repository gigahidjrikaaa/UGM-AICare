# backend/app/routes/summary.py (New File)
from fastapi import APIRouter, Depends, HTTPException, Query, status # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from datetime import date, timedelta, datetime, time
from typing import Dict, List, Set, Optional 

from app.database import get_db
from app.models import User, JournalEntry, Conversation, UserBadge, UserSummary
from app.schemas import LatestSummaryResponse, ActivitySummaryResponse, ActivityData, EarnedBadgeInfo
from app.dependencies import get_current_active_user
import logging
import os

logger = logging.getLogger(__name__)

# Router for Activity Summary (monthly view, streaks)
activity_router = APIRouter( # Renamed to be more specific
    prefix="/api/v1/activity-summary",
    tags=["Activity & Streak Summary"], # Updated tag
    dependencies=[Depends(get_current_active_user)]
)

# New Router for general user data, including chat summaries and badges
user_data_router = APIRouter(
    prefix="/api/v1/user", # Common prefix for user-specific data
    tags=["User Profile & Data"], # New tag
    dependencies=[Depends(get_current_active_user)]
)

# --- API Endpoint ---
@activity_router.get("/", response_model=ActivitySummaryResponse)
async def get_activity_summary(
    month_query: str = Query(..., regex=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Provides a summary of user activity (journal entries, conversations)
    for a given month, updates the user's activity streak data in the database,
    and returns the summary along with current streak info.
    """
    logger.info(f"Fetching activity summary and updating streak for user ID: {current_user.id}, month: {month_query}")
    try:
        year, month_num = map(int, month_query.split('-'))
        start_date = date(year, month_num, 1)

        if month_num == 12:
            next_month_start = date(year + 1, 1, 1)
        else:
            next_month_start = date(year, month_num + 1, 1)
        end_date_of_month = next_month_start - timedelta(days=1) # Last day of the query month

        logger.debug(f"Date range for summary: {start_date} to {end_date_of_month}")
    except ValueError:
        logger.warning(f"Invalid month format received: {month_query}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid month format. Use YYYY-MM.")

    try:
        # Fetch all-time activity dates for streak calculation
        all_journal_dates_query = db.query(func.distinct(JournalEntry.entry_date))\
            .filter(JournalEntry.user_id == current_user.id, JournalEntry.entry_date.isnot(None))
        all_journal_dates: Set[date] = {r[0] for r in all_journal_dates_query.all()}

        all_conv_timestamps_query = db.query(func.distinct(func.date(Conversation.timestamp)))\
            .filter(Conversation.user_id == current_user.id, Conversation.timestamp.isnot(None))
        all_conv_dates: Set[date] = {r[0] for r in all_conv_timestamps_query.all()}

        all_activity_dates_ever = all_journal_dates.union(all_conv_dates)

        # Filter for the requested month (for the summary response)
        journal_dates_this_month = {d for d in all_journal_dates if start_date <= d <= end_date_of_month}
        conv_dates_this_month = {d for d in all_conv_dates if start_date <= d <= end_date_of_month}
        all_activity_dates_this_month = journal_dates_this_month.union(conv_dates_this_month)

        # Streak Calculation
        today = date.today()
        yesterday = today - timedelta(days=1)
        activity_today = today in all_activity_dates_ever

        current_db_streak = current_user.current_streak if current_user.current_streak is not None else 0
        longest_db_streak = current_user.longest_streak if current_user.longest_streak is not None else 0
        last_activity_db = current_user.last_activity_date

        new_streak = current_db_streak
        new_last_activity = last_activity_db

        if activity_today:
            if last_activity_db == yesterday:
                new_streak = current_db_streak + 1
            elif last_activity_db != today: # New activity after a gap or first activity
                new_streak = 1
            # If last_activity_db == today, streak already counted for today, no change.
            new_last_activity = today
        else: # No activity today
            if last_activity_db is not None and last_activity_db < today: # Check if streak should be reset
                 # Only reset if last activity was before yesterday. If it was yesterday, streak remains until tomorrow.
                 # If last activity was yesterday and no activity today, streak does not change today, but will reset tomorrow if still no activity.
                 # This logic might need refinement based on exact streak definition (e.g. reset if no activity *yesterday* or *today*)
                 # Current: if not active today, and last activity was before today, streak is maintained from previous days.
                 # If streak requires *daily* activity, then if not activity_today and last_activity_db < today, new_streak = 0.
                 # For "days in a row" streak:
                 if last_activity_db is not None and last_activity_db < yesterday : # if last activity was before yesterday, streak is broken.
                    new_streak = 0


        new_longest_streak = max(longest_db_streak, new_streak)

        if (new_streak != current_user.current_streak or
            new_longest_streak != current_user.longest_streak or
            new_last_activity != current_user.last_activity_date):
            current_user.current_streak = new_streak
            current_user.longest_streak = new_longest_streak
            current_user.last_activity_date = new_last_activity
            try:
                db.add(current_user)
                db.commit()
                db.refresh(current_user) # Get the updated values, including any defaults set by DB
                logger.info(f"User {current_user.id} streak data updated: Current={new_streak}, Longest={new_longest_streak}, LastActivity={new_last_activity}")
            except Exception as e:
                db.rollback()
                logger.error(f"Database error saving user streak update for user {current_user.id}: {e}", exc_info=True)
                # Potentially re-fetch user to ensure we return consistent (pre-error or post-error) data
                # For simplicity, we'll return the in-memory (potentially stale on error) current_user data.

        summary_data: Dict[str, ActivityData] = {}
        # Iterate through all days of the queried month to ensure all days are present in summary
        current_day_in_month = start_date
        while current_day_in_month <= end_date_of_month:
            date_str = current_day_in_month.isoformat()
            summary_data[date_str] = ActivityData(
                hasJournal=(current_day_in_month in journal_dates_this_month),
                hasConversation=(current_day_in_month in conv_dates_this_month)
            )
            current_day_in_month += timedelta(days=1)

        return ActivitySummaryResponse(
            summary=summary_data,
            currentStreak=current_user.current_streak if current_user.current_streak is not None else 0,
            longestStreak=current_user.longest_streak if current_user.longest_streak is not None else 0
        )

    except Exception as e:
        logger.error(f"Unexpected error in get_activity_summary for user {current_user.id}, month {month_query}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate activity summary")


# --- NEW: Endpoint to Fetch Earned Badges ---
@user_data_router.get("/my-badges", response_model=List[EarnedBadgeInfo])
async def get_my_earned_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Use dependency to get user
):
    """Fetches the list of badges earned by the current authenticated user."""
    logger.info(f"Fetching earned badges for user {current_user.id}")
    try:
        earned_badges = db.query(UserBadge)\
            .filter(UserBadge.user_id == current_user.id)\
            .order_by(UserBadge.awarded_at.desc())\
            .all() # Show newest badges first
        logger.info(f"Found {len(earned_badges)} earned badges for user {current_user.id}")
        # FastAPI will automatically serialize the list of UserBadge objects
        # into a list of EarnedBadgeInfo objects based on the response_model
        return earned_badges
    except Exception as e:
        logger.error(f"Error fetching earned badges for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve earned badges")
    
# --- Endpoint to Fetch Latest Summary ---
@user_data_router.get("/latest-summary", response_model=LatestSummaryResponse)
async def get_latest_user_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    logger.info(f"Fetching latest summary for user ID: {current_user.id}")
    latest_summary = db.query(UserSummary)\
        .filter(UserSummary.user_id == current_user.id)\
        .order_by(UserSummary.timestamp.desc())\
        .first()

    if not latest_summary:
        logger.info(f"No summary found for user ID: {current_user.id}")
        # Return a 200 OK with null data as per LatestSummaryResponse schema
        return LatestSummaryResponse(summary_text=None, timestamp=None)

    logger.info(f"Found summary for user ID: {current_user.id} from {latest_summary.timestamp}")
    return LatestSummaryResponse(
        summary_text=latest_summary.summary_text,
        timestamp=latest_summary.timestamp
    )