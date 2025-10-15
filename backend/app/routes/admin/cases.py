"""Admin Case Management: notes and details."""
from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import Case, CaseNote
from app.schemas.admin.cases import CaseNoteCreate, CaseNoteItem, CaseNotesListResponse


router = APIRouter(prefix="/cases", tags=["Admin - Cases"])


def _to_note_item(row: CaseNote) -> CaseNoteItem:
    return CaseNoteItem(
        id=row.id,
        case_id=str(row.case_id),
        created_at=row.created_at,
        author_id=row.author_id,
        note=row.note,
    )


async def _get_case_or_404(db: AsyncSession, case_id: str) -> Case:
    try:
        uid = UUID(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid case_id") from exc

    result = await db.execute(select(Case).where(Case.id == uid))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


@router.get("/{case_id}/notes", response_model=CaseNotesListResponse)
async def list_notes(
    case_id: str,
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> CaseNotesListResponse:
    case = await _get_case_or_404(db, case_id)
    notes = (
        await db.execute(select(CaseNote).where(CaseNote.case_id == case.id).order_by(CaseNote.created_at.desc()))
    ).scalars().all()
    items = [_to_note_item(n) for n in notes]
    return CaseNotesListResponse(items=items)


@router.post("/{case_id}/notes", response_model=CaseNoteItem, status_code=status.HTTP_201_CREATED)
async def add_note(
    case_id: str,
    payload: CaseNoteCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> CaseNoteItem:
    await _get_case_or_404(db, case_id)

    note = CaseNote(case_id=UUID(case_id), note=payload.note, author_id=getattr(admin_user, "id", None))
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return _to_note_item(note)
