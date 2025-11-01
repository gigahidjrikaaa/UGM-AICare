from __future__ import annotations

import logging
import os
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Set, cast
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.blockchain import mint_nft_badge
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.models import User, UserBadge  # Core models
from app.domains.mental_health.models import (
    Appointment,
    AppointmentType,
    Conversation,
    JournalEntry,
)
from app.schemas.user import (
    CheckinSettingsResponse,
    CheckinSettingsUpdate,
    ContactInfo,
    ConsentAndPrivacySettings,
    EmergencyContact,
    EarnedBadgeInfo,
    LocalizationAndAccessibility,
    ProfileHeaderSummary,
    SafetyAndClinicalBasics,
    SyncAchievementsResponse,
    TherapyAssignment,
    TimelineEntry,
    UserProfileOverviewResponse,
    UserProfileOverviewUpdate,
    UserStatsResponse,
)
from app.utils.security_utils import decrypt_data, encrypt_data
from app.domains.mental_health.services.user_stats_service import UserStatsService

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Profile"],
    dependencies=[Depends(get_current_active_user)],
)

LET_THERE_BE_BADGE_BADGE_ID = 1
TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID = 2
SEVEN_DAYS_A_WEEK_BADGE_ID = 3
TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID = 4
FULL_MOON_POSITIVITY_BADGE_ID = 5
QUARTER_CENTURY_OF_JOURNALING_BADGE_ID = 6
UNLEASH_THE_WORDS_BADGE_ID = 7
BESTIES_BADGE_ID = 8


def _safe_decrypt(value: str | None) -> str | None:
    if not value:
        return None
    decrypted = decrypt_data(value)
    return decrypted or value


def _normalize_optional_string(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _encrypt_optional(value: str | None) -> str | None:
    if value is None:
        return None
    encrypted = encrypt_data(value)
    if encrypted is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to secure profile data.",
        )
    return encrypted


def _calculate_age(dob: date | None) -> int | None:
    if not dob:
        return None
    today = date.today()
    years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return max(years, 0)


async def _ensure_check_in_code(user: User, db: AsyncSession) -> None:
    if user.check_in_code:
        return
    user.check_in_code = uuid.uuid4().hex
    db.add(user)
    await db.commit()
    await db.refresh(user)


def _build_avatar_url(full_name: str | None, check_in_code: str) -> str:
    seed = full_name or check_in_code
    return f"https://api.dicebear.com/7.x/initials/svg?seed={quote(seed)}"


async def _build_timeline(user_id: int, db: AsyncSession) -> List[TimelineEntry]:
    timeline: List[TimelineEntry] = []

    journal_stmt = (
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.created_at.desc())
        .limit(10)
    )
    journal_entries = (await db.execute(journal_stmt)).scalars().all()
    for entry in journal_entries:
        description = (entry.content[:160] + "...") if len(entry.content) > 160 else entry.content
        timeline.append(
            TimelineEntry(
                kind="journal",
                title="Journal entry submitted",
                description=description,
                timestamp=entry.created_at,
                metadata={"entry_id": entry.id, "entry_date": date.fromisoformat(str(entry.entry_date)).isoformat()},
            )
        )

    session_starts_subquery = (
        select(
            Conversation.session_id,
            func.min(Conversation.timestamp).label("started_at"),
        )
        .where(Conversation.user_id == user_id)
        .group_by(Conversation.session_id)
        .subquery()
    )

    conversation_stmt = (
        select(Conversation, session_starts_subquery.c.started_at)
        .join(
            session_starts_subquery,
            and_(
                Conversation.session_id == session_starts_subquery.c.session_id,
                Conversation.timestamp == session_starts_subquery.c.started_at,
            ),
        )
        .order_by(session_starts_subquery.c.started_at.desc())
        .limit(10)
    )
    conversation_rows = await db.execute(conversation_stmt)
    for convo, started_at in conversation_rows.all():
        raw_message = (convo.message or "").strip()
        normalized = " ".join(raw_message.split())
        if normalized:
            topic = normalized[:80]
            if len(normalized) > 80:
                topic = topic.rstrip() + "..."
            title = f"Opened a session with Aika about {topic}"
        else:
            title = "Opened a session with Aika"

        timeline.append(
            TimelineEntry(
                kind="conversation",
                title=title,
                description=None,
                timestamp=started_at,
                metadata={"session_id": convo.session_id},
            )
        )

    appointment_stmt = (
        select(Appointment, AppointmentType)
        .join(AppointmentType, Appointment.appointment_type_id == AppointmentType.id)
        .where(Appointment.user_id == user_id)
        .order_by(Appointment.appointment_datetime.desc())
        .limit(10)
    )
    appointment_rows = await db.execute(appointment_stmt)
    for appointment, appointment_type in appointment_rows.all():
        title = f"Appointment: {appointment_type.name}" if getattr(appointment_type, "name", None) else "Therapy appointment"
        timeline.append(
            TimelineEntry(
                kind="appointment",
                title=title,
                description=f"Status: {appointment.status}",
                timestamp=appointment.appointment_datetime,
                metadata={"appointment_id": appointment.id},
            )
        )

    badge_stmt = (
        select(UserBadge)
        .where(UserBadge.user_id == user_id)
        .order_by(UserBadge.awarded_at.desc())
        .limit(10)
    )
    badges = (await db.execute(badge_stmt)).scalars().all()
    for badge in badges:
        timeline.append(
            TimelineEntry(
                kind="badge",
                title="New badge earned",
                description=f"Badge #{badge.badge_id}",
                timestamp=badge.awarded_at,
                metadata={"transaction_hash": badge.transaction_hash},
            )
        )

    timeline.sort(key=lambda entry: entry.timestamp, reverse=True)
    return timeline[:20]


