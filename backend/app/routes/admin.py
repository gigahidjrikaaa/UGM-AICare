# backend/app/routes/admin.py
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, asc, or_, select, case
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import io
import logging

from app.database import get_async_db
from app.models import User, JournalEntry, Conversation, UserBadge, Appointment, ContentResource, Psychologist, TherapistSchedule
from app.dependencies import get_current_active_user, get_admin_user
from app.services import content_resource_service as resource_service
from app.routes.admin.analytics import router as analytics_router
from app.routes.admin.conversations import router as conversations_router
from app.routes.admin.flags import router as flags_router
from app.routes.admin.users import router as users_router
from app.routes.admin.utils import decrypt_user_email, get_user_stats
from app.schemas.admin import UserListItem

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[]  # We'll add admin auth dependency later
)

# Mount sub-routers for maintainability
router.include_router(analytics_router)
router.include_router(conversations_router)
router.include_router(flags_router)
router.include_router(users_router)

# --- Content Resource Models ---
class ContentResourceBase(BaseModel):
    title: str
    type: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    source: Optional[str] = None


class ContentResourceCreate(ContentResourceBase):
    content: Optional[str] = None


class ContentResourceItem(ContentResourceBase):
    id: int
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="resource_metadata")
    mime_type: Optional[str] = None
    embedding_status: str
    embedding_last_processed_at: Optional[datetime]
    chunk_count: int
    storage_backend: str
    object_storage_key: Optional[str] = None
    object_storage_bucket: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ContentResourceResponse(BaseModel):
    items: List[ContentResourceItem]
    total_count: int


