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
]


class IAQueryParams(BaseModel):
    start: datetime = Field(..., alias="from")
    end: datetime = Field(..., alias="to")


class IAQueryRequest(BaseModel):
    question_id: QuestionId
    params: IAQueryParams


class IAQueryResponse(BaseModel):
    chart: dict[str, Any]
    table: list[dict[str, Any]]
    notes: list[str] = Field(default_factory=list)
