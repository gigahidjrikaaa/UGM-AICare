# backend/app/routes/journal.py
from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Date, cast, select # Import cast
from pydantic import BaseModel, Field
from datetime import date, datetime # Import date
from typing import List, Optional, cast as typing_cast

from app.database import get_async_db, AsyncSessionLocal
from app.models import User, JournalEntry, JournalReflectionPoint
from app.schemas.journal import JournalEntryCreate, JournalEntryResponse, JournalReflectionPointCreate
from app.core.llm import generate_response, LLMProvider
from app.dependencies import get_current_active_user # Use your auth dependency

import logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/journal",
    tags=["Journal"],
    dependencies=[Depends(get_current_active_user)] # Protect all journal routes
)

# --- Background Task for AI Journal Analysis ---
async def analyze_journal_entry_for_insights(
    user_id: int,
    journal_entry_id: int,
    journal_content: str
):
    async with AsyncSessionLocal() as db:
        logger.info(f"Starting AI analysis for journal entry ID: {journal_entry_id} for user ID: {user_id}")
        try:
            # Define a trauma-informed and insight-focused system prompt
            # This is CRITICAL and needs careful crafting and iteration.
            system_prompt_for_reflection = """
You are a compassionate AI assistant. Your role is to gently analyze the following journal entry.
Identify 1-2 potential underlying emotional themes, recurring patterns, or core beliefs that the user might be expressing, possibly related to unresolved feelings or past experiences.
Frame your observations as gentle, open-ended questions or soft reflections that could encourage deeper self-understanding.
DO NOT diagnose, give advice, or use clinical jargon. Focus on empathy and curiosity.
Example observations:
- "It sounds like there's a strong feeling of 'not being good enough' that comes up in different situations. I wonder where that might stem from?"
- "There's a recurring theme of seeking external validation. What might it feel like to find that validation from within?"
- "You mentioned a memory from childhood. How do you feel that experience might be echoing in your present feelings?"
Keep the reflection concise (1-2 sentences).
"""
            # Prepare history for the LLM. For analysis, we might just send the content as the user's message.
            history = [{"role": "user", "content": journal_content}]

            # Choose your provider and model. Gemini Flash might be good for cost/speed.
            # Consider a more powerful model if deeper analysis is needed, but be mindful of cost/latency.
            ai_reflection_text = await generate_response(
                history=history,
                provider="gemini",
                system_prompt=system_prompt_for_reflection,
                max_tokens=150, # Adjust as needed
                temperature=0.5 # Lower temperature for more focused, less "creative" reflections
            )

            if ai_reflection_text and not ai_reflection_text.startswith("Error:"):
                reflection_data = JournalReflectionPointCreate(
                    journal_entry_id=journal_entry_id,
                    user_id=user_id,
                    reflection_text=ai_reflection_text.strip()
                )
                new_reflection = JournalReflectionPoint(**reflection_data.dict())
                db.add(new_reflection)
                await db.commit()
                logger.info(f"Successfully saved AI reflection for journal entry ID: {journal_entry_id}")
            else:
                logger.error(f"AI analysis failed or returned error for journal entry ID: {journal_entry_id}. Response: {ai_reflection_text}")

        except Exception as e:
            await db.rollback() # Rollback in case of error during DB operation for reflection
            logger.error(f"Error during AI journal analysis for entry ID {journal_entry_id}: {e}", exc_info=True)

# --- API Endpoints ---

@router.post("/", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_journal_entry(
    entry_data: JournalEntryCreate,
    background_tasks: BackgroundTasks, # Add BackgroundTasks dependency
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Creates a new journal entry or updates it if one exists for the user and date."""
    result = await db.execute(select(JournalEntry).filter(
        JournalEntry.user_id == current_user.id,
        JournalEntry.entry_date == entry_data.entry_date
    ))
    existing_entry = result.scalar_one_or_none()

    saved_entry = None
    if existing_entry:
        # Update existing entry
        setattr(existing_entry, 'content', entry_data.content)
        setattr(existing_entry, 'prompt_id', entry_data.prompt_id)
        setattr(existing_entry, 'updated_at', datetime.now()) # Use setattr for consistency
        db.add(existing_entry)
        await db.commit()
        await db.refresh(existing_entry)
        saved_entry = existing_entry
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
            await db.commit()
            await db.refresh(new_entry)
            saved_entry = new_entry
        except Exception as e:
             await db.rollback()
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry for this date might already exist or another error occurred.")

    if saved_entry:
        # Add background task for AI analysis
        background_tasks.add_task(
            analyze_journal_entry_for_insights,
            user_id=typing_cast(int, saved_entry.user_id),
            journal_entry_id=typing_cast(int, saved_entry.id),
            journal_content=typing_cast(str, saved_entry.content)
        )
    
    # Eagerly load reflection_points for the response
    # This requires SQLAlchemy 1.4+ for .options on instance, or re-query.
    # For simplicity, if your version is older, the frontend might need to fetch reflections separately
    # or you can re-query the entry with options.
    # Let's assume the relationship in JournalEntryResponse schema handles this if data is present.
    # To ensure it's fresh if the background task was very fast (unlikely but possible):
    await db.refresh(saved_entry) # Refresh to potentially get newly added reflection points if any (though unlikely due to async)

    return saved_entry # This will now include an empty reflection_points list initially


@router.get("/", response_model=List[JournalEntryResponse])
async def get_all_journal_entries(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all journal entries for the current user with pagination."""
    stmt = select(JournalEntry).filter(
        JournalEntry.user_id == current_user.id
    ).order_by(JournalEntry.entry_date.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    entries = result.scalars().all()
    return entries

@router.get("/{entry_date}", response_model=JournalEntryResponse)
async def get_journal_entry_by_date(
    entry_date: date,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves a journal entry for the current user by date."""
    stmt = select(JournalEntry).filter(
        JournalEntry.user_id == current_user.id,
        JournalEntry.entry_date == entry_date
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found for this date.")
    return entry


#! TODO: DELETE endpoint
# @router.delete("/{entry_date_str}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_journal_entry ...