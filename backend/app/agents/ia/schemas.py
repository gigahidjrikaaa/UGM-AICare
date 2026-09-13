from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

QuestionId = Literal[
    "crisis_trend",
    "dropoffs",
    "resource_reuse",
    "fallback_reduction",
    "cost_per_helpful",
    "coverage_windows",
    "topic_analysis",
    "sentiment_trends",
    "intervention_latency",
]


class IAQueryParams(BaseModel):
    start: datetime = Field(..., alias="from")
    end: datetime = Field(..., alias="to")


class IAQueryRequest(BaseModel):
    question_id: QuestionId
    params: IAQueryParams


class DPMetadata(BaseModel):
    """Differential privacy metadata attached to a privatized response."""

    dp_enabled: bool = Field(
        False,
        description="Whether differential privacy noise was applied to this response",
    )
    mechanism: str = Field(
        "laplace",
        description="DP mechanism used (pure epsilon-DP via the Laplace mechanism)",
    )
    epsilon_spent: float = Field(
        0.0,
        description="Epsilon spent by this query execution (0 when DP is disabled)",
    )
    delta: float = Field(
        0.0,
        description="Delta of the guarantee (0.0: pure epsilon-DP via Laplace)",
    )
    statistics_noised: int = Field(
        0,
        description="Number of raw statistics that received Laplace noise",
    )
    budget_remaining: Optional[float] = Field(
        None,
        description="Epsilon remaining in the current rolling budget window",
    )


class IAQueryResponse(BaseModel):
    """Response model for Insights Agent queries.

    Includes both raw analytics data and LLM-generated insights.
    """
    # Raw analytics data (Phase 1 - always present)
    chart: dict[str, Any]
    table: list[dict[str, Any]]
    notes: list[str] = Field(default_factory=list)

    # Differential privacy metadata (present whenever the query service ran)
    privacy_metadata: Optional[DPMetadata] = Field(
        None,
        description="Differential privacy enforcement details for this response",
    )

    # LLM-generated insights (Phase 2 - optional for backward compatibility)
    interpretation: Optional[str] = Field(
        None,
        description="Natural language interpretation of analytics results"
    )
    trends: Optional[list[dict[str, Any]]] = Field(
        None,
        description="Identified patterns and trends in the data"
    )
    summary: Optional[str] = Field(
        None,
        description="Executive summary of key findings"
    )
    recommendations: Optional[list[dict[str, Any]]] = Field(
        None,
        description="Actionable recommendations for administrators"
    )
    pdf_url: Optional[str] = Field(
        None,
        description="URL to downloadable PDF report"
    )
