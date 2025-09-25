"""Email system models."""

from typing import Optional, List
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from datetime import datetime

class EmailTemplate(Base):
    """Email templates for automated messaging."""
    __tablename__ = "email_templates"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    logs: Mapped[List["EmailLog"]] = relationship("EmailLog", back_populates="template")

class EmailGroup(Base):
    """Email distribution groups."""
    __tablename__ = "email_groups"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    recipients: Mapped[List["EmailRecipient"]] = relationship("EmailRecipient", back_populates="group")

class EmailRecipient(Base):
    """Email recipients within groups."""
    __tablename__ = "email_recipients"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    group_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("email_groups.id"))
    
    group: Mapped["EmailGroup"] = relationship("EmailGroup", back_populates="recipients")

class EmailLog(Base):
    """Email sending logs and status."""
    __tablename__ = "email_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("email_templates.id"))
    recipients: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    scheduled_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    
    template: Mapped["EmailTemplate"] = relationship("EmailTemplate", back_populates="logs")