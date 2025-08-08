# backend/app/routes/agents.py
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, asc, select
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from app.database import get_async_db
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
from app.agents.analytics_agent import AnalyticsAgent
from app.agents.intervention_agent import InterventionAgent
from app.agents.triage_agent import TriageAgent

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
        analytics_agent = AnalyticsAgent(db=db)
        
        # The run_analysis method should handle its own status reporting and background execution.
        # We can pass the background_tasks object if the agent needs to schedule sub-tasks.
        report_id = await analytics_agent.run_analysis(
            period=period,
            triggered_by=f"admin_{admin_user.id}",
            background_tasks=background_tasks
        )
        
        if not report_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initiate analytics analysis report."
            )
        
        return AgentApiResponse(
            success=True,
            message=f"Analytics analysis triggered for {period} period",
            data={"report_id": report_id, "status": "pending"}
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
            query = query.where(AnalyticsReport.status == status_filter)
        if period_filter:
            query = query.where(AnalyticsReport.report_period == period_filter)

        # Get total count
        total_query = select(func.count()).select_from(query.alias())
        total_result = await db.execute(total_query)
        total = total_result.scalar_one()

        # Apply pagination and ordering
        paginated_query = query.order_by(desc(AnalyticsReport.generated_at))\
                               .offset((page - 1) * size)\
                               .limit(size)
        reports_result = await db.execute(paginated_query)
        reports = reports_result.scalars().all()
        
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
        intervention_agent = InterventionAgent(db=db)
        db_campaign = await intervention_agent.create_campaign(campaign_data=campaign)

        if not db_campaign:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create intervention campaign"
            )

        return db_campaign

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating intervention campaign: {e}", exc_info=True)
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
            query = query.where(InterventionCampaign.status == status_filter)
        if campaign_type_filter:
            query = query.where(InterventionCampaign.campaign_type == campaign_type_filter)

        # Get total count
        total_query = select(func.count()).select_from(query.alias())
        total_result = await db.execute(total_query)
        total = total_result.scalar_one()

        # Apply pagination and ordering
        paginated_query = query.order_by(desc(InterventionCampaign.created_at))\
                               .offset((page - 1) * size)\
                               .limit(size)
        campaigns_result = await db.execute(paginated_query)
        campaigns = campaigns_result.scalars().all()
        
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
        intervention_agent = InterventionAgent(db=db)
        campaign = await intervention_agent.update_campaign(campaign_id, campaign_update)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        return campaign
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign {campaign_id}: {e}", exc_info=True)
        # Rollback is handled by the agent or session manager in async context
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
        intervention_agent = InterventionAgent(db=db)
        result = await intervention_agent.execute_campaign(campaign_id, background_tasks)

        if not result or not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Failed to execute campaign")
            )

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
        triage_agent = TriageAgent(db=db)
        
        classification_result = await triage_agent.classify_and_escalate(
            conversation_id=classification_request.conversation_id,
            user_id=current_user.id, # Assuming the user is the one making the request
            message_content=[msg.content for msg in classification_request.messages]
        )

        if not classification_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Triage agent failed to produce a classification."
            )

        return classification_result
        
    except Exception as e:
        logger.error(f"Error in triage classification: {e}", exc_info=True)
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
            query = query.where(TriageAssessment.severity_level == severity_filter)
        if user_id_filter:
            query = query.where(TriageAssessment.user_id == user_id_filter)
        if crisis_only:
            query = query.where(TriageAssessment.severity_level == SeverityLevel.CRISIS)

        # Get total count
        total_query = select(func.count()).select_from(query.alias())
        total_result = await db.execute(total_query)
        total = total_result.scalar_one()

        # Apply pagination and ordering
        paginated_query = query.order_by(desc(TriageAssessment.assessed_at))\
                               .offset((page - 1) * size)\
                               .limit(size)
        assessments_result = await db.execute(paginated_query)
        assessments = assessments_result.scalars().all()
        
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
        analytics_reports_count_res = await db.execute(select(func.count(AnalyticsReport.id)))
        analytics_reports_count = analytics_reports_count_res.scalar_one()

        # Active campaigns count
        active_campaigns_count_res = await db.execute(
            select(func.count(InterventionCampaign.id)).where(InterventionCampaign.status == CampaignStatus.ACTIVE)
        )
        active_campaigns_count = active_campaigns_count_res.scalar_one()

        # Triage assessments today
        today = datetime.utcnow().date()
        triage_assessments_today_res = await db.execute(
            select(func.count(TriageAssessment.id)).where(func.date(TriageAssessment.assessed_at) == today)
        )
        triage_assessments_today = triage_assessments_today_res.scalar_one()

        # Crisis alerts count (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        crisis_alerts_count_res = await db.execute(
            select(func.count(TriageAssessment.id)).where(
                TriageAssessment.severity_level == SeverityLevel.CRISIS,
                TriageAssessment.assessed_at >= yesterday
            )
        )
        crisis_alerts_count = crisis_alerts_count_res.scalar_one()

        # Average assessment confidence
        avg_confidence_result = await db.execute(select(func.avg(TriageAssessment.confidence_score)))
        avg_assessment_confidence = avg_confidence_result.scalar() or 0.0

        # Last analytics run
        last_analytics_res = await db.execute(
            select(AnalyticsReport)
            .where(AnalyticsReport.status == ReportStatus.COMPLETED)
            .order_by(desc(AnalyticsReport.generated_at))
            .limit(1)
        )
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
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get performance metrics for all agents"""
    logger.info(f"Admin {admin_user.id} requesting performance metrics")
    
    try:
        metrics = []
        
        for agent_type in [AgentType.ANALYTICS, AgentType.INTERVENTION, AgentType.TRIAGE]:
            # Get logs for this agent type
            logs = db.query(AgentSystemLog).filter(
                AgentSystemLog.agent_type == agent_type
            ).order_by(desc(AgentSystemLog.event_timestamp)).limit(100).all()
            
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

async def execute_analytics_analysis(report_id: int, db: Session):
    """Background task to execute analytics analysis"""
    # TODO: Implement actual analytics logic
    pass

async def execute_campaign_task(campaign_id: int, db: Session):
    """Background task to execute intervention campaign"""
    # TODO: Implement actual campaign execution logic
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