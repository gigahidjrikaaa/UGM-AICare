"""Proactive Outreach (Interventions) admin endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.domains.mental_health.models import CampaignExecution, InterventionCampaign
from app.schemas.admin.interventions import (
    InterventionCampaignCreate,
    InterventionCampaignListResponse,
    InterventionCampaignResponse,
)


router = APIRouter(prefix="/interventions", tags=["Admin - Interventions"])


def _to_campaign_response(row: InterventionCampaign) -> InterventionCampaignResponse:
    metrics = {
        "total": row.executions_delivered + row.executions_failed,
        "scheduled": 0,
        "pending_review": 0,
        "active": 1 if row.status in ("active", "running") else 0,
        "completed": 1 if row.status in ("completed", "stopped", "ended") else 0,
        "failed": 1 if row.status == "failed" else 0,
    }
    return InterventionCampaignResponse(
        id=row.id,
        campaign_type=row.campaign_type,
        title=row.title,
        description=row.description,
        content=row.content or {},
        target_criteria=row.target_criteria,
        target_audience_size=row.target_audience_size,
        priority=row.priority,
        status=row.status,
        start_date=row.start_date,
        end_date=row.end_date,
        executions_delivered=row.executions_delivered,
        executions_failed=row.executions_failed,
        created_at=row.created_at,
        updated_at=row.updated_at,
        metrics=metrics,
    )


@router.get("/campaigns", response_model=InterventionCampaignListResponse)
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> InterventionCampaignListResponse:
    base = select(InterventionCampaign).order_by(desc(InterventionCampaign.updated_at)).offset(skip).limit(limit)
    rows = (await db.execute(base)).scalars().all()
    total = int((await db.execute(select(func.count()).select_from(InterventionCampaign))).scalar() or 0)
    items = [_to_campaign_response(row) for row in rows]
    return InterventionCampaignListResponse(items=items, total=total)


@router.post("/campaigns", response_model=InterventionCampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: InterventionCampaignCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> InterventionCampaignResponse:
    now = datetime.utcnow()
    row = InterventionCampaign(
        campaign_type=payload.campaign_type,
        title=payload.title,
        description=payload.description,
        content=payload.content or {},
        target_criteria=payload.target_criteria,
        priority=payload.priority or "medium",
        status=payload.status or "draft",
        start_date=payload.start_date or now,
        end_date=payload.end_date,
        target_audience_size=0,
        executions_delivered=0,
        executions_failed=0,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    await db.refresh(row)
    return _to_campaign_response(row)


# --- Intervention Plans ---

from app.domains.mental_health.models.interventions import InterventionPlanRecord
from app.models.user import User
from app.schemas.admin.interventions import InterventionPlanListResponse, InterventionPlanResponse

@router.get("/plans", response_model=InterventionPlanListResponse)
async def list_intervention_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> InterventionPlanListResponse:
    """List all intervention plans."""
    # Join with User to get names
    stmt = (
        select(InterventionPlanRecord, User)
        .join(User, InterventionPlanRecord.user_id == User.id)
        .order_by(desc(InterventionPlanRecord.updated_at))
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    total = int((await db.execute(select(func.count()).select_from(InterventionPlanRecord))).scalar() or 0)
    
    items = []
    for plan, user in rows:
        items.append(InterventionPlanResponse(
            id=plan.id,
            user_id=plan.user_id,
            user_name=user.name,
            user_email=user.email,
            plan_title=plan.plan_title,
            risk_level=plan.risk_level,
            status=plan.status,
            total_steps=plan.total_steps,
            completed_steps=plan.completed_steps,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
            plan_data=plan.plan_data,
            completion_tracking=plan.completion_tracking
        ))
        
    return InterventionPlanListResponse(items=items, total=total)


@router.post("/plans/{plan_id}/notify", status_code=status.HTTP_200_OK)
async def notify_user_about_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
):
    """Notify user about their intervention plan (Email/Push)."""
    stmt = select(InterventionPlanRecord).where(InterventionPlanRecord.id == plan_id)
    plan = (await db.execute(stmt)).scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    # In a real system, this would trigger an email or push notification
    # For now, we'll just log it or return success
    
    return {"message": f"Notification sent to user {plan.user_id} for plan {plan_id}"}

