"""Appointment and counselor management models."""

from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from datetime import datetime

if TYPE_CHECKING:
    from app.models.user import User

class Counselor(Base):
    """Licensed counselors available for appointments - extends User model."""
    __tablename__ = "counselors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        unique=True, 
        nullable=True,
        index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    specialization: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    
    # Extended profile fields
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    education: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # List of degrees
    certifications: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # List of certifications
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    languages: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # List of languages spoken
    consultation_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    availability_schedule: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Weekly schedule
    rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=True)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="counselor_profile")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="counselor")

class AppointmentType(Base):
    """Types of appointments available."""
    __tablename__ = "appointment_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="appointment_type")

class Appointment(Base):
    """User appointments with counselors."""
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    counselor_id: Mapped[int] = mapped_column(Integer, ForeignKey("counselors.id"), nullable=False)
    appointment_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("appointment_types.id"), nullable=False)
    
    appointment_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    user: Mapped["User"] = relationship("User", back_populates="appointments")
    counselor: Mapped["Counselor"] = relationship("Counselor", back_populates="appointments")
    appointment_type: Mapped["AppointmentType"] = relationship("AppointmentType", back_populates="appointments")