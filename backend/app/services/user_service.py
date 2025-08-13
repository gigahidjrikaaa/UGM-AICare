# backend/app/services/user_service.py (New File)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status # type: ignore
from typing import Optional
import logging

from app.models import User # Import User model
from app.utils.security_utils import encrypt_data # Import encryption utility

logger = logging.getLogger(__name__)

async def async_get_or_create_user(db: AsyncSession, google_sub: str, plain_email: Optional[str] = None) -> User:
    """
    Asynchronously finds a user by google_sub or creates a new one.
    Encrypts email upon creation or if updating a NULL email field.
    """
    logger.info(f"ASYNC_SERVICE: Attempting to get/create user for sub: {google_sub[:10]}")
    stmt = select(User).where(User.google_sub == google_sub)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    needs_commit = False

    if not user:
        logger.info(f"ASYNC_SERVICE: User not found for sub {google_sub[:10]}. Preparing to create.")
        encrypted_email_str = None
        if plain_email:
            encrypted_email_str = encrypt_data(plain_email)
            if not encrypted_email_str:
                logger.error(f"Failed to encrypt email for new user {google_sub[:10]}. Storing email as NULL.")

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

    elif user.email is None and plain_email:
        logger.info(f"Existing user {user.id} found with NULL email. Attempting to set email.")
        encrypted_email_str = encrypt_data(plain_email)
        if encrypted_email_str:
            setattr(user, 'email', encrypted_email_str)
            db.add(user)
            needs_commit = True
        else:
            logger.error(f"Failed to encrypt email for existing user {user.id}. Email remains NULL.")

    if needs_commit:
        try:
            await db.commit()
            await db.refresh(user)
        except Exception as e:
            await db.rollback()
            logger.error(f"ASYNC_SERVICE: db.commit() FAILED for user related to sub {google_sub[:10]}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save user record due to database error.")

    return user

async def async_get_user_by_google_sub(db: AsyncSession, google_sub: str) -> Optional[User]:
    stmt = select(User).where(User.google_sub == google_sub)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
