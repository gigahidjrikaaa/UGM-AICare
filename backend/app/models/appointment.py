# backend/app/models/appointment.py
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Psychologist(Base):
    __tablename__ = "psychologists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)

    appointments = relationship("Appointment", back_populates="psychologist")

class AppointmentType(Base):
    __tablename__ = "appointment_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)

    appointments = relationship("Appointment", back_populates="appointment_type")

    def __init__(self, name: str, duration_minutes: int, description: Optional[str] = None):
        self.name = name
        self.duration_minutes = duration_minutes
        self.description = description

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    psychologist_id = Column(Integer, ForeignKey("psychologists.id"), nullable=False)
    appointment_type_id = Column(Integer, ForeignKey("appointment_types.id"), nullable=False)
    
    appointment_datetime = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="scheduled", nullable=False)  # e.g., "scheduled", "completed", "cancelled"

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", back_populates="appointments")
    psychologist = relationship("Psychologist", back_populates="appointments")
    appointment_type = relationship("AppointmentType", back_populates="appointments")