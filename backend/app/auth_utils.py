# backend/app/auth_utils.py (New File)
import os
import logging
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from fastapi import HTTPException, status

from hkdf import Hkdf  # type: ignore
from jose import jwe, jwt, exceptions as jose_exceptions, JWTError # type: ignore
from pydantic import BaseModel, ValidationError

# Load environment variables
JWT_SECRET = os.environ.get("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))


logger = logging.getLogger(__name__)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    if not JWT_SECRET:
        raise ValueError("JWT_SECRET_KEY is not set, cannot create token.")

    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

# --- Input Validation ---
if not JWT_SECRET:
    logger.error("CRITICAL: JWT_SECRET_KEY environment variable is not set!")
    raise ValueError("JWT_SECRET_KEY must be set in the environment")

# Ensure JWT_SECRET is long enough for JWE (e.g., 32 bytes for A256CBC-HS512)
if len(JWT_SECRET) < 32:
    logger.error(f"CRITICAL: JWT_SECRET_KEY is too short ({len(JWT_SECRET)} chars). Must be at least 32 characters for JWE.")
    raise ValueError("JWT_SECRET_KEY must be at least 32 characters long.")

class TokenPayload(BaseModel):
    """Pydantic model for expected JWT payload structure AFTER decryption"""
    sub: str # User ID (subject)
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[str] = None
    allow_email_checkins: Optional[bool] = None
    iat: Optional[int] = None # Issued at timestamp
    exp: Optional[int] = None # Expiration timestamp
    accessToken: Optional[str] = None

# --- HKDF Key Derivation Helper ---
def _derive_encryption_key(secret: str) -> bytes:
    """
    Derives the encryption key from the shared secret using HKDF,
    matching NextAuth v4's likely parameters.
    """
    # Encode the necessary strings to bytes
    secret_bytes = secret.encode('utf-8')
    # For NextAuth v4, salt is typically empty, info is specific string
    salt_bytes = b""
    info_bytes = b"NextAuth.js Generated Encryption Key"
    # Key length for A256CBC-HS512 (common in v4 JWE) is 64 bytes (512 bits)
    key_length_bytes = 32

    try:
        hkdf = Hkdf(salt_bytes, secret_bytes)
        derived_key = hkdf.expand(info_bytes, key_length_bytes)
        # logger.debug(f"Derived HKDF key length: {len(derived_key)} bytes") # For debugging
        if len(derived_key) != key_length_bytes:
             # This shouldn't happen with hkdf.expand but good check
             raise ValueError(f"Derived key length is incorrect. Expected {key_length_bytes}, got {len(derived_key)}.")
        return derived_key
    except Exception as e:
        logger.error(f"Failed to derive encryption key using HKDF: {e}")
        raise RuntimeError("Could not derive necessary encryption key.")

def decrypt_and_validate_token(token: str) -> TokenPayload:
    """Decrypts the JWE token and validates the resulting payload."""
    if not JWT_SECRET:
         # Should not happen if checked at startup, but safeguard anyway
         logger.error("JWT Secret Key is missing, cannot decrypt token.")
         raise HTTPException(
             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
             detail="Authentication configuration error.",
         )

    try:
        payload_dict = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        payload = TokenPayload(**payload_dict)
        return payload

    except JWTError as e:
        logger.error(f"JWE/JWT Decryption/Validation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Invalid or malformed token",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
        )
    except ValidationError as e:
        logger.error(f"Token payload validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Unexpected token payload structure",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
        )