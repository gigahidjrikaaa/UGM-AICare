# backend/app/routes/email.py 

from fastapi import APIRouter, Depends, HTTPException, status, Body # type: ignore
from pydantic import BaseModel, EmailStr # Keep for potential test endpoint
from typing import List, Optional
from sqlalchemy.orm import Session
import logging

from app.utils.email_utils import send_email
from app.database import get_db

logger = logging.getLogger(__name__)

# Configure router (prefix might change if you move files)
# Keep the /email prefix for now, maybe for future simple email tasks or testing
router = APIRouter(prefix="/api/v1/email", tags=["Email Utility"])

# --- OPTIONAL: Add a Simple Test Endpoint ---
# This can be useful during development to test if your SMTP settings in .env
# and the send_email utility function are working correctly, without needing
# the scheduler or other complex logic to run. Remove if not needed.

class TestEmailPayload(BaseModel):
    recipient_email: EmailStr
    subject: str = "UGM-AICare Test Email"
    message: str = "This is a test message from the UGM-AICare email utility."

@router.post("/test-send", status_code=status.HTTP_200_OK)
async def send_test_email(
    payload: TestEmailPayload = Body(...),
    # Optional: Protect this test endpoint if desired
    # current_user: User = Depends(get_current_active_user)
):
    """Sends a simple test email to the specified recipient."""
    logger.info(f"Received request to send test email to: {payload.recipient_email}")

    # Construct simple HTML body
    html_body = f"""
    <html><body>
    <p>Halo, kawan!</p>
    <p>{payload.message}</p>
    <p>With love,<br/>Aika <3</p>
    </body></html>
    """

    # Call the centralized utility function
    success = send_email(
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        html_content=html_body
    )

    if success:
        return {"message": f"Test email sent successfully to {payload.recipient_email} (check spam folder too)."}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test email. Check backend logs and SMTP configuration in .env."
        )

# --- End Optional Test Endpoint ---

# You can add other simple, direct email-related endpoints here in the future if needed.