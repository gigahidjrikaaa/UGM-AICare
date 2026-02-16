# backend/app/routes/journal.py
from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Date, cast, select # Import cast
from pydantic import BaseModel, Field
from datetime import date, datetime # Import date
from typing import List, Optional, cast as typing_cast

from app.database import get_async_db, AsyncSessionLocal
from app.models import User  # Core model
from app.domains.mental_health.models import JournalEntry, JournalReflectionPoint, JournalTag
from app.domains.mental_health.schemas.journal import (
    JournalEntryCreate, JournalEntryResponse, JournalReflectionPointCreate,
    JournalEntryFilter, JournalAnalyticsResponse, JournalExportResponse
)
from app.core.llm import generate_response, LLMProvider
from app.dependencies import get_current_active_user # Use your auth dependency
from app.domains.mental_health.services.personal_context import invalidate_user_personal_context
from app.services.achievement_service import trigger_achievement_check
from fastapi.responses import FileResponse
from typing import Optional, List
import csv
from io import StringIO
from datetime import datetime, timedelta
from collections import defaultdict
import os
import tempfile
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
                model="gemini_google",
                system_prompt=system_prompt_for_reflection,
                max_tokens=512, # Adjust as needed
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

    word_count = len(entry_data.content.split())
    saved_entry = None
    if existing_entry:
        # Update existing entry
        setattr(existing_entry, 'content', entry_data.content)
        setattr(existing_entry, 'prompt_id', entry_data.prompt_id)
        setattr(existing_entry, 'mood', entry_data.mood)
        setattr(existing_entry, 'word_count', word_count)
        setattr(existing_entry, 'updated_at', datetime.now()) # Use setattr for consistency
        db.add(existing_entry)
        
        # Handle tags - delete existing and add new
        await db.execute(select(JournalTag).filter(JournalTag.journal_entry_id == existing_entry.id))
        for tag_name in entry_data.tags:
            new_tag = JournalTag(journal_entry_id=existing_entry.id, tag_name=tag_name)
            db.add(new_tag)
            
        await db.commit()
        await db.refresh(existing_entry)
        saved_entry = existing_entry
        await invalidate_user_personal_context(current_user.id)
        
        # Invalidate journal cache
        from app.core.cache import get_cache_service
        cache = get_cache_service()
        await cache.delete_pattern(f"cache:journals:{current_user.id}:*")
        await cache.delete_pattern(f"cache:journal_highlights:{current_user.id}:*")
    else:
        # Create new entry
        new_entry_data = entry_data.dict()
        new_entry = JournalEntry(
            user_id=current_user.id,
            entry_date=new_entry_data.get("entry_date"),
            content=new_entry_data.get("content"),
            prompt_id=new_entry_data.get("prompt_id"),
            mood=new_entry_data.get("mood"),
            word_count=word_count
        )
        db.add(new_entry)
        try:
            await db.commit()
            await db.refresh(new_entry)
            saved_entry = new_entry
            
            # Add tags
            for tag_name in entry_data.tags:
                new_tag = JournalTag(journal_entry_id=new_entry.id, tag_name=tag_name)
                db.add(new_tag)
            await db.commit()
            
            await invalidate_user_personal_context(current_user.id)
            
            # Invalidate journal cache
            from app.core.cache import get_cache_service
            cache = get_cache_service()
            await cache.delete_pattern(f"cache:journals:{current_user.id}:*")
            await cache.delete_pattern(f"cache:journal_highlights:{current_user.id}:*")
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry for this date might already exist or another error occurred.")


    if saved_entry:
        try:
            await trigger_achievement_check(
                db,
                current_user,
                action="journal_saved",
                fail_on_config_error=False,
            )
        except Exception as exc:  # pragma: no cover - best effort
            logger.warning(
                "Badge auto-sync failed after journal save for user %s: %s",
                current_user.id,
                exc,
            )

        # Add background task for AI analysis
        background_tasks.add_task(
            analyze_journal_entry_for_insights,
            user_id=typing_cast(int, saved_entry.user_id),
            journal_entry_id=typing_cast(int, saved_entry.id),
            journal_content=typing_cast(str, saved_entry.content)
        )
    
    # Eagerly load reflection_points and tags for the response
    from sqlalchemy.orm import selectinload
    stmt = select(JournalEntry).options(
        selectinload(JournalEntry.reflection_points),
        selectinload(JournalEntry.tags)
    ).filter(JournalEntry.id == saved_entry.id)
    result = await db.execute(stmt)
    entry_with_data = result.scalar_one_or_none()
    return entry_with_data


