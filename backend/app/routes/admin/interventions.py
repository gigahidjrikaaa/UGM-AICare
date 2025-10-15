"""Proactive Outreach (Interventions) admin endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import CampaignExecution, InterventionCampaign
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
    await db.commit()
    await db.refresh(row)
    return _to_campaign_response(row)

