# backend/app/schemas/journal.py
from pydantic import BaseModel
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

    class Config:
        from_attributes = True

#? --- Journal Schemas ---
class JournalEntryBase(BaseModel):
    entry_date: date
    content: str
    prompt_id: Optional[int] = None

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryUpdate(BaseModel):
    content: Optional[str] # Allow updating only content for a specific date
    prompt_id: Optional[int] = None # Allow updating prompt_text too, if desired

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

    class Config:
        from_attributes = True

class JournalEntryResponse(JournalEntryBase): # Modify existing schema
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    prompt: Optional[JournalPromptResponse] = None
    reflection_points: List[JournalReflectionPointResponse] = [] # Add this line

    class Config:
        from_attributes = True