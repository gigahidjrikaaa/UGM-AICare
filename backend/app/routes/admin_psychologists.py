"""Admin routes for psychologist management."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload
from typing import List, Optional
from app.database import get_async_db
from app.models.user import User
from app.models.appointments import Psychologist, Appointment
from app.schemas.psychologist import (
    PsychologistCreate,
    PsychologistUpdate,
    PsychologistResponse,
    PsychologistListResponse,
    PsychologistListItem,
    PsychologistAvailabilityToggle,
    PsychologistStats
)
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/admin/psychologists", tags=["Admin - Psychologists"])


async def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Dependency to ensure user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ========================================
# List and Search Psychologists
# ========================================

@router.get("", response_model=PsychologistListResponse)
async def list_psychologists(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_available: Optional[bool] = None,
    specialization: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_admin)
):
    """
    List all psychologists with pagination and filters.
    
    - **page**: Page number (starts at 1)
    - **page_size**: Number of items per page
    - **search**: Search by name or specialization
    - **is_available**: Filter by availability status
    - **specialization**: Filter by specialization
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"📊 [list_psychologists] Querying psychologists - page: {page}, page_size: {page_size}, search: {search}, is_available: {is_available}")
    
    query = select(Psychologist)
    
    # Apply search filter
    if search:
        query = query.filter(
            or_(
                Psychologist.name.ilike(f"%{search}%"),
                Psychologist.specialization.ilike(f"%{search}%")
            )
        )
    
    # Apply availability filter
    if is_available is not None:
        query = query.filter(Psychologist.is_available == is_available)
    
    # Apply specialization filter
    if specialization:
        query = query.filter(Psychologist.specialization.ilike(f"%{specialization}%"))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Psychologist.name).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    psychologists = result.scalars().all()
    
    logger.info(f"📊 [list_psychologists] Found {len(psychologists)} psychologists (total in DB: {total})")
    if psychologists:
        logger.info(f"📊 [list_psychologists] First psychologist: ID={psychologists[0].id}, name={psychologists[0].name}, user_id={psychologists[0].user_id}")
    else:
        logger.warning(f"⚠️ [list_psychologists] No psychologists found! Query filters: search={search}, is_available={is_available}, specialization={specialization}")
        # Debug: Try to fetch ALL psychologists without filters
        debug_query = select(Psychologist)
        debug_result = await db.execute(debug_query)
        all_psychologists = debug_result.scalars().all()
        logger.warning(f"⚠️ [list_psychologists] DEBUG: Total psychologists in DB (no filters): {len(all_psychologists)}")
        if all_psychologists:
            logger.warning(f"⚠️ [list_psychologists] DEBUG: Sample psychologist: ID={all_psychologists[0].id}, name={all_psychologists[0].name}, is_available={all_psychologists[0].is_available}")
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size
    
    return PsychologistListResponse(
        psychologists=[PsychologistListItem.model_validate(p) for p in psychologists],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# ========================================
# Get Single Psychologist
# ========================================

@router.get("/{psychologist_id}", response_model=PsychologistResponse)
async def get_psychologist(
    psychologist_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_admin)
):
    """Get detailed information about a specific psychologist."""
    query = select(Psychologist).options(
        joinedload(Psychologist.user)
    ).filter(Psychologist.id == psychologist_id)
    
    result = await db.execute(query)
    psychologist = result.scalar_one_or_none()
    
    if not psychologist:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    
    return PsychologistResponse.model_validate(psychologist)


# ========================================
# Create Psychologist Profile
# ========================================

