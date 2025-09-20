import logging
import os
from datetime import datetime

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.utils.security_utils import encrypt_data

logger = logging.getLogger(__name__)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def _maybe_encrypt(value: str | None) -> str | None:
    if value is None:
        return None
    encrypted = encrypt_data(value)
    if encrypted is None:
        logger.error("Failed to encrypt value for admin bootstrap; aborting creation.")
        raise ValueError("Failed to encrypt admin credential")
    return encrypted


async def ensure_default_admin(db: AsyncSession) -> None:
    """Ensure at least one admin account exists; bootstrap from env if missing."""
    stmt_existing = select(User).where(User.role == "admin").limit(1)
    result_existing = await db.execute(stmt_existing)
    existing_admin = result_existing.scalar_one_or_none()
    if existing_admin:
        logger.info("Admin account already present; skipping bootstrap.")
        return

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        logger.warning("ADMIN_EMAIL or ADMIN_PASSWORD not set; cannot create default admin user.")
        return

    try:
        encrypted_email = _maybe_encrypt(admin_email)
        encrypted_name = _maybe_encrypt("Administrator")
    except ValueError:
        return

    password_hash = _hash_password(admin_password)

    admin_user = User(
        email=encrypted_email,
        password_hash=password_hash,
        role="admin",
        is_active=True,
        email_verified=True,
        name=encrypted_name,
        created_at=datetime.utcnow(),
        last_login=None,
    )

    db.add(admin_user)
    try:
        await db.commit()
        await db.refresh(admin_user)
        logger.info("Default admin user created from environment configuration.")
    except Exception as exc:
        await db.rollback()
        logger.error(f"Failed to create default admin user: {exc}")
