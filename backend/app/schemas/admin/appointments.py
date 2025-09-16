from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PsychologistResponse(BaseModel):
    id: int
    name: str
    specialization: Optional[str]
    image_url: Optional[str]
    is_available: bool

    model_config = {
        "from_attributes": True,
    }


class AppointmentResponse(BaseModel):
    id: int
    user_id: int
    psychologist_id: int
    appointment_type_id: int
    appointment_datetime: datetime
    notes: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class AppointmentUpdate(BaseModel):
    appointment_datetime: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class TherapistScheduleResponse(BaseModel):
    id: int
    therapist_id: int
    day_of_week: str
    start_time: str
    end_time: str
    timezone: str

    model_config = {
        "from_attributes": True,
    }


class TherapistScheduleCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    timezone: str


class TherapistScheduleUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: Optional[str] = None
