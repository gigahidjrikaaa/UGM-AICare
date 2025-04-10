# backend/app/routes/summary.py (New File)
from fastapi import APIRouter, Depends, HTTPException, Query, status # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import func, Date, cast, DateTime
from pydantic import BaseModel, Field
from datetime import date, timedelta, datetime, time
from typing import Dict, List, Set

from app.database import get_db
from app.models import User, JournalEntry, Conversation, UserBadge # Import needed models
from app.dependencies import get_current_active_user # Your auth dependency
from app.core.blockchain_utils import mint_nft_badge
import logging
import os

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

# --- NEW: Pydantic Model for Earned Badge Response ---
class EarnedBadgeInfo(BaseModel):
    badge_id: int
    awarded_at: datetime
    transaction_hash: str
    contract_address: str
    # You can add more fields here later if needed, e.g., fetching metadata from DB/IPFS
    # name: Optional[str] = None
    # image_url: Optional[str] = None

    class Config:
        orm_mode = True # Or from_attributes = True for Pydantic v2

# Badge ID Constants -- Might be possible to relocate this later
LET_THERE_BE_BADGE_BADGE_ID = 1
TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID = 2
SEVEN_DAYS_A_WEEK_BADGE_ID = 3
TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID = 4
FULL_MOON_POSITIVITY_BADGE_ID = 5
QUARTER_CENTURY_OF_JOURNALING_BADGE_ID = 6
UNLEASH_THE_WORDS_BADGE_ID = 7
BESTIES_BADGE_ID = 8

# --- API Endpoint ---

