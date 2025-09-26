from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


RiskLevel = Literal[0, 1, 2, 3]
NextStep = Literal['sca', 'human', 'resource']


class STAClassifyRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    meta: dict[str, str | int | float] | None = None


class STAClassifyResponse(BaseModel):
    risk_level: RiskLevel
    intent: str
    next_step: NextStep
    handoff: bool = False
    diagnostic_notes: Optional[str] = Field(default=None, exclude=True)

    class Config:
        json_schema_extra = {
            "example": {
                "risk_level": 1,
                "intent": "academic_stress",
                "next_step": "sca",
                "handoff": False,
            }
        }
