# backend/app/core/scheduler.py
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler # type: ignore
from sqlalchemy.orm import Session
from app.database import SessionLocal # Factory to create sessions for jobs
from app.models import User
from app.utils.security_utils import decrypt_data
from app.utils.email_utils import send_email
from datetime import datetime, time, timedelta, date
import random
import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Use timezone relevant to your users (e.g., WIB)
scheduler = BackgroundScheduler(timezone="Asia/Jakarta")
CHECKIN_JOB_ID = "proactive_checkin_job"

def send_proactive_checkins():
    """Scheduled job to find inactive users and send check-in emails."""
    logger.info("Scheduler: Running proactive check-in job...")
    db: Optional[Session] = None # Initialize db to None
    try:
        db = SessionLocal() # Create a new session scope for this job run
        # Define criteria: e.g., users opted-in, last active 3 days ago
        three_days_ago = date.today() - timedelta(days=3)

        eligible_users = db.query(User).filter(
            User.allow_email_checkins == True,
            User.last_activity_date == three_days_ago,
            User.email != None # Ensure user has an email stored
        ).all()

        logger.info(f"Scheduler: Found {len(eligible_users)} users eligible for check-in.")
        if not eligible_users: return # Exit early if no one is eligible

        # Get App URL for link back
        app_url = os.getenv('NEXTAUTH_URL', 'http://localhost:3000')

        for user in eligible_users:
            decrypted_email = decrypt_data(user.email) # Decrypt email from DB
            if not decrypted_email:
                logger.error(f"Scheduler: Failed to decrypt email for user {user.id}. Skipping check-in.")
                continue

            # Prepare email content (use variations)
            user_name = user.name or 'Teman UGM' # Use name if available
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
    finally:
        if db:
            db.close() # Ensure the session is closed after the job finishes
            logger.debug("Scheduler: Database session closed for check-in job.")

def start_scheduler():
    """Adds the check-in job and starts the scheduler."""
    if scheduler.running:
        logger.info("APScheduler already running.")
        return

    # Schedule to run once daily (e.g., at 10:00 AM WIB)
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