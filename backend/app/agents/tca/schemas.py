from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict, Union

from pydantic import BaseModel, Field


class TCAInterveneRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    intent: str = Field(..., min_length=1)
    user_hash: str = Field(..., min_length=1, description="Anonymized user identifier")
    options: Optional[Dict[str, Union[int, str, float]]] = None
    consent_followup: Optional[bool] = None


class PlanStep(BaseModel):
    title: str
    description: str
    duration_min: Optional[int] = None
    id: Optional[str] = None  # Optional for backward compatibility or internal tracking


class ResourceCard(BaseModel):
    title: str
    description: str
    url: Optional[str] = None
    resource_id: Optional[str] = None  # Optional for backward compatibility
    resource_type: Optional[str] = "link"  # "link", "activity", "video", "article"
    activity_id: Optional[str] = None  # For interactive activities (e.g., "box-breathing")


class TCAInterveneResponse(BaseModel):
    plan_steps: list[PlanStep]
    resource_cards: list[ResourceCard]
    next_check_in: Optional[datetime] = None


# Backward compatibility aliases (SCA→TCA rename was incomplete)
SCAInterveneRequest = TCAInterveneRequest
"""Alias for TCAInterveneRequest. Support Coach Agent (SCA) was renamed to Therapeutic Coach Agent (TCA)."""

SCAInterveneResponse = TCAInterveneResponse
"""Alias for TCAInterveneResponse. Support Coach Agent (SCA) was renamed to Therapeutic Coach Agent (TCA)."""


class SCAFollowUpRequest(BaseModel):
    session_id: str
    last_plan_id: str
    check_in: dict[str, int | str]


class SCAFollowUpResponse(BaseModel):
    acknowledged: bool = True
    next_check_in: Optional[datetime] = None
