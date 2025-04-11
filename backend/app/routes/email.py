from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status # type: ignore
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import logging
import time
from apscheduler.schedulers.background import BackgroundScheduler # type: ignore
from apscheduler.triggers.cron import CronTrigger # type: ignore
from app.database import get_db
from app.models import EmailTemplate, EmailLog, EmailGroup
from app.schemas import EmailRecipient, CreateEmailTemplate, EmailRequest, EmailGroupCreate, ScheduleEmailRequest
import os
from dotenv import load_dotenv

load_dotenv()

# Load environment variables
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_SMTP_SERVER = os.getenv("EMAIL_SMTP_SERVER")
EMAIL_SMTP_PORT = os.getenv("EMAIL_SMTP_PORT")

# Configure router
router = APIRouter(prefix="/email", tags=["email"])

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.start()

# Helper function to send email
def send_email(recipients: List[EmailRecipient], subject: str, body: str):
    message = MIMEMultipart()
    message["From"] = EMAIL_USERNAME
    message["Subject"] = subject
    message.attach(MIMEText(body, "html"))
    
    try:
        with smtplib.SMTP(EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            
            for recipient in recipients:
                message["To"] = recipient.email
                server.sendmail(
                    EMAIL_USERNAME, recipient.email, message.as_string()
                )
                logging.info(f"Email sent to {recipient.email}")
                
                # Brief pause to avoid overwhelming the server
                time.sleep(0.5)
        
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

# Routes
@router.post("/templates/", status_code=status.HTTP_201_CREATED)
async def create_email_template(
    template: CreateEmailTemplate, db: Session = Depends(get_db)
):
    """Create a new email template"""
    db_template = EmailTemplate(
        name=template.name,
        subject=template.subject,
        body=template.body,
        description=template.description
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/templates/")
async def list_email_templates(db: Session = Depends(get_db)):
    """List all email templates"""
    templates = db.query(EmailTemplate).all()
    return templates

@router.get("/templates/{template_id}")
async def get_email_template(template_id: int, db: Session = Depends(get_db)):
    """Get a specific email template"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    return template

@router.post("/groups/", status_code=status.HTTP_201_CREATED)
async def create_email_group(
    group: EmailGroupCreate, db: Session = Depends(get_db)
):
    """Create a new email group with recipients"""
    db_group = EmailGroup(
        name=group.name,
        description=group.description,
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Add recipients to the group
    for recipient in group.recipients:
        db_recipient = EmailRecipient(
            email=recipient.email,
            name=recipient.name,
            group_id=db_group.id
        )
        db.add(db_recipient)
    
    db.commit()
    return db_group

@router.get("/groups/")
async def list_email_groups(db: Session = Depends(get_db)):
    """List all email groups"""
    groups = db.query(EmailGroup).all()
    return groups

@router.post("/send/")
async def send_immediate_email(
    request: EmailRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send an email immediately or schedule it for later"""
    # Get template
    template = db.query(EmailTemplate).filter(EmailTemplate.id == request.template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    
    # Format email subject and body with variables
    subject = template.subject
    body = template.body
    
    for key, value in request.template_variables.items():
        placeholder = f"{{{{{key}}}}}"
        subject = subject.replace(placeholder, str(value))
        body = body.replace(placeholder, str(value))
    
    # Send immediately or schedule
    if request.schedule_time and request.schedule_time > datetime.now():
        # Calculate delay in seconds
        delay = (request.schedule_time - datetime.now()).total_seconds()
        
        # Log scheduled email
        email_log = EmailLog(
            template_id=template.id,
            recipients=", ".join([r.email for r in request.recipients]),
            status="scheduled",
            scheduled_time=request.schedule_time
        )
        db.add(email_log)
        db.commit()
        
        # Schedule task
        def scheduled_task():
            success = send_email(request.recipients, subject, body)
            # Update log
            with db.session.begin():
                log = db.query(EmailLog).filter(EmailLog.id == email_log.id).first()
                if log:
                    log.status = "sent" if success else "failed"
                    log.sent_time = datetime.now()
        
        background_tasks.add_task(time.sleep, delay)
        background_tasks.add_task(scheduled_task)
        
        return {"message": f"Email scheduled for {request.schedule_time}"}
    else:
        # Send immediately
        background_tasks.add_task(send_email, request.recipients, subject, body)
        
        # Log sent email
        email_log = EmailLog(
            template_id=template.id,
            recipients=", ".join([r.email for r in request.recipients]),
            status="sending",
            scheduled_time=datetime.now()
        )
        db.add(email_log)
        db.commit()
        
        return {"message": "Email sending in background"}

@router.post("/schedule/")
async def schedule_recurring_email(
    request: ScheduleEmailRequest,
    db: Session = Depends(get_db)
):
    """Schedule an email to be sent regularly based on a cron expression"""
    # Validate template
    template = db.query(EmailTemplate).filter(EmailTemplate.id == request.template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    
    # Validate group
    group = db.query(EmailGroup).filter(EmailGroup.id == request.group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email group not found"
        )
    
    # Get all recipients in the group
    recipients = db.query(EmailRecipient).filter(EmailRecipient.group_id == group.id).all()
    if not recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email group has no recipients"
        )
    
    # Create job ID
    job_id = f"email_job_{template.id}_{group.id}"
    
    # Function to execute on schedule
    def send_scheduled_email():
        # Format email subject and body with variables
        subject = template.subject
        body = template.body
        
        for key, value in request.template_variables.items():
            placeholder = f"{{{{{key}}}}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        
        # Convert DB recipients to Pydantic model
        email_recipients = [
            EmailRecipient(email=r.email, name=r.name) for r in recipients
        ]
        
        # Send email
        success = send_email(email_recipients, subject, body)
        
        # Log email
        with db.session.begin():
            email_log = EmailLog(
                template_id=template.id,
                recipients=", ".join([r.email for r in recipients]),
                status="sent" if success else "failed",
                scheduled_time=datetime.now(),
                sent_time=datetime.now() if success else None
            )
            db.add(email_log)
    
    # Add job to scheduler
    try:
        # Remove existing job if it exists
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        
        # Add new job with cron trigger
        scheduler.add_job(
            send_scheduled_email,
            CronTrigger.from_crontab(request.schedule),
            id=job_id,
            replace_existing=True
        )
        
        return {
            "message": f"Email scheduled with cron expression: {request.schedule}",
            "job_id": job_id
        }
    except Exception as e:
        logging.error(f"Error scheduling email: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid schedule: {str(e)}"
        )

@router.get("/schedules/")
async def list_scheduled_emails():
    """List all scheduled email jobs"""
    jobs = []
    for job in scheduler.get_jobs():
        if job.id.startswith("email_job_"):
            jobs.append({
                "job_id": job.id,
                "next_run_time": job.next_run_time,
                "cron": str(job.trigger)
            })
    return jobs

@router.delete("/schedules/{job_id}")
async def delete_scheduled_email(job_id: str):
    """Delete a scheduled email job"""
    if not scheduler.get_job(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled job not found"
        )
    
    scheduler.remove_job(job_id)
    return {"message": f"Scheduled email job {job_id} deleted"}

@router.get("/logs/")
async def get_email_logs(
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0
):
    """Get email sending logs"""
    logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).offset(offset).limit(limit).all()
    return logs