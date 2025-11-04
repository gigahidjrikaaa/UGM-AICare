"""Admin API routes for Support Coach Agent (SCA) management.

Provides admin-only endpoints for:
- Viewing all intervention plans across users
- Analytics on plan effectiveness
- User progress monitoring
- CBT module usage tracking
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.core.auth import get_current_user, require_role
from app.models.user import User
from app.domains.mental_health.models.interventions import InterventionPlanRecord
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/admin/sca", tags=["admin-sca"])


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class InterventionPlanSummary(BaseModel):
    """Summary of an intervention plan for admin list view."""
    id: int
    user_hash: str = Field(description="Anonymized user identifier")
    plan_title: str
    risk_level: Optional[int]
    status: str
    is_active: bool
    total_steps: int
    completed_steps: int
    completion_percentage: float
    created_at: datetime
    last_viewed_at: Optional[datetime]
    
    # Engagement metrics
    days_since_created: int
    days_since_last_viewed: Optional[int]
    
    class Config:
        from_attributes = True


class InterventionPlanDetail(BaseModel):
    """Detailed intervention plan for admin inspection."""
    id: int
    user_hash: str
    session_id: Optional[str]
    plan_title: str
    risk_level: Optional[int]
    plan_data: dict
    completion_tracking: dict
    total_steps: int
    completed_steps: int
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_viewed_at: Optional[datetime]
    archived_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class InterventionPlansListResponse(BaseModel):
    """Paginated list of intervention plans."""
    plans: List[InterventionPlanSummary]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class SCAAnalytics(BaseModel):
    """Analytics for SCA effectiveness."""
    # Overview
    total_plans: int
    active_plans: int
    completed_plans: int
    archived_plans: int
    
    # Engagement
    avg_completion_percentage: float
    avg_days_to_completion: Optional[float]
    plans_viewed_in_24h: int
    plans_not_viewed_in_7d: int
    
    # Risk distribution
    risk_level_distribution: dict[str, int]
    
    # Effectiveness
    completion_rate: float
    abandonment_rate: float
    
    # Timeframe
    timeframe_days: int
    generated_at: datetime


class CBTModuleUsage(BaseModel):
    """CBT module usage statistics."""
    module_name: str
    usage_count: int
    avg_completion_rate: float
    total_steps: int


class UserProgress(BaseModel):
    """Individual user progress summary."""
    user_hash: str
    total_plans: int
    active_plans: int
    completed_plans: int
    avg_completion_percentage: float
    last_plan_created: datetime
    engagement_score: float = Field(description="0-100 score based on activity")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def anonymize_user_id(user_id: int) -> str:
    """Convert user ID to anonymized hash for privacy."""
    import hashlib
    return hashlib.sha256(f"user_{user_id}".encode()).hexdigest()[:16]


def calculate_engagement_score(
    total_plans: int,
    completed_plans: int,
    avg_completion: float,
    days_since_last: Optional[int]
) -> float:
    """Calculate user engagement score (0-100)."""
    score = 0.0
    
    # Plans created (max 30 points)
    score += min(total_plans * 10, 30)
    
    # Completion rate (max 40 points)
    if total_plans > 0:
        completion_rate = completed_plans / total_plans
        score += completion_rate * 40
    
    # Progress on active plans (max 20 points)
    score += (avg_completion / 100) * 20
    
    # Recency bonus (max 10 points)
    if days_since_last is not None:
        if days_since_last <= 1:
            score += 10
        elif days_since_last <= 7:
            score += 5
        elif days_since_last <= 30:
            score += 2
    
    return min(score, 100.0)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/interventions", response_model=InterventionPlansListResponse)
async def list_all_intervention_plans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: active, completed, archived"),
    risk_level: Optional[int] = Query(None, ge=0, le=3, description="Filter by risk level"),
    sort_by: str = Query("created_at", description="Sort by: created_at, completion_percentage, last_viewed_at"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    search: Optional[str] = Query(None, description="Search in plan titles"),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all intervention plans across all users (admin only).
    
    Features:
    - Pagination
    - Filtering by status and risk level
    - Sorting by multiple fields
    - Search by plan title
    - Privacy-preserving user hash
    """
    # Build query
    query = select(InterventionPlanRecord)
    
    # Apply filters
    filters = []
    if status:
        filters.append(InterventionPlanRecord.status == status)
    if risk_level is not None:
        filters.append(InterventionPlanRecord.risk_level == risk_level)
    if search:
        filters.append(InterventionPlanRecord.plan_title.ilike(f"%{search}%"))
    
    if filters:
        query = query.where(and_(*filters))
    
    # Apply sorting
    sort_column = getattr(InterventionPlanRecord, sort_by, InterventionPlanRecord.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    # Get total count
    count_query = select(func.count()).select_from(InterventionPlanRecord)
    if filters:
        count_query = count_query.where(and_(*filters))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    query = query.limit(page_size).offset((page - 1) * page_size)
    
    # Execute query
    result = await db.execute(query)
    plans = result.scalars().all()
    
    # Convert to response format
    now = datetime.now()
    plans_summary = []
    for plan in plans:
        days_since_created = (now - plan.created_at).days
        days_since_last_viewed = (now - plan.last_viewed_at).days if plan.last_viewed_at else None
        
        # Calculate completion percentage from tracking
        tracking = plan.completion_tracking or {}
        completed_step_indices = tracking.get("completed_steps", [])
        completion_pct = (len(completed_step_indices) / plan.total_steps * 100) if plan.total_steps > 0 else 0.0
        
        plans_summary.append(InterventionPlanSummary(
            id=plan.id,
            user_hash=anonymize_user_id(plan.user_id),
            plan_title=plan.plan_title,
            risk_level=plan.risk_level,
            status=plan.status,
            is_active=plan.is_active,
            total_steps=plan.total_steps,
            completed_steps=plan.completed_steps,
            completion_percentage=completion_pct,
            created_at=plan.created_at,
            last_viewed_at=plan.last_viewed_at,
            days_since_created=days_since_created,
            days_since_last_viewed=days_since_last_viewed
        ))
    
    return InterventionPlansListResponse(
        plans=plans_summary,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
        has_prev=page > 1
    )


@router.get("/interventions/{plan_id}", response_model=InterventionPlanDetail)
async def get_intervention_plan_detail(
    plan_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get detailed information about a specific intervention plan (admin only).
    
    Returns full plan data including steps, resources, and tracking.
    """
    query = select(InterventionPlanRecord).where(InterventionPlanRecord.id == plan_id)
    result = await db.execute(query)
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention plan {plan_id} not found"
        )
    
    return InterventionPlanDetail(
        id=plan.id,
        user_hash=anonymize_user_id(plan.user_id),
        session_id=plan.session_id,
        plan_title=plan.plan_title,
        risk_level=plan.risk_level,
        plan_data=plan.plan_data,
        completion_tracking=plan.completion_tracking,
        total_steps=plan.total_steps,
        completed_steps=plan.completed_steps,
        status=plan.status,
        is_active=plan.is_active,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        last_viewed_at=plan.last_viewed_at,
        archived_at=plan.archived_at
    )


@router.get("/analytics", response_model=SCAAnalytics)
async def get_sca_analytics(
    days: int = Query(30, ge=1, le=365, description="Timeframe in days"),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get analytics on SCA intervention plan effectiveness (admin only).
    
    Provides metrics on:
    - Total plans created
    - Completion rates
    - Engagement metrics
    - Risk level distribution
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Total plans in timeframe
    total_query = select(func.count()).select_from(InterventionPlanRecord).where(
        InterventionPlanRecord.created_at >= cutoff_date
    )
    total_result = await db.execute(total_query)
    total_plans = total_result.scalar() or 0
    
    # Active plans
    active_query = select(func.count()).select_from(InterventionPlanRecord).where(
        and_(
            InterventionPlanRecord.created_at >= cutoff_date,
            InterventionPlanRecord.status == "active",
            InterventionPlanRecord.is_active == True
        )
    )
    active_result = await db.execute(active_query)
    active_plans = active_result.scalar() or 0
    
    # Completed plans
    completed_query = select(func.count()).select_from(InterventionPlanRecord).where(
        and_(
            InterventionPlanRecord.created_at >= cutoff_date,
            InterventionPlanRecord.status == "completed"
        )
    )
    completed_result = await db.execute(completed_query)
    completed_plans = completed_result.scalar() or 0
    
    # Archived plans
    archived_query = select(func.count()).select_from(InterventionPlanRecord).where(
        and_(
            InterventionPlanRecord.created_at >= cutoff_date,
            InterventionPlanRecord.status == "archived"
        )
    )
    archived_result = await db.execute(archived_query)
    archived_plans = archived_result.scalar() or 0
    
    # Average completion percentage
    avg_completion_query = select(
        func.avg(
            case(
                (InterventionPlanRecord.total_steps > 0, 
                 InterventionPlanRecord.completed_steps * 100.0 / InterventionPlanRecord.total_steps),
                else_=0
            )
        )
    ).where(InterventionPlanRecord.created_at >= cutoff_date)
    avg_completion_result = await db.execute(avg_completion_query)
    avg_completion_pct = avg_completion_result.scalar() or 0.0
    
    # Plans viewed in last 24h
    viewed_24h_query = select(func.count()).select_from(InterventionPlanRecord).where(
        and_(
            InterventionPlanRecord.created_at >= cutoff_date,
            InterventionPlanRecord.last_viewed_at >= datetime.now() - timedelta(hours=24)
        )
    )
    viewed_24h_result = await db.execute(viewed_24h_query)
    plans_viewed_24h = viewed_24h_result.scalar() or 0
    
    # Plans not viewed in 7 days
    not_viewed_7d_query = select(func.count()).select_from(InterventionPlanRecord).where(
        and_(
            InterventionPlanRecord.created_at >= cutoff_date,
            InterventionPlanRecord.is_active == True,
            func.coalesce(InterventionPlanRecord.last_viewed_at, InterventionPlanRecord.created_at) 
                < datetime.now() - timedelta(days=7)
        )
    )
    not_viewed_7d_result = await db.execute(not_viewed_7d_query)
    plans_not_viewed_7d = not_viewed_7d_result.scalar() or 0
    
    # Risk level distribution
    risk_distribution_query = select(
        InterventionPlanRecord.risk_level,
        func.count()
    ).where(
        InterventionPlanRecord.created_at >= cutoff_date
    ).group_by(InterventionPlanRecord.risk_level)
    risk_distribution_result = await db.execute(risk_distribution_query)
    risk_distribution = {}
    risk_labels = {0: "low", 1: "medium", 2: "high", 3: "critical", None: "unknown"}
    for risk_level, count in risk_distribution_result:
        risk_distribution[risk_labels.get(risk_level, "unknown")] = count
    
    # Calculate rates
    completion_rate = (completed_plans / total_plans * 100) if total_plans > 0 else 0.0
    abandonment_rate = (archived_plans / total_plans * 100) if total_plans > 0 else 0.0
    
    # Average days to completion (for completed plans)
    avg_days_query = select(
        func.avg(
            func.extract('epoch', InterventionPlanRecord.updated_at - InterventionPlanRecord.created_at) / 86400
        )
    ).where(
        and_(
            InterventionPlanRecord.created_at >= cutoff_date,
            InterventionPlanRecord.status == "completed"
        )
    )
    avg_days_result = await db.execute(avg_days_query)
    avg_days_to_completion = avg_days_result.scalar()
    
    return SCAAnalytics(
        total_plans=total_plans,
        active_plans=active_plans,
        completed_plans=completed_plans,
        archived_plans=archived_plans,
        avg_completion_percentage=round(avg_completion_pct, 2),
        avg_days_to_completion=round(avg_days_to_completion, 2) if avg_days_to_completion else None,
        plans_viewed_in_24h=plans_viewed_24h,
        plans_not_viewed_in_7d=plans_not_viewed_7d,
        risk_level_distribution=risk_distribution,
        completion_rate=round(completion_rate, 2),
        abandonment_rate=round(abandonment_rate, 2),
        timeframe_days=days,
        generated_at=datetime.now()
    )


@router.get("/cbt-modules/usage", response_model=List[CBTModuleUsage])
async def get_cbt_module_usage(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get CBT module usage statistics from intervention plans (admin only).
    
    Analyzes plan_data JSON to extract module mentions and completion rates.
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Get all plans in timeframe
    query = select(InterventionPlanRecord).where(
        InterventionPlanRecord.created_at >= cutoff_date
    )
    result = await db.execute(query)
    plans = result.scalars().all()
    
    # Analyze module usage
    module_stats: dict[str, dict] = {}
    
    for plan in plans:
        plan_data = plan.plan_data or {}
        plan_steps = plan_data.get("plan_steps", [])
        resource_cards = plan_data.get("resource_cards", [])
        
        # Extract module names from steps and resources
        for step in plan_steps:
            step_title = step.get("title", "")
            # Simple heuristic: look for "CBT" or module-like titles
            if "CBT" in step_title or "Cognitive" in step_title or "Behavioral" in step_title:
                module_name = step_title
                if module_name not in module_stats:
                    module_stats[module_name] = {"count": 0, "total_steps": 0, "completed": 0}
                module_stats[module_name]["count"] += 1
                module_stats[module_name]["total_steps"] += 1
                if step.get("completed", False):
                    module_stats[module_name]["completed"] += 1
    
    # Convert to response format
    usage_list = []
    for module_name, stats in module_stats.items():
        avg_completion = (stats["completed"] / stats["total_steps"] * 100) if stats["total_steps"] > 0 else 0.0
        usage_list.append(CBTModuleUsage(
            module_name=module_name,
            usage_count=stats["count"],
            avg_completion_rate=round(avg_completion, 2),
            total_steps=stats["total_steps"]
        ))
    
    # Sort by usage count
    usage_list.sort(key=lambda x: x.usage_count, reverse=True)
    
    return usage_list


@router.get("/users/progress", response_model=List[UserProgress])
async def get_user_progress_summary(
    limit: int = Query(50, ge=1, le=200),
    min_plans: int = Query(1, ge=1, description="Minimum number of plans to include user"),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get aggregated user progress across intervention plans (admin only).
    
    Returns anonymized user summaries with engagement scores.
    """
    # Aggregate by user_id
    query = select(
        InterventionPlanRecord.user_id,
        func.count(InterventionPlanRecord.id).label("total_plans"),
        func.sum(case((InterventionPlanRecord.status == "active", 1), else_=0)).label("active_plans"),
        func.sum(case((InterventionPlanRecord.status == "completed", 1), else_=0)).label("completed_plans"),
        func.avg(
            case(
                (InterventionPlanRecord.total_steps > 0,
                 InterventionPlanRecord.completed_steps * 100.0 / InterventionPlanRecord.total_steps),
                else_=0
            )
        ).label("avg_completion"),
        func.max(InterventionPlanRecord.created_at).label("last_plan_created"),
        func.max(InterventionPlanRecord.last_viewed_at).label("last_viewed")
    ).group_by(
        InterventionPlanRecord.user_id
    ).having(
        func.count(InterventionPlanRecord.id) >= min_plans
    ).order_by(
        desc("total_plans")
    ).limit(limit)
    
    result = await db.execute(query)
    user_stats = result.all()
    
    # Convert to response format
    now = datetime.now()
    progress_list = []
    for stat in user_stats:
        days_since_last_viewed = None
        if stat.last_viewed:
            days_since_last_viewed = (now - stat.last_viewed).days
        
        engagement_score = calculate_engagement_score(
            total_plans=stat.total_plans,
            completed_plans=stat.completed_plans or 0,
            avg_completion=stat.avg_completion or 0.0,
            days_since_last=days_since_last_viewed
        )
        
        progress_list.append(UserProgress(
            user_hash=anonymize_user_id(stat.user_id),
            total_plans=stat.total_plans,
            active_plans=stat.active_plans or 0,
            completed_plans=stat.completed_plans or 0,
            avg_completion_percentage=round(stat.avg_completion or 0.0, 2),
            last_plan_created=stat.last_plan_created,
            engagement_score=round(engagement_score, 2)
        ))
    
    return progress_list
