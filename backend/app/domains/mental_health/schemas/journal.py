# backend/app/schemas/journal.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, date

#? --- Journal Prompt Schemas ---
class JournalPromptBase(BaseModel):
    text: str
    category: Optional[str] = None
    is_active: bool = True

class JournalPromptCreate(JournalPromptBase):
    pass # No extra fields needed for creation beyond base

class JournalPromptUpdate(BaseModel):
    text: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class JournalPromptResponse(JournalPromptBase):
    id: int

    model_config = ConfigDict(from_attributes = True)

#? --- Journal Schemas ---
class JournalEntryBase(BaseModel):
    entry_date: date
    content: str
    prompt_id: Optional[int] = None
    mood: Optional[int] = None # 1-5 scale
    tags: List[str] = [] # List of tag names

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryUpdate(BaseModel):
    content: Optional[str] # Allow updating only content for a specific date
    prompt_id: Optional[int] = None # Allow updating prompt_text too, if desired
    mood: Optional[int] = None
    tags: Optional[List[str]] = None

class JournalEntryFilter(BaseModel):
    search_query: Optional[str] = None
    mood_min: Optional[int] = None
    mood_max: Optional[int] = None
    tags: Optional[List[str]] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    skip: int = 0
    limit: int = 100

#? --- Journal Reflection Point Schemas ---
class JournalReflectionPointBase(BaseModel):
    reflection_text: str
    # Optional: reflection_category: Optional[str] = None

class JournalReflectionPointCreate(JournalReflectionPointBase):
    journal_entry_id: int
    user_id: int

class JournalReflectionPointResponse(JournalReflectionPointBase):
    id: int
    journal_entry_id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes = True)

class JournalTagResponse(BaseModel):
    id: int
    journal_entry_id: int
    tag_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes = True)

class JournalEntryResponse(JournalEntryBase): # Modify existing schema
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    prompt: Optional[JournalPromptResponse] = None
    reflection_points: List[JournalReflectionPointResponse] = []
    tags: List[JournalTagResponse] = []
    word_count: int

    model_config = ConfigDict(from_attributes = True)

class JournalAnalyticsResponse(BaseModel):
    total_entries: int
    total_word_count: int
    avg_word_count: float
    mood_distribution: dict # {1: count, 2: count, ...}
    most_used_tags: List[dict] # [{"tag": "work", "count": 5}, ...]
    mood_trend: List[dict] # [{"date": "2024-01-01", "mood": 4}, ...]
    writing_frequency: List[dict] # [{"date": "2024-01-01", "count": 2}, ...]

class JournalExportResponse(BaseModel):
    export_url: str
    filename: str
    total_entries: int