from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SCAInterveneRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    intent: str = Field(..., min_length=1)
    options: dict[str, int | str | float] = Field(default_factory=dict)
    consent_followup: Optional[bool] = None


class PlanStep(BaseModel):
    id: str
    label: str
    duration_min: Optional[int] = None


class ResourceCard(BaseModel):
    resource_id: str
    title: str
    summary: str
    url: Optional[str] = None


class SCAInterveneResponse(BaseModel):
    plan_steps: list[PlanStep]
    resource_cards: list[ResourceCard]
    next_check_in: Optional[datetime] = None


class SCAFollowUpRequest(BaseModel):
    session_id: str
    last_plan_id: str
    check_in: dict[str, int | str]


class SCAFollowUpResponse(BaseModel):
    acknowledged: bool = True
    next_check_in: Optional[datetime] = None
