# backend/app/core/scheduler.py
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal # Factory to create async sessions for jobs
from app.models import User
from app.utils.security_utils import decrypt_data
from app.utils.email_utils import send_email
from app.services.insights_service import InsightsService
from datetime import datetime, time as dt_time, timedelta, date
import random
import os
import logging
import time
import asyncio
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Use timezone relevant to your users (e.g., WIB)
scheduler = BackgroundScheduler(timezone="Asia/Jakarta")
CHECKIN_JOB_ID = "proactive_checkin_job"

def send_proactive_checkins():
    """Scheduled job to find inactive users and send check-in emails."""
    asyncio.run(async_send_proactive_checkins())

async def async_send_proactive_checkins():
    """Async implementation of the scheduled job."""
    logger.info("Scheduler: Running proactive check-in job...")
    async with AsyncSessionLocal() as db:
        try:
            # Define criteria: e.g., users opted-in, last active 3 days ago
            three_days_ago = date.today() - timedelta(days=3)

            stmt = select(User).where(
                User.allow_email_checkins == True,
                User.last_activity_date == three_days_ago,
                User.email != None # Ensure user has an email stored
            )
            result = await db.execute(stmt)
            eligible_users = result.scalars().all()

            logger.info(f"Scheduler: Found {len(eligible_users)} users eligible for check-in.")
            if not eligible_users: 
                return # Exit early if no one is eligible

        # Get App URL for link back
            # Prepare email content (use variations) 
            app_url = os.getenv('NEXTAUTH_URL', 'http://localhost:4000')

            for user in eligible_users:
                if not user.email:  # type: ignore  # Check if email is None or empty string
                    logger.warning(f"Scheduler: User {user.id} has no email address. Skipping check-in.")
                    continue
                    
                decrypted_email = decrypt_data(user.email)  # type: ignore  # Decrypt email from DB
                if not decrypted_email:
                    logger.error(f"Scheduler: Failed to decrypt email for user {user.id}. Skipping check-in.")
                    continue

                # Prepare email content (use variations) 
                # Note: User model doesn't have 'name' field, using google_sub or default
                user_name = getattr(user, 'name', None) or 'Teman UGM'  # Use name if available, fallback to default
                checkin_subjects = [ f"Sekadar menyapa dari Aika, {user_name}!", "Checking in - Gimana kabarmu?", "Aika mampir sebentar :)", ]
                checkin_messages = [
                    f"Halo {user_name}, Aika cuma mau mampir sebentar nih. Gimana kabarmu beberapa hari ini? Kalau mau cerita atau sekadar ngobrol, aku ada di sini ya.",
                    f"Hai {user_name}, hope you're doing okay! Udah beberapa hari kita nggak ngobrol, kalau ada yang ingin dibagikan, jangan ragu ya. Salam, Aika.",
                    f"Hey {user_name}, it's Aika! Just checking in. Remember, taking small moments for yourself matters. Kalau butuh teman bicara, feel free to chat!",
                ]
                subject = random.choice(checkin_subjects)
                message = random.choice(checkin_messages)

                # Basic HTML structure
                html_body = f"""
                <html><body>
                <p>{message}</p>
                <p>Kamu bisa ngobrol denganku kapan saja di <a href="{app_url}/aika">UGM-AICare</a>.</p>
                <hr>
                <p style='font-size:0.8em; color:grey;'>Kamu menerima email ini karena mengaktifkan fitur check-in Aika. Kamu bisa menonaktifkannya di halaman profilmu.</p>
                </body></html>
                """

                # Send the email via the utility function
                send_email(recipient_email=decrypted_email, subject=subject, html_content=html_body)
                time.sleep(1) # Optional: Rate limit to avoid hitting SMTP limits
                logger.info(f"Scheduler: Check-in email sent to {user.id} ({decrypted_email}).")

        except Exception as e:
            logger.error(f"Scheduler: Error during check-in job execution: {e}", exc_info=True)

def generate_weekly_ia_report():
    """Scheduled job to generate weekly IA insights report."""
    asyncio.run(async_generate_weekly_ia_report())

async def async_generate_weekly_ia_report():
    """Async implementation of the weekly IA report job."""
    logger.info("Scheduler: Running weekly IA report generation...")
    async with AsyncSessionLocal() as db:
        try:
            insights_service = InsightsService(db)
            
            # Generate report for the past week
            report = await insights_service.generate_weekly_report()
            
            logger.info(
                f"Scheduler: Successfully generated weekly IA report {report.id}. "
                f"Assessments: {report.assessment_count}, High risk: {report.high_risk_count}"
            )
            
            # TODO: Send email notification to admins (Phase 5)
            # For now, report is stored and event is emitted
            
        except Exception as e:
            logger.error(f"Scheduler: Error during IA report generation: {e}", exc_info=True)

def start_scheduler():
    """Adds the check-in job and starts the scheduler."""
    if scheduler.running:
        logger.info("APScheduler already running.")
        return

    # Schedule proactive check-in (once daily at 10:00 AM WIB)
    scheduler.add_job(
        send_proactive_checkins,
        trigger='cron',
        hour=10,
        minute=0,
        id=CHECKIN_JOB_ID,
        replace_existing=True,
        misfire_grace_time=3600 # Allow job to run up to 1 hour late if scheduler was down
    )
    logger.info(f"Scheduled job '{CHECKIN_JOB_ID}' with trigger: cron[hour=10, minute=0]")
    
    # Schedule weekly IA report (every Sunday at 2:00 AM WIB)
    scheduler.add_job(
        generate_weekly_ia_report,
        trigger='cron',
        day_of_week='sun',
        hour=2,
        minute=0,
        id='weekly_ia_report_job',
        replace_existing=True,
        misfire_grace_time=3600
    )
    logger.info("Scheduled job 'weekly_ia_report_job' with trigger: cron[day_of_week=sun, hour=2, minute=0]")

    try:
        scheduler.start()
        logger.info("APScheduler started successfully.")
    except Exception as e:
         logger.error(f"Failed to start APScheduler: {e}", exc_info=True)

def shutdown_scheduler():
    """Shuts down the scheduler gracefully."""
    if scheduler.running:
        logger.info("Shutting down APScheduler...")
        scheduler.shutdown()
        logger.info("APScheduler shut down.")