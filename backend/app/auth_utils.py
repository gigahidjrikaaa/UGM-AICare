# backend/app/auth_utils.py (New File)
import os
import logging
import json
from typing import Optional, Dict, Any
from jose import jwe, jwt, exceptions as jose_exceptions, JWTError # type: ignore
from fastapi import HTTPException, status # type: ignore
from pydantic import BaseModel, ValidationError
from hkdf import Hkdf # type: ignore

# Load environment variables
JWT_SECRET = os.environ.get("JWT_SECRET_KEY")
# ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS512")

logger = logging.getLogger(__name__)

# --- Input Validation ---
if not JWT_SECRET:
    logger.error("CRITICAL: JWT_SECRET_KEY environment variable is not set!")
    raise ValueError("JWT_SECRET_KEY must be set in the environment")

class TokenPayload(BaseModel):
    """Pydantic model for expected JWT payload structure AFTER decryption"""
    sub: str # User ID (subject)
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[str] = None
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
        # --- Derive the key first ---
        derived_key = _derive_encryption_key(JWT_SECRET)

        # --- Decrypt using the DERIVED key ---
        decrypted_payload_bytes = jwe.decrypt(token, derived_key)
        decrypted_payload_str = decrypted_payload_bytes.decode('utf-8')
        payload_dict: Dict[str, Any] = json.loads(decrypted_payload_str)

        logger.debug(f"Decrypted JWE payload: {payload_dict}")

        # --- Payload Validation ---
        # Validate payload structure using Pydantic
        payload = TokenPayload(**payload_dict)

        # Optional: Add expiry validation (using the 'exp' claim from the payload)
        # if payload.exp and payload.exp < time.time():
        #     logger.warning(f"Token expired for sub: {payload.sub}")
        #     raise HTTPException(
        #          status_code=status.HTTP_401_UNAUTHORIZED,
        #          detail="Token has expired",
        #          headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"The token has expired\""},
        #      )

        return payload

    # --- Corrected Exception Handling ---
    # Catch specific JWE exceptions first
    except jose_exceptions.ExpiredSignatureError: # Can still happen if inner JWS has expiry
        logger.warning("Received an expired token signature (within JWE).")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"The token has expired\""},
        )
    except (jose_exceptions.JWEError, JWTError) as e: # Catch JWEError and base JWTError
        logger.error(f"JWE/JWT Decryption/Validation Error: {e}")
        # Check specific error messages if needed
        if "signature validation failed" in str(e).lower(): # Check message for integrity failure
             detail = "Could not validate credentials: Token integrity check failed"
        elif "key must be" in str(e).lower(): # If key length error persists
             detail = "Could not validate credentials: Key configuration issue"
        else:
             detail = "Could not validate credentials: Invalid or malformed token"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
        )
    except json.JSONDecodeError:
        logger.error("Failed to decode decrypted payload string as JSON.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Invalid token payload format",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
         )
    except ValidationError as e:
        logger.error(f"Token payload validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Unexpected token payload structure",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
        )
    except Exception as e:
        logger.error(f"Unexpected error during token decryption/validation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during token processing",
        )