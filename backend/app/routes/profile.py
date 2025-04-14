# backend/app/routes/profile.py (New File or add to existing user routes)
from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models import User
from app.dependencies import get_current_active_user
from app.schemas import CheckinSettingsUpdate, CheckinSettingsResponse

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Profile"],
    dependencies=[Depends(get_current_active_user)] # Protect profile routes
)

@router.put("/settings/checkins", response_model=CheckinSettingsResponse)
async def update_checkin_settings(
    settings: CheckinSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Updates the user's preference for receiving email check-ins."""
    logger.info(f"Updating check-in settings for user {current_user.id} to: {settings.allow_email_checkins}")
    current_user.allow_email_checkins = settings.allow_email_checkins
    try:
        db.add(current_user) # Add to session to track changes
        db.commit()
        db.refresh(current_user) # Refresh to confirm
        return CheckinSettingsResponse(allow_email_checkins=current_user.allow_email_checkins)
    except Exception as e:
         db.rollback()
         logger.error(f"Failed to update check-in settings for user {current_user.id}: {e}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update settings")

# --- Add other profile-related endpoints here later ---
# e.g., GET /api/v1/profile/me to fetch user details