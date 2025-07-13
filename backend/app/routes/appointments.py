from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.dependencies import get_db
from app.services.user_service import get_user_by_google_sub

router = APIRouter()

@router.get("/psychologists", response_model=List[schemas.Psychologist])
def get_psychologists(db: Session = Depends(get_db)):
    """
    Get a list of all psychologists.
    """
    return db.query(models.Psychologist).all()

@router.get("/appointment-types", response_model=List[schemas.AppointmentType])
def get_appointment_types(db: Session = Depends(get_db)):
    """
    Get a list of all appointment types.
    """
    return db.query(models.AppointmentType).all()

@router.post("/appointments", response_model=schemas.Appointment)
def create_appointment(appointment: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    """
    Create a new appointment.
    """
    user = get_user_by_google_sub(db, appointment.user_identifier)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_appointment = models.Appointment(
        user_id=user.id,
        psychologist_id=appointment.psychologist_id,
        appointment_type_id=appointment.appointment_type_id,
        appointment_datetime=appointment.appointment_datetime,
        notes=appointment.notes,
        status=appointment.status
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment
