# backend/app/utils/security_utils.py
import os
from cryptography.fernet import Fernet, InvalidToken # type: ignore
from dotenv import load_dotenv
import logging
from typing import Optional

load_dotenv() # Ensure environment variables are loaded

logger = logging.getLogger(__name__)

# --- Initialize Fernet ---
ENCRYPTION_KEY = os.getenv("EMAIL_ENCRYPTION_KEY")
fernet_instance = None

if ENCRYPTION_KEY:
    try:
        fernet_instance = Fernet(ENCRYPTION_KEY.encode()) # Key needs to be bytes
        logger.info("Fernet email encryption utility initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Fernet with provided key: {e}", exc_info=True)
        fernet_instance = None
else:
    logger.warning("EMAIL_ENCRYPTION_KEY not found in environment. Email encryption/decryption will be disabled.")

# --- Encryption/Decryption Functions ---

def encrypt_data(data: Optional[str]) -> Optional[str]:
    """Encrypts string data (like an email address). Returns base64 encoded string or None."""
    if not fernet_instance or not data:
        if not fernet_instance: logger.warning("Encryption skipped: Fernet not initialized.")
        # Return original data ONLY if encryption is off? Or always None/error on failure?
        # Returning None on failure or if key missing is safer.
        return None if fernet_instance else data
    try:
        encrypted_data = fernet_instance.encrypt(data.encode())
        return encrypted_data.decode() # Return as base64 string
    except Exception as e:
        logger.error(f"Failed to encrypt data: {e}", exc_info=True)
        return None # Indicate encryption failure

def decrypt_data(encrypted_data: Optional[str]) -> Optional[str]:
    """Decrypts string data (like an encrypted email address). Returns original string or None."""
    if not fernet_instance or not encrypted_data:
        if not fernet_instance: logger.warning("Decryption skipped: Fernet not initialized.")
        return None # Cannot decrypt if no key or no data
    try:
        # Ensure data is bytes
        encrypted_bytes = encrypted_data.encode()
        decrypted_data_bytes = fernet_instance.decrypt(encrypted_bytes)
        return decrypted_data_bytes.decode()
    except InvalidToken:
        logger.error("Failed to decrypt data: Invalid token or key mismatch.")
        return None
    except Exception as e:
        logger.error(f"Failed to decrypt data: {e}", exc_info=True)
        return None