@router.post("/content-resources", response_model=ContentResourceItem, status_code=status.HTTP_201_CREATED)
async def create_content_resource(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    type: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """
    Create a new content resource suitable for retrieval augmented generation pipelines.
    """

    logger.info("Admin %s creating content resource '%s'", admin_user.id, title)
    resource_type = type.lower()
    if resource_type not in resource_service.SUPPORTED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported resource type")

    parsed_tags = [tag.strip() for tag in (tags or "").split(",") if tag.strip()]

    ingestion_result: resource_service.ResourceIngestionResult

    if resource_type == "text":
        if not content:
            raise HTTPException(status_code=400, detail="Text resources require content")
        ingestion_result = await resource_service.ingest_text_resource({"content": content})
    elif resource_type == "url":
        if not source:
            raise HTTPException(status_code=400, detail="URL resources require a source URL")
        ingestion_result = await resource_service.ingest_url_resource(source)
    else:  # pdf
        if file is None:
            raise HTTPException(status_code=400, detail="PDF resources require an uploaded file")
        ingestion_result = await resource_service.ingest_pdf_resource(file)
        if not source:
            source = file.filename

    db_resource = ContentResource(
        title=title,
        type=resource_type,
        description=description,
        tags=parsed_tags,
        source=source,
        content=ingestion_result.get("processed_content", ""),
        resource_metadata=ingestion_result.get("metadata", {}),
        mime_type=ingestion_result.get("mime_type"),
        embedding_status="pending",
        chunk_count=ingestion_result.get("chunk_count", 0),
        storage_backend=ingestion_result.get("storage_backend", "database"),
        object_storage_key=ingestion_result.get("object_storage_key"),
        object_storage_bucket=ingestion_result.get("object_storage_bucket"),
    )

    db.add(db_resource)
    await db.commit()
    await db.refresh(db_resource)

    background_tasks.add_task(resource_service.enqueue_embedding_job, db_resource.id)
    return db_resource

@router.get("/content-resources", response_model=ContentResourceResponse)
async def get_content_resources(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None, alias="type"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Get a paginated list of content resources with filtering and sorting."""

    logger.info(
        "Admin %s requesting content resources (page=%s, limit=%s, search=%s, type=%s)",
        admin_user.id,
        page,
        limit,
        search,
        resource_type,
    )

    filters = []
    if search:
        pattern = f"%{search}%"
        filters.append(or_(ContentResource.title.ilike(pattern), ContentResource.description.ilike(pattern)))
    if resource_type:
        filters.append(ContentResource.type == resource_type)

    sort_column_map = {
        "title": ContentResource.title,
        "type": ContentResource.type,
        "created_at": ContentResource.created_at,
        "updated_at": ContentResource.updated_at,
        "embedding_status": ContentResource.embedding_status,
    }
    sort_column = sort_column_map.get(sort_by, ContentResource.created_at)
    sort_method = desc if sort_order.lower() == "desc" else asc

    base_query = select(ContentResource)
    if filters:
        for clause in filters:
            base_query = base_query.where(clause)

    count_query = select(func.count()).select_from(base_query.subquery())
    total_count = (await db.execute(count_query)).scalar() or 0

    query = base_query.order_by(sort_method(sort_column)).offset((page - 1) * limit).limit(limit)
    results = await db.execute(query)
    items = list(results.scalars().all())

    return ContentResourceResponse(items=[ContentResourceItem.from_orm(item) for item in items], total_count=total_count)

@router.get("/content-resources/{resource_id}", response_model=ContentResourceItem)
async def get_content_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Get a single content resource by ID.
    """
    logger.info("Admin %s requesting content resource %s", admin_user.id, resource_id)
    resource = await resource_service.ensure_resource_exists(db, resource_id)
    return resource


@router.get("/content-resources/types", response_model=List[str])
async def get_content_resource_types(
    admin_user: User = Depends(get_admin_user),
):
    """Return the supported resource types for the admin UI."""

    return sorted(resource_service.SUPPORTED_TYPES)


@router.get("/content-resources/{resource_id}/file")
async def download_content_resource_file(
    resource_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Stream the raw binary backing the resource (PDF or crawled HTML)."""

    resource = await resource_service.ensure_resource_exists(db, resource_id)

    media_type = resource.mime_type or "application/octet-stream"
    filename = resource.source or f"resource-{resource_id}"

    if resource.storage_backend == "minio" and resource.object_storage_key:
        bucket = resource.object_storage_bucket or resource_service.get_minio_bucket_name()
        binary = await resource_service.download_from_minio(bucket, resource.object_storage_key)
    else:
        raise HTTPException(status_code=404, detail="Resource has no stored binary")

    return StreamingResponse(
        io.BytesIO(binary),
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""},
    )

@router.put("/content-resources/{resource_id}", response_model=ContentResourceItem)
async def update_content_resource(
    resource_id: int,
    background_tasks: BackgroundTasks,
    title: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update a content resource and optionally re-ingest new source material."""

    logger.info("Admin %s updating content resource %s", admin_user.id, resource_id)
    db_resource = await resource_service.ensure_resource_exists(db, resource_id)

    new_type = (type or db_resource.type).lower()
    if new_type not in resource_service.SUPPORTED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported resource type")

    ingestion_result: Optional[resource_service.ResourceIngestionResult] = None

    if new_type == "text" and content is not None:
        ingestion_result = await resource_service.ingest_text_resource({"content": content})
    elif new_type == "url" and source is not None:
        ingestion_result = await resource_service.ingest_url_resource(source)
    elif new_type == "pdf" and file is not None:
        ingestion_result = await resource_service.ingest_pdf_resource(file)
        if not source:
            source = file.filename

    if title is not None:
        db_resource.title = title
    if description is not None:
        db_resource.description = description
    if tags is not None:
        db_resource.tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    if source is not None:
        db_resource.source = source

    db_resource.type = new_type

    if ingestion_result:
        # Clean up previous storage location if present
        if db_resource.storage_backend == "minio" and db_resource.object_storage_key:
            bucket_to_delete = db_resource.object_storage_bucket or resource_service.get_minio_bucket_name()
            await resource_service.delete_from_minio(bucket_to_delete, db_resource.object_storage_key)

        db_resource.content = ingestion_result.get("processed_content", "")
        db_resource.resource_metadata = ingestion_result.get("metadata", {})
        db_resource.mime_type = ingestion_result.get("mime_type")
        db_resource.embedding_status = "pending"
        db_resource.chunk_count = ingestion_result.get("chunk_count", 0)
        db_resource.storage_backend = ingestion_result.get("storage_backend", db_resource.storage_backend)
        db_resource.object_storage_key = ingestion_result.get("object_storage_key")
        db_resource.object_storage_bucket = ingestion_result.get("object_storage_bucket")
        background_tasks.add_task(resource_service.enqueue_embedding_job, db_resource.id)

    db_resource.updated_at = datetime.now()
    db.add(db_resource)
    await db.commit()
    await db.refresh(db_resource)
    return db_resource

@router.delete("/content-resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Delete a content resource.
    """
    logger.info("Admin %s deleting content resource %s", admin_user.id, resource_id)
    db_resource = await resource_service.ensure_resource_exists(db, resource_id)

    if db_resource.storage_backend == "minio" and db_resource.object_storage_key:
        bucket = db_resource.object_storage_bucket or resource_service.get_minio_bucket_name()
        await resource_service.delete_from_minio(bucket, db_resource.object_storage_key)

    await db.delete(db_resource)
    await db.commit()
    return

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get overall system statistics"""
    logger.info(f"Admin {admin_user.id} requesting system stats")
    
    try:
        stats = await get_user_stats(db)
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system statistics"
        )

# --- Dashboard Summaries ---
class AppointmentSummary(BaseModel):
    date_from: date
    date_to: date
    total: int
    completed: int
    cancelled: int
    today_total: int

@router.get("/appointments/summary", response_model=AppointmentSummary)
async def get_appointments_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Lightweight summary for appointments to power the dashboard."""
    try:
        today = datetime.now().date()
        # Default range is current month
        if not date_from or not date_to:
            first_day = today.replace(day=1)
            if today.month == 12:
                next_month = today.replace(year=today.year + 1, month=1, day=1)
            else:
                next_month = today.replace(month=today.month + 1, day=1)
            last_day = next_month - timedelta(days=1)
            date_from = date_from or first_day
            date_to = date_to or last_day

        base = select(Appointment).filter(
            func.date(Appointment.appointment_datetime) >= date_from,
            func.date(Appointment.appointment_datetime) <= date_to,
        )

        total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
        completed = (await db.execute(select(func.count(Appointment.id)).filter(Appointment.status == 'completed', func.date(Appointment.appointment_datetime) >= date_from, func.date(Appointment.appointment_datetime) <= date_to))).scalar() or 0
        cancelled = (await db.execute(select(func.count(Appointment.id)).filter(Appointment.status == 'cancelled', func.date(Appointment.appointment_datetime) >= date_from, func.date(Appointment.appointment_datetime) <= date_to))).scalar() or 0
        today_total = (await db.execute(select(func.count(Appointment.id)).filter(func.date(Appointment.appointment_datetime) == today))).scalar() or 0

        return AppointmentSummary(
            date_from=date_from,
            date_to=date_to,
            total=int(total),
            completed=int(completed),
            cancelled=int(cancelled),
            today_total=int(today_total),
        )
    except Exception as e:
        logger.error(f"Error generating appointment summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch appointment summary")


class FeedbackSummary(BaseModel):
    window_days: int
    count: int
    avg_nps: Optional[float] = None
    avg_felt_understood: Optional[float] = None

@router.get("/feedback/summary", response_model=FeedbackSummary)
async def get_feedback_summary(
    window_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Compute simple feedback KPIs (NPS, felt understood) for the last N days."""
    try:
        from app.models import Feedback
        cutoff = datetime.now() - timedelta(days=window_days)
        base = select(Feedback).filter(Feedback.timestamp >= cutoff)
        count = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

        avg_nps = (await db.execute(select(func.avg(Feedback.nps_rating)).filter(Feedback.timestamp >= cutoff))).scalar()
        avg_felt = (await db.execute(select(func.avg(Feedback.felt_understood_rating)).filter(Feedback.timestamp >= cutoff))).scalar()

        return FeedbackSummary(
            window_days=window_days,
            count=int(count),
            avg_nps=float(avg_nps) if avg_nps is not None else None,
            avg_felt_understood=float(avg_felt) if avg_felt is not None else None,
        )
    except Exception as e:
        logger.error(f"Error generating feedback summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch feedback summary")

# --- Appointment Models ---
class PsychologistResponse(BaseModel):
    id: int
    name: str
    specialization: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool

    class Config:
        from_attributes = True

class AppointmentResponse(BaseModel):
    id: int
    user: UserListItem
    psychologist: PsychologistResponse
    appointment_type: str
    appointment_datetime: datetime
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Appointment Endpoints ---
@router.get("/psychologists", response_model=List[UserListItem])
async def get_psychologists(db: AsyncSession = Depends(get_async_db)):
    # Correlated subqueries: accurate counts without join fan-out
    journal_count_sq = (
        select(func.count(JournalEntry.id))
        .where(JournalEntry.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    conversation_count_sq = (
        select(func.count(Conversation.id))
        .where(Conversation.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    badge_count_sq = (
        select(func.count(UserBadge.id))
        .where(UserBadge.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    appointment_count_sq = (
        select(func.count(Appointment.id))
        .where(Appointment.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )

    base_query = (
        select(
            User,
            journal_count_sq.label("journal_count"),
            conversation_count_sq.label("conversation_count"),
            badge_count_sq.label("badge_count"),
            appointment_count_sq.label("appointment_count"),
        )
        .where(User.role == "therapist")
    )

    results = await db.execute(base_query)

    users: List[UserListItem] = []
    for user, journal_count, conversation_count, badge_count, appointment_count in results.all():
        users.append(
            UserListItem(
                id=user.id,
                email=decrypt_user_email(user.email),
                google_sub=user.google_sub,
                wallet_address=user.wallet_address,
                sentiment_score=user.sentiment_score,
                current_streak=user.current_streak,
                longest_streak=user.longest_streak,
                last_activity_date=user.last_activity_date,
                allow_email_checkins=user.allow_email_checkins,
                role=getattr(user, "role", "user"),
                is_active=getattr(user, "is_active", True),
                created_at=getattr(user, "created_at", None),
                total_journal_entries=int(journal_count or 0),
                total_conversations=int(conversation_count or 0),
                total_badges=int(badge_count or 0),
                total_appointments=int(appointment_count or 0),
                last_login=getattr(user, "last_login", None),
            )
        )
    return users

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.user),
            selectinload(Appointment.psychologist),
            selectinload(Appointment.appointment_type)
        )
        .order_by(desc(Appointment.appointment_datetime))
    )
    appointments = result.scalars().all()
    return appointments

@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.user),
            selectinload(Appointment.psychologist),
            selectinload(Appointment.appointment_type)
        )
        .filter(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appointment

class AppointmentUpdate(BaseModel):
    status: str

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: int, appointment_data: AppointmentUpdate, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Appointment).filter(Appointment.id == appointment_id))
    db_appointment = result.scalar_one_or_none()
    if not db_appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    setattr(db_appointment, 'status', appointment_data.status)
    setattr(db_appointment, 'status', appointment_data.status)
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment)
    return db_appointment

@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Appointment).filter(Appointment.id == appointment_id))
    db_appointment = result.scalar_one_or_none()
    if not db_appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    await db.delete(db_appointment)
    await db.commit()

# --- Therapist Schedule Models ---
class TherapistScheduleResponse(BaseModel):
    id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool
    reason: Optional[str] = None

    class Config:
        from_attributes = True

class TherapistScheduleCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool = True
    reason: Optional[str] = None

class TherapistScheduleUpdate(BaseModel):
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_available: Optional[bool] = None
    reason: Optional[str] = None

# --- Therapist Schedule Endpoints ---
@router.get("/therapists/{therapist_id}/schedule", response_model=List[TherapistScheduleResponse])
async def get_therapist_schedule(therapist_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(TherapistSchedule)
        .filter(TherapistSchedule.therapist_id == therapist_id)
    )
    schedule = result.scalars().all()
    return schedule

@router.post("/therapists/{therapist_id}/schedule", response_model=TherapistScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_therapist_schedule(
    therapist_id: int,
    schedule_data: TherapistScheduleCreate,
    db: AsyncSession = Depends(get_async_db)
):
    db_schedule = TherapistSchedule(therapist_id=therapist_id, **schedule_data.dict())
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return db_schedule

@router.put("/therapists/schedule/{schedule_id}", response_model=TherapistScheduleResponse)
async def update_therapist_schedule(
    schedule_id: int,
    schedule_data: TherapistScheduleUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    result = await db.execute(select(TherapistSchedule).filter(TherapistSchedule.id == schedule_id))
    db_schedule = result.scalar_one_or_none()
    if not db_schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    update_data = schedule_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_schedule, key, value)
    
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return db_schedule

@router.delete("/therapists/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_therapist_schedule(schedule_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(TherapistSchedule).filter(TherapistSchedule.id == schedule_id))
    db_schedule = result.scalar_one_or_none()
    if not db_schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    await db.delete(db_schedule)
    await db.commit()
