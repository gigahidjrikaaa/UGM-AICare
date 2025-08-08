# backend/app/routes/agents.py
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, asc, select
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from app.database import get_async_db, AsyncSessionLocal
from app.models import User, Conversation
from app.models.agents import (
    AnalyticsReport, InterventionCampaign, CampaignExecution, 
    TriageAssessment, AgentSystemLog, AgentConfiguration
)
from app.schemas.agents import (
    AnalyticsReportCreate, AnalyticsReportResponse, AnalyticsReportSummary,
    InterventionCampaignCreate, InterventionCampaignUpdate, InterventionCampaignResponse,
    CampaignExecutionResponse, TriageAssessmentCreate, TriageAssessmentResponse,
    TriageClassificationRequest, TriageClassificationResponse,
    AgentSystemLogCreate, AgentSystemLogResponse,
    AgentConfigurationCreate, AgentConfigurationUpdate, AgentConfigurationResponse,
    AgentDashboardStats, AgentPerformanceMetrics, AgentTrendAnalysis,
    BulkCampaignUpdate, BulkTriageReview, AgentApiResponse,
    PaginatedAnalyticsReports, PaginatedCampaigns, PaginatedTriageAssessments,
    AgentType, ReportStatus, CampaignStatus, SeverityLevel
)
from app.dependencies import get_current_active_user
from app.routes.admin import get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/agents",
    tags=["AI Agents"],
    dependencies=[]
)

# ========================================
# ANALYTICS AGENT ENDPOINTS
# ========================================

