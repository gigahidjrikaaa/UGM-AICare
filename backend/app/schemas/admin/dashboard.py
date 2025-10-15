from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


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


class DashboardKPIs(BaseModel):
    active_critical_cases: int = 0
    overall_sentiment: Optional[float] = Field(default=None, description="Average user sentiment score in window")
    sentiment_delta: Optional[float] = Field(default=None, description="Change vs prior window; positive is up")
    appointments_this_week: int = 0


class TrendingTopic(BaseModel):
    topic: str
    count: int


class AlertItem(BaseModel):
    case_id: str
    severity: str
    created_at: datetime
    session_id: Optional[str] = None
    user_hash: str
    summary: Optional[str] = None


class InsightsPanel(BaseModel):
    trending_topics: List[TrendingTopic] = Field(default_factory=list)
    ia_summary: str = ""


class DashboardOverview(BaseModel):
    kpis: DashboardKPIs
    insights: InsightsPanel
    alerts: List[AlertItem] = Field(default_factory=list)

