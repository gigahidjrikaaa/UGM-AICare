import logging
import os
from datetime import datetime
from typing import Optional

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.utils.security_utils import encrypt_data
from app.services.user_service import async_get_user_by_plain_email

logger = logging.getLogger(__name__)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def _password_matches(password: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    try:
        return _pwd_context.verify(password, hashed)
    except Exception:
        return False


def _maybe_encrypt(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    encrypted = encrypt_data(value)
    if encrypted is None:
        logger.error("Failed to encrypt value for admin bootstrap; aborting creation.")
        raise ValueError("Failed to encrypt admin credential")
    return encrypted


async def ensure_default_admin(db: AsyncSession) -> None:
    """Ensure the default admin account exists and matches configured credentials."""
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        logger.warning("ADMIN_EMAIL or ADMIN_PASSWORD not set; skipping default admin bootstrap.")
        return

    try:
        encrypted_email = _maybe_encrypt(admin_email)
    except ValueError:
        return

    stmt = select(User).where(User.email == encrypted_email)
    result = await db.execute(stmt)
    admin_user = result.scalar_one_or_none()

    if admin_user is None:
        admin_user = await async_get_user_by_plain_email(db, admin_email)

    password_hash = _hash_password(admin_password)

    if admin_user is None:
        admin_user = User(
            email=encrypted_email,
            password_hash=password_hash,
            role="admin",
            is_active=True,
            email_verified=True,
            name=_maybe_encrypt("Administrator"),
            created_at=datetime.utcnow(),
            last_login=None,
        )
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)
        logger.info("Default admin user created from environment configuration.")
        return

    updates_made = False

    if not _password_matches(admin_password, admin_user.password_hash):
        admin_user.password_hash = password_hash
        updates_made = True

    if admin_user.role != "admin":
        admin_user.role = "admin"
        updates_made = True

    if not admin_user.is_active:
        admin_user.is_active = True
        updates_made = True

    if not admin_user.email_verified:
        admin_user.email_verified = True
        updates_made = True

    if updates_made:
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)
        logger.info("Default admin user updated to match environment configuration.")
    else:
        logger.info("Default admin user already matches environment configuration.")






