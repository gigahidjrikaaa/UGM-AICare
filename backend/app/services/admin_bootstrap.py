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
    admin_email = os.getenv("ADMIN_EMAIL")

    if not admin_email:
        logger.warning("ADMIN_EMAIL not set; cannot check for existing admin user.")
        return

    # Check if admin account already exists by role
    stmt_existing_role = select(User).where(User.role == "admin").limit(1)
    result_existing_role = await db.execute(stmt_existing_role)
    existing_admin_by_role = result_existing_role.scalar_one_or_none()

    # Check if account already exists with this email (regardless of role)
    encrypted_email = _maybe_encrypt(admin_email)
    if encrypted_email:
        stmt_existing_email = select(User).where(User.email == encrypted_email).limit(1)
        result_existing_email = await db.execute(stmt_existing_email)
        existing_admin_by_email = result_existing_email.scalar_one_or_none()
    else:
        existing_admin_by_email = None

    if existing_admin_by_role or existing_admin_by_email:
        logger.info("Admin account already present (by role or email); skipping bootstrap.")
        return

    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_password:
        logger.warning("ADMIN_PASSWORD not set; cannot create default admin user.")
        return

    try:
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


async def ensure_default_counselor(db: AsyncSession) -> None:
    """Ensure at least one counselor account exists; bootstrap from env if missing."""
    counselor_email = os.getenv("COUNSELOR_EMAIL")

    if not counselor_email:
        logger.warning("COUNSELOR_EMAIL not set; cannot check for existing counselor user.")
        return

    # Check if counselor account already exists by role
    stmt_existing_role = select(User).where(User.role == "counselor").limit(1)
    result_existing_role = await db.execute(stmt_existing_role)
    existing_counselor_by_role = result_existing_role.scalar_one_or_none()

    # Check if account already exists with this email (regardless of role)
    encrypted_email = _maybe_encrypt(counselor_email)
    if encrypted_email:
        stmt_existing_email = select(User).where(User.email == encrypted_email).limit(1)
        result_existing_email = await db.execute(stmt_existing_email)
        existing_counselor_by_email = result_existing_email.scalar_one_or_none()
    else:
        existing_counselor_by_email = None

    if existing_counselor_by_role or existing_counselor_by_email:
        logger.info("Counselor account already present (by role or email); skipping bootstrap.")
        return

    counselor_password = os.getenv("COUNSELOR_PASSWORD")
    counselor_name = os.getenv("COUNSELOR_NAME", "Default Counselor")

    if not counselor_password:
        logger.warning("COUNSELOR_PASSWORD not set; cannot create default counselor user.")
        return

    try:
        encrypted_name = _maybe_encrypt(counselor_name)
    except ValueError:
        return

    password_hash = _hash_password(counselor_password)

    counselor_user = User(
        email=encrypted_email,
        password_hash=password_hash,
        role="counselor",
        is_active=True,
        email_verified=True,
        name=encrypted_name,
        created_at=datetime.utcnow(),
        last_login=None,
    )

    db.add(counselor_user)
    try:
        await db.commit()
        await db.refresh(counselor_user)
        logger.info("Default counselor user created from environment configuration.")
    except Exception as exc:
        await db.rollback()
        logger.error(f"Failed to create default counselor user: {exc}")
