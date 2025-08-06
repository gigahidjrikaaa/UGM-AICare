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

logger = logging.getLogger(__name__)

router = APIRouter()

class LoginRequest(BaseModel):
    username: str  # This is actually email, but frontend sends as username
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
    """Verify admin credentials against environment variables and development fallbacks"""
    admin_email = os.getenv("ADMIN_EMAIL", "komentatorugm@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "komentatorugm")
    
    # Development fallback credentials (should be removed in production)
    dev_email = "admin@ugm.ac.id"
    dev_password = "admin123"
    
    logger.info(f"Admin login attempt for email: {email}")
    logger.info(f"Expected admin email: {admin_email}")
    logger.info(f"Development mode fallback available: {dev_email}")
    
    # Check primary admin credentials
    if email == admin_email and password == admin_password:
        logger.info("Admin login successful with primary credentials")
        return True
    
    # Check development fallback credentials (for development only)
    if email == dev_email and password == dev_password:
        logger.info("Admin login successful with development fallback credentials")
        return True
    
    logger.warning(f"Admin login failed - no matching credentials for: {email}")
    return False

def hash_password(password: str) -> str:
    """Simple password hashing - in production, use bcrypt or similar"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/login", response_model=LoginResponse)
async def admin_login(request: LoginRequest):
    """
    Admin login endpoint for NextAuth admin-login provider
    """
    try:
        logger.info(f"Admin login attempt for: {request.username}")
        
        if verify_admin_credentials(request.username, request.password):
            logger.info("Admin login successful")
            return LoginResponse(
                id="admin-001",  # Static admin ID
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
    """
    Regular user login endpoint for NextAuth credentials provider
    """
    try:
        logger.info(f"User login attempt for: {request.email}")
        
        # For now, return a placeholder response since user auth isn't fully implemented
        # In production, you would:
        # 1. Verify user credentials against database
        # stmt = select(User).where(User.email == request.email)
        # result = await db.execute(stmt)
        # user = result.scalar_one_or_none()
        # 2. Check password hash
        # 3. Return user data
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="User login not yet implemented"
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
    """
    User registration endpoint
    """
    try:
        logger.info(f"User registration attempt for: {request.email}")
        
        # For now, return a placeholder response since user registration isn't fully implemented
        # In production, you would:
        # 1. Validate email format and password strength
        # 2. Check if user already exists
        # stmt = select(User).where(User.email == request.email)
        # result = await db.execute(stmt)
        # existing_user = result.scalar_one_or_none()
        # 3. Hash password
        # 4. Create user in database
        # new_user = User(...)
        # db.add(new_user)
        # await db.commit()
        # 5. Send verification email
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="User registration not yet implemented"
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
    """
    Password reset endpoint
    """
    try:
        logger.info(f"Password reset request for: {request.email}")
        
        # For now, return a placeholder response since password reset isn't fully implemented
        # In production, you would:
        # 1. Validate email exists in database
        # 2. Generate reset token
        # 3. Store token with expiration
        # 4. Send reset email
        
        return ForgotPasswordResponse(
            message="Password reset email sent"
        )
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during password reset"
        )
