"""Analytics and reporting models."""

from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from datetime import datetime

class AnalyticsReport(Base):
    """System analytics and insights reports."""
    __tablename__ = "analytics_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    window_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    window_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    report_period: Mapped[str] = mapped_column(String(50), nullable=False)
    insights: Mapped[dict] = mapped_column(JSON, nullable=False)
    trends: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    baseline_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    resource_engagement: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    intervention_outcomes: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    topic_excerpts: Mapped[Optional[list[dict]]] = mapped_column(JSON, nullable=True)
    intervention_triggers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)