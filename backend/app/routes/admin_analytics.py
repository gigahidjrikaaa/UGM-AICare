"""
Admin Analytics API Routes

Provides endpoints for Safety Agent performance and intervention plan analytics
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.services.agent_performance_service import AgentPerformanceService
from app.services.intervention_analytics_service import InterventionPlanAnalyticsService

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get("/agent-performance/all")
async def get_all_agent_performance(
    time_period_days: int = Query(30, ge=1, le=365, description="Time period in days"),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """
    Get comprehensive performance metrics for all Safety Agents
    
    Returns metrics for:
    - STA (Safety Triage Agent)
    - SCA (Support Coach Agent)
    - SDA (Service Desk Agent)
    - IA (Intelligence Analytics)
    - Orchestrator (LangGraph)
    """
    return await AgentPerformanceService.get_all_agent_metrics(db, time_period_days)


@router.get("/agent-performance/sta")
async def get_sta_performance(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """Get Safety Triage Agent performance metrics"""
    return await AgentPerformanceService.get_sta_performance(db, time_period_days)


@router.get("/agent-performance/sca")
async def get_sca_performance(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """Get Support Coach Agent performance metrics"""
    return await AgentPerformanceService.get_sca_performance(db, time_period_days)


@router.get("/agent-performance/sda")
async def get_sda_performance(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """Get Service Desk Agent performance metrics"""
    return await AgentPerformanceService.get_sda_performance(db, time_period_days)


@router.get("/agent-performance/ia")
async def get_ia_performance(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """Get Intelligence Analytics performance metrics"""
    return await AgentPerformanceService.get_ia_performance(db, time_period_days)


@router.get("/agent-performance/orchestrator")
async def get_orchestrator_performance(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """Get LangGraph Orchestrator performance metrics"""
    return await AgentPerformanceService.get_orchestrator_performance(db, time_period_days)


@router.get("/intervention-plans/comprehensive")
async def get_comprehensive_intervention_analytics(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """
    Get comprehensive intervention plan analytics
    
    Includes:
    - Overview metrics
    - Analytics by plan type
    - Progress distribution
    - Step completion analytics
    - Recent completions
    """
    return await InterventionPlanAnalyticsService.get_comprehensive_analytics(db, time_period_days)


@router.get("/intervention-plans/overview")
async def get_intervention_overview(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, Any]:
    """Get intervention plan overview metrics"""
    return await InterventionPlanAnalyticsService.get_overview_metrics(db, time_period_days)


@router.get("/intervention-plans/by-type")
async def get_intervention_by_type(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> List[Dict[str, Any]]:
    """Get intervention plan analytics broken down by plan type"""
    return await InterventionPlanAnalyticsService.get_plan_type_analytics(db, time_period_days)


@router.get("/intervention-plans/progress-distribution")
async def get_progress_distribution(
    time_period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> Dict[str, int]:
    """Get distribution of plans by progress status"""
    return await InterventionPlanAnalyticsService.get_progress_distribution(db, time_period_days)


@router.get("/intervention-plans/recent-completions")
async def get_recent_completions(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_async_db),
    _user = Depends(get_admin_user)
) -> List[Dict[str, Any]]:
    """Get recently completed intervention plans"""
    return await InterventionPlanAnalyticsService.get_recent_completions(db, limit)
