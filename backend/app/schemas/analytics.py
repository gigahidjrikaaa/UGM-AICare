from __future__ import annotations
from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional, Dict, List
import hashlib
import json

AllowedIntent = Literal['user_leaderboard','aggregate','trend']
AllowedMetric = Literal['concerning_assessment_count','severe_assessment_count']
AllowedEntity = Literal['user']

class TimeframeSpec(BaseModel):
    mode: Literal['rolling','calendar'] = 'rolling'
    days: Optional[int] = Field(default=None, ge=1, le=365)
    calendar_month: Optional[str] = Field(default=None, pattern=r'^\d{4}-\d{2}$')  # YYYY-MM
    source: Optional[str] = None  # phrase that produced timeframe

    @model_validator(mode='after')
    def validate_timeframe(self):  # type: ignore[override]
        if self.mode == 'rolling':
            if not self.days:
                raise ValueError('rolling timeframe requires days')
            if self.calendar_month:
                raise ValueError('rolling timeframe cannot set calendar_month')
        if self.mode == 'calendar':
            if not self.calendar_month:
                raise ValueError('calendar timeframe requires calendar_month')
        return self

class QueryFilters(BaseModel):
    severity_at_or_above: Optional[Literal['low','moderate','high','critical']] = None

class AnalyticsQuerySpec(BaseModel):
    intent: AllowedIntent
    metric: AllowedMetric
    entity: AllowedEntity = 'user'
    timeframe: TimeframeSpec
    filters: Optional[QueryFilters] = None
    raw_question: Optional[str] = None
    assumptions: List[str] = []

    @model_validator(mode='after')
    def ensure_defaults(self):  # type: ignore[override]
        if self.assumptions is None:
            self.assumptions = []
        return self

    def hash(self) -> str:
        payload = self.dict()
        payload_str = json.dumps(payload, sort_keys=True, separators=(',',':'))
        return hashlib.sha256(payload_str.encode('utf-8')).hexdigest()

class AnalyticsRunResult(BaseModel):
    spec: AnalyticsQuerySpec
    metrics: Dict[str, object]
    answer: Optional[str] = None
    empty: bool = False
    explanation: Optional[str] = None
    hashing: Dict[str,str] | None = None

__all__ = [
    'TimeframeSpec','QueryFilters','AnalyticsQuerySpec','AnalyticsRunResult','AllowedIntent','AllowedMetric','AllowedEntity'
]