@router.post("/analytics/trigger", response_model=AgentApiResponse)
async def trigger_analytics_analysis(
    background_tasks: BackgroundTasks,
    period: str = Query("weekly", description="Analysis period"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Manually trigger analytics agent execution"""
    logger.info(f"Admin {admin_user.id} triggering analytics analysis for period: {period}")
    
    try:
        # Check if analysis is already running
        running_report_res = await db.execute(select(AnalyticsReport).filter(
            AnalyticsReport.status == ReportStatus.RUNNING
        ))
        running_report = running_report_res.scalar_one_or_none()
        
        if running_report:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Analytics analysis is already running"
            )
        
        # Create pending report
        report = AnalyticsReport(
            report_period=period,
            status=ReportStatus.PENDING,
            insights={},
            data_sources={"triggered_by": f"admin_{admin_user.id}"}
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        
        # Add background task to execute analysis
        background_tasks.add_task(execute_analytics_analysis, report.id)
        
        return AgentApiResponse(
            success=True,
            message=f"Analytics analysis triggered for {period} period",
            data={"report_id": report.id, "status": "pending"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering analytics analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger analytics analysis"
        )

@router.get("/analytics/reports", response_model=PaginatedAnalyticsReports)
async def get_analytics_reports(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: Optional[ReportStatus] = Query(None),
    period_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get paginated list of analytics reports"""
    logger.info(f"Admin {admin_user.id} requesting analytics reports")
    
    try:
        query = select(AnalyticsReport)
        
        # Apply filters
        if status_filter:
            query = query.filter(AnalyticsReport.status == status_filter)
        if period_filter:
            query = query.filter(AnalyticsReport.report_period == period_filter)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0
        
        # Apply pagination and ordering
        paged_query = query.order_by(desc(AnalyticsReport.generated_at)).offset((page - 1) * size).limit(size)
        reports_res = await db.execute(paged_query)
        reports = reports_res.scalars().all()
        
        # Convert to summary format
        items = []
        for report in reports:
            triggered_campaigns_count = len(report.triggered_campaigns) if report.triggered_campaigns else 0
            key_insights_count = len(report.insights.get('key_insights', [])) if report.insights else 0
            
            items.append(AnalyticsReportSummary(
                id=report.id,
                generated_at=report.generated_at,
                report_period=report.report_period,
                status=report.status,
                users_analyzed=report.users_analyzed,
                conversations_analyzed=report.conversations_analyzed,
                key_insights_count=key_insights_count,
                triggered_campaigns_count=triggered_campaigns_count
            ))
        
        return PaginatedAnalyticsReports(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    except Exception as e:
        logger.error(f"Error fetching analytics reports: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics reports"
        )

@router.get("/analytics/reports/{report_id}", response_model=AnalyticsReportResponse)
async def get_analytics_report(
    report_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get detailed analytics report"""
    logger.info(f"Admin {admin_user.id} requesting analytics report {report_id}")
    
    try:
        result = await db.execute(select(AnalyticsReport).filter(AnalyticsReport.id == report_id))
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analytics report not found"
            )
        
        return AnalyticsReportResponse.from_orm(report)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analytics report {report_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics report"
        )

# ========================================
# INTERVENTION AGENT ENDPOINTS
# ========================================

@router.post("/intervention/campaigns", response_model=InterventionCampaignResponse)
async def create_intervention_campaign(
    campaign: InterventionCampaignCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Create new intervention campaign"""
    logger.info(f"Admin {admin_user.id} creating intervention campaign: {campaign.campaign_name}")
    
    try:
        db_campaign = InterventionCampaign(
            triggered_by_report_id=campaign.triggered_by_report_id,
            campaign_name=campaign.campaign_name,
            campaign_type=campaign.campaign_type,
            target_criteria=campaign.target_criteria,
            content=campaign.content,
            resources=campaign.resources,
            scheduled_at=campaign.scheduled_at,
            status=CampaignStatus.DRAFT
        )
        
        db.add(db_campaign)
        await db.commit()
        await db.refresh(db_campaign)
        
        return InterventionCampaignResponse.from_orm(db_campaign)
        
    except Exception as e:
        logger.error(f"Error creating intervention campaign: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create intervention campaign"
        )

@router.get("/intervention/campaigns", response_model=PaginatedCampaigns)
async def get_intervention_campaigns(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: Optional[CampaignStatus] = Query(None),
    campaign_type_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get paginated list of intervention campaigns"""
    logger.info(f"Admin {admin_user.id} requesting intervention campaigns")
    
    try:
        query = select(InterventionCampaign)
        
        # Apply filters
        if status_filter:
            query = query.filter(InterventionCampaign.status == status_filter)
        if campaign_type_filter:
            query = query.filter(InterventionCampaign.campaign_type == campaign_type_filter)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0
        
        # Apply pagination and ordering
        paged_query = query.order_by(desc(InterventionCampaign.created_at)).offset((page - 1) * size).limit(size)
        campaigns_res = await db.execute(paged_query)
        campaigns = campaigns_res.scalars().all()
        
        items = [InterventionCampaignResponse.from_orm(campaign) for campaign in campaigns]
        
        return PaginatedCampaigns(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    except Exception as e:
        logger.error(f"Error fetching intervention campaigns: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch intervention campaigns"
        )

@router.put("/intervention/campaigns/{campaign_id}", response_model=InterventionCampaignResponse)
async def update_intervention_campaign(
    campaign_id: int,
    campaign_update: InterventionCampaignUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Update intervention campaign"""
    logger.info(f"Admin {admin_user.id} updating campaign {campaign_id}")
    
    try:
        result = await db.execute(select(InterventionCampaign).filter(InterventionCampaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        # Update fields
        update_data = campaign_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(campaign, field, value)
        
        await db.commit()
        await db.refresh(campaign)
        
        return InterventionCampaignResponse.from_orm(campaign)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign {campaign_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update campaign"
        )

@router.post("/intervention/campaigns/{campaign_id}/execute", response_model=AgentApiResponse)
async def execute_intervention_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Execute intervention campaign"""
    logger.info(f"Admin {admin_user.id} executing campaign {campaign_id}")
    
    try:
        result = await db.execute(select(InterventionCampaign).filter(InterventionCampaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        if campaign.status != CampaignStatus.DRAFT and campaign.status != CampaignStatus.SCHEDULED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign cannot be executed in current status"
            )
        
        # Update campaign status
        campaign.status = CampaignStatus.ACTIVE
        campaign.executed_at = datetime.utcnow()
        await db.commit()
        
        # Add background task to execute campaign
        background_tasks.add_task(execute_campaign_task, campaign_id)
        
        return AgentApiResponse(
            success=True,
            message=f"Campaign {campaign_id} execution started",
            data={"campaign_id": campaign_id, "status": "executing"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing campaign {campaign_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute campaign"
        )

# ========================================
# TRIAGE AGENT ENDPOINTS
# ========================================

@router.post("/triage/classify", response_model=TriageClassificationResponse)
async def classify_conversation(
    classification_request: TriageClassificationRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Real-time conversation classification by Triage Agent"""
    logger.info(f"Triage classification for conversation {classification_request.conversation_id}")
    
    try:
        # Here you would implement the actual triage logic
        # For now, returning a mock response
        # TODO: Implement actual AI-based classification
        
        severity = classify_message_severity(classification_request.messages)
        confidence = calculate_confidence_score(classification_request.messages)
        action = determine_action_from_severity(severity)
        resources = get_recommended_resources(severity, classification_request.context)
        crisis_indicators = detect_crisis_indicators(classification_request.messages)
        
        # Create assessment record
        assessment = TriageAssessment(
            conversation_id=classification_request.conversation_id,
            user_id=classification_request.user_id,
            severity_level=severity,
            confidence_score=confidence,
            crisis_indicators={"indicators": crisis_indicators},
            recommended_action=action,
            recommended_resources={"resources": resources},
            follow_up_required=severity in [SeverityLevel.HIGH, SeverityLevel.CRISIS],
            escalation_needed=severity == SeverityLevel.CRISIS
        )
        
        db.add(assessment)
        await db.commit()
        await db.refresh(assessment)
        
        return TriageClassificationResponse(
            severity_level=severity,
            confidence_score=confidence,
            recommended_action=action,
            recommended_resources=resources,
            crisis_indicators=crisis_indicators,
            follow_up_required=assessment.follow_up_required,
            escalation_needed=assessment.escalation_needed,
            assessment_id=assessment.id
        )
        
    except Exception as e:
        logger.error(f"Error in triage classification: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to classify conversation"
        )

@router.get("/triage/assessments", response_model=PaginatedTriageAssessments)
async def get_triage_assessments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    severity_filter: Optional[SeverityLevel] = Query(None),
    user_id_filter: Optional[int] = Query(None),
    crisis_only: bool = Query(False),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get paginated list of triage assessments"""
    logger.info(f"Admin {admin_user.id} requesting triage assessments")
    
    try:
        query = select(TriageAssessment)
        
        # Apply filters
        if severity_filter:
            query = query.filter(TriageAssessment.severity_level == severity_filter)
        if user_id_filter:
            query = query.filter(TriageAssessment.user_id == user_id_filter)
        if crisis_only:
            query = query.filter(TriageAssessment.severity_level == SeverityLevel.CRISIS)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0
        
        # Apply pagination and ordering
        paged_query = query.order_by(desc(TriageAssessment.assessed_at)).offset((page - 1) * size).limit(size)
        assessments_res = await db.execute(paged_query)
        assessments = assessments_res.scalars().all()
        
        items = [TriageAssessmentResponse.from_orm(assessment) for assessment in assessments]
        
        return PaginatedTriageAssessments(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    except Exception as e:
        logger.error(f"Error fetching triage assessments: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch triage assessments"
        )

# ========================================
# DASHBOARD AND MONITORING ENDPOINTS
# ========================================

@router.get("/dashboard/stats", response_model=AgentDashboardStats)
async def get_agent_dashboard_stats(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get agent system dashboard statistics"""
    logger.info(f"Admin {admin_user.id} requesting dashboard stats")
    
    try:
        # Analytics reports count
        analytics_reports_count = (await db.execute(select(func.count(AnalyticsReport.id)))).scalar() or 0
        
        # Active campaigns count
        active_campaigns_count = (await db.execute(select(func.count(InterventionCampaign.id)).filter(
            InterventionCampaign.status == CampaignStatus.ACTIVE
        ))).scalar() or 0
        
        # Triage assessments today
        today = datetime.utcnow().date()
        triage_assessments_today = (await db.execute(select(func.count(TriageAssessment.id)).filter(
            func.date(TriageAssessment.assessed_at) == today
        ))).scalar() or 0
        
        # Crisis alerts count (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        crisis_alerts_count = (await db.execute(select(func.count(TriageAssessment.id)).filter(
            TriageAssessment.severity_level == SeverityLevel.CRISIS,
            TriageAssessment.assessed_at >= yesterday
        ))).scalar() or 0
        
        # Average assessment confidence
        avg_confidence_result = (await db.execute(select(func.avg(TriageAssessment.confidence_score)))).scalar()
        avg_assessment_confidence = float(avg_confidence_result) if avg_confidence_result else 0.0
        
        # Last analytics run
        last_analytics_res = await db.execute(select(AnalyticsReport).filter(
            AnalyticsReport.status == ReportStatus.COMPLETED
        ).order_by(desc(AnalyticsReport.generated_at)))
        last_analytics = last_analytics_res.scalar_one_or_none()
        
        return AgentDashboardStats(
            analytics_reports_count=analytics_reports_count,
            active_campaigns_count=active_campaigns_count,
            triage_assessments_today=triage_assessments_today,
            crisis_alerts_count=crisis_alerts_count,
            avg_assessment_confidence=avg_assessment_confidence,
            last_analytics_run=last_analytics.generated_at if last_analytics else None,
            next_analytics_scheduled=None,  # TODO: Implement scheduling
            system_health_status="healthy"  # TODO: Implement health check
        )
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard statistics"
        )

@router.get("/performance", response_model=List[AgentPerformanceMetrics])
async def get_agent_performance_metrics(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get performance metrics for all agents"""
    logger.info(f"Admin {admin_user.id} requesting performance metrics")
    
    try:
        metrics = []
        
        for agent_type in [AgentType.ANALYTICS, AgentType.INTERVENTION, AgentType.TRIAGE]:
            # Get logs for this agent type
            logs_res = await db.execute(select(AgentSystemLog).filter(
                AgentSystemLog.agent_type == agent_type
            ).order_by(desc(AgentSystemLog.event_timestamp)).limit(100))
            logs = logs_res.scalars().all()
            
            if logs:
                success_count = len([log for log in logs if log.status == "success"])
                success_rate = (success_count / len(logs)) * 100
                avg_processing_time = sum([log.processing_time_ms for log in logs if log.processing_time_ms]) / len(logs)
                
                # Error count in last 24 hours
                yesterday = datetime.utcnow() - timedelta(days=1)
                error_count = len([log for log in logs if log.status == "error" and log.event_timestamp >= yesterday])
                
                last_execution = logs[0].event_timestamp if logs else None
                health_status = "healthy" if success_rate > 90 else "warning" if success_rate > 70 else "critical"
            else:
                success_rate = 0.0
                avg_processing_time = 0
                error_count = 0
                last_execution = None
                health_status = "unknown"
            
            metrics.append(AgentPerformanceMetrics(
                agent_type=agent_type,
                success_rate=success_rate,
                avg_processing_time_ms=int(avg_processing_time),
                total_executions=len(logs),
                last_execution=last_execution,
                error_count_24h=error_count,
                health_status=health_status
            ))
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error fetching performance metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch performance metrics"
        )

# ========================================
# HELPER FUNCTIONS (TO BE IMPLEMENTED)
# ========================================

async def execute_analytics_analysis(report_id: int):
    """Background task to execute analytics analysis"""
    async with AsyncSessionLocal() as db:
        # TODO: Implement actual analytics logic using the async 'db' session
        pass

async def execute_campaign_task(campaign_id: int):
    """Background task to execute intervention campaign"""
    async with AsyncSessionLocal() as db:
        # TODO: Implement actual campaign execution logic using the async 'db' session
        pass

def classify_message_severity(messages: List[Dict[str, Any]]) -> SeverityLevel:
    """Classify message severity using AI"""
    # TODO: Implement actual AI classification
    return SeverityLevel.LOW

def calculate_confidence_score(messages: List[Dict[str, Any]]) -> int:
    """Calculate confidence score for classification"""
    # TODO: Implement confidence calculation
    return 85

def determine_action_from_severity(severity: SeverityLevel) -> str:
    """Determine recommended action based on severity"""
    action_map = {
        SeverityLevel.LOW: "self_help",
        SeverityLevel.MEDIUM: "counseling", 
        SeverityLevel.HIGH: "counseling",
        SeverityLevel.CRISIS: "emergency"
    }
    return action_map.get(severity, "self_help")

def get_recommended_resources(severity: SeverityLevel, context: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Get recommended resources based on severity and context"""
    # TODO: Implement resource recommendation logic
    return [
        {"type": "article", "title": "Managing Stress", "url": "/resources/stress"},
        {"type": "contact", "title": "UGM Counseling", "phone": "+62-274-xxx-xxxx"}
    ]

def detect_crisis_indicators(messages: List[Dict[str, Any]]) -> List[str]:
    """Detect crisis indicators in messages"""
    # TODO: Implement crisis detection logic
    return []
