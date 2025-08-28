import os
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.database import get_async_db
from app.models import User
import logging
from passlib.context import CryptContext
from datetime import datetime
from app.auth_utils import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter()

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

class ForgotPasswordResponse(BaseModel):
    message: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/token", response_model=Token)
async def login_for_access_token(request: UserLoginRequest, db: AsyncSession = Depends(get_async_db)):
    logger.info(f"Checking for dev credentials. ALLOW_DEV_CREDENTIALS='{os.getenv('ALLOW_DEV_CREDENTIALS')}'")
    # Dev-only hardcoded admin credentials
    if os.getenv("ALLOW_DEV_CREDENTIALS") == "true":
        if request.email == "admin@ugm.ac.id" and request.password == "admin123":
            logger.warning("Performing login using hardcoded development credentials.")
            access_token = create_access_token(
                data={"sub": "dev-admin-001", "role": "admin"}
            )
            return {
                "access_token": access_token, 
                "token_type": "bearer",
                "user": {
                    "id": "dev-admin-001",
                    "email": "admin@ugm.ac.id",
                    "name": "Development Admin",
                    "role": "admin"
                }
            }

    try:
        logger.info(f"Login attempt for: {request.email}")
        
        stmt = select(User).where(User.email == request.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(request.password, user.password_hash):
            logger.warning(f"Authentication failed for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role}
        )
        
        logger.info(f"Login successful for user: {user.email}, role: {user.role}")
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for {request.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login",
        )

@router.post("/register", response_model=RegisterResponse)
async def register_user(request: RegisterRequest, db: AsyncSession = Depends(get_async_db)):
    try:
        logger.info(f"User registration attempt for: {request.email}")
        
        stmt = select(User).where(User.email == request.email)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        hashed_password = get_password_hash(request.password)
        
        date_of_birth = None
        if request.dateOfBirth:
            try:
                date_of_birth = datetime.strptime(request.dateOfBirth, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format for dateOfBirth. Please use YYYY-MM-DD."
                )
        
        new_user = User(
            name=request.name,
            email=request.email,
            password_hash=hashed_password,
            first_name=request.firstName,
            last_name=request.lastName,
            phone=request.phone,
            date_of_birth=date_of_birth,
            gender=request.gender,
            city=request.city,
            university=request.university,
            major=request.major,
            year_of_study=request.yearOfStudy,
            allow_email_checkins=request.allowEmailCheckins,
            role='user' # Default role
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return RegisterResponse(
            message="User registered successfully",
            user_id=new_user.id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during user registration"
        )

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(request: ForgotPasswordRequest):
    try:
        logger.info(f"Password reset request for: {request.email}")
        
        # This should contain logic to send a password reset email
        # For now, it's a placeholder
        
        return ForgotPasswordResponse(
            message="If an account with this email exists, a password reset link has been sent."
        )
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during password reset"
        )
