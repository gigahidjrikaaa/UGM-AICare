from datetime import date, datetime
from typing import Dict, List, Optional

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
    """Key Performance Indicators for admin dashboard."""
    active_critical_cases: int = 0
    overall_sentiment: Optional[float] = Field(default=None, description="Average user sentiment score in window")
    sentiment_delta: Optional[float] = Field(default=None, description="Change vs prior window; positive is up")
    appointments_this_week: int = 0
    cases_opened_this_week: int = Field(default=0, description="New cases created this week")
    cases_closed_this_week: int = Field(default=0, description="Cases resolved this week")
    avg_case_resolution_time: Optional[float] = Field(default=None, description="Average time to resolve cases (hours)")
    sla_breach_count: int = Field(default=0, description="Number of cases that breached SLA")
    active_campaigns_count: int = Field(default=0, description="Number of active outreach campaigns")


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
    """Insights panel with IA-generated reports and trending topics."""
    trending_topics: List[TrendingTopic] = Field(default_factory=list)
    ia_summary: str = ""
    report_generated_at: Optional[datetime] = Field(default=None, description="When the IA report was generated")
    report_period: Optional[str] = Field(default=None, description="Time period covered by the report")


class DashboardOverview(BaseModel):
    kpis: DashboardKPIs
    insights: InsightsPanel
    alerts: List[AlertItem] = Field(default_factory=list)


class HistoricalDataPoint(BaseModel):
    """A single data point in a time series."""
    date: date
    value: Optional[float] = None  # Can be None if no data for that period


class TrendsResponse(BaseModel):
    """Historical trends data for dashboard charts."""
    sentiment_trend: List[HistoricalDataPoint] = Field(description="Sentiment score over time")
    cases_opened_trend: List[HistoricalDataPoint] = Field(description="Cases opened over time")
    cases_closed_trend: List[HistoricalDataPoint] = Field(description="Cases closed over time")
    topic_trends: Dict[str, List[HistoricalDataPoint]] = Field(
        default_factory=dict,
        description="Topic frequency over time (topic name -> data points)"
    )
    time_range_days: int = Field(description="Number of days covered")
    bucket_size_days: int = Field(description="Size of each time bucket in days")
