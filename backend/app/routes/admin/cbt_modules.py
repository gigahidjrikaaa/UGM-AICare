"""Admin CRUD for CBT modules and their steps.

Backs the existing admin console page (`/admin/cbt-modules`) whose frontend
components already call these exact paths — this router is the missing
backend. Order matters: the `/steps/{step_id}` routes are registered BEFORE
`/{module_id}` routes because FastAPI path params are validated after route
matching ("steps" would otherwise be captured as a module_id and 422).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.domains.mental_health.models.content import CbtModule, CbtModuleStep

router = APIRouter(prefix="/cbt-modules", tags=["Admin CBT Modules"])


# ========================================
# Schemas
# ========================================

class CbtModulePayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)


class CbtModuleOut(BaseModel):
    id: int
    title: str
    description: str

    model_config = {"from_attributes": True}


class CbtModuleListOut(BaseModel):
    items: List[CbtModuleOut]
    total_count: int


class CbtStepPayload(BaseModel):
    module_id: Optional[int] = None
    step_order: int = Field(..., ge=1)
    step_type: str = Field(..., min_length=1, max_length=50)
    content: str = Field(..., min_length=1)
    user_input_type: Optional[str] = None
    user_input_variable: Optional[str] = None
    feedback_prompt: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    tool_to_run: Optional[str] = None
    is_skippable: bool = False
    delay_after_ms: int = Field(0, ge=0)
    parent_id: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None


class CbtStepOut(BaseModel):
    id: int
    module_id: int
    step_order: int
    step_type: str
    content: str
    user_input_type: Optional[str] = None
    user_input_variable: Optional[str] = None
    feedback_prompt: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    tool_to_run: Optional[str] = None
    is_skippable: bool
    delay_after_ms: int
    parent_id: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


# ========================================
# Step routes (registered before /{module_id} routes — see module docstring)
# ========================================

async def _get_step_or_404(db: AsyncSession, step_id: int) -> CbtModuleStep:
    step = (
        await db.execute(select(CbtModuleStep).where(CbtModuleStep.id == step_id))
    ).scalar_one_or_none()
    if step is None:
        raise HTTPException(status_code=404, detail="CBT module step not found")
    return step


@router.put("/steps/{step_id}", response_model=CbtStepOut)
async def update_cbt_step(
    step_id: int,
    payload: CbtStepPayload,
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> CbtStepOut:
    step = await _get_step_or_404(db, step_id)
    for field, value in payload.model_dump(exclude_unset=True, exclude={"module_id"}).items():
        setattr(step, field, value)
    if payload.module_id is not None and payload.module_id != step.module_id:
        module = (
            await db.execute(select(CbtModule).where(CbtModule.id == payload.module_id))
        ).scalar_one_or_none()
        if module is None:
            raise HTTPException(status_code=404, detail="Target CBT module not found")
        step.module_id = payload.module_id
    await db.commit()
    await db.refresh(step)
    return step


@router.delete("/steps/{step_id}")
async def delete_cbt_step(
    step_id: int,
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> Dict[str, Any]:
    step = await _get_step_or_404(db, step_id)
    await db.delete(step)
    await db.commit()
    return {"ok": True, "deleted_id": step_id}


# ========================================
# Module routes
# ========================================

async def _get_module_or_404(db: AsyncSession, module_id: int) -> CbtModule:
    module = (
        await db.execute(select(CbtModule).where(CbtModule.id == module_id))
    ).scalar_one_or_none()
    if module is None:
        raise HTTPException(status_code=404, detail="CBT module not found")
    return module


@router.get("", response_model=CbtModuleListOut)
async def list_cbt_modules(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> CbtModuleListOut:
    total = (
        await db.execute(select(func.count(CbtModule.id)))
    ).scalar_one()
    rows = (
        await db.execute(
            select(CbtModule)
            .order_by(CbtModule.id.asc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).scalars().all()
    return CbtModuleListOut(items=list(rows), total_count=int(total))


@router.post("", response_model=CbtModuleOut)
async def create_cbt_module(
    payload: CbtModulePayload,
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> CbtModuleOut:
    module = CbtModule(title=payload.title, description=payload.description)
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return module


@router.get("/{module_id}/steps", response_model=List[CbtStepOut])
async def list_cbt_steps(
    module_id: int,
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> List[CbtStepOut]:
    await _get_module_or_404(db, module_id)
    rows = (
        await db.execute(
            select(CbtModuleStep)
            .where(CbtModuleStep.module_id == module_id)
            .order_by(CbtModuleStep.step_order.asc(), CbtModuleStep.id.asc())
        )
    ).scalars().all()
    return list(rows)


@router.post("/{module_id}/steps", response_model=CbtStepOut)
async def create_cbt_step(
    module_id: int,
    payload: CbtStepPayload,
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> CbtStepOut:
    await _get_module_or_404(db, module_id)
    step = CbtModuleStep(
        module_id=module_id,
        step_order=payload.step_order,
        step_type=payload.step_type,
        content=payload.content,
        user_input_type=payload.user_input_type,
        user_input_variable=payload.user_input_variable,
        feedback_prompt=payload.feedback_prompt,
        options=payload.options,
        tool_to_run=payload.tool_to_run,
        is_skippable=payload.is_skippable,
        delay_after_ms=payload.delay_after_ms,
        parent_id=payload.parent_id,
        extra_data=payload.extra_data,
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


@router.put("/{module_id}", response_model=CbtModuleOut)
async def update_cbt_module(
    module_id: int,
    payload: CbtModulePayload,
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> CbtModuleOut:
    module = await _get_module_or_404(db, module_id)
    module.title = payload.title
    module.description = payload.description
    await db.commit()
    await db.refresh(module)
    return module


@router.delete("/{module_id}")
async def delete_cbt_module(
    module_id: int,
    db: AsyncSession = Depends(get_async_db),
    _admin: Any = Depends(get_admin_user),
) -> Dict[str, Any]:
    module = await _get_module_or_404(db, module_id)
    await db.delete(module)
    await db.commit()
    return {"ok": True, "deleted_id": module_id}
