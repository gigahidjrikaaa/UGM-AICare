from datetime import date
from typing import Optional

from pydantic import BaseModel


class AppointmentSummary(BaseModel):
    date_from: date
    date_to: date
    total: int
    completed: int
    cancelled: int
    today_total: int


class FeedbackSummary(BaseModel):
    window_days: int
    count: int
    avg_nps: Optional[float] = None
    avg_felt_understood: Optional[float] = None
