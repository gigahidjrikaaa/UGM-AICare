# backend/app/routes/journal.py
from fastapi import APIRouter, Depends, HTTPException, status, Body # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import Date, cast # Import cast
from pydantic import BaseModel, Field
from datetime import date, datetime # Import date
from typing import List, Optional

from app.database import get_db
from app.models import User, JournalEntry
from app.schemas import JournalEntryCreate, JournalEntryResponse
from app.dependencies import get_current_active_user # Use your auth dependency

router = APIRouter(
    prefix="/api/v1/journal",
    tags=["Journal"],
    dependencies=[Depends(get_current_active_user)] # Protect all journal routes
)

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
        existing_entry.content = entry_data.content  # type: ignore[assignment]
        existing_entry.prompt_id = entry_data.prompt_id  # type: ignore[assignment] # Update prompt_text
        existing_entry.updated_at = datetime.now()  # type: ignore[assignment]
        db.add(existing_entry)
        db.commit()
        db.refresh(existing_entry)
        return existing_entry
    else:
        # Create new entry
        new_entry_data = entry_data.dict()
        new_entry = JournalEntry(
            user_id=current_user.id,
            entry_date=new_entry_data.get("entry_date"),
            content=new_entry_data.get("content"),
            prompt_id=new_entry_data.get("prompt_id")
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
async def get_all_journal_entries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all journal entries for the current user with pagination."""
    entries = db.query(JournalEntry).filter(
        JournalEntry.user_id == current_user.id
    ).order_by(JournalEntry.entry_date.desc()).offset(skip).limit(limit).all()
    return entries

@router.get("/{entry_date}", response_model=JournalEntryResponse)
async def get_journal_entry_by_date(
    entry_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves a journal entry for the current user by date."""
    entry = db.query(JournalEntry).filter(
        JournalEntry.user_id == current_user.id,
        JournalEntry.entry_date == entry_date
    ).first() # Use .options(selectinload(JournalEntry.prompt)) for eager loading if needed
    
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found for this date.")
    return entry


#! TODO: DELETE endpoint
# @router.delete("/{entry_date_str}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_journal_entry ...