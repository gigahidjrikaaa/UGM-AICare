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
    total_feedback: int
    positive_feedback: int
    neutral_feedback: int
    negative_feedback: int
    avg_ratings: float
    todays_feedback: int
