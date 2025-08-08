# backend/app/schemas/appointments.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

#? --- Psychology Appointment Schemas ---

# --- Psychologist Schemas ---
class PsychologistBase(BaseModel):
    name: str
    specialization: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True

class PsychologistCreate(PsychologistBase):
    pass

class Psychologist(PsychologistBase):
    id: int

    class Config:
        from_attributes = True

# --- AppointmentType Schemas ---
class AppointmentTypeBase(BaseModel):
    name: str
    duration_minutes: int
    description: Optional[str] = None

class AppointmentTypeCreate(AppointmentTypeBase):
    pass

class AppointmentType(AppointmentTypeBase):
    id: int

    class Config:
        from_attributes = True

# --- Appointment Schemas ---
class AppointmentBase(BaseModel):
    psychologist_id: int
    appointment_type_id: int
    appointment_datetime: datetime
    notes: Optional[str] = None
    status: str = "scheduled"

class AppointmentCreate(AppointmentBase):
    user_identifier: str # google_sub

class AppointmentUpdate(BaseModel):
    appointment_datetime: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class Appointment(AppointmentBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    psychologist: Psychologist
    appointment_type: AppointmentType

    class Config:
        from_attributes = True