@router.post("", response_model=PsychologistResponse, status_code=201)
async def create_psychologist(
    psychologist_data: PsychologistCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new psychologist profile linked to a user.
    
    The user must exist and must have role 'counselor' or 'admin'.
    """
    # Check if user exists
    user_query = select(User).filter(User.id == psychologist_data.user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has appropriate role
    if user.role not in ["counselor", "admin"]:
        raise HTTPException(
            status_code=400, 
            detail=f"User must have 'counselor' or 'admin' role. Current role: {user.role}"
        )
    
    # Check if psychologist profile already exists for this user
    existing_query = select(Psychologist).filter(Psychologist.user_id == psychologist_data.user_id)
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=409, 
            detail="Psychologist profile already exists for this user"
        )
    
    # Create psychologist profile
    psychologist = Psychologist(
        user_id=psychologist_data.user_id,
        name=psychologist_data.name,
        specialization=psychologist_data.specialization,
        image_url=psychologist_data.image_url,
        is_available=psychologist_data.is_available,
        bio=psychologist_data.bio,
        years_of_experience=psychologist_data.years_of_experience,
        languages=psychologist_data.languages,
        consultation_fee=psychologist_data.consultation_fee,
        education=psychologist_data.education,
        certifications=psychologist_data.certifications,
        availability_schedule=psychologist_data.availability_schedule
    )
    
    db.add(psychologist)
    await db.commit()
    await db.refresh(psychologist)
    
    # Load user relationship
    await db.refresh(psychologist, ['user'])
    
    return PsychologistResponse.model_validate(psychologist)


# ========================================
# Update Psychologist Profile
# ========================================

@router.put("/{psychologist_id}", response_model=PsychologistResponse)
async def update_psychologist(
    psychologist_id: int,
    psychologist_data: PsychologistUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_admin)
):
    """Update an existing psychologist profile."""
    query = select(Psychologist).filter(Psychologist.id == psychologist_id)
    result = await db.execute(query)
    psychologist = result.scalar_one_or_none()
    
    if not psychologist:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    
    # Update only provided fields
    update_data = psychologist_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(psychologist, field, value)
    
    await db.commit()
    await db.refresh(psychologist)
    await db.refresh(psychologist, ['user'])
    
    return PsychologistResponse.model_validate(psychologist)


# ========================================
# Toggle Availability
# ========================================

@router.patch("/{psychologist_id}/availability", response_model=PsychologistResponse)
async def toggle_availability(
    psychologist_id: int,
    availability: PsychologistAvailabilityToggle,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_admin)
):
    """Toggle psychologist availability status."""
    query = select(Psychologist).filter(Psychologist.id == psychologist_id)
    result = await db.execute(query)
    psychologist = result.scalar_one_or_none()
    
    if not psychologist:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    
    psychologist.is_available = availability.is_available
    await db.commit()
    await db.refresh(psychologist)
    await db.refresh(psychologist, ['user'])
    
    return PsychologistResponse.model_validate(psychologist)


# ========================================
# Delete Psychologist Profile
# ========================================

@router.delete("/{psychologist_id}", status_code=204)
async def delete_psychologist(
    psychologist_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a psychologist profile.
    
    Note: This does not delete the associated user account, only the psychologist profile.
    All appointments with this psychologist will remain but reference will be removed.
    """
    query = select(Psychologist).filter(Psychologist.id == psychologist_id)
    result = await db.execute(query)
    psychologist = result.scalar_one_or_none()
    
    if not psychologist:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    
    await db.delete(psychologist)
    await db.commit()
    
    return None


# ========================================
# Get Psychologist Statistics
# ========================================

@router.get("/{psychologist_id}/stats", response_model=PsychologistStats)
async def get_psychologist_stats(
    psychologist_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_admin)
):
    """Get statistics for a specific psychologist."""
    psychologist_query = select(Psychologist).filter(Psychologist.id == psychologist_id)
    psychologist_result = await db.execute(psychologist_query)
    psychologist = psychologist_result.scalar_one_or_none()
    
    if not psychologist:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    
    # Get appointment statistics
    total_appointments_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == psychologist_id
    )
    total_appointments = await db.scalar(total_appointments_query) or 0
    
    upcoming_appointments_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == psychologist_id,
        Appointment.status == 'scheduled'
    )
    upcoming_appointments = await db.scalar(upcoming_appointments_query) or 0
    
    completed_appointments_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == psychologist_id,
        Appointment.status == 'completed'
    )
    completed_appointments = await db.scalar(completed_appointments_query) or 0
    
    cancelled_appointments_query = select(func.count(Appointment.id)).filter(
        Appointment.psychologist_id == psychologist_id,
        Appointment.status == 'cancelled'
    )
    cancelled_appointments = await db.scalar(cancelled_appointments_query) or 0
    
    # Get unique patients count
    total_patients_query = select(func.count(func.distinct(Appointment.user_id))).filter(
        Appointment.psychologist_id == psychologist_id
    )
    total_patients = await db.scalar(total_patients_query) or 0
    
    return PsychologistStats(
        total_appointments=total_appointments,
        upcoming_appointments=upcoming_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
        total_patients=total_patients,
        average_rating=psychologist.rating or 0.0,
        total_reviews=psychologist.total_reviews or 0
    )
