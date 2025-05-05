# backend/app/routes/internal.py

from fastapi import APIRouter, Depends, HTTPException, Security, status, Body # type: ignore
from fastapi.security import APIKeyHeader # type: ignore
from sqlalchemy.orm import Session
from typing import Optional, List, Tuple

from app.database import get_db
from app.schemas import UserInternalResponse, UserSyncPayload, UserSyncResponse
from app.models import User
from app.services.user_service import get_or_create_user # Import the user service function
from app.utils.security_utils import decrypt_data, encrypt_data #! For email decryption ONLY if needed
import os
import re
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/internal", tags=["Internal"])

# --- Security Setup ---
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY") # Set this in your .env!
if not INTERNAL_API_KEY:
    print("WARNING: INTERNAL_API_KEY is not set. Internal endpoints are insecure.")

api_key_header = APIKeyHeader(name="X-Internal-API-Key", auto_error=False)

#? Helper for inconsistent UUIDs (Google Sub)
# --- Helper to check UUID format (keep as is) ---
def is_uuid_like(text: Optional[str]) -> bool:
    if not text: return False
    pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    return bool(re.match(pattern, text, re.IGNORECASE))

# --- Define Allowed Email Domains ---
#! Disallow Gmail in production, but allow for now
ALLOWED_EMAIL_DOMAINS: Tuple[str, ...] = (
    "@mail.ugm.ac.id",
    "@ugm.ac.id",
    "@gmail.com", # <-- ALLOW GMAIL FOR NOW
)

# --- Modified Helper to check allowed email domains ---
def is_allowed_email_domain(email: Optional[str]) -> bool:
    """Checks if the email belongs to one of the allowed domains."""
    if not email:
        return False
    # Ensure case-insensitive check
    email_lower = email.lower()
    for domain in ALLOWED_EMAIL_DOMAINS:
        if email_lower.endswith(domain):
            return True
    return False

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
    logger.info(f"Internal API: Fetching user by sub: {google_sub}")
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
        role=None,
        allow_email_checkins=db_user.allow_email_checkins,
    )

# --- POST Endpoint for User Sync ---
@router.post("/sync-user", response_model=UserSyncResponse, dependencies=[Security(get_api_key)])
async def sync_user_on_login(
    payload: UserSyncPayload = Body(...),
    db: Session = Depends(get_db)
):
    """
    Called internally by NextAuth after login.
    Ensures user exists, corrects google_sub if necessary,
    and creates new users only if they have an allowed email domain
    (currently UGM or Gmail).
    """
    logger.info(f"Sync user request received for google_sub: {payload.google_sub[:10]}...")
    correct_google_sub = payload.google_sub
    plain_email = payload.email
    encrypted_email = encrypt_data(plain_email) if plain_email else None

    db_user: Optional[User] = None
    needs_commit = False

    # 1. Try finding by correct numerical google_sub
    db_user = db.query(User).filter(User.google_sub == correct_google_sub).first()

    if db_user:
        logger.info(f"User found by correct google_sub: {db_user.id}")
        # Ensure email is up-to-date if provided now but missing before
        if encrypted_email and db_user.email is None:
             logger.info(f"Updating missing email for user {db_user.id}")
             db_user.email = encrypted_email
             needs_commit = True
        # Optional: Log if provided email differs from stored email?
        elif encrypted_email and db_user.email != encrypted_email:
             logger.warning(f"Provided email differs from stored email for user {db_user.id}. Stored email will be kept unless manually changed.")
             # Policy: We don't automatically overwrite an existing email here.
    elif plain_email and encrypted_email:
        # 2. If not found by sub, try finding by email
        logger.info(f"User not found by sub, trying email: {plain_email}")
        user_by_email = db.query(User).filter(User.email == encrypted_email).first()

        if user_by_email:
            logger.info(f"User found by email: {user_by_email.id}. Checking existing google_sub...")
            db_user = user_by_email
            if is_uuid_like(db_user.google_sub):
                logger.warning(f"Correcting google_sub for user ID {db_user.id} from '{db_user.google_sub}' to '{correct_google_sub}' based on email match.")
                db_user.google_sub = correct_google_sub
                needs_commit = True
            # No need for the elif db_user.google_sub != correct_google_sub check here,
            # as finding by email implies the sub was wrong or missing.

        else:
            # 3. Not found by sub OR email -> Check domain BEFORE creating
            logger.info(f"User not found by email either. Checking domain for creation eligibility: {plain_email}")
            # --- Use the new domain check ---
            if is_allowed_email_domain(plain_email):
                logger.info(f"Email domain is allowed. Creating new user...")
                try:
                    db_user = User(
                        google_sub=correct_google_sub,
                        email=encrypted_email,
                        allow_email_checkins=True # Set default preferences
                    )
                    db.add(db_user)
                    needs_commit = True
                    db.flush() # Flush to handle potential immediate errors
                    logger.info(f"New user created in session for sub {correct_google_sub[:10]}")
                except Exception as e:
                    logger.error(f"Error creating new User object for sub {correct_google_sub[:10]}: {e}", exc_info=True)
                    db.rollback()
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to prepare new user record.")
            else:
                # Not found and NOT an allowed email domain - DO NOT CREATE
                logger.warning(f"User not found for sub {correct_google_sub[:10]} and email '{plain_email}' is not in allowed domains {ALLOWED_EMAIL_DOMAINS}. User creation denied.")
                # Return a more generic "forbidden" error to the frontend caller
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account creation restricted to specific email domains."
                )
    elif not plain_email:
         # Not found by sub, and no email provided
         logger.error(f"User sync failed: User not found for sub {correct_google_sub[:10]} and no email was provided.")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot sync user: Required email information missing.")

    # --- Commit and Return ---
    if needs_commit:
        try:
            db.commit()
            if db_user: # Ensure db_user is not None before refreshing
                db.refresh(db_user)
                logger.info(f"Successfully committed changes for user {db_user.id}")
            else: # Should not happen if needs_commit is true, but log if it does
                 logger.error("Commit triggered but db_user object was None.")
        except Exception as e:
            logger.error(f"Database commit failed during user sync: {e}", exc_info=True)
            db.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error during user sync.")

    if not db_user:
         logger.error(f"Sync logic completed without resolving to a user object for sub {correct_google_sub[:10]}.")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error processing user sync.")

    return UserSyncResponse(
        message="User synced successfully",
        user_id=db_user.id,
        google_sub=db_user.google_sub,
        email_stored=(db_user.email is not None)
    )