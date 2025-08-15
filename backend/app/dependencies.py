# backend/app/dependencies.py (Modified)
import logging
from fastapi import Depends, HTTPException, Header, status # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User
from app.database import get_async_db
from app.auth_utils import decrypt_and_validate_token

logger = logging.getLogger(__name__)

def get_token_from_header(authorization: str = Header(...)) -> str:
    """Extracts the token from the Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_request\""},
        )
    token = authorization.split(" ")[1]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token missing",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
        )
    return token

async def get_current_active_user(
    token: str = Depends(get_token_from_header), # Use the extracted token
    db: AsyncSession = Depends(get_async_db),
) -> User:
    """Dependency to get the current authenticated and active user from JWT."""
    logger.info("Attempting to authenticate user...")
    payload = decrypt_and_validate_token(token) # Use the helper function

    google_sub_id = payload.sub # Pydantic model ensures 'sub' exists
    stmt = select(User).filter(User.google_sub == google_sub_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        logger.warning(f"User with google_sub {google_sub_id} not found in database.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Optional: Add checks for user status (e.g., is_active) if needed
    # if not user.is_active:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    logger.info(f"Successfully authenticated user: {google_sub_id}")
    return user

async def get_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Dependency to ensure current user is an admin or therapist."""
    user_role = getattr(current_user, 'role', None)
    user_active = getattr(current_user, 'is_active', True)
    
    if not user_role or user_role not in ["admin", "therapist"]:
        logger.warning(f"User {current_user.id} with role '{user_role}' attempted to access admin endpoint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or therapist access required"
        )
    
    if not user_active:
        logger.warning(f"Inactive admin user {current_user.id} attempted to access admin endpoint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    return current_user
