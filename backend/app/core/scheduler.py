# backend/app/core/scheduler.py
"""
Proactive Wellness Scheduler

This module implements the scheduling system for proactive mental health interventions:
1. Risk-weighted check-ins based on screening profile severity
2. Trend detection for deteriorating mental health indicators
3. Personalized outreach based on primary concerns
4. Weekly IA report generation

Key Features:
- Uses APScheduler with AsyncIOScheduler for FastAPI compatibility
- Risk-weighted inactivity thresholds (severe=1 day, moderate=2 days, mild=3 days, none=5 days)
- Tracks check-in history to avoid spamming users
- Screening-aware message personalization
"""
from __future__ import annotations

from typing import Optional, Dict, List, Any, TYPE_CHECKING
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import joinedload
from app.database import AsyncSessionLocal
from app.models import User
from app.domains.mental_health.models.assessments import UserScreeningProfile
from app.utils.email_utils import send_email
from app.domains.mental_health.services.insights_service import InsightsService
from datetime import datetime, timedelta, date
import random
import os
import logging
import asyncio
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)

# Use AsyncIOScheduler to work properly with FastAPI's event loop
scheduler = AsyncIOScheduler(timezone="Asia/Jakarta")

# Job IDs
CHECKIN_JOB_ID = "proactive_checkin_job"
TREND_DETECTION_JOB_ID = "trend_detection_job"
WEEKLY_IA_REPORT_JOB_ID = "weekly_ia_report_job"

# =============================================================================
# RISK-WEIGHTED THRESHOLDS
# =============================================================================

# Inactivity thresholds based on risk level (in days)
RISK_INACTIVITY_THRESHOLDS: Dict[str, int] = {
    "critical": 1,   # Check in after 1 day of inactivity
    "severe": 1,     # Check in after 1 day of inactivity
    "moderate": 2,   # Check in after 2 days of inactivity
    "mild": 3,       # Check in after 3 days of inactivity
    "none": 5,       # Check in after 5 days of inactivity (default)
}

# Minimum hours between check-ins to avoid spamming
MIN_HOURS_BETWEEN_CHECKINS = 48  # At least 48 hours between check-ins


# =============================================================================
# PERSONALIZED MESSAGE TEMPLATES
# =============================================================================

