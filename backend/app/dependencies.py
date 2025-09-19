# backend/app/dependencies.py (Modified)
import logging
from fastapi import Depends, HTTPException, Header, status  # type: ignore
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
            headers={"WWW-Authenticate": 'Bearer error="invalid_request"'},
        )
    token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token missing",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )
    return token


async def get_current_active_user(
    token: str = Depends(get_token_from_header),
    db: AsyncSession = Depends(get_async_db),
) -> User:
    """Dependency to return the authenticated and active user for a valid JWT."""
    payload = decrypt_and_validate_token(token)

    try:
        user_id = int(payload.sub)
    except (TypeError, ValueError):
        logger.error("JWT subject is not a valid user identifier: %s", payload.sub)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        logger.warning("JWT resolved to missing user id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    if not user.is_active:
        logger.warning("Inactive user %s attempted to access protected route", user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    if payload.role and payload.role != user.role:
        logger.warning(
            "Token role mismatch for user %s: token=%s, db=%s",
            user_id,
            payload.role,
            user.role,
        )

    if payload.google_sub and user.google_sub and payload.google_sub != user.google_sub:
        logger.warning(
            "Token google_sub mismatch for user %s: token=%s, db=%s",
            user_id,
            payload.google_sub,
            user.google_sub,
        )

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to ensure current user is an admin or therapist."""
    user_role = getattr(current_user, "role", None)
    user_active = getattr(current_user, "is_active", True)

    if not user_role or user_role not in ["admin", "therapist"]:
        logger.warning(
            "User %s with role '%s' attempted to access admin endpoint",
            current_user.id,
            user_role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or therapist access required",
        )

    if not user_active:
        logger.warning(
            "Inactive admin user %s attempted to access admin endpoint",
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return current_user