@router.get("/", response_model=List[JournalEntryResponse])
async def get_all_journal_entries(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all journal entries for the current user with pagination."""
    from sqlalchemy.orm import selectinload
    stmt = select(JournalEntry).options(selectinload(JournalEntry.reflection_points)).filter(
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
    from sqlalchemy.orm import selectinload
    stmt = select(JournalEntry).options(
        selectinload(JournalEntry.reflection_points),
        selectinload(JournalEntry.tags)
    ).filter(
        JournalEntry.user_id == current_user.id,
        JournalEntry.entry_date == entry_date
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        # Log for debugging and robustness
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Journal entry not found for user {current_user.id} on date {entry_date}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found for this date.")
    return entry


@router.post("/search", response_model=List[JournalEntryResponse])
async def search_journal_entries(
    filter_params: JournalEntryFilter,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search and filter journal entries."""
    from sqlalchemy.orm import selectinload
    from sqlalchemy import or_, and_, func
    
    stmt = select(JournalEntry).options(
        selectinload(JournalEntry.reflection_points),
        selectinload(JournalEntry.tags)
    ).filter(JournalEntry.user_id == current_user.id)
    
    # Apply filters
    if filter_params.search_query:
        search_term = f"%{filter_params.search_query}%"
        stmt = stmt.where(
            or_(
                JournalEntry.content.ilike(search_term)
            )
        )
    
    if filter_params.mood_min is not None:
        stmt = stmt.where(JournalEntry.mood >= filter_params.mood_min)
    
    if filter_params.mood_max is not None:
        stmt = stmt.where(JournalEntry.mood <= filter_params.mood_max)
    
    if filter_params.date_from:
        stmt = stmt.where(JournalEntry.entry_date >= filter_params.date_from)
    
    if filter_params.date_to:
        stmt = stmt.where(JournalEntry.entry_date <= filter_params.date_to)
    
    # Tag filtering
    if filter_params.tags:
        for tag in filter_params.tags:
            subquery = select(JournalTag.journal_entry_id).where(JournalTag.tag_name == tag)
            stmt = stmt.where(JournalEntry.id.in_(subquery))
    
    stmt = stmt.order_by(JournalEntry.entry_date.desc()).offset(filter_params.skip).limit(filter_params.limit)
    result = await db.execute(stmt)
    entries = result.scalars().all()
    return entries


@router.get("/analytics/overview", response_model=JournalAnalyticsResponse)
async def get_journal_analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get journal analytics for the user."""
    from sqlalchemy import func, desc
    
    date_threshold = datetime.now() - timedelta(days=days)
    
    # Get all entries in date range
    result = await db.execute(
        select(JournalEntry)
        .options(selectinload(JournalEntry.tags))
        .filter(
            JournalEntry.user_id == current_user.id,
            JournalEntry.entry_date >= date_threshold.date()
        )
    )
    entries = result.scalars().all()
    
    # Calculate statistics
    total_entries = len(entries)
    total_word_count = sum(e.word_count for e in entries)
    avg_word_count = total_word_count / total_entries if total_entries > 0 else 0
    
    # Mood distribution
    mood_dist = defaultdict(int)
    mood_trend = []
    
    for entry in sorted(entries, key=lambda x: x.entry_date):
        if entry.mood:
            mood_dist[entry.mood] += 1
            mood_trend.append({
                "date": entry.entry_date.isoformat(),
                "mood": entry.mood
            })
    
    # Most used tags
    tag_count = defaultdict(int)
    for entry in entries:
        for tag in entry.tags:
            tag_count[tag.tag_name] += 1
    
    most_used_tags = sorted(
        [{"tag": tag, "count": count} for tag, count in tag_count.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]
    
    # Writing frequency by date
    date_count = defaultdict(int)
    for entry in entries:
        date_count[entry.entry_date.isoformat()] += 1
    
    writing_frequency = sorted(
        [{"date": date, "count": count} for date, count in date_count.items()],
        key=lambda x: x["date"]
    )
    
    return JournalAnalyticsResponse(
        total_entries=total_entries,
        total_word_count=total_word_count,
        avg_word_count=round(avg_word_count, 2),
        mood_distribution=dict(mood_dist),
        most_used_tags=most_used_tags,
        mood_trend=mood_trend,
        writing_frequency=writing_frequency
    )


@router.get("/export/{format}", response_model=JournalExportResponse)
async def export_journal_entries(
    format: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export journal entries as CSV or PDF."""
    from sqlalchemy.orm import selectinload
    
    if format not in ['csv', 'pdf']:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'pdf'")
    
    result = await db.execute(
        select(JournalEntry)
        .options(
            selectinload(JournalEntry.tags),
            selectinload(JournalEntry.prompt)
        )
        .filter(JournalEntry.user_id == current_user.id)
        .order_by(JournalEntry.entry_date.desc())
    )
    entries = result.scalars().all()
    
    if format == 'csv':
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['Date', 'Content', 'Mood', 'Tags', 'Prompt', 'Word Count'])
        
        for entry in entries:
            tags = ', '.join([tag.tag_name for tag in entry.tags])
            prompt = entry.prompt.text if entry.prompt else ''
            writer.writerow([
                entry.entry_date,
                entry.content.replace('\n', ' '),
                entry.mood or '',
                tags,
                prompt,
                entry.word_count
            ])
        
        # Create temp file
        temp_dir = tempfile.gettempdir()
        filename = f"journal_export_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = os.path.join(temp_dir, filename)
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            f.write(output.getvalue())
        
        # Return file response
        return FileResponse(
            filepath,
            media_type='text/csv',
            filename=filename
        )
    else:  # PDF
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib import colors
            
            temp_dir = tempfile.gettempdir()
            filename = f"journal_export_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            filepath = os.path.join(temp_dir, filename)
            
            doc = SimpleDocTemplate(filepath, pagesize=letter)
            styles = getSampleStyleSheet()
            
            elements = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=1
            )
            elements.append(Paragraph("Journal Entries", title_style))
            elements.append(Spacer(1, 20))
            
            # Entries
            for entry in entries:
                # Date
                date_text = f"<b>Date:</b> {entry.entry_date}"
                elements.append(Paragraph(date_text, styles['Normal']))
                
                # Mood
                if entry.mood:
                    mood_emoji = {1: '😢', 2: '😕', 3: '😐', 4: '😊', 5: '😄'}
                    mood_text = f"<b>Mood:</b> {mood_emoji.get(entry.mood, '')} ({entry.mood}/5)"
                    elements.append(Paragraph(mood_text, styles['Normal']))
                
                # Tags
                if entry.tags:
                    tags_text = "<b>Tags:</b> " + ', '.join([tag.tag_name for tag in entry.tags])
                    elements.append(Paragraph(tags_text, styles['Normal']))
                
                # Content
                elements.append(Paragraph(f"<b>Content:</b>", styles['Normal']))
                content_text = entry.content.replace('\n', '<br/>')
                elements.append(Paragraph(content_text, styles['BodyText']))
                
                elements.append(Spacer(1, 20))
                elements.append(Spacer(1, 10))
            
            doc.build(elements)
            
            return FileResponse(
                filepath,
                media_type='application/pdf',
                filename=filename
            )
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="PDF generation not available. Install reportlab package."
            )


@router.get("/tags/all", response_model=List[str])
async def get_all_user_tags(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all tags used by the user."""
    from sqlalchemy import distinct
    
    result = await db.execute(
        select(JournalEntry.id)
        .join(JournalTag)
        .filter(JournalEntry.user_id == current_user.id)
    )
    entry_ids = [row[0] for row in result.all()]
    
    if not entry_ids:
        return []
    
    tag_result = await db.execute(
        select(JournalTag.tag_name)
        .where(JournalTag.journal_entry_id.in_(entry_ids))
        .distinct()
    )
    tags = [row[0] for row in tag_result.all()]
    
    return sorted(tags)


#! TODO: DELETE endpoint
# @router.delete("/{entry_date_str}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_journal_entry ...
