# backend/app/schemas/email.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Pydantic models
class EmailRecipient(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class CreateEmailTemplate(BaseModel):
    name: str
    subject: str
    body: str
    description: Optional[str] = None

class EmailRequest(BaseModel):
    template_id: int
    recipients: List[EmailRecipient]
    schedule_time: Optional[datetime] = None
    template_variables: Optional[dict] = {}

class EmailGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    recipients: List[EmailRecipient]

class ScheduleEmailRequest(BaseModel):
    template_id: int