def get_personalized_message(
    user_name: str,
    primary_concerns: List[str],
    risk_level: str,
    app_url: str
) -> tuple[str, str]:
    """Generate personalized check-in message based on user's screening profile.
    
    Args:
        user_name: User's display name
        primary_concerns: List of primary concern dimensions from screening
        risk_level: Overall risk level from screening profile
        app_url: Application URL for links
        
    Returns:
        tuple: (subject, html_body)
    """
    # Concern-specific messages
    concern_messages: Dict[str, List[str]] = {
        "depression": [
            f"Halo {user_name}, Aika cuma mau mampir sebentar. Aku tau kadang semuanya terasa berat. Kalau mau cerita, aku di sini ya.",
            f"Hey {user_name}, hope you're doing okay. Kalau lagi nggak semangat atau merasa down, it's okay to talk about it. Aku ada di sini.",
        ],
        "anxiety": [
            f"Hai {user_name}, Aika di sini. Kalau pikiranmu lagi racing atau merasa overwhelmed, kamu nggak sendirian. Mau ngobrol?",
            f"Hey {user_name}, just checking in. Kalau lagi banyak yang dikhawatirkan, sometimes it helps to talk it out. I'm here.",
        ],
        "sleep": [
            f"Halo {user_name}, gimana tidurnya belakangan ini? Aku tau susah tidur itu menyebalkan. Kalau mau share, aku siap dengerin.",
            f"Hey {user_name}, Aika mampir sebentar. Kalau malam-malam susah tidur atau gelisah, feel free to chat. Sometimes it helps.",
        ],
        "academic": [
            f"Hai {user_name}, gimana kuliahnya? Aku tau tekanan akademik bisa overwhelming. Kalau butuh teman curhat, aku di sini.",
            f"Hey {user_name}, Aika checking in. Skripsi/tugas kadang bikin stress, I get it. Mau cerita? No judgment here.",
        ],
        "social": [
            f"Halo {user_name}, udah lama kita nggak ngobrol. Kalau lagi merasa sendirian atau butuh teman bicara, aku selalu ada.",
            f"Hey {user_name}, just wanted to reach out. Sometimes we all feel a bit isolated. I'm here if you want to talk.",
        ],
        "self_worth": [
            f"Hai {user_name}, Aika mau remind you that you matter. Kalau lagi nggak yakin sama diri sendiri, let's talk about it.",
            f"Hey {user_name}, just checking in. You're doing better than you think. Kalau mau cerita, I'm here to listen.",
        ],
        "stress": [
            f"Halo {user_name}, gimana kabarnya? Aku tau kamu mungkin lagi banyak tekanan. Kalau mau vent atau sekadar ngobrol, aku di sini.",
            f"Hey {user_name}, Aika here. Stress can pile up quickly. Mau share what's on your mind? No pressure.",
        ],
    }
    
    # Default messages for general check-in
    default_messages = [
        f"Halo {user_name}, Aika cuma mau mampir sebentar nih. Gimana kabarmu beberapa hari ini? Kalau mau cerita atau sekadar ngobrol, aku ada di sini ya.",
        f"Hai {user_name}, hope you're doing okay! Udah beberapa hari kita nggak ngobrol, kalau ada yang ingin dibagikan, jangan ragu ya. Salam, Aika.",
        f"Hey {user_name}, it's Aika! Just checking in. Remember, taking small moments for yourself matters. Kalau butuh teman bicara, feel free to chat!",
    ]
    
    # Risk-specific urgent messages
    urgent_messages = [
        f"Hai {user_name}, Aika di sini. Aku cuma mau ngecek keadaanmu. Gimana perasaanmu hari ini? Kalau ada yang berat, cerita aja ya.",
        f"Hey {user_name}, I've been thinking about you. Just wanted to check in - how are you really doing? I'm here to listen.",
    ]
    
    # Select message based on concerns and risk
    if risk_level in ("critical", "severe"):
        message = random.choice(urgent_messages)
        subject = f"Aika thinking of you, {user_name} 💙"
    elif primary_concerns:
        # Get message for the first (most significant) concern
        primary = primary_concerns[0] if primary_concerns else None
        if primary and primary in concern_messages:
            message = random.choice(concern_messages[primary])
            subject = f"Hey {user_name}, Aika mampir sebentar"
        else:
            message = random.choice(default_messages)
            subject = random.choice([
                f"Sekadar menyapa dari Aika, {user_name}!",
                "Checking in - Gimana kabarmu?",
                "Aika mampir sebentar :)",
            ])
    else:
        message = random.choice(default_messages)
        subject = random.choice([
            f"Sekadar menyapa dari Aika, {user_name}!",
            "Checking in - Gimana kabarmu?",
            "Aika mampir sebentar :)",
        ])
    
    # Build HTML body
    html_body = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="font-size: 16px; line-height: 1.6; color: #333;">{message}</p>
        <p style="margin-top: 24px;">
            <a href="{app_url}/aika" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Ngobrol sama Aika
            </a>
        </p>
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999; margin-top: 16px;">
            Kamu menerima email ini karena mengaktifkan fitur check-in Aika. 
            Kamu bisa menonaktifkannya di <a href="{app_url}/settings" style="color: #666;">halaman pengaturan</a>.
        </p>
    </body>
    </html>
    """
    
    return subject, html_body


# =============================================================================
# PROACTIVE CHECK-IN JOB
# =============================================================================

async def send_proactive_checkins() -> None:
    """Scheduled job to find inactive users and send personalized check-in emails.
    
    Features:
    - Risk-weighted inactivity thresholds
    - Range-based query (not exact date match)
    - Excludes recently contacted users
    - Screening-aware message personalization
    - Tracks check-in history
    """
    logger.info("Scheduler: Running proactive check-in job...")
    async with AsyncSessionLocal() as db:
        try:
            app_url = os.getenv('NEXTAUTH_URL', 'http://localhost:4000')
            today = date.today()
            now = datetime.now()
            
            # Get all users with their screening profiles
            stmt = (
                select(User, UserScreeningProfile)
                .outerjoin(UserScreeningProfile, User.id == UserScreeningProfile.user_id)
                .where(
                    User.allow_email_checkins == True,
                    User.email != None,
                    User.is_active == True,
                )
            )
            result = await db.execute(stmt)
            users_with_profiles = result.all()
            
            eligible_count = 0
            sent_count = 0
            
            for user, screening_profile in users_with_profiles:
                # Determine risk level from screening profile
                risk_level = "none"
                primary_concerns: List[str] = []
                
                if screening_profile:
                    risk_level = screening_profile.overall_risk or "none"
                    if screening_profile.profile_data:
                        primary_concerns = screening_profile.profile_data.get("primary_concerns", [])
                
                # Also check user's risk_level field as fallback
                if risk_level == "none" and user.risk_level:
                    risk_level = user.risk_level
                
                # Get threshold for this risk level
                threshold_days = RISK_INACTIVITY_THRESHOLDS.get(risk_level, 5)
                threshold_date = today - timedelta(days=threshold_days)
                
                # Check if user is inactive enough to warrant check-in
                last_activity = user.last_activity_date
                if last_activity is None:
                    # User has never been active, check based on account creation
                    if user.created_at:
                        creation_date = user.created_at.date() if isinstance(user.created_at, datetime) else user.created_at
                        if creation_date > threshold_date:
                            continue  # Account too new
                    else:
                        continue  # No activity data, skip
                elif last_activity > threshold_date:
                    continue  # User has been active recently
                
                # Check if we've already sent a check-in recently
                if user.last_checkin_sent_at:
                    hours_since_checkin = (now - user.last_checkin_sent_at).total_seconds() / 3600
                    if hours_since_checkin < MIN_HOURS_BETWEEN_CHECKINS:
                        logger.debug(f"Scheduler: Skipping user {user.id}, check-in sent {hours_since_checkin:.1f}h ago")
                        continue
                
                eligible_count += 1
                
                # Get email (stored as plaintext, encryption removed for performance)
                if not user.email:
                    continue
                    
                user_email = user.email
                
                # Get personalized message
                user_name = user.name or user.preferred_name or 'Teman UGM'
                subject, html_body = get_personalized_message(
                    user_name=user_name,
                    primary_concerns=primary_concerns,
                    risk_level=risk_level,
                    app_url=app_url
                )
                
                # Send email
                try:
                    send_email(recipient_email=user_email, subject=subject, html_content=html_body)
                    
                    # Update check-in tracking
                    user.last_checkin_sent_at = now
                    user.checkin_count = (user.checkin_count or 0) + 1
                    
                    sent_count += 1
                    logger.info(
                        f"Scheduler: Check-in sent to user {user.id} "
                        f"(risk={risk_level}, concerns={primary_concerns[:2]}, count={user.checkin_count})"
                    )
                    
                    # Rate limit to avoid email service issues
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Scheduler: Failed to send check-in to user {user.id}: {e}")
            
            # Commit all check-in tracking updates
            await db.commit()
            
            logger.info(
                f"Scheduler: Proactive check-in job complete. "
                f"Evaluated: {len(users_with_profiles)}, Eligible: {eligible_count}, Sent: {sent_count}"
            )
            
        except Exception as e:
            logger.error(f"Scheduler: Error during check-in job: {e}", exc_info=True)
            await db.rollback()


# =============================================================================
# TREND DETECTION JOB
# =============================================================================

async def detect_screening_trends() -> None:
    """Scheduled job to detect deteriorating mental health trends.
    
    Analyzes screening profile changes over time to identify:
    - Users whose scores are worsening
    - New entries into moderate/severe categories
    - Patterns requiring proactive intervention
    
    Creates alerts for admin dashboard and triggers early outreach.
    """
    logger.info("Scheduler: Running screening trend detection job...")
    async with AsyncSessionLocal() as db:
        try:
            # Get all screening profiles with significant indicators
            stmt = (
                select(UserScreeningProfile, User)
                .join(User, UserScreeningProfile.user_id == User.id)
                .where(
                    User.is_active == True,
                    or_(
                        UserScreeningProfile.overall_risk.in_(["moderate", "severe", "critical"]),
                        UserScreeningProfile.requires_attention == True,
                    )
                )
            )
            result = await db.execute(stmt)
            profiles_to_check = result.all()
            
            deterioration_count = 0
            alerts_created = 0
            
            for profile, user in profiles_to_check:
                if not profile.profile_data:
                    continue
                
                dimension_scores = profile.profile_data.get("dimension_scores", {})
                
                # Check for deterioration patterns
                deteriorating_dimensions: List[Dict[str, Any]] = []
                for dim_key, score_data in dimension_scores.items():
                    if isinstance(score_data, dict):
                        trend = score_data.get("trend", "stable")
                        current_score = score_data.get("current_score", 0)
                        severity = score_data.get("severity_label", "none")
                        
                        # Flag if worsening and above mild threshold
                        if trend == "worsening" and current_score > 0.3:
                            deteriorating_dimensions.append({
                                "dimension": dim_key,
                                "score": current_score,
                                "severity": severity,
                            })
                
                if deteriorating_dimensions:
                    deterioration_count += 1
                    
                    # Check if user needs immediate attention
                    if profile.overall_risk in ("severe", "critical"):
                        # Create alert for admin
                        try:
                            from app.services.alert_service import get_alert_service
                            from app.models.alerts import AlertType, AlertSeverity
                            
                            alert_service = get_alert_service(db)
                            await alert_service.create_alert(
                                alert_type=AlertType.SYSTEM_NOTIFICATION,
                                severity=AlertSeverity.HIGH if profile.overall_risk == "severe" else AlertSeverity.CRITICAL,
                                title="Deteriorating Mental Health Trend Detected",
                                message=(
                                    f"User {user.id} showing worsening trend in "
                                    f"{len(deteriorating_dimensions)} dimension(s): "
                                    f"{', '.join([d['dimension'] for d in deteriorating_dimensions[:3]])}. "
                                    f"Overall risk: {profile.overall_risk}."
                                ),
                                alert_metadata={
                                    "user_id": user.id,
                                    "risk_level": profile.overall_risk,
                                    "deteriorating_dimensions": deteriorating_dimensions,
                                    "detection_type": "trend_analysis",
                                },
                            )
                            alerts_created += 1
                            logger.warning(
                                f"Scheduler: Created alert for user {user.id} with deteriorating trend"
                            )
                        except Exception as e:
                            logger.error(f"Scheduler: Failed to create alert for user {user.id}: {e}")
                    
                    # Mark profile as requiring attention if not already
                    if not profile.requires_attention:
                        profile.requires_attention = True
                        logger.info(f"Scheduler: Marked user {user.id} profile as requiring attention")
            
            await db.commit()
            
            logger.info(
                f"Scheduler: Trend detection complete. "
                f"Profiles checked: {len(profiles_to_check)}, "
                f"Deteriorating: {deterioration_count}, "
                f"Alerts created: {alerts_created}"
            )
            
        except Exception as e:
            logger.error(f"Scheduler: Error during trend detection: {e}", exc_info=True)
            await db.rollback()


# =============================================================================
# WEEKLY IA REPORT JOB
# =============================================================================

async def generate_weekly_ia_report() -> None:
    """Scheduled job to generate weekly IA insights report."""
    logger.info("Scheduler: Running weekly IA report generation...")
    async with AsyncSessionLocal() as db:
        try:
            insights_service = InsightsService(db)
            
            # Generate report for the past week (with LLM analysis enabled)
            report = await insights_service.generate_weekly_report(
                period_start=None,  # Defaults to 7 days ago
                period_end=None,    # Defaults to now
                use_llm=True
            )
            
            logger.info(
                f"Scheduler: Successfully generated weekly IA report {report.id}. "
                f"Assessments: {report.assessment_count}, High risk: {report.high_risk_count}"
            )
            
            # TODO: Send email notification to admins
            
        except Exception as e:
            logger.error(f"Scheduler: Error during IA report generation: {e}", exc_info=True)


# =============================================================================
# SCHEDULER LIFECYCLE
# =============================================================================

def start_scheduler() -> None:
    """Adds all scheduled jobs and starts the scheduler."""
    if scheduler.running:
        logger.info("APScheduler already running.")
        return

    # Schedule proactive check-in (twice daily: 10:00 AM and 7:00 PM WIB)
    scheduler.add_job(
        send_proactive_checkins,
        trigger='cron',
        hour=10,
        minute=0,
        id=CHECKIN_JOB_ID,
        replace_existing=True,
        misfire_grace_time=3600
    )
    logger.info(f"Scheduled job '{CHECKIN_JOB_ID}' with trigger: cron[hour=10, minute=0]")
    
    # Schedule evening check-in for high-risk users
    scheduler.add_job(
        send_proactive_checkins,
        trigger='cron',
        hour=19,
        minute=0,
        id=f"{CHECKIN_JOB_ID}_evening",
        replace_existing=True,
        misfire_grace_time=3600
    )
    logger.info(f"Scheduled job '{CHECKIN_JOB_ID}_evening' with trigger: cron[hour=19, minute=0]")
    
    # Schedule trend detection (every 6 hours)
    scheduler.add_job(
        detect_screening_trends,
        trigger='cron',
        hour='0,6,12,18',  # Every 6 hours
        minute=30,
        id=TREND_DETECTION_JOB_ID,
        replace_existing=True,
        misfire_grace_time=3600
    )
    logger.info(f"Scheduled job '{TREND_DETECTION_JOB_ID}' with trigger: cron[hour=0,6,12,18, minute=30]")
    
    # Schedule weekly IA report (every Sunday at 2:00 AM WIB)
    scheduler.add_job(
        generate_weekly_ia_report,
        trigger='cron',
        day_of_week='sun',
        hour=2,
        minute=0,
        id=WEEKLY_IA_REPORT_JOB_ID,
        replace_existing=True,
        misfire_grace_time=3600
    )
    logger.info(f"Scheduled job '{WEEKLY_IA_REPORT_JOB_ID}' with trigger: cron[day_of_week=sun, hour=2, minute=0]")

    try:
        scheduler.start()
        logger.info("APScheduler started successfully with enhanced proactive features.")
    except Exception as e:
        logger.error(f"Failed to start APScheduler: {e}", exc_info=True)


def shutdown_scheduler() -> None:
    """Shuts down the scheduler gracefully."""
    if scheduler.running:
        logger.info("Shutting down APScheduler...")
        scheduler.shutdown()
        logger.info("APScheduler shut down.")


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

async def trigger_immediate_checkin(user_id: int, reason: str = "manual") -> bool:
    """Trigger an immediate check-in for a specific user.
    
    Args:
        user_id: User ID to send check-in to
        reason: Reason for triggering (for logging)
        
    Returns:
        bool: True if check-in was sent successfully
    """
    logger.info(f"Scheduler: Triggering immediate check-in for user {user_id} (reason: {reason})")
    
    async with AsyncSessionLocal() as db:
        try:
            app_url = os.getenv('NEXTAUTH_URL', 'http://localhost:4000')
            
            # Get user with screening profile
            stmt = (
                select(User, UserScreeningProfile)
                .outerjoin(UserScreeningProfile, User.id == UserScreeningProfile.user_id)
                .where(User.id == user_id)
            )
            result = await db.execute(stmt)
            row = result.first()
            
            if not row:
                logger.error(f"Scheduler: User {user_id} not found")
                return False
            
            user, profile = row
            
            if not user.email:
                logger.error(f"Scheduler: User {user_id} has no email")
                return False
            
            user_email = user.email  # Stored as plaintext (encryption removed for performance)
            
            # Get screening data
            risk_level = profile.overall_risk if profile else "none"
            primary_concerns: List[str] = []
            if profile and profile.profile_data:
                primary_concerns = profile.profile_data.get("primary_concerns", [])
            
            # Get personalized message
            user_name = user.name or user.preferred_name or 'Teman UGM'
            subject, html_body = get_personalized_message(
                user_name=user_name,
                primary_concerns=primary_concerns,
                risk_level=risk_level,
                app_url=app_url
            )
            
            # Send email
            send_email(recipient_email=user_email, subject=subject, html_content=html_body)
            
            # Update tracking
            user.last_checkin_sent_at = datetime.now()
            user.checkin_count = (user.checkin_count or 0) + 1
            await db.commit()
            
            logger.info(f"Scheduler: Immediate check-in sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Scheduler: Failed to send immediate check-in: {e}", exc_info=True)
            await db.rollback()
            return False
