# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

#? --- Link DID Schemas ---
class LinkDIDRequest(BaseModel):
    wallet_address: str

#? --- Pydantic Model for Earned Badge Response ---
class EarnedBadgeInfo(BaseModel):
    badge_id: int
    awarded_at: datetime
    transaction_hash: str
    contract_address: str
    # You can add more fields here later if needed, e.g., fetching metadata from DB/IPFS
    name: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True # or orm_mode = True for Pydantic v2

#? --- Pydantic Model for User Profile Response ---
class UserProfileResponse(BaseModel):
    id: int
    google_sub: str
    email: Optional[str] = None # Encrypted email, can be decrypted if needed
    wallet_address: str | None = None
    current_streak: int = 0 # Current streak count. At least 1 day of activity is needed to count as a streak.
    longest_streak: int = 0 # Longest streak count. At least 1 day of activity is needed to count as a streak.
    allow_email_checkins: bool = True # Whether user wants email check-ins

    class Config:
        from_attributes = True # Or orm_mode = True for Pydantic v2
    
#? --- Pydantic Model for Check-in Settings ---
# Check-in settings model for updating user preferences
class CheckinSettingsUpdate(BaseModel):
    allow_email_checkins: bool

class CheckinSettingsResponse(BaseModel):
    allow_email_checkins: bool
    message: str = "Settings updated successfully"

#? --- Pydantic Model for Email Payload ---
# Email payload model for sending test emails
class TestEmailPayload(BaseModel):
    recipient_email: EmailStr
    subject: str = "UGM-AICare Test Email"
    message: str = "This is a test message from the UGM-AICare email utility."

#? --- Pydantic Model for Sync Achievements Response in profile.py ---
class SyncAchievementsResponse(BaseModel):
    message: str
    newly_awarded_badges: List[EarnedBadgeInfo] = [] # Return info about newly minted badges