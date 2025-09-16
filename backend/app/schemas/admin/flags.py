from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class FlagCreate(BaseModel):
    reason: str
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class FlagResponse(BaseModel):
    id: int
    session_id: str
    user_id: Optional[int]
    reason: Optional[str]
    notes: Optional[str]
    tags: Optional[List[str]]
    status: str
    flagged_by_admin_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class FlagUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class FlagsSummary(BaseModel):
    open_flags: int
    closed_flags: int
    escalated_flags: int
    tags: List[str]


class FlagsBulkCloseRequest(BaseModel):
    flag_ids: List[int]


class FlagsBulkTagRequest(BaseModel):
    flag_ids: List[int]
    tags: List[str]
