# backend/app/dependencies.py (Modified)
import logging
from fastapi import Depends, HTTPException, Header, status, Cookie  # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User
from app.database import get_async_db
from app.auth_utils import decrypt_and_validate_token

logger = logging.getLogger(__name__)


def get_token_from_request(
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
    token_cookie: str | None = Cookie(default=None, alias="token"),
    auth_cookie: str | None = Cookie(default=None, alias="auth"),
) -> str:
    """Obtain bearer token from Authorization header or known cookies.

    Order of precedence: Authorization header > access_token > token > auth
    """
    candidate: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[1].strip():
            candidate = parts[1].strip()
    if not candidate:
        candidate = access_token or token_cookie or auth_cookie
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )
    return candidate


async def get_current_active_user(
    token: str = Depends(get_token_from_request),
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
    raw_role = getattr(current_user, "role", "") or ""
    normalized_role = raw_role.strip().lower()
    user_active = getattr(current_user, "is_active", True)

    # Map legacy / alternate role labels
    role_alias_map = {
        "administrator": "admin",
        "superadmin": "admin",
        "super-admin": "admin",
        "therapist": "therapist",
    }
    effective_role = role_alias_map.get(normalized_role, normalized_role)

    allowed_roles = {"admin", "therapist"}
    if effective_role not in allowed_roles:
        logger.warning(
            "Access denied: user %s role='%s' (normalized='%s' effective='%s') not in %s",
            getattr(current_user, "id", "?"),
            raw_role,
            normalized_role,
            effective_role,
            allowed_roles,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or therapist access required",
        )

    if not user_active:
        logger.warning(
            "Inactive privileged user %s attempted to access admin endpoint",
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Optionally synchronize normalized role back to DB (avoid write if unchanged)
    if effective_role != raw_role and hasattr(current_user, "role"):
        try:
            current_user.role = effective_role  # type: ignore[attr-defined]
        except Exception:
            # Non-fatal; just log
            logger.debug("Could not persist normalized role for user %s", current_user.id)

    return current_user
