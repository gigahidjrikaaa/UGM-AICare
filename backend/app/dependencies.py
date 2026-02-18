# backend/app/dependencies.py (Modified)
import logging
import hashlib
from fastapi import Depends, HTTPException, Header, status, Cookie, Request  # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import joinedload, load_only, lazyload, selectinload
from app.models import User
from app.database import get_async_db
from app.auth_utils import decrypt_and_validate_token

logger = logging.getLogger(__name__)


def get_token_from_request(
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
    token_cookie: str | None = Cookie(default=None, alias="token"),
    auth_cookie: str | None = Cookie(default=None, alias="auth"),
    nextauth_session: str | None = Cookie(default=None, alias="next-auth.session-token"),
) -> str:
    """Obtain bearer token from Authorization header or known cookies.

    Order of precedence: Authorization header > access_token > token > auth > nextauth_session
    """
    candidate: str | None = None
    source = "none"
    
    if authorization and authorization.lower().startswith("bearer "):
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[1].strip():
            candidate = parts[1].strip()
            source = "Authorization header"
    
    if not candidate:
        if access_token:
            candidate = access_token
            source = "access_token cookie"
        elif token_cookie:
            candidate = token_cookie
            source = "token cookie"
        elif auth_cookie:
            candidate = auth_cookie
            source = "auth cookie"
        elif nextauth_session:
            candidate = nextauth_session
            source = "next-auth.session-token cookie"
    
    if not candidate:
        logger.warning("No authentication token found in request (checked: Authorization header, cookies: access_token, token, auth, next-auth.session-token)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )
    
    logger.debug(f"Token found in: {source}")
    return candidate


async def get_current_active_user(
    token: str = Depends(get_token_from_request),
    db: AsyncSession = Depends(get_async_db),
    request: Request = None,  # type: ignore[assignment]
) -> User:
    """Dependency to return the authenticated and active user for a valid JWT."""
    return await _resolve_current_active_user(
        token=token,
        db=db,
        request=request,
        eager_normalized_relations=False,
    )


async def get_current_active_user_with_normalized_relations(
    token: str = Depends(get_token_from_request),
    db: AsyncSession = Depends(get_async_db),
    request: Request = None,  # type: ignore[assignment]
) -> User:
    """Authenticated active user with normalized relations eagerly loaded.

    Use this dependency only for routes that read/write normalized user tables
    (e.g., profile/preferences/clinical views) to avoid async lazy-load issues.
    """
    return await _resolve_current_active_user(
        token=token,
        db=db,
        request=request,
        eager_normalized_relations=True,
    )


def _build_auth_user_query(user_id: int, eager_normalized_relations: bool):
    if eager_normalized_relations:
        return (
            select(User)
            .options(
                joinedload(User.profile),
                joinedload(User.preferences),
                selectinload(User.clinical_record),
                selectinload(User.emergency_contacts),
            )
            .where(User.id == user_id)
        )

    return (
        select(User)
        .options(
            lazyload("*"),
            load_only(User.id, User.is_active, User.role, User.google_sub),
        )
        .where(User.id == user_id)
    )


async def _resolve_current_active_user(
    token: str,
    db: AsyncSession,
    request: Request | None,
    eager_normalized_relations: bool,
) -> User:
    """Resolve authenticated active user with optional eager relation loading."""
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

    auth_user_query = _build_auth_user_query(
        user_id=user_id,
        eager_normalized_relations=eager_normalized_relations,
    )

    try:
        result = await db.execute(auth_user_query)
        user = result.unique().scalar_one_or_none()
    except DBAPIError as exc:
        logger.warning(
            "Transient DB error while resolving current user id=%s; retrying once: %s",
            user_id,
            exc,
        )
        await db.rollback()
        result = await db.execute(auth_user_query)
        user = result.unique().scalar_one_or_none()

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

    # Expose request-scoped context for non-DI layers (e.g., middleware).
    # Never store raw tokens; use a deterministic hash.
    if request is not None:
        try:
            request.state.user_id = int(user.id)
            request.state.session_id = hashlib.sha256(token.encode("utf-8")).hexdigest()
            request.state.analytics_allowed = True
        except Exception:
            # Non-fatal; auth should still succeed.
            pass

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
