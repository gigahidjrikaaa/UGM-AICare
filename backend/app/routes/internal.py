# backend/app/routes/internal.py (New or existing file)

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Security, status # type: ignore
from fastapi.security import APIKeyHeader # type: ignore
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import UserInternalResponse
from app.models import User
import os

router = APIRouter(prefix="/api/v1/internal", tags=["Internal"])

# --- Security Setup ---
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY") # Set this in your .env!
if not INTERNAL_API_KEY:
    print("WARNING: INTERNAL_API_KEY is not set. Internal endpoints are insecure.")

api_key_header = APIKeyHeader(name="X-Internal-API-Key", auto_error=False)

async def get_api_key(api_key: str = Security(api_key_header)):
    if not INTERNAL_API_KEY: # Allow access if key is not set (for local dev maybe)
        print("Allowing access to internal API without key (INTERNAL_API_KEY not set)")
        return "dummy_key_allowed"
    if api_key == INTERNAL_API_KEY:
        return api_key
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing Internal API Key"
        )
# --- End Security Setup ---

@router.get("/user-by-sub/{google_sub}", response_model=UserInternalResponse, dependencies=[Security(get_api_key)])
async def get_user_by_google_sub(google_sub: str, db: Session = Depends(get_db)):
    """
    Internal endpoint to fetch user details by Google SUB ID.
    Requires X-Internal-API-Key header.
    """
    print(f"Internal API: Fetching user by sub: {google_sub}") # Add logging
    db_user = db.query(User).filter(User.google_sub == google_sub).first()
    if not db_user:
        print(f"Internal API: User not found for sub: {google_sub}")
        raise HTTPException(status_code=404, detail="User not found")

    # You might need to map the DB role to the role string expected by the frontend/NextAuth
    # For now, assuming role is handled in NextAuth or add it to User model if needed
    return UserInternalResponse(
        id=db_user.id,
        google_sub=db_user.google_sub,
        email=db_user.email,
        wallet_address=db_user.wallet_address,
        role=None # Or fetch/map role if stored in DB user
    )