from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


class CaseNoteItem(BaseModel):
    id: int
    case_id: str
    created_at: datetime
    author_id: int | None
    note: str


class CaseNotesListResponse(BaseModel):
    items: List[CaseNoteItem]


class CaseNoteCreate(BaseModel):
    note: str

