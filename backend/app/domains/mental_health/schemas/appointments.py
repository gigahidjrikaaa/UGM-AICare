# backend/app/schemas/appointments.py
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, Optional, List
from datetime import datetime
from enum import Enum

#? --- Psychology Appointment Schemas ---

# --- Appointment Status Enum ---
class AppointmentStatus(str, Enum):
    """Valid appointment statuses."""
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    moved = "moved"
    no_show = "no_show"

# --- Counselor Schemas ---
class CounselorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    specialization: Optional[str] = Field(None, max_length=200)
    image_url: Optional[str] = Field(None, max_length=500)
    is_available: bool = True

class CounselorCreate(CounselorBase):
    pass

class CounselorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    specialization: Optional[str] = Field(None, max_length=200)
    image_url: Optional[str] = Field(None, max_length=500)
    is_available: Optional[bool] = None

class Counselor(CounselorBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class CounselorPublicProfile(BaseModel):
    """Student-facing counselor profile for the directory + detail page.

    Everything a student needs to choose (and trust) a counselor before
    booking. Deliberately excludes internal/admin fields: user linkage and
    availability_schedule internals.
    """
    id: int
    name: str
    specialization: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None
    languages: List[Any] = []
    consultation_fee: Optional[float] = None
    rating: float = 0.0
    total_reviews: int = 0
    education: List[Any] = []
    certifications: List[Any] = []

    model_config = ConfigDict(from_attributes=True)

    @field_validator("languages", "education", "certifications", mode="before")
    @classmethod
    def _empty_list_on_none(cls, value):
        return value if value is not None else []

    @field_validator("rating", mode="before")
    @classmethod
    def _default_rating(cls, value):
        return 0.0 if value is None else value

    @field_validator("total_reviews", mode="before")
    @classmethod
    def _default_total_reviews(cls, value):
        return 0 if value is None else value

# --- AppointmentType Schemas ---
class AppointmentTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    duration_minutes: int = Field(..., ge=15, le=480, description="Duration in minutes (15-480)")
    description: Optional[str] = Field(None, max_length=1000)

class AppointmentTypeCreate(AppointmentTypeBase):
    pass

class AppointmentTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    description: Optional[str] = Field(None, max_length=1000)

class AppointmentType(AppointmentTypeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- Simplified User Schema for Appointment Responses ---
class AppointmentUser(BaseModel):
    """Simplified user information for appointment responses."""
    id: int
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Appointment Schemas ---
class AppointmentBase(BaseModel):
    counselor_id: int = Field(..., gt=0)
    appointment_type_id: int = Field(..., gt=0)
    appointment_datetime: datetime = Field(..., description="ISO 8601 datetime for the appointment")
    notes: Optional[str] = Field(None, max_length=5000, description="Pre-appointment notes or additional information")
    status: AppointmentStatus = AppointmentStatus.scheduled

    @field_validator('appointment_datetime')
    @classmethod
    def validate_future_datetime(cls, v: datetime) -> datetime:
        """Ensure appointment is not in the past (with 5-minute grace period)."""
        from datetime import timedelta
        if v < datetime.now() - timedelta(minutes=5):
            raise ValueError('Appointment datetime cannot be in the past')
        return v

class AppointmentCreate(AppointmentBase):
    """Schema for creating a new appointment."""
    pass  # Will use current user from auth

class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment."""
    appointment_datetime: Optional[datetime] = Field(None, description="New datetime for the appointment")
    notes: Optional[str] = Field(None, max_length=5000)
    status: Optional[AppointmentStatus] = None

    @field_validator('appointment_datetime')
    @classmethod
    def validate_future_datetime(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Ensure new appointment time is not in the past."""
        if v is not None:
            from datetime import timedelta
            if v < datetime.now() - timedelta(minutes=5):
                raise ValueError('Appointment datetime cannot be in the past')
        return v

class AppointmentNotesUpdate(BaseModel):
    """Schema for updating only appointment notes (pre-appointment information)."""
    notes: str = Field(..., max_length=5000, description="Pre-appointment notes for the counselor")

class AppointmentStatusUpdate(BaseModel):
    """Schema for updating appointment status."""
    status: AppointmentStatus

class Appointment(AppointmentBase):
    """Full appointment response with all relationships."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    # Nested relationships
    counselor: Counselor
    appointment_type: AppointmentType

    model_config = ConfigDict(from_attributes=True)

class AppointmentWithUser(Appointment):
    """Appointment response including user information (for admin endpoints)."""
    user: AppointmentUser

    model_config = ConfigDict(from_attributes=True)

class AppointmentListResponse(BaseModel):
    """Paginated list of appointments."""
    total: int
    appointments: List[Appointment]
    page: int = 1
    page_size: int = 50

    model_config = ConfigDict(from_attributes=True)

# --- Statistics Schemas ---
class AppointmentStats(BaseModel):
    """Statistics about user appointments."""
    total_appointments: int
    upcoming_count: int
    completed_count: int
    cancelled_count: int
    moved_count: int
    no_show_count: int

class CounselorAvailability(BaseModel):
    """Counselor availability information."""
    counselor_id: int
    counselor_name: str
    is_available: bool
    total_appointments: int
    upcoming_appointments: int

    model_config = ConfigDict(from_attributes=True)