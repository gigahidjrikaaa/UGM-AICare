# backend/app/routes/journal.py
from fastapi import APIRouter, Depends, HTTPException, status, Body # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import Date, cast # Import cast
from pydantic import BaseModel, Field
from datetime import date, datetime # Import date
from typing import List, Optional

from app.database import get_db
from app.models import User, JournalEntry
from app.dependencies import get_current_active_user # Use your auth dependency

router = APIRouter(
    prefix="/api/v1/journal",
    tags=["Journal"],
    dependencies=[Depends(get_current_active_user)] # Protect all journal routes
)

# --- Pydantic Schemas ---
class JournalEntryBase(BaseModel):
    entry_date: date
    content: str

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryUpdate(BaseModel):
    content: str # Allow updating only content for a specific date

class JournalEntryResponse(JournalEntryBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True # or from_attributes = True for Pydantic v2

# --- API Endpoints ---

@router.post("/", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_journal_entry(
    entry_data: JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Creates a new journal entry or updates it if one exists for the user and date."""
    existing_entry = db.query(JournalEntry).filter(
        JournalEntry.user_id == current_user.id,
        JournalEntry.entry_date == entry_data.entry_date
    ).first()

    if existing_entry:
        # Update existing entry
        existing_entry.content = entry_data.content
        existing_entry.updated_at = datetime.now()
        db.add(existing_entry)
        db.commit()
        db.refresh(existing_entry)
        return existing_entry
    else:
        # Create new entry
        new_entry = JournalEntry(
            **entry_data.dict(),
            user_id=current_user.id
        )
        db.add(new_entry)
        try:
            db.commit()
            db.refresh(new_entry)
            return new_entry
        except Exception as e: # Catch potential unique constraint violation if logic had race condition
             db.rollback()
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry for this date might already exist.")


@router.get("/", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Gets journal entries for the current user, optionally filtered by date range."""
    query = db.query(JournalEntry).filter(JournalEntry.user_id == current_user.id)
    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)
    entries = query.order_by(JournalEntry.entry_date.desc()).all()
    return entries

@router.get("/{entry_date_str}", response_model=JournalEntryResponse)
async def get_journal_entry_by_date(
    entry_date_str: str, # Receive date as string YYYY-MM-DD
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Gets a specific journal entry for the current user by date."""
    try:
        entry_date = date.fromisoformat(entry_date_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD.")

    entry = db.query(JournalEntry).filter(
        JournalEntry.user_id == current_user.id,
        JournalEntry.entry_date == entry_date
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found for this date")
    return entry

#! TODO: DELETE endpoint
# @router.delete("/{entry_date_str}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_journal_entry ...