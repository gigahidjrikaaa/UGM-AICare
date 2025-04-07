# backend/app/dependencies.py (Modified)
import logging
from fastapi import Depends, HTTPException, Header, status # type: ignore
from sqlalchemy.orm import Session
from app.models import User
from app.database import get_db
from app.auth_utils import decode_jwt_token # Import the new helper

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

def get_current_active_user(
    token: str = Depends(get_token_from_header), # Use the extracted token
    db: Session = Depends(get_db),
) -> User:
    """Dependency to get the current authenticated and active user from JWT."""
    logger.info("Attempting to authenticate user...")
    payload = decode_jwt_token(token) # Use the helper function

    user_id = payload.sub # Pydantic model ensures 'sub' exists

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"User with id {user_id} not found in database.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Optional: Add checks for user status (e.g., is_active) if needed
    # if not user.is_active:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    logger.info(f"Successfully authenticated user: {user.id}")
    return user