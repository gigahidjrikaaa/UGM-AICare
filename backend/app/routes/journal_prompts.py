from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_async_db
from app.models import JournalPrompt, User, JournalReflectionPoint # Add JournalReflectionPoint
from app.schemas import JournalPromptCreate, JournalPromptResponse, JournalPromptUpdate, JournalReflectionPointResponse # Add JournalReflectionPointResponse
from app.dependencies import get_current_active_user # Or a specific admin dependency

router = APIRouter(
    prefix="/api/v1/journal-prompts",
    tags=["Journal Prompts"],
    # Consider if all prompt routes need auth, or just creation/modification
    dependencies=[Depends(get_current_active_user)]
)

@router.post("/", response_model=JournalPromptResponse, status_code=status.HTTP_201_CREATED)
async def create_journal_prompt(
    prompt_data: JournalPromptCreate,
    db: AsyncSession = Depends(get_async_db)
    # current_user: User = Depends(get_admin_user) # Example for admin protection
):
    """Creates a new journal prompt. (Protected endpoint - for admin use)"""
    new_prompt = JournalPrompt(**prompt_data.dict())
    db.add(new_prompt)
    await db.commit()
    await db.refresh(new_prompt)
    return new_prompt

@router.get("/", response_model=List[JournalPromptResponse])
async def get_active_journal_prompts(
    db: AsyncSession = Depends(get_async_db)
):
    """Retrieves all active journal prompts."""
    result = await db.execute(select(JournalPrompt).filter(JournalPrompt.is_active == True))
    prompts = result.scalars().all()
    return prompts

@router.get("/{prompt_id}", response_model=JournalPromptResponse)
async def get_journal_prompt(
    prompt_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Retrieves a specific journal prompt by ID."""
    result = await db.execute(select(JournalPrompt).filter(JournalPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal prompt not found.")
    return prompt

@router.put("/{prompt_id}", response_model=JournalPromptResponse)
async def update_journal_prompt(
    prompt_id: int,
    prompt_data: JournalPromptUpdate,
    db: AsyncSession = Depends(get_async_db)
    # current_user: User = Depends(get_admin_user) # Example for admin protection
):
    """Updates an existing journal prompt. (Protected endpoint - for admin use)"""
    result = await db.execute(select(JournalPrompt).filter(JournalPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal prompt not found.")
    
    update_data = prompt_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prompt, key, value)
        
    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)
    return prompt

@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal_prompt(
    prompt_id: int,
    db: AsyncSession = Depends(get_async_db)
    # current_user: User = Depends(get_admin_user) # Example for admin protection
):
    """Deletes a journal prompt. (Protected endpoint - for admin use)"""
    result = await db.execute(select(JournalPrompt).filter(JournalPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal prompt not found.")
    
    await db.delete(prompt)
    await db.commit()
    return None

# You can add this to a new router group like "Journal Insights" or keep it with prompts
@router.get("/reflections/me", response_model=List[JournalReflectionPointResponse])
async def get_my_journal_reflection_points(
    limit: int = 5, # Get the latest 5 reflections, for example
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves the latest AI-generated reflection points for the current user."""
    stmt = select(JournalReflectionPoint).filter(
        JournalReflectionPoint.user_id == current_user.id
    ).order_by(JournalReflectionPoint.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    reflections = result.scalars().all()
    
    if not reflections:
        # It's okay if there are no reflections yet, don't raise 404
        return []
    return reflections