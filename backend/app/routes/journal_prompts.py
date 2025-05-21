from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import JournalPrompt
from app.schemas import JournalPromptCreate, JournalPromptResponse, JournalPromptUpdate
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
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_admin_user) # Example for admin protection
):
    """Creates a new journal prompt. (Protected endpoint - for admin use)"""
    new_prompt = JournalPrompt(**prompt_data.dict())
    db.add(new_prompt)
    db.commit()
    db.refresh(new_prompt)
    return new_prompt

@router.get("/", response_model=List[JournalPromptResponse])
async def get_active_journal_prompts(
    db: Session = Depends(get_db)
):
    """Retrieves all active journal prompts."""
    prompts = db.query(JournalPrompt).filter(JournalPrompt.is_active == True).all()
    return prompts

@router.get("/{prompt_id}", response_model=JournalPromptResponse)
async def get_journal_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """Retrieves a specific journal prompt by ID."""
    prompt = db.query(JournalPrompt).filter(JournalPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal prompt not found.")
    return prompt

@router.put("/{prompt_id}", response_model=JournalPromptResponse)
async def update_journal_prompt(
    prompt_id: int,
    prompt_data: JournalPromptUpdate,
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_admin_user) # Example for admin protection
):
    """Updates an existing journal prompt. (Protected endpoint - for admin use)"""
    prompt = db.query(JournalPrompt).filter(JournalPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal prompt not found.")
    
    update_data = prompt_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prompt, key, value)
        
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt

@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_admin_user) # Example for admin protection
):
    """Deletes a journal prompt. (Protected endpoint - for admin use)"""
    prompt = db.query(JournalPrompt).filter(JournalPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal prompt not found.")
    
    db.delete(prompt)
    db.commit()
    return None