@router.get("/", response_model=ActivitySummaryResponse)
async def get_activity_summary(
    month: str = Query(..., regex=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    logger.info(f"Fetching activity summary, streak, and checking badges for user ID: {current_user.id}, month: {month}")
    try:
        # --- Date Range Calculation ---
        year, month_num = map(int, month.split('-'))
        start_date = date(year, month_num, 1)
        start_datetime = datetime.combine(start_date, time.min)
        next_month_start = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
        next_month_start_datetime = datetime.combine(next_month_start, time.min)
        end_date = next_month_start - timedelta(days=1)
        logger.debug(f"Date range: {start_datetime} to {next_month_start_datetime} (exclusive end)")
    except ValueError:
        logger.warning(f"Invalid month format received: {month}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid month format. Use YYYY-MM.")

    try:
        # --- Fetch Existing Data & Counts ---
        needs_db_update = False # Flag to track if user or user_badge needs saving

        # Get user's current streak data
        current_db_streak = current_user.current_streak
        longest_db_streak = current_user.longest_streak
        last_activity_db = current_user.last_activity_date

        # Get total journal entry count for the user
        journal_count = db.query(func.count(JournalEntry.id))\
            .filter(JournalEntry.user_id == current_user.id)\
            .scalar() or 0
        logger.debug(f"Total journal entries for user {current_user.id}: {journal_count}")

        # Get distinct dates with journal entries (all time)
        all_journal_dates_query = db.query(func.distinct(JournalEntry.entry_date))\
            .filter(JournalEntry.user_id == current_user.id)
        all_journal_dates: Set[date] = {r[0] for r in all_journal_dates_query.all() if r[0] and isinstance(r[0], date)}

        # Get distinct dates with conversations (all time)
        all_conv_timestamps_query = db.query(Conversation.timestamp)\
            .filter(Conversation.user_id == current_user.id)\
            .distinct()
        all_conv_dates: Set[date] = {r[0].date() for r in all_conv_timestamps_query.all() if r[0] and isinstance(r[0], datetime)}

        # Combine all unique activity dates (ever)
        all_activity_dates_ever = all_journal_dates.union(all_conv_dates)
        total_activity_days = len(all_activity_dates_ever)
        logger.debug(f"Total unique activity days for user {current_user.id}: {total_activity_days}")

        # Get activity dates for the *requested month* (for the summary response)
        journal_dates_this_month = {d for d in all_journal_dates if start_date <= d <= end_date}
        conv_dates_this_month = {d for d in all_conv_dates if start_date <= d <= end_date}
        all_activity_dates_this_month = journal_dates_this_month.union(conv_dates_this_month)
        logger.debug(f"Activity Dates Set for requested month {month}: {all_activity_dates_this_month}")

        # Get IDs of badges already awarded to this user
        awarded_badge_ids: Set[int] = {
            result[0] for result in db.query(UserBadge.badge_id)\
                .filter(UserBadge.user_id == current_user.id).all()
        }
        logger.debug(f"User {current_user.id} already has badge IDs: {awarded_badge_ids}")

        # --- Streak Calculation Logic ---
        today = date.today()
        yesterday = today - timedelta(days=1)
        activity_today = today in all_activity_dates_ever # Check if user was active *today* at all

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

        # --- !! Badge Awarding Logic !! ---
        logger.debug(f"Checking badge qualifications for user {current_user.id}")
        nft_contract_address = os.getenv("NFT_CONTRACT_ADDRESS")
        badges_to_add_to_db = [] # Collect new badge records before committing

        if not nft_contract_address:
            logger.error("NFT_CONTRACT_ADDRESS not configured. Cannot mint badges.")
        else:
            # Function to handle the minting process and logging
            def attempt_mint(badge_id: int, reason: str):
                nonlocal needs_db_update # Allow modification of outer scope variable
                if badge_id not in awarded_badge_ids:
                    logger.info(f"User qualifies for Badge {badge_id} ({reason}).")
                    if current_user.wallet_address:
                        logger.info(f"Attempting mint to wallet {current_user.wallet_address}")
                        tx_hash = mint_nft_badge(current_user.wallet_address, badge_id)
                        if tx_hash:
                            badges_to_add_to_db.append({"badge_id": badge_id, "tx_hash": tx_hash})
                            needs_db_update = True # Mark that DB needs saving
                            logger.info(f"Mint tx sent for badge {badge_id}: {tx_hash}")
                        else:
                            logger.error(f"Minting badge {badge_id} failed (blockchain_utils returned None).")
                    else:
                        logger.warning(f"User qualifies for Badge {badge_id} but has no linked wallet.")
                # else: logger.debug(f"User already has badge {badge_id}.") # Optional: log if already owned

            # --- Check Badge 1: Let there be badge (First Activity) ---
            # Check if today is the *only* activity day ever
            if activity_today and total_activity_days == 1:
                attempt_mint(LET_THERE_BE_BADGE_BADGE_ID, "First Activity")

            # --- Check Badge 2: Triple Threat (of Thoughts!) (3 Days Activity) ---
            if total_activity_days >= 3:
                attempt_mint(TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID, "3 Total Days Activity")

            # --- Check Badge 3: Seven Days a Week (7-Day Streak) ---
            if new_streak >= 7:
                attempt_mint(SEVEN_DAYS_A_WEEK_BADGE_ID, "7-Day Streak")

            # --- Check Badge 4: Two Weeks Notice(...) (14-Day Streak) ---
            if new_streak >= 14:
                attempt_mint(TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID, "14-Day Streak")

            # --- Check Badge 5: Full Moon Positivity (30-Day Streak) ---
            if new_streak >= 30:
                attempt_mint(FULL_MOON_POSITIVITY_BADGE_ID, "30-Day Streak")

            # --- Check Badge 6: Quarter Century (of Journaling!) (25 Journals) ---
            if journal_count >= 25:
                attempt_mint(QUARTER_CENTURY_OF_JOURNALING_BADGE_ID, "25 Journal Entries")

        # --- Add Newly Awarded Badges to DB Session ---
        if badges_to_add_to_db:
            for badge_info in badges_to_add_to_db:
                new_award = UserBadge(
                    user_id=current_user.id,
                    badge_id=badge_info["badge_id"],
                    contract_address=nft_contract_address,
                    transaction_hash=badge_info["tx_hash"],
                    awarded_at=datetime.now()
                )
                db.add(new_award)
                # Mark awarded in memory to prevent potential duplicate attempts in same request if logic allows
                awarded_badge_ids.add(badge_info["badge_id"])
                logger.info(f"Recorded badge {badge_info['badge_id']} award in session for user {current_user.id}")


        # --- Commit DB changes (Streak + Badges) ---
        if needs_db_update:
            try:
                # User object might have been added already if streak changed
                # db.add(current_user) # Not strictly needed if already tracked by session
                db.commit()
                db.refresh(current_user) # Refresh user object after commit
                logger.info(f"Successfully saved updated user data (streak/badges) for user {current_user.id}")
            except Exception as e:
                db.rollback()
                logger.error(f"Database error saving user data update: {e}", exc_info=True)
                # Log and continue, returning possibly stale streak data from before commit attempt
                # Or raise 500 if this commit is critical
                # raise HTTPException(status_code=500, detail="Failed to save user/badge data")

        # --- Create Summary Data Dictionary for Response ---
        summary_data: Dict[str, ActivityData] = {}
        for activity_date in all_activity_dates_this_month:
            if isinstance(activity_date, date):
                date_str = activity_date.isoformat()
                summary_data[date_str] = ActivityData(
                    hasJournal=(activity_date in journal_dates_this_month), # Use this month's set
                    hasConversation=(activity_date in conv_dates_this_month) # Use this month's set
                )
            else:
                 logger.error(f"Skipped non-date item during summary creation: {repr(activity_date)}")

        logger.debug(f"Final summary_data for {month}: {summary_data}")
        logger.debug(f"Returning streaks: Current={current_user.current_streak}, Longest={current_user.longest_streak}")

        # --- Return Final Response ---
        return ActivitySummaryResponse(
            summary=summary_data,
            currentStreak=current_user.current_streak,
            longestStreak=current_user.longest_streak
        )

    except Exception as e:
        logger.error(f"Unexpected error generating activity summary for user {current_user.id}, month {month}: {e}", exc_info=True)
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