# backend/app/services/user_service.py (New File)
from sqlalchemy.orm import Session
from fastapi import HTTPException, status # type: ignore
from typing import Optional
import logging

from app.models import User # Import User model
from app.utils.security_utils import encrypt_data # Import encryption utility

logger = logging.getLogger(__name__)

def get_or_create_user(db: Session, google_sub: str, plain_email: Optional[str] = None) -> User:
    """
    Finds a user by google_sub or creates a new one in the database.
    Encrypts email upon creation or if updating a NULL email field.
    """
    logger.info(f"SERVICE: Attempting to get/create user for sub: {google_sub[:10]}") # Log entry
    user = db.query(User).filter(User.google_sub == google_sub).first()
    needs_commit = False

    if not user:
        logger.info(f"SERVICE: User not found for sub {google_sub[:10]}. Preparing to create.")
        encrypted_email_str = None
        if plain_email:
            encrypted_email_str = encrypt_data(plain_email)
            if not encrypted_email_str:
                logger.error(f"Failed to encrypt email for new user {google_sub[:10]}. Storing email as NULL.")

        try: # Add try/except around User object creation
            user = User(
                google_sub=google_sub,
                email=encrypted_email_str,
            )
            logger.info(f"SERVICE: User object created in memory for sub {google_sub[:10]}.")
            db.add(user)
            logger.info(f"SERVICE: User object added to DB session for sub {google_sub[:10]}.")
            needs_commit = True
        except Exception as e:
             logger.error(f"SERVICE: Error INSTANTIATING User object for sub {google_sub[:10]}: {e}", exc_info=True)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to prepare user record.")

    # Optional: If user exists but email is missing in DB, update it
    elif user.email is None and plain_email:
        logger.info(f"Existing user {user.id} found with NULL email. Attempting to set email.")
        encrypted_email_str = encrypt_data(plain_email)
        if encrypted_email_str:
            user.email = encrypted_email_str
            db.add(user) # Add to session for update tracking
            needs_commit = True # Mark commit needed after potential update
        else:
            logger.error(f"Failed to encrypt email for existing user {user.id}. Email remains NULL.")

    # Commit if a new user was added or an existing user's email was updated
    if needs_commit:
        logger.info(f"SERVICE: Attempting db.commit() for user related to sub {google_sub[:10]}.") # Log before commit
        try:
            db.commit()
            logger.info(f"SERVICE: db.commit() SUCCEEDED for user {user.id} (sub {google_sub[:10]}).") # Log success
            db.refresh(user)
            logger.info(f"SERVICE: db.refresh() completed for user {user.id}.")
        except Exception as e:
            logger.error(f"SERVICE: db.commit() FAILED for user related to sub {google_sub[:10]}: {e}", exc_info=True) # Log commit failure
            db.rollback()
            logger.info(f"SERVICE: db.rollback() executed for sub {google_sub[:10]}.") # Log rollback
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save user record due to database error.")
    else:
         logger.info(f"SERVICE: No commit needed for user {user.id} (sub {google_sub[:10]}).")

    return user