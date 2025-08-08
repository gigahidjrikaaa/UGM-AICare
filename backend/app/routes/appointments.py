from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app import models, schemas
from app.database import get_async_db
from app.services.user_service import async_get_user_by_google_sub

router = APIRouter()

@router.get("/psychologists", response_model=List[schemas.Psychologist])
async def get_psychologists(db: AsyncSession = Depends(get_async_db)):
    """
    Get a list of all psychologists.
    """
    result = await db.execute(select(models.Psychologist))
    return result.scalars().all()

@router.get("/appointment-types", response_model=List[schemas.AppointmentType])
async def get_appointment_types(db: AsyncSession = Depends(get_async_db)):
    """
    Get a list of all appointment types.
    """
    result = await db.execute(select(models.AppointmentType))
    return result.scalars().all()

@router.post("/appointments", response_model=schemas.Appointment)
async def create_appointment(appointment: schemas.AppointmentCreate, db: AsyncSession = Depends(get_async_db)):
    """
    Create a new appointment.
    """
    user = await async_get_user_by_google_sub(db, appointment.user_identifier)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_appointment = models.Appointment(
        user_id=user.id, # type: ignore
        psychologist_id=appointment.psychologist_id,
        appointment_type_id=appointment.appointment_type_id,
        appointment_datetime=appointment.appointment_datetime,
        notes=appointment.notes,
        status=appointment.status
    )
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment)
    return db_appointment
