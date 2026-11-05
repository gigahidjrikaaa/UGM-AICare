"""Counselor outbound-email endpoints.

- GET  /patients/{user_id}/email/templates  — available templates + daily cap
- POST /patients/{user_id}/email            — render + send + audit
- GET  /patients/{user_id}/emails           — send history for that student

Scope: the target student must be inside the counselor's caseload (the same
conversation-scope definition used across the portal). Peer supporters are
not offered this channel — their contact surface is the moderated in-app
peer thread.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.domains.mental_health.models import CounselorEmailLog
from app.domains.mental_health.services import counselor_email_service
from app.domains.mental_health.services.counselor_scope import (
    get_counselor_conversation_scope,
)
from app.models.user import User

logger = logging.getLogger(__name__)

email_router = APIRouter(prefix="/patients", tags=["Counselor Email"])


async def require_counselor(current_user: User = Depends(get_current_active_user)) -> User:
    """Local mirror of counselor.py's require_counselor — lazy import to
    avoid a circular import (counselor.py mounts this router)."""
    from app.domains.mental_health.routes.counselor import require_counselor as _rc

    return await _rc(current_user=current_user)


async def require_email_channel(current_user: User = Depends(require_counselor)) -> User:
    """Peer supporters deliberately do NOT get the email channel (they are
    students; direct email would bypass the moderated chat + supervision
    model). Their contact surface is the in-app peer thread."""
    if getattr(current_user, "role", None) == "peer_supporter":
        raise HTTPException(
            status_code=403,
            detail="Peer supporters do not have access to the email channel.",
        )
    return current_user


class EmailTemplateOut(BaseModel):
    key: str
    label: str
    description: str
    default_subject: str


class EmailTemplatesResponse(BaseModel):
    templates: List[EmailTemplateOut]
    daily_limit: int


class SendEmailRequest(BaseModel):
    template_key: str = Field(..., description="Template key (see /email/templates)")
    custom_message: str = Field("", max_length=4000, description="Personal note merged into the template")


class SendEmailResponse(BaseModel):
    delivered: bool
    template: str
    subject: str
    student_email_opt_in: bool
    sent_today: int
    daily_limit: int
    thread_id: Optional[int] = None


class EmailLogOut(BaseModel):
    id: int
    template_key: str
    subject: str
    status: str
    created_at: datetime
    message_redacted: Optional[str] = None


class EmailHistoryResponse(BaseModel):
    emails: List[EmailLogOut]


async def _scope_or_403(
    db: AsyncSession, counselor_user: User, student_user_id: int
) -> None:
    """The student must be inside the counselor's caseload."""
    from app.domains.mental_health.models import Counselor as CounselorProfile

    profile = (
        await db.execute(
            select(CounselorProfile).where(CounselorProfile.user_id == counselor_user.id)
        )
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Counselor profile not found")

    scope = await get_counselor_conversation_scope(db, profile)
    _, scoped_user_ids = scope if isinstance(scope, tuple) else (None, scope.user_ids)
    if student_user_id not in scoped_user_ids:
        raise HTTPException(
            status_code=403,
            detail="This student is not in your caseload.",
        )


async def _student_name_for(db: AsyncSession, student_user_id: int) -> str:
    from app.models.user import User as UserModel
    from app.routes.admin.utils import decrypt_user_field

    row = (
        await db.execute(select(UserModel.name).where(UserModel.id == student_user_id))
    ).scalar_one_or_none()
    if row:
        try:
            name = decrypt_user_field(row)
            if name:
                return name
        except Exception:
            pass
    return "Student"


@email_router.get("/email/templates", response_model=EmailTemplatesResponse)
async def list_email_templates(
    current_user: User = Depends(require_email_channel),
    db: AsyncSession = Depends(get_async_db),
):
    """Active templates (admin-editable DB rows, falling back to code defaults)."""
    from app.domains.mental_health.services.counselor_email_service import (
        DAILY_LIMIT_PER_COUNSELOR,
    )
    from app.domains.mental_health.services.counselor_email_service import (
        resolve_templates_from_db,
    )

    templates = await resolve_templates_from_db(db)
    return EmailTemplatesResponse(
        templates=[
            EmailTemplateOut(
                key=t.key,
                label=t.label_id,
                description=t.description,
                default_subject=t.default_subject_id,
            )
            for t in templates
        ],
        daily_limit=DAILY_LIMIT_PER_COUNSELOR,
    )


class EmailPreviewRequest(BaseModel):
    template_key: str
    custom_message: str = Field("", max_length=4000)


class EmailPreviewResponse(BaseModel):
    template: str
    label: str
    subject: str
    html: str
    plain: str
    disclaimer: str


@email_router.post("/{user_id}/email/preview", response_model=EmailPreviewResponse)
async def preview_student_email(
    user_id: int,
    payload: EmailPreviewRequest,
    current_user: User = Depends(require_email_channel),
    db: AsyncSession = Depends(get_async_db),
):
    """Render the template for preview — nothing is sent or logged."""
    from app.domains.mental_health.services.counselor_email_service import build_preview

    await _scope_or_403(db, current_user, user_id)
    try:
        return await build_preview(
            db,
            counselor_name=current_user.name or "Your counselor",
            student_name=await _student_name_for(db, user_id),
            template_key=payload.template_key,
            custom_message=payload.custom_message,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@email_router.post("/{user_id}/email", response_model=SendEmailResponse)
async def send_student_email(
    user_id: int,
    payload: SendEmailRequest,
    current_user: User = Depends(require_email_channel),
    db: AsyncSession = Depends(get_async_db),
):
    """Render a template and email the student (scope-checked, audited)."""
    from app.domains.mental_health.services.counselor_email_service import send_student_email

    await _scope_or_403(db, current_user, user_id)
    try:
        result = await send_student_email(
            db,
            counselor_user=current_user,
            student_user_id=user_id,
            template_key=payload.template_key,
            custom_message=payload.custom_message,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    return SendEmailResponse(**result)


@email_router.get("/{user_id}/emails", response_model=EmailHistoryResponse)
async def list_student_email_history(
    user_id: int,
    current_user: User = Depends(require_email_channel),
    db: AsyncSession = Depends(get_async_db),
):
    await _scope_or_403(db, current_user, user_id)
    rows = (
        await db.execute(
            select(CounselorEmailLog)
            .where(
                CounselorEmailLog.counselor_user_id == current_user.id,
                CounselorEmailLog.student_user_id == user_id,
            )
            .order_by(CounselorEmailLog.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    return EmailHistoryResponse(
        emails=[
            EmailLogOut(
                id=row.id,
                template_key=row.template_key,
                subject=row.subject,
                status=row.status,
                created_at=row.created_at,
                message_redacted=row.message_redacted,
            )
            for row in rows
        ]
    )
