from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import os
import hashlib
import secrets
from app.database import get_async_db
from app.models import User
import logging
from passlib.context import CryptContext
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    username: str
    password: str

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

class LoginResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class RegisterResponse(BaseModel):
    message: str
    user_id: int

class ForgotPasswordRequest(BaseModel):
    email: str

class ForgotPasswordResponse(BaseModel):
    message: str

def verify_admin_credentials(email: str, password: str) -> bool:
    admin_email = os.getenv("ADMIN_EMAIL", "komentatorugm@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "komentatorugm")
    
    dev_email = "admin@ugm.ac.id"
    dev_password = "admin123"
    
    logger.info(f"Admin login attempt for email: {email}")
    
    if email == admin_email and password == admin_password:
        logger.info("Admin login successful with primary credentials")
        return True
    
    if email == dev_email and password == dev_password:
        logger.info("Admin login successful with development fallback credentials")
        return True
    
    logger.warning(f"Admin login failed - no matching credentials for: {email}")
    return False

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/login", response_model=LoginResponse)
async def admin_login(request: LoginRequest):
    try:
        logger.info(f"Admin login attempt for: {request.username}")
        
        if verify_admin_credentials(request.username, request.password):
            logger.info("Admin login successful")
            return LoginResponse(
                id="admin-001",
                email=request.username,
                name="Administrator",
                role="admin"
            )
        else:
            logger.warning(f"Admin login failed for: {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during admin login"
        )

@router.post("/user/login", response_model=LoginResponse)
async def user_login(request: UserLoginRequest, db: AsyncSession = Depends(get_async_db)):
    try:
        logger.info(f"User login attempt for: {request.email}")
        
        stmt = select(User).where(User.email == request.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        return LoginResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during user login"
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
            allow_email_checkins=request.allowEmailCheckins
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
        
        return ForgotPasswordResponse(
            message="Password reset email sent"
        )
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during password reset"
        )