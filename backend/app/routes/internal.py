# backend/app/routes/internal.py

from fastapi import APIRouter, Depends, HTTPException, Security, status, Body # type: ignore
from fastapi.security import APIKeyHeader # type: ignore
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.schemas import UserInternalResponse, UserSyncPayload, UserSyncResponse
from app.models import User
from app.services.user_service import get_or_create_user # Import the user service function
# from app.utils.security_utils import decrypt_data #! For email decryption ONLY if needed
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/internal", tags=["Internal"])

# --- Security Setup ---
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY") # Set this in your .env!
if not INTERNAL_API_KEY:
    print("WARNING: INTERNAL_API_KEY is not set. Internal endpoints are insecure.")

api_key_header = APIKeyHeader(name="X-Internal-API-Key", auto_error=False)

async def get_api_key(api_key: str = Security(api_key_header)):
    # if not INTERNAL_API_KEY: # Allow access if key is not set (for local dev maybe)
    #     print("Allowing access to internal API without key (INTERNAL_API_KEY not set)")
    #     return "dummy_key_allowed"
    if api_key == INTERNAL_API_KEY:
        return api_key
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing Internal API Key"
        )
# --- End Security Setup ---

@router.get("/user-by-sub/{google_sub}", response_model=UserInternalResponse, dependencies=[Security(get_api_key)])
async def get_user_by_google_sub(google_sub: str, db: Session = Depends(get_db)):
    """
    Internal endpoint to fetch user details by Google SUB ID.
    Requires X-Internal-API-Key header.
    """
    print(f"Internal API: Fetching user by sub: {google_sub}") # Add logging
    db_user = db.query(User).filter(User.google_sub == google_sub).first()
    if not db_user:
        print(f"Internal API: User not found for sub: {google_sub}")
        raise HTTPException(status_code=404, detail="User not found")

    #! Decrypt email IF needed only
    #! Be careful returning PII even on internal APIs
    #! Check with project lead if this is necessary
    # if db_user.email:
    #     plain_email = decrypt_data(db_user.email)
    #     db_user.email = plain_email # Set decrypted email for response (if needed)

    return UserInternalResponse(
        id=db_user.id,
        google_sub=db_user.google_sub,
        email=db_user.email, # Return encrypted email stored in DB
        wallet_address=db_user.wallet_address,
        role=None
    )

# --- NEW POST Endpoint for User Sync ---
@router.post("/sync-user", response_model=UserSyncResponse, dependencies=[Security(get_api_key)])
async def sync_user_on_login(
    payload: UserSyncPayload = Body(...),
    db: Session = Depends(get_db)
):
    """
    Called internally by NextAuth after login to ensure user exists in DB
    and email (encrypted) is stored/updated if missing.
    Requires X-Internal-API-Key header.
    """
    logger.info(f"Internal sync request received for google_sub: {payload.google_sub[:10]}...")
    try:
        # Call the refactored function from user_service
        db_user = get_or_create_user(db=db, google_sub=payload.google_sub, plain_email=payload.email)

        return UserSyncResponse(
            message="User synced successfully",
            user_id=db_user.id,
            google_sub=db_user.google_sub,
            email_stored=(db_user.email is not None) # Check if encrypted email is now stored
        )
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions (like 500 from DB error)
        raise http_exc
    except Exception as e:
        # Catch any other unexpected errors from get_or_create_user or here
        logger.error(f"Internal sync failed unexpectedly for google_sub {payload.google_sub[:10]}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal user sync processing failed")
