# backend/app/routes/profile.py (New File or add to existing user routes)
from datetime import datetime
from typing import Dict, List, Set, Any
from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
import logging
import os

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.schemas.user import CheckinSettingsUpdate, CheckinSettingsResponse, EarnedBadgeInfo, SyncAchievementsResponse
from app.models import UserBadge, JournalEntry, User, Conversation
from app.core.blockchain_utils import mint_nft_badge # Import the minting function

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Profile"],
    dependencies=[Depends(get_current_active_user)] # Protect profile routes
)

# Badge ID Constants -- Might be possible to relocate this later
LET_THERE_BE_BADGE_BADGE_ID = 1
TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID = 2
SEVEN_DAYS_A_WEEK_BADGE_ID = 3
TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID = 4
FULL_MOON_POSITIVITY_BADGE_ID = 5
QUARTER_CENTURY_OF_JOURNALING_BADGE_ID = 6
UNLEASH_THE_WORDS_BADGE_ID = 7
BESTIES_BADGE_ID = 8

@router.put("/settings/checkins", response_model=CheckinSettingsResponse)
async def update_checkin_settings(
    settings: CheckinSettingsUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Updates the user's preference for receiving email check-ins."""
    any_user: Any = current_user
    logger.info(f"Updating check-in settings for user {any_user.id} to: {settings.allow_email_checkins}")
    setattr(any_user, 'allow_email_checkins', settings.allow_email_checkins)
    try:
        db.add(any_user) # Add to session to track changes
        await db.commit()
        await db.refresh(any_user) # Refresh to confirm
        return CheckinSettingsResponse(allow_email_checkins=any_user.allow_email_checkins)
    except Exception as e:
         await db.rollback()
         logger.error(f"Failed to update check-in settings for user {current_user.id}: {e}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update settings")

@router.post("/sync-achievements", response_model=SyncAchievementsResponse)
async def sync_user_achievements(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Checks all badge criteria for the current user, attempts to mint any
    missing badges they qualify for, and returns info about newly awarded badges.
    """
    any_user: Any = current_user
    logger.info(f"Running sync achievements for user {any_user.id}")
    needs_db_update = False
    badges_to_add_to_db: List[Dict] = [] # Store {'badge_id': id, 'tx_hash': hash}
    newly_awarded_badge_info: List[EarnedBadgeInfo] = [] # Store full info for response

    try:
        # --- Fetch Necessary Data ---
        # Streaks (already stored on user object)
        current_streak = any_user.current_streak
        # Journal Count
        journal_count = (await db.execute(select(func.count(JournalEntry.id))\
            .filter(JournalEntry.user_id == any_user.id)\
            )).scalar() or 0
        # Total Activity Days (simplified: just count distinct journal dates for now)
        # More accurate check would involve union with conversation dates again
        total_activity_days = (await db.execute(select(func.count(func.distinct(JournalEntry.entry_date)))\
            .filter(JournalEntry.user_id == any_user.id)\
            )).scalar() or 0
        # Awarded Badge IDs
        awarded_badges_res = await db.execute(select(UserBadge.badge_id).filter(UserBadge.user_id == any_user.id))
        awarded_badge_ids: Set[int] = {
            r[0] for r in awarded_badges_res.all()
        }
        logger.debug(f"User {any_user.id} data: Streak={current_streak}, Journals={journal_count}, ActivityDays={total_activity_days}, Awarded={awarded_badge_ids}")

        # --- Badge Awarding Logic ---
        nft_contract_address = os.getenv("NFT_CONTRACT_ADDRESS")
        if not nft_contract_address:
            logger.error("NFT_CONTRACT_ADDRESS not configured. Cannot mint badges.")
            raise HTTPException(status_code=500, detail="Server configuration error prevents badge awarding.")

        # Helper function for minting attempt
        def attempt_mint(badge_id: int, reason: str):
            nonlocal needs_db_update
            if badge_id not in awarded_badge_ids:
                logger.info(f"User qualifies for Badge {badge_id} ({reason}).")
                if any_user.wallet_address:
                    tx_hash = mint_nft_badge(any_user.wallet_address, badge_id)
                    if tx_hash:
                        badges_to_add_to_db.append({"badge_id": badge_id, "tx_hash": tx_hash})
                        needs_db_update = True
                    else: logger.error(f"Minting badge {badge_id} failed.")
                else: logger.warning(f"User qualifies for Badge {badge_id} but has no linked wallet.")

        # Check badges 1-6 (based on fetched data)
        if total_activity_days >= 1: attempt_mint(LET_THERE_BE_BADGE_BADGE_ID, "First Activity") # Check total days >= 1
        if total_activity_days >= 3: attempt_mint(TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID, "3 Total Days Activity")
        if current_streak >= 7: attempt_mint(SEVEN_DAYS_A_WEEK_BADGE_ID, "7-Day Streak")
        if current_streak >= 14: attempt_mint(TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID, "14-Day Streak")
        if current_streak >= 30: attempt_mint(FULL_MOON_POSITIVITY_BADGE_ID, "30-Day Streak")
        if journal_count >= 25: attempt_mint(QUARTER_CENTURY_OF_JOURNALING_BADGE_ID, "25 Journal Entries")

        # TODO: Add checks for badge 7 & 8 (requires fetching relevant data like last journal entry length or session message counts)

        # --- Add Newly Awarded Badges to DB Session ---
        if badges_to_add_to_db:
            current_time = datetime.now() # Use consistent timestamp
            for badge_info in badges_to_add_to_db:
                new_award = UserBadge(
                    user_id=any_user.id,
                    badge_id=badge_info["badge_id"],
                    contract_address=nft_contract_address,
                    transaction_hash=badge_info["tx_hash"],
                    awarded_at=current_time
                )
                db.add(new_award)
                # Prepare info for the response
                newly_awarded_badge_info.append(EarnedBadgeInfo(
                     badge_id=badge_info["badge_id"],
                     awarded_at=current_time,
                     transaction_hash=badge_info["tx_hash"],
                     contract_address=nft_contract_address
                ))
                logger.info(f"Recorded badge {badge_info['badge_id']} award in session for user {any_user.id}")

        # --- Commit DB changes ---
        if needs_db_update:
            try:
                await db.commit()
                logger.info(f"Successfully saved new badge awards for user {any_user.id}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Database error saving new badge awards: {e}", exc_info=True)
                # Don't fail the whole request, but maybe return a partial success message?
                return SyncAchievementsResponse(message="Checked achievements, but failed to save some awards.", newly_awarded_badges=[]) # Return empty list on DB error

        return SyncAchievementsResponse(
            message="Achievements checked successfully.",
            newly_awarded_badges=newly_awarded_badge_info # Return list of badges just awarded
        )

    except Exception as e:
        logger.error(f"Unexpected error syncing achievements for user {any_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to sync achievements")

@router.get("/my-badges", response_model=List[EarnedBadgeInfo])
async def get_my_earned_badges(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all badges earned by the current user."""
    logger.info(f"Fetching earned badges for user {current_user.id}")
    try:
        result = await db.execute(select(UserBadge).filter(UserBadge.user_id == current_user.id).order_by(UserBadge.awarded_at.desc()))
        earned_badges = result.scalars().all()

        # FastAPI will automatically convert the list of UserBadge ORM objects
        # to a list of EarnedBadgeInfo Pydantic models due to the response_model
        # and from_attributes=True in the schema.
        return earned_badges
    except Exception as e:
        logger.error(f"Error fetching badges for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve earned badges.")
    
    