# backend/app/utils/security_utils.py
import os
from cryptography.fernet import Fernet, InvalidToken # type: ignore
from dotenv import load_dotenv, find_dotenv
import logging
from typing import Optional

load_dotenv(find_dotenv())  # Ensure environment variables are loaded

logger = logging.getLogger(__name__)

# --- Encryption/Decryption Functions (DISABLED) ---
# We have disabled encryption for email/name to improve performance and allow DB-level uniqueness constraints.
# These functions are kept as pass-throughs to avoid breaking existing calls.

def encrypt_data(data: Optional[str]) -> Optional[str]:
    """Pass-through: Returns data as-is (Encryption disabled)."""
    return data

def decrypt_data(encrypted_data: Optional[str]) -> Optional[str]:
    """Pass-through: Returns data as-is (Encryption disabled)."""
    return encrypted_data