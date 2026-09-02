"""User normalization helpers.

The normalized tables (`user_profiles`, `user_preferences`,
`user_clinical_records`, `user_emergency_contacts`) are the single source of
truth for profile, preference, clinical, and emergency-contact data. The
legacy denormalized PII/PHI columns on `users` have been dropped.

This module provides:
- centralized accessors so callers stop reaching into `users.*` fields
- `ensure_user_normalized_tables` to guarantee 1:1 rows exist for a user
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable, Optional

from sqlalchemy import inspect, select
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.models.user_preferences import UserPreferences
from app.models.user_profile import UserProfile


_JAKARTA_DEFAULT_COUNTRY = "Indonesia"


def display_name(user: User) -> str:
    """Best-effort human display name (safe for UI + email templates)."""

    if user.profile:
        for candidate in (user.profile.preferred_name, user.profile.first_name, user.profile.full_name):
            if candidate:
                return str(candidate)

    for candidate in (user.name, user.first_name, user.email):
        if candidate:
            return str(candidate)

    return "Teman UGM"


def allow_email_checkins(user: User) -> bool:
    if user.preferences and user.preferences.allow_email_checkins is not None:
        return bool(user.preferences.allow_email_checkins)
    return bool(getattr(user, "allow_email_checkins", True))


def check_in_code(user: User) -> Optional[str]:
    if user.preferences and user.preferences.check_in_code:
        return str(user.preferences.check_in_code)
    return getattr(user, "check_in_code", None)


def current_risk_level(user: User) -> Optional[str]:
    if user.clinical_record and user.clinical_record.current_risk_level:
        return str(user.clinical_record.current_risk_level)
    return None


@dataclass(frozen=True)
class ClinicalSnapshot:
    risk_level: Optional[str]
    clinical_summary: Optional[str]
    primary_concerns: Optional[str]
    safety_plan_notes: Optional[str]


def clinical_snapshot(user: User) -> ClinicalSnapshot:
    if user.clinical_record:
        concerns = user.clinical_record.primary_concerns
        joined: Optional[str] = None
        if concerns:
            normalized = [str(v).strip() for v in concerns if str(v).strip()]
            joined = ", ".join(normalized) if normalized else None
        return ClinicalSnapshot(
            risk_level=current_risk_level(user),
            clinical_summary=user.clinical_record.clinical_summary,
            primary_concerns=joined,
            safety_plan_notes=user.clinical_record.safety_plan_notes,
        )

    return ClinicalSnapshot(
        risk_level=None,
        clinical_summary=None,
        primary_concerns=None,
        safety_plan_notes=None,
    )


async def ensure_user_normalized_tables(db: AsyncSession, user: User) -> User:
    """Ensure normalized 1:1 rows exist (best-effort).

    - Creates missing `user_profiles` / `user_preferences` rows with defaults.
    - Copies remaining shared `users` columns (names, contact, demographics,
      engagement) into the profile when the profile field is empty.
    - Never overwrites non-empty normalized fields.
    """

    changed = False

    # Ensure relationships are loaded in async-safe way.
    # Some call sites intentionally resolve a minimal auth user object
    # with lazy relationships disabled; direct relationship access would
    # otherwise trigger MissingGreenlet.
    relationship_names = {
        "profile",
        "preferences",
        "clinical_record",
        "emergency_contacts",
    }
    user_state = inspect(user)
    should_preload = user_state.detached or any(
        rel_name in user_state.unloaded for rel_name in relationship_names
    )

    if should_preload:
        preload_result = await db.execute(
            select(User)
            .options(
                joinedload(User.profile),
                joinedload(User.preferences),
                selectinload(User.clinical_record),
                selectinload(User.emergency_contacts),
            )
            .where(User.id == user.id)
        )
        loaded_user = preload_result.unique().scalar_one_or_none()
        if loaded_user is not None:
            user = loaded_user

    # ---------------------------------------------------------------------
    # user_profiles
    # ---------------------------------------------------------------------
    if user.profile is None:
        user.profile = UserProfile(user_id=user.id, country=_JAKARTA_DEFAULT_COUNTRY)
        db.add(user.profile)
        changed = True

    profile = user.profile
    if profile is not None:
        # Names
        if not profile.first_name and getattr(user, "first_name", None):
            profile.first_name = user.first_name
            changed = True
        if not profile.last_name and getattr(user, "last_name", None):
            profile.last_name = user.last_name
            changed = True
        if not profile.preferred_name and getattr(user, "preferred_name", None):
            profile.preferred_name = user.preferred_name
            changed = True
        if not profile.pronouns and getattr(user, "pronouns", None):
            profile.pronouns = user.pronouns
            changed = True

        # Contact
        if not profile.phone and getattr(user, "phone", None):
            profile.phone = user.phone
            changed = True
        if not profile.alternate_phone and getattr(user, "alternate_phone", None):
            profile.alternate_phone = user.alternate_phone
            changed = True
        if not getattr(profile, "telegram_username", None) and getattr(user, "telegram_username", None):
            profile.telegram_username = user.telegram_username
            changed = True

        # Demographics / academics
        for attr in (
            "date_of_birth",
            "gender",
            "city",
            "university",
            "major",
        ):
            if getattr(profile, attr, None) is None and getattr(user, attr, None) is not None:
                setattr(profile, attr, getattr(user, attr))
                changed = True

        # year_of_study is int in profile, str in legacy user
        if profile.year_of_study is None and getattr(user, "year_of_study", None):
            try:
                profile.year_of_study = int(str(user.year_of_study))
                changed = True
            except Exception:
                pass

        # Engagement
        if getattr(profile, "sentiment_score", None) in (None, 0.0) and getattr(user, "sentiment_score", None) not in (None, 0.0):
            profile.sentiment_score = float(user.sentiment_score)
            changed = True
        if (profile.current_streak or 0) == 0 and getattr(user, "current_streak", 0):
            profile.current_streak = int(user.current_streak)
            changed = True
        if (profile.longest_streak or 0) == 0 and getattr(user, "longest_streak", 0):
            profile.longest_streak = int(user.longest_streak)
            changed = True
        if profile.last_activity_date is None and getattr(user, "last_activity_date", None) is not None:
            try:
                profile.last_activity_date = user.last_activity_date
                changed = True
            except Exception:
                pass

        if not profile.profile_photo_url and getattr(user, "profile_photo_url", None):
            profile.profile_photo_url = user.profile_photo_url
            changed = True

    # ---------------------------------------------------------------------
    # user_preferences
    # ---------------------------------------------------------------------
    if user.preferences is None:
        user.preferences = UserPreferences(
            user_id=user.id,
            preferred_language="id",
            preferred_timezone="Asia/Jakarta",
            aika_personality="empathetic",
            aika_response_length="balanced",
        )
        db.add(user.preferences)
        changed = True

    preferences = user.preferences
    if preferences is not None:
        # allow_email_checkins exists in both legacy + preferences
        legacy_allow = getattr(user, "allow_email_checkins", None)
        if preferences.allow_email_checkins is None and legacy_allow is not None:
            preferences.allow_email_checkins = bool(legacy_allow)
            changed = True

        legacy_checkin_code = getattr(user, "check_in_code", None)
        if not preferences.check_in_code and legacy_checkin_code:
            preferences.check_in_code = str(legacy_checkin_code)
            changed = True

    if changed:
        # Avoid messing with caller's transaction semantics; the caller owns commit.
        db.add(user)

    return user


async def set_profile_last_activity_date(
    db: AsyncSession,
    *,
    user: User,
    activity_date: date,
) -> None:
    """Update last_activity_date in the normalized profile (best-effort)."""

    if user.profile is None:
        await ensure_user_normalized_tables(db, user)

    if user.profile and user.profile.last_activity_date != activity_date:
        user.profile.last_activity_date = activity_date
        db.add(user.profile)


async def set_checkins_opt_in(db: AsyncSession, *, user: User, allow: bool) -> None:
    if user.preferences is None:
        await ensure_user_normalized_tables(db, user)

    if not user.preferences:
        return

    user.preferences.allow_email_checkins = bool(allow)
    db.add(user.preferences)
