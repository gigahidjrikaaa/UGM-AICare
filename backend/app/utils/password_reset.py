"""Password reset utility functions."""

import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.utils.email_utils import send_email
from app.auth_utils import hash_password

logger = logging.getLogger(__name__)

def generate_reset_token() -> str:
    """Generate a secure random token for password reset."""
    return secrets.token_urlsafe(32)

def is_token_expired(expires_at: Optional[datetime]) -> bool:
    """Check if a password reset token has expired."""
    if not expires_at:
        return True
    return datetime.utcnow() > expires_at

async def create_password_reset_token(db: AsyncSession, email: str) -> bool:
    """
    Create a password reset token for a user.
    
    Args:
        db: Database session
        email: User's email address (plain text)
        
    Returns:
        bool: True if token was created and email sent, False otherwise
    """
    try:
        from app.utils.security_utils import encrypt_data
        
        # Encrypt the email to search for user (emails are stored encrypted)
        encrypted_email = encrypt_data(email)
        
        # Find user by encrypted email
        result = await db.execute(
            select(User).where(User.email == encrypted_email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if user exists or not
            logger.info(f"Password reset requested for non-existent email: {email}")
            return True  # Still return True for security
            
        # Generate reset token and expiration (1 hour from now)
        reset_token = generate_reset_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Update user with reset token
        user.password_reset_token = reset_token
        user.password_reset_expires = expires_at
        
        await db.commit()
        
        # Send password reset email
        reset_url = f"https://ugm-aicare.com/reset-password?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset - UGM AICare</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #001D58 0%, #003875 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #FFCA40; color: #001D58; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
                .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔒 Password Reset Request</h1>
                    <p>UGM AICare - Your Mental Health Companion</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    
                    <p>We received a request to reset your password for your UGM AICare account. If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset My Password</a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important Security Information:</strong>
                        <ul>
                            <li>This link will expire in 1 hour for your security</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                        {reset_url}
                    </p>
                    
                    <p>If you have any questions or concerns, please contact our support team.</p>
                    
                    <p>Stay safe,<br>
                    <strong>The UGM AICare Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message from UGM AICare - Please do not reply to this email</p>
                    <p>© 2025 Universitas Gadjah Mada - Mental Health Innovation Lab</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send the email
        email_sent = send_email(
            recipient_email=email,
            subject="🔒 Password Reset Request - UGM AICare",
            html_content=html_content
        )
        
        if email_sent:
            logger.info(f"Password reset email sent to: {email}")
        else:
            logger.error(f"Failed to send password reset email to: {email}")
            
        return email_sent
        
    except Exception as e:
        logger.error(f"Error creating password reset token for {email}: {e}")
        await db.rollback()
        return False

async def reset_password_with_token(
    db: AsyncSession, 
    token: str, 
    new_password: str
) -> dict:
    """
    Reset a user's password using a valid reset token.
    
    Args:
        db: Database session
        token: Password reset token
        new_password: New password to set
        
    Returns:
        dict: Result with success status and message
    """
    try:
        # Find user by reset token
        result = await db.execute(
            select(User).where(User.password_reset_token == token)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return {
                "success": False,
                "message": "Invalid or expired reset token"
            }
            
        # Check if token is expired
        if is_token_expired(user.password_reset_expires):
            # Clear expired token
            user.password_reset_token = None
            user.password_reset_expires = None
            await db.commit()
            
            return {
                "success": False,
                "message": "Reset token has expired. Please request a new one."
            }
            
        # Hash the new password
        hashed_password = hash_password(new_password)
        
        # Update user with new password and clear reset token
        user.password_hash = hashed_password
        user.password_reset_token = None
        user.password_reset_expires = None
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        logger.info(f"Password successfully reset for user ID: {user.id}")
        
        return {
            "success": True,
            "message": "Password has been successfully reset"
        }
        
    except Exception as e:
        logger.error(f"Error resetting password with token: {e}")
        await db.rollback()
        return {
            "success": False,
            "message": "An error occurred while resetting your password"
        }

async def cleanup_expired_tokens(db: AsyncSession) -> int:
    """
    Clean up expired password reset tokens.
    
    Args:
        db: Database session
        
    Returns:
        int: Number of tokens cleaned up
    """
    try:
        # Find users with expired tokens
        result = await db.execute(
            select(User).where(
                User.password_reset_expires < datetime.utcnow()
            )
        )
        users_with_expired_tokens = result.scalars().all()
        
        count = 0
        for user in users_with_expired_tokens:
            user.password_reset_token = None
            user.password_reset_expires = None
            count += 1
            
        await db.commit()
        
        if count > 0:
            logger.info(f"Cleaned up {count} expired password reset tokens")
            
        return count
        
    except Exception as e:
        logger.error(f"Error cleaning up expired tokens: {e}")
        await db.rollback()
        return 0