@router.get("/overview", response_model=UserProfileOverviewResponse)
async def get_profile_overview(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> UserProfileOverviewResponse:
    await _ensure_check_in_code(current_user, db)

    email = _safe_decrypt(current_user.email) or current_user.email
    phone = _safe_decrypt(current_user.phone)
    alternate_phone = _safe_decrypt(current_user.alternate_phone)

    emergency_contact = EmergencyContact(
        name=_safe_decrypt(current_user.emergency_contact_name),
        relationship=_safe_decrypt(current_user.emergency_contact_relationship),
        phone=_safe_decrypt(current_user.emergency_contact_phone),
        email=_safe_decrypt(current_user.emergency_contact_email),
    )
    if not any([emergency_contact.name, emergency_contact.relationship, emergency_contact.phone, emergency_contact.email]):
        emergency_contact = None

    full_name_parts = [
        _safe_decrypt(current_user.first_name),
        _safe_decrypt(current_user.last_name),
    ]
    full_name = " ".join([part for part in full_name_parts if part]) or _safe_decrypt(current_user.name)
    preferred_name = _safe_decrypt(current_user.preferred_name)

    header = ProfileHeaderSummary(
        user_id=current_user.id,
        full_name=full_name,
        preferred_name=preferred_name,
        pronouns=_safe_decrypt(current_user.pronouns),
        profile_photo_url=_safe_decrypt(current_user.profile_photo_url),
        wallet_address=current_user.wallet_address,
        google_sub=current_user.google_sub,
        avatar_url=_safe_decrypt(current_user.profile_photo_url)
        or _build_avatar_url(preferred_name or full_name, current_user.check_in_code or str(current_user.id)),
        date_of_birth=cast(date, current_user.date_of_birth) if current_user.date_of_birth else None,
        age=_calculate_age(cast(date, current_user.date_of_birth) if current_user.date_of_birth else None),
        sentiment_score=current_user.sentiment_score,
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        last_activity_date=cast(date, current_user.last_activity_date) if current_user.last_activity_date else None,
        city=_safe_decrypt(current_user.city),
        university=_safe_decrypt(current_user.university),
        major=_safe_decrypt(current_user.major),
        year_of_study=_safe_decrypt(current_user.year_of_study),
        created_at=current_user.created_at,
        check_in_code=current_user.check_in_code or "",
    )

    contact = ContactInfo(
        primary_email=email,
        phone=phone,
        alternate_phone=alternate_phone,
        emergency_contact=emergency_contact,
    )

    safety = SafetyAndClinicalBasics(
        risk_level=_safe_decrypt(current_user.risk_level),
        clinical_summary=_safe_decrypt(current_user.clinical_summary),
        primary_concerns=_safe_decrypt(current_user.primary_concerns),
        safety_plan_notes=_safe_decrypt(current_user.safety_plan_notes),
    )

    therapy = TherapyAssignment(
        current_therapist_name=_safe_decrypt(current_user.current_therapist_name),
        current_therapist_contact=_safe_decrypt(current_user.current_therapist_contact),
        therapy_modality=_safe_decrypt(current_user.therapy_modality),
        therapy_frequency=_safe_decrypt(current_user.therapy_frequency),
        therapy_notes=_safe_decrypt(current_user.therapy_notes),
    )

    consent = ConsentAndPrivacySettings(
        allow_email_checkins=current_user.allow_email_checkins,
        consent_data_sharing=current_user.consent_data_sharing,
        consent_research=current_user.consent_research,
        consent_emergency_contact=current_user.consent_emergency_contact,
        consent_marketing=current_user.consent_marketing,
    )

    localization = LocalizationAndAccessibility(
        preferred_language=_safe_decrypt(current_user.preferred_language),
        preferred_timezone=_safe_decrypt(current_user.preferred_timezone),
        accessibility_needs=_safe_decrypt(current_user.accessibility_needs),
        communication_preferences=_safe_decrypt(current_user.communication_preferences),
        interface_preferences=_safe_decrypt(current_user.interface_preferences),
    )

    timeline = await _build_timeline(current_user.id, db)

    return UserProfileOverviewResponse(
        header=header,
        contact=contact,
        safety=safety,
        therapy=therapy,
        timeline=timeline,
        consent=consent,
        localization=localization,
        aicare_team_notes=_safe_decrypt(current_user.aicare_team_notes),
    )


@router.post("/refresh-stats", response_model=UserStatsResponse)
async def refresh_user_stats(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> UserStatsResponse:
    """
    Refresh and update user statistics (streaks, sentiment score).
    Call this endpoint from dashboard/profile to ensure stats are always current.
    """
    logger.info(f"Refreshing stats for user {current_user.id}")
    try:
        stats_service = UserStatsService(db)
        stats = await stats_service.refresh_user_stats(current_user)
        return stats
    except Exception as e:
        logger.error(f"Failed to refresh stats for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh user statistics"
        )


@router.put("/overview", response_model=UserProfileOverviewResponse)
async def update_profile_overview(
    payload: UserProfileOverviewUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> UserProfileOverviewResponse:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return await get_profile_overview(db=db, current_user=current_user)

    string_fields = [
        "preferred_name",
        "pronouns",
        "profile_photo_url",
        "phone",
        "alternate_phone",
        "emergency_contact_name",
        "emergency_contact_relationship",
        "emergency_contact_phone",
        "emergency_contact_email",
        "risk_level",
        "clinical_summary",
        "primary_concerns",
        "safety_plan_notes",
        "current_therapist_name",
        "current_therapist_contact",
        "therapy_modality",
        "therapy_frequency",
        "therapy_notes",
        "preferred_language",
        "preferred_timezone",
        "accessibility_needs",
        "communication_preferences",
        "interface_preferences",
        "city",
        "university",
        "major",
        "year_of_study",
    ]
    boolean_fields = [
        "consent_data_sharing",
        "consent_research",
        "consent_emergency_contact",
        "consent_marketing",
    ]

    updated = False

    try:
        for field in string_fields:
            if field in data:
                normalized = _normalize_optional_string(data.get(field))
                if normalized is None:
                    setattr(current_user, field, None)
                else:
                    setattr(current_user, field, _encrypt_optional(normalized))
                updated = True

        for field in boolean_fields:
            if field in data and data[field] is not None:
                setattr(current_user, field, data[field])
                updated = True

        if updated:
            current_user.updated_at = datetime.utcnow()
            db.add(current_user)
            await db.commit()
            await db.refresh(current_user)
            
            # Invalidate user cache after profile update
            from app.core.cache import invalidate_user_cache
            await invalidate_user_cache(current_user.id)
            logger.info(f"Invalidated cache for user {current_user.id} after profile update")
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        await db.rollback()
        logger.error("Failed to update profile overview for user %s", current_user.id, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile overview.") from exc

    return await get_profile_overview(db=db, current_user=current_user)


@router.put("/settings/checkins", response_model=CheckinSettingsResponse)
async def update_checkin_settings(
    settings: CheckinSettingsUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> CheckinSettingsResponse:
    logger.info("Updating check-in settings for user %s to %s", current_user.id, settings.allow_email_checkins)
    current_user.allow_email_checkins = settings.allow_email_checkins
    try:
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)
    except Exception as exc:  # pragma: no cover - defensive logging
        await db.rollback()
        logger.error("Failed to update check-in settings for user %s", current_user.id, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update settings") from exc

    return CheckinSettingsResponse(allow_email_checkins=current_user.allow_email_checkins)


@router.post("/sync-achievements", response_model=SyncAchievementsResponse)
async def sync_user_achievements(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> SyncAchievementsResponse:
    logger.info("Running achievement sync for user %s", current_user.id)
    needs_db_update = False
    badges_to_add_to_db: List[Dict[str, Any]] = []
    newly_awarded_badge_info: List[EarnedBadgeInfo] = []

    try:
        current_streak = current_user.current_streak
        journal_count = (
            await db.execute(
                select(func.count(JournalEntry.id)).filter(JournalEntry.user_id == current_user.id)
            )
        ).scalar() or 0
        total_activity_days = (
            await db.execute(
                select(func.count(func.distinct(JournalEntry.entry_date))).filter(
                    JournalEntry.user_id == current_user.id
                )
            )
        ).scalar() or 0
        awarded_badges_res = await db.execute(
            select(UserBadge.badge_id).filter(UserBadge.user_id == current_user.id)
        )
        awarded_badge_ids: Set[int] = {row[0] for row in awarded_badges_res.all()}

        nft_contract_address = os.getenv("NFT_CONTRACT_ADDRESS")
        if not nft_contract_address:
            logger.error("NFT_CONTRACT_ADDRESS not configured. Cannot mint badges.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server configuration error prevents badge awarding.")

        def attempt_mint(badge_id: int, reason: str) -> None:
            nonlocal needs_db_update
            if badge_id in awarded_badge_ids:
                return
            logger.info("User %s qualifies for badge %s (%s)", current_user.id, badge_id, reason)
            if current_user.wallet_address:
                tx_hash = mint_nft_badge(current_user.wallet_address, badge_id)
                if tx_hash:
                    badges_to_add_to_db.append({"badge_id": badge_id, "tx_hash": tx_hash})
                    needs_db_update = True
                else:
                    logger.error("Minting badge %s failed for user %s", badge_id, current_user.id)
            else:
                logger.warning("User %s qualifies for badge %s but has no linked wallet", current_user.id, badge_id)

        if total_activity_days >= 1:
            attempt_mint(LET_THERE_BE_BADGE_BADGE_ID, "First activity")
        if total_activity_days >= 3:
            attempt_mint(TRIPLE_THREAT_OF_THOUGHTS_BADGE_ID, "3 days of activity")
        if current_streak >= 7:
            attempt_mint(SEVEN_DAYS_A_WEEK_BADGE_ID, "7-day streak")
        if current_streak >= 14:
            attempt_mint(TWO_WEEKS_NOTICE_YOU_GAVE_TO_NEGATIVITY_BADGE_ID, "14-day streak")
        if current_streak >= 30:
            attempt_mint(FULL_MOON_POSITIVITY_BADGE_ID, "30-day streak")
        if journal_count >= 25:
            attempt_mint(QUARTER_CENTURY_OF_JOURNALING_BADGE_ID, "25 journal entries")

        if badges_to_add_to_db:
            current_time = datetime.now()
            for badge_info in badges_to_add_to_db:
                new_award = UserBadge(
                    user_id=current_user.id,
                    badge_id=badge_info["badge_id"],
                    contract_address=nft_contract_address,
                    transaction_hash=badge_info["tx_hash"],
                    awarded_at=current_time,
                )
                db.add(new_award)
                newly_awarded_badge_info.append(
                    EarnedBadgeInfo(
                        badge_id=badge_info["badge_id"],
                        awarded_at=current_time,
                        transaction_hash=badge_info["tx_hash"],
                        contract_address=nft_contract_address,
                    )
                )

        if needs_db_update:
            try:
                await db.commit()
                logger.info("Saved %s new badge awards for user %s", len(newly_awarded_badge_info), current_user.id)
            except Exception as exc:  # pragma: no cover - defensive logging
                await db.rollback()
                logger.error("Database error while saving new badge awards", exc_info=True)
                return SyncAchievementsResponse(
                    message="Checked achievements, but failed to save some awards.",
                    newly_awarded_badges=[],
                )

        return SyncAchievementsResponse(
            message="Achievements checked successfully.",
            newly_awarded_badges=newly_awarded_badge_info,
        )

    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Unexpected error syncing achievements for user %s", current_user.id, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to sync achievements") from exc


@router.get("/my-badges", response_model=List[EarnedBadgeInfo])
async def get_my_earned_badges(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> List[EarnedBadgeInfo]:
    logger.info("Fetching earned badges for user %s", current_user.id)
    try:
        result = await db.execute(
            select(UserBadge).filter(UserBadge.user_id == current_user.id).order_by(UserBadge.awarded_at.desc())
        )
        return list(result.scalars().all())
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Error fetching badges for user %s", current_user.id, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve earned badges.") from exc

