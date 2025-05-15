# backend/app/routes/summary.py (New File)
from fastapi import APIRouter, Depends, HTTPException, Query, status # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import func, Date, cast, DateTime
from pydantic import BaseModel, Field
from datetime import date, timedelta, datetime, time
from typing import Dict, List, Set

from app.database import get_db
from app.models import User, JournalEntry, Conversation, UserBadge, UserSummary
from app.schemas import LatestSummaryResponse
from app.dependencies import get_current_active_user
from app.core.blockchain_utils import mint_nft_badge
from app.schemas import ActivitySummaryResponse, ActivityData, EarnedBadgeInfo
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/activity-summary",
    tags=["Activity Summary"],
    dependencies=[Depends(get_current_active_user)] # Protect this route
)

# --- API Endpoint ---
@router.get("/", response_model=ActivitySummaryResponse)
async def get_activity_summary(
    month: str = Query(..., regex=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Provides a summary of user activity (journal entries, conversations)
    for a given month, updates the user's activity streak data in the database,
    and returns the summary along with current streak info.
    """
    logger.info(f"Fetching activity summary and updating streak for user ID: {current_user.id}, month: {month}")
    try:
        # --- Date Range Calculation ---
        year, month_num = map(int, month.split('-'))
        start_date = date(year, month_num, 1)
        start_datetime = datetime.combine(start_date, time.min)
        next_month_start = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
        next_month_start_datetime = datetime.combine(next_month_start, time.min)
        end_date = next_month_start - timedelta(days=1)
        logger.debug(f"Date range for summary: {start_datetime} to {next_month_start_datetime} (exclusive end)")
    except ValueError:
        logger.warning(f"Invalid month format received: {month}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid month format. Use YYYY-MM.")

    try:
        needs_db_update = False # Flag for streak updates

        # --- Fetch Activity Dates (for requested month AND all time for streak calc) ---

        # Get distinct journal dates (all time)
        all_journal_dates_query = db.query(func.distinct(JournalEntry.entry_date))\
            .filter(JournalEntry.user_id == current_user.id)
        all_journal_dates: Set[date] = {r[0] for r in all_journal_dates_query.all() if r[0] and isinstance(r[0], date)}

        # Get distinct conversation dates (all time)
        all_conv_timestamps_query = db.query(Conversation.timestamp)\
            .filter(Conversation.user_id == current_user.id)\
            .distinct()
        all_conv_dates: Set[date] = {r[0].date() for r in all_conv_timestamps_query.all() if r[0] and isinstance(r[0], datetime)}

        # Combine all unique activity dates (ever)
        all_activity_dates_ever = all_journal_dates.union(all_conv_dates)

        # Filter for the requested month (for the summary response)
        journal_dates_this_month = {d for d in all_journal_dates if start_date <= d <= end_date}
        conv_dates_this_month = {d for d in all_conv_dates if start_date <= d <= end_date}
        all_activity_dates_this_month = journal_dates_this_month.union(conv_dates_this_month)
        logger.debug(f"Activity Dates Set for requested month {month}: {all_activity_dates_this_month}")

        # --- Streak Calculation & User DB Update ---
        today = date.today()
        yesterday = today - timedelta(days=1)
        activity_today = today in all_activity_dates_ever # Check if user was active *today*

        current_db_streak = current_user.current_streak
        longest_db_streak = current_user.longest_streak
        last_activity_db = current_user.last_activity_date

        new_streak = current_db_streak
        new_last_activity = last_activity_db

        if activity_today:
            if last_activity_db == yesterday: new_streak += 1
            elif last_activity_db != today: new_streak = 1
            new_last_activity = today
        else:
            if last_activity_db is not None and last_activity_db < yesterday: new_streak = 0

        new_longest_streak = max(longest_db_streak, new_streak)

        # Check if User model needs updating for streak fields
        if (new_streak != current_db_streak or
            new_longest_streak != longest_db_streak or
            new_last_activity != last_activity_db):
            needs_db_update = True
            current_user.current_streak = new_streak
            current_user.longest_streak = new_longest_streak
            current_user.last_activity_date = new_last_activity
            logger.info(f"User {current_user.id} streak data staged for update: Current={new_streak}, Longest={new_longest_streak}, LastActivity={new_last_activity}")

            # Commit streak changes here
            try:
                db.add(current_user) # Add to session if state changed
                db.commit()
                db.refresh(current_user)
                logger.info(f"Successfully saved updated streak data for user {current_user.id}")
            except Exception as e:
                db.rollback()
                logger.error(f"Database error saving user streak update: {e}", exc_info=True)
                # Allow request to continue, but return possibly stale streak data below
                # Re-fetch user to get pre-error streak values if needed
                # current_user = db.query(User).filter(User.id == current_user.id).first() # Re-fetch on error?

        # --- Create Summary Data Dictionary for Response ---
        summary_data: Dict[str, ActivityData] = {}
        for activity_date in all_activity_dates_this_month:
            if isinstance(activity_date, date):
                date_str = activity_date.isoformat()
                summary_data[date_str] = ActivityData(
                    # Check against this month's sets for calendar display
                    hasJournal=(activity_date in journal_dates_this_month),
                    hasConversation=(activity_date in conv_dates_this_month)
                )
            else:
                 logger.error(f"Skipped non-date item during summary creation: {repr(activity_date)}")

        logger.debug(f"Final summary_data for {month}: {summary_data}")
        logger.debug(f"Returning streaks: Current={current_user.current_streak}, Longest={current_user.longest_streak}")

        # --- Return Final Response ---
        # Returns the summary for the *requested month* and the *current* streak data
        return ActivitySummaryResponse(
            summary=summary_data,
            currentStreak=current_user.current_streak, # Use value from potentially refreshed user object
            longestStreak=current_user.longest_streak # Use value from potentially refreshed user object
        )

    except Exception as e:
        logger.error(f"Unexpected error generating activity summary/streak for user {current_user.id}, month {month}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate activity summary")

# --- NEW: Endpoint to Fetch Earned Badges ---
@router.get("/my-badges", response_model=List[EarnedBadgeInfo])
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
@router.get("/user/latest-summary", response_model=LatestSummaryResponse)
async def get_latest_user_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    latest_summary = db.query(UserSummary)\
        .filter(UserSummary.user_id == current_user.id)\
        .order_by(UserSummary.timestamp.desc())\
        .first()

    if not latest_summary:
        return LatestSummaryResponse(summary_text=None, timestamp=None)

    return LatestSummaryResponse(
        summary_text=latest_summary.summary_text,
        timestamp=latest_summary.timestamp
    )