# backend/app/services/user_service.py (New File)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status # type: ignore
from typing import Optional
import logging

from app.models import User # Import User model
from app.utils.security_utils import encrypt_data, decrypt_data # Import encryption utilities

logger = logging.getLogger(__name__)

async def async_get_or_create_user(db: AsyncSession, google_sub: str, plain_email: Optional[str] = None) -> User:
    """
    Asynchronously finds a user by google_sub or email, or creates a new one.
    If a user exists with the email but not the google_sub, it links them.
    Encrypts email upon creation or if updating a NULL email field.
    """
    logger.info(f"ASYNC_SERVICE: Attempting to get/create user for sub: {google_sub[:10]}")
    
    # 1. Try to find user by google_sub
    stmt = select(User).where(User.google_sub == google_sub)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    needs_commit = False

    if user:
        logger.info(f"Found user by google_sub: {user.id}")
        # If user found by sub, but email is not set, try to set it
        if not user.email and plain_email:
            encrypted_email_str = encrypt_data(plain_email)
            if encrypted_email_str:
                setattr(user, 'email', encrypted_email_str)
                db.add(user)
                needs_commit = True
            else:
                logger.error(f"Failed to encrypt email for existing user {user.id}. Email remains NULL.")
    else:
        logger.info(f"User not found by google_sub. Checking by email: {plain_email}")
        # 2. If not found by sub, try by email
        if plain_email:
            encrypted_email_str = encrypt_data(plain_email)
            if not encrypted_email_str:
                logger.error(f"Failed to encrypt email for lookup. Cannot proceed with email check.")
                # This case is problematic, as we can't check the DB for an unencrypted email.
                # For now, we assume encryption always works. A more robust solution might be needed.
            
            stmt_email = select(User).where(User.email == encrypted_email_str)
            result_email = await db.execute(stmt_email)
            user_by_email = result_email.scalar_one_or_none()

            if user_by_email:
                # 3. User exists with this email, link google_sub
                logger.info(f"User found by email ({plain_email}). Linking google_sub.")
                user = user_by_email
                setattr(user, 'google_sub', google_sub)
                db.add(user)
                needs_commit = True
            else:
                # 4. No user found by sub or email, create new user
                logger.info(f"No user found by email. Creating new user for sub {google_sub[:10]}.")
                try:
                    user = User(
                        google_sub=google_sub,
                        email=encrypted_email_str,
                    )
                    db.add(user)
                    needs_commit = True
                except Exception as e:
                    logger.error(f"ASYNC_SERVICE: Error INSTANTIATING User object for sub {google_sub[:10]}: {e}", exc_info=True)
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to prepare user record.")
        else:
            # Cannot find by email, and no user by sub, so create a new one without email
            logger.info(f"No plain_email provided. Creating new user for sub {google_sub[:10]} without email.")
            try:
                user = User(google_sub=google_sub)
                db.add(user)
                needs_commit = True
            except Exception as e:
                logger.error(f"ASYNC_SERVICE: Error INSTANTIATING User object for sub {google_sub[:10]}: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to prepare user record.")


    if needs_commit:
        try:
            await db.commit()
            await db.refresh(user)
        except Exception as e:
            await db.rollback()
            logger.error(f"ASYNC_SERVICE: db.commit() FAILED for user related to sub {google_sub[:10]}: {e}", exc_info=True)
            # Check if it's a unique constraint violation on email
            if "UniqueViolationError" in str(e) and "ix_users_email" in str(e):
                 raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists but could not be linked automatically. Please log in with your original method and link your account in settings."
                )
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save user record due to database error.")

    return user

async def async_get_user_by_google_sub(db: AsyncSession, google_sub: str) -> Optional[User]:
    stmt = select(User).where(User.google_sub == google_sub)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def async_get_user_by_plain_email(db: AsyncSession, plain_email: str) -> Optional[User]:
    """Lookup by plaintext email."""
    # Since encryption is disabled, we can do a direct DB lookup.
    # We use ILIKE or func.lower() for case-insensitive match if needed, but exact match is faster.
    # For now, let's assume stored emails are normalized or just do exact match.
    
    stmt = select(User).where(User.email == plain_email)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()



