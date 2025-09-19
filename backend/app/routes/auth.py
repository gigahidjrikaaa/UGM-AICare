import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_utils import create_access_token
from app.database import get_async_db
from app.models import User
from app.services.user_service import async_get_user_by_plain_email
from app.utils.security_utils import encrypt_data, decrypt_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class UserLoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    yearOfStudy: Optional[str] = None
    allowEmailCheckins: Optional[bool] = None


class RegisterResponse(BaseModel):
    message: str
    user_id: int


class ForgotPasswordRequest(BaseModel):
    email: str


class OAuthTokenRequest(BaseModel):
    provider: str
    provider_account_id: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None
    role: str | None = None


class ForgotPasswordResponse(BaseModel):
    message: str


def normalize_oauth_role(email: Optional[str], requested_role: Optional[str]) -> str:
    """Restrict accepted roles for OAuth sign-ins."""
    if requested_role in {"user", "guest"}:
        return requested_role
    if email and email.lower().endswith("@ugm.ac.id"):
        return "user"
    return "guest"


def serialize_user(
    user: User,
    *,
    fallback_email: Optional[str] = None,
    fallback_name: Optional[str] = None,
) -> dict:
    """Return a safe representation of the user for API responses."""
    decrypted_email = decrypt_data(user.email) if user.email else None
    decrypted_name = decrypt_data(user.name) if user.name else None

    return {
        "id": str(user.id),
        "email": decrypted_email or fallback_email,
        "name": decrypted_name or fallback_name,
        "role": user.role,
        "google_sub": user.google_sub,
        "allow_email_checkins": user.allow_email_checkins,
    }


def build_token_payload(user: User) -> dict[str, str]:
    payload: dict[str, str] = {"sub": str(user.id), "role": user.role}
    if user.google_sub:
        payload["google_sub"] = user.google_sub
    return payload


@router.post("/oauth/token", response_model=Token)
async def exchange_oauth_token(
    payload: OAuthTokenRequest,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Upsert a user coming from an OAuth provider and issue an internal token."""
    if payload.provider.lower() != "google":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported OAuth provider",
        )

    provider_account_id = payload.provider_account_id
    if not provider_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing provider account id",
        )

    encrypted_email = encrypt_data(payload.email) if payload.email else None

    stmt = select(User).where(User.google_sub == provider_account_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user and encrypted_email:
        stmt = select(User).where(User.email == encrypted_email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

    try:
        if user is None:
            role = normalize_oauth_role(payload.email, payload.role)
            user = User(
                google_sub=provider_account_id,
                email=encrypted_email,
                name=encrypt_data(payload.name) if payload.name else None,
                role=role,
                is_active=True,
                email_verified=True,
                created_at=datetime.utcnow(),
            )
            db.add(user)
        else:
            updated = False
            if user.google_sub != provider_account_id:
                user.google_sub = provider_account_id
                updated = True
            if encrypted_email and user.email != encrypted_email:
                user.email = encrypted_email
                updated = True
            if payload.name:
                enc_name = encrypt_data(payload.name)
                if enc_name and user.name != enc_name:
                    user.name = enc_name
                    updated = True
            if not user.is_active:
                user.is_active = True
                updated = True
            if not user.email_verified:
                user.email_verified = True
                updated = True
            if updated:
                db.add(user)

        user.last_login = datetime.utcnow()
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to exchange OAuth token for %s", provider_account_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during OAuth sign-in",
        ) from exc

    access_token = create_access_token(build_token_payload(user))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(
            user,
            fallback_email=payload.email,
            fallback_name=payload.name,
        ),
    }


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    return bool(hashed_password and pwd_context.verify(plain_password, hashed_password))


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


@router.post("/token", response_model=Token)
async def login_for_access_token(
    request: UserLoginRequest,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    logger.info("Login attempt for: %s", request.email)

    encrypted_email = encrypt_data(request.email)
    if not encrypted_email:
        logger.error("Login error for %s: Failed to encrypt email.", request.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login",
        )

    stmt = select(User).where(User.email == encrypted_email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        user = await async_get_user_by_plain_email(db, request.email)

    if (
        not user
        or not user.password_hash
        or not verify_password(request.password, user.password_hash)
    ):
        logger.warning("Authentication failed for: %s", request.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        logger.warning("Inactive account attempted login: %s", request.email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    user.last_login = datetime.utcnow()
    db.add(user)

    try:
        await db.commit()
        await db.refresh(user)
    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to finalize login for %s", request.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login",
        ) from exc

    access_token = create_access_token(build_token_payload(user))

    logger.info("Login successful for user: %s, role: %s", user.email, user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user, fallback_email=request.email),
    }


@router.post("/register", response_model=RegisterResponse)
async def register_user(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    try:
        logger.info("User registration attempt for: %s", request.email)

        encrypted_email = encrypt_data(request.email)
        if not encrypted_email:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not process email.",
            )

        stmt = select(User).where(User.email == encrypted_email)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        hashed_password = get_password_hash(request.password)

        date_of_birth = None
        if request.dateOfBirth:
            try:
                date_of_birth = datetime.strptime(request.dateOfBirth, "%Y-%m-%d").date()
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format for dateOfBirth. Please use YYYY-MM-DD.",
                ) from exc

        new_user = User(
            name=encrypt_data(request.name),
            email=encrypted_email,
            password_hash=hashed_password,
            first_name=encrypt_data(request.firstName) if request.firstName else None,
            last_name=encrypt_data(request.lastName) if request.lastName else None,
            phone=encrypt_data(request.phone) if request.phone else None,
            date_of_birth=date_of_birth,
            gender=encrypt_data(request.gender) if request.gender else None,
            city=encrypt_data(request.city) if request.city else None,
            university=encrypt_data(request.university) if request.university else None,
            major=encrypt_data(request.major) if request.major else None,
            year_of_study=request.yearOfStudy,
            allow_email_checkins=request.allowEmailCheckins,
            role="user",
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return {
            "message": "User registered successfully",
            "user_id": new_user.id,
        }
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        logger.error("User registration error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during user registration",
        ) from exc


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(request: ForgotPasswordRequest) -> ForgotPasswordResponse:
    try:
        logger.info("Password reset request for: %s", request.email)

        # TODO: Implement password reset email dispatch
        return ForgotPasswordResponse(
            message="If an account with this email exists, a password reset link has been sent."
        )
    except Exception as exc:
        logger.error("Password reset error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during password reset",
        ) from exc


