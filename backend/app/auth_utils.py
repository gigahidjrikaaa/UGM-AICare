# backend/app/auth_utils.py (New File)
import os
import logging
from typing import Optional
from jose import JWTError, jwt # type: ignore
from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError

# Load environment variables
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "sigmasigmaboysigmaboy") # Replace with a strong, environment-specific secret
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS512")

logger = logging.getLogger(__name__)

class TokenPayload(BaseModel):
    """Pydantic model for expected JWT payload structure"""
    sub: str # User ID (subject)
    # Add other expected fields like exp (expiry), iat (issued at), role, etc.
    # exp: Optional[int] = None
    # role: Optional[str] = None

def decode_jwt_token(token: str) -> TokenPayload:
    """Decodes and validates the JWT token, returning the payload."""
    try:
        payload_dict = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        logger.debug(f"Raw decoded payload: {payload_dict}")

        # Validate payload structure using Pydantic
        payload = TokenPayload(**payload_dict)
        # Optional: Add expiry validation here if 'exp' is in the payload
        # if payload.exp and payload.exp < time.time():
        #     raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")

        return payload
    except JWTError as e:
        logger.error(f"JWT Error during decoding: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValidationError as e:
        logger.error(f"Token payload validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Malformed token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error during token decoding: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during token processing",
        )