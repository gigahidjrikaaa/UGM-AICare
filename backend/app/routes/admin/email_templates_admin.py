"""Admin CRUD for outbound email templates.

Templates are DB rows consumed by the counselor email service; editing here
updates what counselors send without a deploy. The `key` is immutable after
creation (it's the stable identifier the counselor flow references).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.domains.mental_health.services import counselor_email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email-templates", tags=["Admin Email Templates"])


class EmailTemplateOut(BaseModel):
    id: int
    key: str
    label: str
    description: Optional[str] = None
    subject: str
    body_text: str
    is_active: bool
    sort_order: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmailTemplateListResponse(BaseModel):
    templates: List[EmailTemplateOut]


class EmailTemplateCreate(BaseModel):
    key: str = Field(..., min_length=2, max_length=50, description="Unique slug, e.g. 'session_reminder'")
    label: str = Field(..., min_length=1, max_length=120)
    description: str = ""
    subject: str = Field(..., min_length=1, max_length=255)
    body_text: str = Field(..., min_length=1)
    sort_order: int = 0


class EmailTemplateUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    body_text: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


@router.get("", response_model=EmailTemplateListResponse)
async def list_templates(
    db: AsyncSession = Depends(get_async_db),
    admin_user: Any = Depends(get_admin_user),
):
    rows = await counselor_email_service.admin_list_templates(db)
    return {"templates": rows}


@router.post("", response_model=EmailTemplateOut)
async def create_template(
    payload: EmailTemplateCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: Any = Depends(get_admin_user),
):
    try:
        row = await counselor_email_service.admin_create_template(
            db,
            key=payload.key,
            label=payload.label,
            subject=payload.subject,
            body_text=payload.body_text,
            description=payload.description,
            sort_order=payload.sort_order,
            updated_by=admin_user.id,
        )
        return row
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.put("/{template_id}", response_model=EmailTemplateOut)
async def update_template(
    template_id: int,
    payload: EmailTemplateUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: Any = Depends(get_admin_user),
):
    try:
        return await counselor_email_service.admin_update_template(
            db,
            template_id,
            label=payload.label,
            subject=payload.subject,
            body_text=payload.body_text,
            description=payload.description,
            is_active=payload.is_active,
            sort_order=payload.sort_order,
            updated_by=admin_user.id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: Any = Depends(get_admin_user),
):
    try:
        await counselor_email_service.admin_delete_template(db, template_id)
        return {"ok": True, "deleted_id": template_id}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
