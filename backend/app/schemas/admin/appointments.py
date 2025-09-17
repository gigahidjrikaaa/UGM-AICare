from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AppointmentUser(BaseModel):
    id: int
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PsychologistResponse(BaseModel):
    id: int
    name: str
    specialization: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool

    model_config = ConfigDict(from_attributes=True)


class AppointmentResponse(BaseModel):
    id: int
    user: AppointmentUser
    psychologist: PsychologistResponse
    appointment_type: Optional[str] = None
    appointment_datetime: datetime
    notes: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AppointmentUpdate(BaseModel):
    status: str


class TherapistScheduleResponse(BaseModel):
    id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TherapistScheduleCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool = True
    reason: Optional[str] = None


class TherapistScheduleUpdate(BaseModel):
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_available: Optional[bool] = None
    reason: Optional[str] = None
