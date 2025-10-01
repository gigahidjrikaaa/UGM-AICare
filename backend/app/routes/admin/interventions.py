"""Safety Coaching management endpoints for the admin panel."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.sca.schemas import (
    SCAFollowUpRequest,
    SCAFollowUpResponse,
    SCAInterveneRequest,
    SCAInterveneResponse,
)
from app.agents.sca.service import SupportCoachService, get_support_coach_service
from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import (
    CampaignExecution,
    InterventionAgentSettings,
    InterventionCampaign,
    TriageAssessment,
    User,
)
from app.schemas.admin import (
    CampaignMetrics,
    CampaignSummary,
    ExecutionSummary,
    InterventionCampaignCreate,
    InterventionCampaignListResponse,
    InterventionCampaignResponse,
    InterventionCampaignUpdate,
    InterventionExecutionListResponse,
    InterventionExecutionResponse,
    InterventionExecutionUpdate,
    InterventionOverview,
    InterventionSettings,
    InterventionSettingsUpdate,
    ManualInterventionCreate,
    QueueItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/safety-coaching", tags=["Admin - Safety Coaching"])

# --- Helpers -----------------------------------------------------------------

CAMPAIGN_ACTIVE_STATUSES: set[str] = {"active", "running", "launched"}
EXECUTION_PENDING_REVIEW: set[str] = {"pending_review", "awaiting_manual", "paused"}
EXECUTION_COMPLETED: set[str] = {"completed", "sent"}
EXECUTION_FAILURES: set[str] = {"failed", "cancelled", "error"}


async def _ensure_settings(db: AsyncSession) -> InterventionAgentSettings:
    result = await db.execute(select(InterventionAgentSettings).limit(1))
    settings = result.scalar_one_or_none()
    if settings is None:
        settings = InterventionAgentSettings(channels_enabled=["email"])
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    elif settings.channels_enabled is None:
        settings.channels_enabled = ["email"]
    return settings


def _campaign_metrics_from_counts(status_counts: Dict[str, int]) -> CampaignMetrics:
    total = sum(status_counts.values())
    scheduled = status_counts.get("scheduled", 0)
    pending_review = sum(status_counts.get(s, 0) for s in EXECUTION_PENDING_REVIEW)
    active = sum(status_counts.get(s, 0) for s in ("approved", "in_progress", "active"))
    completed = sum(status_counts.get(s, 0) for s in EXECUTION_COMPLETED)
    failed = sum(status_counts.get(s, 0) for s in EXECUTION_FAILURES)
    return CampaignMetrics(
        total=total,
        scheduled=scheduled,
        pending_review=pending_review,
        active=active,
        completed=completed,
        failed=failed,
    )


def _execution_to_response(
    execution: CampaignExecution,
    campaign: InterventionCampaign,
    user: Optional[User],
    *,
    plan_preview: SCAInterveneResponse | None = None,
) -> InterventionExecutionResponse:
    preview_payload: Dict[str, Any] | None = None
    if plan_preview is not None:
        preview_payload = plan_preview.model_dump(mode="json")
    elif isinstance(execution.trigger_data, dict):
        cached = execution.trigger_data.get("sca_plan_preview")
        if isinstance(cached, dict):
            preview_payload = cached

    payload = {
        "id": execution.id,
        "campaign_id": execution.campaign_id,
        "user_id": execution.user_id,
        "status": execution.status,
        "scheduled_at": execution.scheduled_at,
        "executed_at": execution.executed_at,
        "delivery_method": execution.delivery_method,
        "notes": execution.notes,
        "engagement_score": execution.engagement_score,
        "is_manual": execution.is_manual,
        "user_name": getattr(user, "name", None),
        "user_email": getattr(user, "email", None),
        "campaign_title": campaign.title,
        "priority": campaign.priority,
        "plan_preview": preview_payload,
    }

    return InterventionExecutionResponse.model_validate(payload)


def _queue_item_from_execution(
    execution: CampaignExecution,
    campaign: InterventionCampaign,
    user: Optional[User],
) -> QueueItem:
    return QueueItem(
        execution_id=execution.id,
        user_id=execution.user_id,
        user_name=getattr(user, "name", None),
        user_email=getattr(user, "email", None),
        status=execution.status,
        scheduled_at=execution.scheduled_at,
        campaign_id=execution.campaign_id,
        priority=campaign.priority,
        risk_score=execution.trigger_data.get("risk_score") if execution.trigger_data else None,
        severity_level=execution.trigger_data.get("severity") if execution.trigger_data else None,
        recommended_action=execution.trigger_data.get("recommended_action") if execution.trigger_data else None,
        delivery_method=execution.delivery_method,
        notes=execution.notes,
    )


def _merge_trigger_data(
    metadata: Optional[Dict[str, Any]],
    plan_preview: SCAInterveneResponse | None,
) -> Optional[Dict[str, Any]]:
    if plan_preview is None:
        return metadata

    merged = dict(metadata or {})
    merged["sca_plan_preview"] = plan_preview.model_dump(mode="json")
    return merged


# --- Overview ----------------------------------------------------------------

@router.get("/overview", response_model=InterventionOverview)
async def get_intervention_overview(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionOverview:
    """Return high-level metrics to power the intervention dashboard."""

    settings = await _ensure_settings(db)

    # Campaign status breakdown
    campaign_status_rows = await db.execute(
        select(InterventionCampaign.status, func.count(InterventionCampaign.id))
        .group_by(InterventionCampaign.status)
    )
    campaign_counts = {status: count for status, count in campaign_status_rows}
    campaign_summary = CampaignSummary(
        total=sum(campaign_counts.values()),
        active=sum(campaign_counts.get(s, 0) for s in CAMPAIGN_ACTIVE_STATUSES),
        paused=campaign_counts.get("paused", 0),
        draft=campaign_counts.get("created", 0) + campaign_counts.get("draft", 0),
        completed=campaign_counts.get("completed", 0),
    )

    # Execution breakdown
    execution_status_rows = await db.execute(
        select(CampaignExecution.status, func.count(CampaignExecution.id))
        .group_by(CampaignExecution.status)
    )
    execution_counts = {status: count for status, count in execution_status_rows}
    execution_summary = ExecutionSummary(
        total=sum(execution_counts.values()),
        scheduled=execution_counts.get("scheduled", 0),
        pending_review=sum(execution_counts.get(s, 0) for s in EXECUTION_PENDING_REVIEW),
        approved=execution_counts.get("approved", 0),
        completed=sum(execution_counts.get(s, 0) for s in EXECUTION_COMPLETED),
        failed=sum(execution_counts.get(s, 0) for s in EXECUTION_FAILURES),
    )

    queue_size = execution_summary.pending_review

    # Pull top pending executions for quick review cards
    pending_query = (
        select(CampaignExecution, InterventionCampaign, User)
        .join(InterventionCampaign, CampaignExecution.campaign_id == InterventionCampaign.id)
        .join(User, CampaignExecution.user_id == User.id, isouter=True)
        .filter(CampaignExecution.status.in_(EXECUTION_PENDING_REVIEW))
        .order_by(desc(CampaignExecution.scheduled_at))
        .limit(5)
    )
    pending_rows = await db.execute(pending_query)
    queue_preview = [
        _queue_item_from_execution(exec_, campaign, user)
        for exec_, campaign, user in pending_rows.all()
    ]

    # High-risk triage assessments from last 48 hours
    two_days_ago = datetime.utcnow() - timedelta(hours=48)
    triage_query = (
        select(TriageAssessment, User)
        .join(User, TriageAssessment.user_id == User.id, isouter=True)
        .where(TriageAssessment.risk_score >= settings.risk_score_threshold)
        .where(TriageAssessment.created_at >= two_days_ago)
        .order_by(desc(TriageAssessment.risk_score), desc(TriageAssessment.created_at))
        .limit(5)
    )
    triage_rows = await db.execute(triage_query)
    triage_preview = [
        QueueItem(
            execution_id=None,
            user_id=assessment.user_id,
            user_name=getattr(user, "name", None),
            user_email=getattr(user, "email", None),
            status="triage_alert",
            scheduled_at=assessment.created_at,
            risk_score=assessment.risk_score,
            severity_level=assessment.severity_level,
            recommended_action=assessment.recommended_action,
            delivery_method=None,
            notes=None,
        )
        for assessment, user in triage_rows.all()
    ]

    # Combine queue preview prioritising pending executions first
    top_cases = queue_preview + [case for case in triage_preview if case not in queue_preview]

    return InterventionOverview(
        campaign_summary=campaign_summary,
        execution_summary=execution_summary,
        queue_size=queue_size,
        automation_enabled=settings.auto_mode_enabled,
        human_review_required=settings.human_review_required,
        risk_score_threshold=settings.risk_score_threshold,
        daily_send_limit=settings.daily_send_limit,
        channels_enabled=settings.channels_enabled or [],
        last_updated=datetime.utcnow(),
        top_risk_cases=top_cases,
    )


# --- Campaign management -----------------------------------------------------

@router.get("/campaigns", response_model=InterventionCampaignListResponse)
async def list_intervention_campaigns(
    status_filter: Optional[str] = Query(None, description="Filter campaigns by status"),
    search: Optional[str] = Query(None, description="Search by title or description"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionCampaignListResponse:
    query = select(InterventionCampaign).order_by(desc(InterventionCampaign.created_at))
    count_query = select(func.count(InterventionCampaign.id))

    if status_filter:
        query = query.filter(InterventionCampaign.status == status_filter)
        count_query = count_query.filter(InterventionCampaign.status == status_filter)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(func.lower(InterventionCampaign.title).ilike(pattern) | func.lower(InterventionCampaign.description).ilike(pattern))
        count_query = count_query.filter(func.lower(InterventionCampaign.title).ilike(pattern) | func.lower(InterventionCampaign.description).ilike(pattern))

    total = (await db.execute(count_query)).scalar() or 0

    query = query.offset(offset).limit(limit)
    campaigns = (await db.execute(query)).scalars().all()

    # Load execution counts in one pass
    if campaigns:
        campaign_ids = [c.id for c in campaigns]
        exec_rows = await db.execute(
            select(
                CampaignExecution.campaign_id,
                CampaignExecution.status,
                func.count(CampaignExecution.id),
            )
            .where(CampaignExecution.campaign_id.in_(campaign_ids))
            .group_by(CampaignExecution.campaign_id, CampaignExecution.status)
        )
        metrics_map: Dict[int, Dict[str, int]] = {}
        for campaign_id, status_value, count in exec_rows:
            metrics_map.setdefault(campaign_id, {})[status_value] = count
    else:
        metrics_map = {}

    items = []
    for campaign in campaigns:
        status_counts = metrics_map.get(campaign.id, {})
        metrics = _campaign_metrics_from_counts(status_counts)
        items.append(
            InterventionCampaignResponse(
                id=campaign.id,
                campaign_type=campaign.campaign_type,
                title=campaign.title,
                description=campaign.description,
                priority=campaign.priority,
                status=campaign.status,
                content=campaign.content,
                target_criteria=campaign.target_criteria,
                start_date=campaign.start_date,
                end_date=campaign.end_date,
                target_audience_size=campaign.target_audience_size,
                executions_delivered=campaign.executions_delivered,
                executions_failed=campaign.executions_failed,
                created_at=campaign.created_at,
                updated_at=campaign.updated_at,
                metrics=metrics,
            )
        )

    return InterventionCampaignListResponse(items=items, total=int(total))


@router.post("/campaigns", response_model=InterventionCampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_intervention_campaign(
    payload: InterventionCampaignCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionCampaignResponse:
    campaign = InterventionCampaign(
        campaign_type=payload.campaign_type,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status=payload.status,
        content=payload.content,
        target_criteria=payload.target_criteria,
        start_date=payload.start_date or datetime.utcnow(),
        end_date=payload.end_date,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    metrics = _campaign_metrics_from_counts({})

    return InterventionCampaignResponse(
        id=campaign.id,
        campaign_type=campaign.campaign_type,
        title=campaign.title,
        description=campaign.description,
        priority=campaign.priority,
        status=campaign.status,
        content=campaign.content,
        target_criteria=campaign.target_criteria,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        target_audience_size=campaign.target_audience_size,
        executions_delivered=campaign.executions_delivered,
        executions_failed=campaign.executions_failed,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        metrics=metrics,
    )


@router.patch("/campaigns/{campaign_id}", response_model=InterventionCampaignResponse)
async def update_intervention_campaign(
    campaign_id: int,
    payload: InterventionCampaignUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionCampaignResponse:
    result = await db.execute(
        select(InterventionCampaign).filter(InterventionCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    updated_fields = payload.model_dump(exclude_unset=True)
    for key, value in updated_fields.items():
        setattr(campaign, key, value)

    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    # Recalculate metrics
    exec_rows = await db.execute(
        select(CampaignExecution.status, func.count(CampaignExecution.id))
        .where(CampaignExecution.campaign_id == campaign.id)
        .group_by(CampaignExecution.status)
    )
    metrics = _campaign_metrics_from_counts({status: count for status, count in exec_rows})

    return InterventionCampaignResponse(
        id=campaign.id,
        campaign_type=campaign.campaign_type,
        title=campaign.title,
        description=campaign.description,
        priority=campaign.priority,
        status=campaign.status,
        content=campaign.content,
        target_criteria=campaign.target_criteria,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        target_audience_size=campaign.target_audience_size,
        executions_delivered=campaign.executions_delivered,
        executions_failed=campaign.executions_failed,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        metrics=metrics,
    )


# --- Manual interventions ----------------------------------------------------

@router.post("/executions/manual", response_model=InterventionExecutionResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_intervention(
    payload: ManualInterventionCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
    support_service: SupportCoachService = Depends(get_support_coach_service),
) -> InterventionExecutionResponse:
    user = await db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    plan_preview: SCAInterveneResponse | None = None
    if payload.intent:
        sca_request = SCAInterveneRequest(
            session_id=f"admin-manual-{admin_user.id}-{payload.user_id}",
            intent=payload.intent,
            options=payload.options or {},
            consent_followup=payload.consent_followup,
        )
        try:
            plan_preview = await support_service.intervene(sca_request)
        except NotImplementedError as exc:
            logger.info("Support Coach service not ready for manual preview: %s", exc)
        except ValueError as exc:
            logger.warning("Invalid manual intervention preview for admin %s: %s", admin_user.id, exc)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.error("Unexpected error running Support Coach preview: %s", exc, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to contact Support Coach agent for preview",
            ) from exc

    campaign: Optional[InterventionCampaign] = None
    if payload.campaign_id:
        campaign = await db.get(InterventionCampaign, payload.campaign_id)
        if campaign is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    else:
        if not payload.title:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required when campaign_id is not provided")
        campaign = InterventionCampaign(
            campaign_type="manual",
            title=payload.title,
            description=payload.message,
            priority="high",
            status="active",
            content={"message": payload.message or "", "created_at": datetime.utcnow().isoformat()},
            target_criteria={"type": "user", "user_id": payload.user_id},
            start_date=datetime.utcnow(),
        )
        db.add(campaign)
        await db.flush()  # ensure campaign has ID before execution

    execution = CampaignExecution(
        campaign_id=campaign.id,
        user_id=payload.user_id,
        status="pending_review" if (payload.metadata or plan_preview) else "scheduled",
        scheduled_at=payload.scheduled_at or datetime.utcnow(),
        delivery_method=payload.delivery_method,
        trigger_data=_merge_trigger_data(payload.metadata, plan_preview),
        notes=payload.notes,
        is_manual=True,
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)
    await db.refresh(campaign)

    return _execution_to_response(execution, campaign, user, plan_preview=plan_preview)


@router.post("/plans/preview", response_model=SCAInterveneResponse)
async def preview_support_plan(
    payload: SCAInterveneRequest,
    admin_user: User = Depends(get_admin_user),
    support_service: SupportCoachService = Depends(get_support_coach_service),
) -> SCAInterveneResponse:
    logger.info(
        "Admin %s requesting Safety Coaching plan preview (intent=%s)",
        admin_user.id,
        payload.intent,
    )
    try:
        return await support_service.intervene(payload)
    except NotImplementedError as exc:
        logger.info("Support Coach service not yet implemented: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Support Coach agent is not available yet",
        ) from exc
    except ValueError as exc:
        logger.warning("Invalid Support Coach request from admin %s: %s", admin_user.id, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.error("Failed to generate Support Coach plan preview: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate plan preview",
        ) from exc


@router.post("/follow-ups", response_model=SCAFollowUpResponse)
async def record_follow_up(
    payload: SCAFollowUpRequest,
    admin_user: User = Depends(get_admin_user),
    support_service: SupportCoachService = Depends(get_support_coach_service),
) -> SCAFollowUpResponse:
    logger.info(
        "Admin %s submitting Support Coach follow-up (plan=%s)",
        admin_user.id,
        payload.last_plan_id,
    )
    try:
        return await support_service.followup(payload)
    except NotImplementedError as exc:
        logger.info("Support Coach follow-up not yet available: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Support Coach agent is not available yet",
        ) from exc
    except ValueError as exc:
        logger.warning("Invalid Support Coach follow-up request from admin %s: %s", admin_user.id, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.error("Failed to record Support Coach follow-up: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record follow-up",
        ) from exc


@router.get("/executions", response_model=InterventionExecutionListResponse)
async def list_campaign_executions(
    status_filter: Optional[str] = Query(None, description="Filter by execution status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionExecutionListResponse:
    query = (
        select(CampaignExecution, InterventionCampaign, User)
        .join(InterventionCampaign, CampaignExecution.campaign_id == InterventionCampaign.id)
        .join(User, CampaignExecution.user_id == User.id, isouter=True)
        .order_by(desc(CampaignExecution.scheduled_at))
    )
    count_query = select(func.count(CampaignExecution.id))

    if status_filter:
        query = query.filter(CampaignExecution.status == status_filter)
        count_query = count_query.filter(CampaignExecution.status == status_filter)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.offset(offset).limit(limit)
    rows = await db.execute(query)

    items = [
        _execution_to_response(execution, campaign, user)
        for execution, campaign, user in rows.all()
    ]

    return InterventionExecutionListResponse(items=items, total=int(total))


@router.patch("/executions/{execution_id}", response_model=InterventionExecutionResponse)
async def update_campaign_execution(
    execution_id: int,
    payload: InterventionExecutionUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionExecutionResponse:
    result = await db.execute(
        select(CampaignExecution, InterventionCampaign, User)
        .join(InterventionCampaign, CampaignExecution.campaign_id == InterventionCampaign.id)
        .join(User, CampaignExecution.user_id == User.id, isouter=True)
        .filter(CampaignExecution.id == execution_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")

    execution, campaign, user = row
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(execution, key, value)

    execution.updated_at = datetime.utcnow()
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    return _execution_to_response(execution, campaign, user)


@router.get("/queue", response_model=InterventionExecutionListResponse)
async def get_pending_review_queue(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
    limit: int = Query(25, ge=1, le=200),
) -> InterventionExecutionListResponse:
    query = (
        select(CampaignExecution, InterventionCampaign, User)
        .join(InterventionCampaign, CampaignExecution.campaign_id == InterventionCampaign.id)
        .join(User, CampaignExecution.user_id == User.id, isouter=True)
        .filter(CampaignExecution.status.in_(EXECUTION_PENDING_REVIEW))
        .order_by(desc(CampaignExecution.scheduled_at))
        .limit(limit)
    )
    rows = await db.execute(query)
    items = [
        _execution_to_response(execution, campaign, user)
        for execution, campaign, user in rows.all()
    ]
    return InterventionExecutionListResponse(items=items, total=len(items))


# --- Settings ----------------------------------------------------------------

@router.get("/settings", response_model=InterventionSettings)
async def get_intervention_settings(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionSettings:
    settings = await _ensure_settings(db)
    return InterventionSettings(
        auto_mode_enabled=settings.auto_mode_enabled,
        human_review_required=settings.human_review_required,
        risk_score_threshold=settings.risk_score_threshold,
        daily_send_limit=settings.daily_send_limit,
        channels_enabled=settings.channels_enabled or [],
        escalation_email=settings.escalation_email,
        office_hours_start=settings.office_hours_start,
        office_hours_end=settings.office_hours_end,
        manual_notes=settings.manual_notes,
        updated_at=settings.updated_at,
    )


@router.put("/settings", response_model=InterventionSettings)
async def update_intervention_settings(
    payload: InterventionSettingsUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> InterventionSettings:
    settings = await _ensure_settings(db)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    settings.updated_by = admin_user.id
    settings.updated_at = datetime.utcnow()

    db.add(settings)
    await db.commit()
    await db.refresh(settings)

    return InterventionSettings(
        auto_mode_enabled=settings.auto_mode_enabled,
        human_review_required=settings.human_review_required,
        risk_score_threshold=settings.risk_score_threshold,
        daily_send_limit=settings.daily_send_limit,
        channels_enabled=settings.channels_enabled or [],
        escalation_email=settings.escalation_email,
        office_hours_start=settings.office_hours_start,
        office_hours_end=settings.office_hours_end,
        manual_notes=settings.manual_notes,
        updated_at=settings.updated_at,
    )
