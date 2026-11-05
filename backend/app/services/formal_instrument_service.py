"""Formal instrument administration: scoring, persistence, profile update.

Extends the opt-in self-report channel (``self_report_service.py``) to full
administered instruments — PHQ-9 and GAD-7 — defined in
``app.domains.mental_health.screening.formal_instruments``.

A submission:
1. is scored against the published instrument (total, band, crisis flag);
2. is persisted as a ``FormalScreeningSubmission`` (auditable item-level record);
3. appends a ``ScreeningDimensionSample`` (source=``formal_instrument``) so the
   longitudinal series and the trajectory detector see it;
4. updates the ``UserScreeningProfile`` dimension score directly (a formal
   instrument is a stronger signal than covert extraction, so it *sets* the
   dimension score and puts a floor under the overall risk level);
5. when the crisis gateway item is non-zero (PHQ-9 item 9), raises a counselor
   alert and returns the canonical crisis resources to the UI.

Results are screening indicators, never diagnoses — every response payload
carries the disclaimer and, for elevated bands, concrete next steps.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import (
    FormalScreeningSubmission,
    ScreeningDimensionSample,
    UserScreeningProfile,
)
from app.domains.mental_health.screening.engine import (
    IndicatorSeverity,
    ScreeningDimension,
    ScreeningProfile,
)
from app.domains.mental_health.screening.formal_instruments import (
    FormalInstrument,
    get_instrument,
)

logger = logging.getLogger(__name__)

#: Anti-spam: at most this many submissions per instrument per 24h window.
MAX_SUBMISSIONS_PER_DAY = 3

#: Map instrument bands onto the covert engine's severity ladder. There is
#: deliberately no "critical" mapping: critical is reserved for crisis-signal
#: machinery, not questionnaire totals.
_BAND_TO_SEVERITY: Dict[str, IndicatorSeverity] = {
    "minimal": IndicatorSeverity.NONE,
    "mild": IndicatorSeverity.MILD,
    "moderate": IndicatorSeverity.MODERATE,
    "moderately_severe": IndicatorSeverity.SEVERE,
    "severe": IndicatorSeverity.SEVERE,
}

_SEVERITY_ORDER: Dict[IndicatorSeverity, int] = {
    IndicatorSeverity.NONE: 0,
    IndicatorSeverity.MILD: 1,
    IndicatorSeverity.MODERATE: 2,
    IndicatorSeverity.SEVERE: 3,
    IndicatorSeverity.CRITICAL: 4,
}


async def _count_recent_submissions(
    db: AsyncSession, user_id: int, instrument_code: str
) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    return int(
        await db.scalar(
            select(func.count(FormalScreeningSubmission.id)).where(
                FormalScreeningSubmission.user_id == user_id,
                FormalScreeningSubmission.instrument == instrument_code,
                FormalScreeningSubmission.created_at >= cutoff,
            )
        )
        or 0
    )


def _severity_rank(severity: IndicatorSeverity) -> int:
    return _SEVERITY_ORDER[severity]


def _apply_to_profile(
    profile: ScreeningProfile,
    *,
    instrument: FormalInstrument,
    normalized: float,
    band_key: str,
    band_label: str,
) -> None:
    """Set the instrument's dimension score and raise the overall-risk floor."""
    from app.domains.mental_health.screening.engine import DimensionScore

    dim = profile.dimension_scores.get(instrument.dimension)
    if dim is None:
        dim = DimensionScore(dimension=ScreeningDimension(instrument.dimension))
        profile.dimension_scores[instrument.dimension] = dim

    dim.current_score = max(dim.current_score, float(normalized))
    dim.instrument = instrument.code
    dim.severity_label = band_key
    dim.indicator_count += 1
    dim.last_updated = datetime.utcnow()
    dim.trend = "stable"  # a single snapshot carries no trend by itself

    # Primary concerns: top 3 dimensions by net score (mirrors the engine).
    ranked = sorted(
        (
            (key, score.current_score - score.protective_score * 0.5)
            for key, score in profile.dimension_scores.items()
        ),
        key=lambda item: item[1],
        reverse=True,
    )
    profile.primary_concerns = [key for key, net in ranked[:3] if net > 0.2]

    # Overall risk: the formal band sets a floor under the weighted average.
    band_severity = _BAND_TO_SEVERITY.get(band_key, IndicatorSeverity.MILD)
    averaged = profile.get_severity()
    profile.overall_risk_level = (
        averaged if _severity_rank(averaged) >= _severity_rank(band_severity) else band_severity
    )
    profile.requires_attention = profile.overall_risk_level in (
        IndicatorSeverity.MODERATE,
        IndicatorSeverity.SEVERE,
        IndicatorSeverity.CRITICAL,
    )


async def record_formal_instrument(
    db: AsyncSession,
    *,
    user_id: int,
    instrument_code: str,
    responses: Sequence[int],
    escalate_on_crisis: bool = True,
) -> Dict[str, Any]:
    """Score, persist, and integrate a formal instrument submission.

    Raises ``ValueError`` on malformed responses and ``RuntimeError`` when the
    per-instrument daily cap is reached.
    """
    instrument = get_instrument(instrument_code)
    scored = score_responses(instrument, responses)

    recent = await _count_recent_submissions(db, user_id, instrument.code)
    if recent >= MAX_SUBMISSIONS_PER_DAY:
        raise RuntimeError(
            f"Daily limit reached for {instrument.code} — try again tomorrow or "
            "review your previous results."
        )

    band: Any = scored["band"]

    submission = FormalScreeningSubmission(
        user_id=user_id,
        instrument=instrument.code,
        responses=list(scored["responses"]),
        total_score=int(scored["total"]),
        max_score=int(scored["max"]),
        normalized_score=float(scored["normalized"]),
        severity_band=band.band,
        severity_label=band.label,
        crisis_flag=bool(scored["crisis_flag"]),
        crisis_item_indices=list(scored["crisis_item_indices"]),
    )
    db.add(submission)

    # Longitudinal series: one sample for the instrument's dimension.
    normalized = float(scored["normalized"])
    db.add(
        ScreeningDimensionSample(
            user_id=user_id,
            dimension=instrument.dimension,
            current_score=normalized,
            protective_score=0.0,
            net_score=normalized,
            instrument=instrument.code,
            raw_score=float(scored["total"]),
            max_score=float(scored["max"]),
            normalized_score=normalized,
            source="formal_instrument",
            source_entity_id=None,
            confidence=1.0,
        )
    )

    # Screening profile: set the dimension score and raise the risk floor.
    profile_row = (
        await db.execute(
            select(UserScreeningProfile).where(UserScreeningProfile.user_id == user_id)
        )
    ).scalar_one_or_none()

    if profile_row is not None and profile_row.profile_data:
        profile = ScreeningProfile(
            user_id=user_id,
            **{k: v for k, v in profile_row.profile_data.items() if k != "user_id"},
        )
    else:
        profile = ScreeningProfile(user_id=user_id)

    _apply_to_profile(
        profile,
        instrument=instrument,
        normalized=normalized,
        band_key=band.band,
        band_label=band.label,
    )

    profile_dict = profile.model_dump(mode="json")
    if profile_row is not None:
        profile_row.profile_data = profile_dict
        profile_row.updated_at = datetime.utcnow()
        profile_row.overall_risk = profile.overall_risk_level.value
        profile_row.requires_attention = profile.requires_attention
    else:
        db.add(
            UserScreeningProfile(
                user_id=user_id,
                profile_data=profile_dict,
                overall_risk=profile.overall_risk_level.value,
                requires_attention=profile.requires_attention,
            )
        )

    await db.flush()

    logger.info(
        "Formal instrument recorded: user=%s instrument=%s total=%s/%s band=%s crisis=%s",
        user_id,
        instrument.code,
        scored["total"],
        scored["max"],
        band.band,
        scored["crisis_flag"],
    )

    crisis_flag = bool(scored["crisis_flag"])
    escalated = False
    if crisis_flag and escalate_on_crisis:
        escalated = await _escalate_crisis_flag(db, user_id=user_id, instrument=instrument, scored=scored)

    return {
        "instrument": instrument.code,
        "dimension": instrument.dimension,
        "total": int(scored["total"]),
        "max": int(scored["max"]),
        "normalized": normalized,
        "band": band.band,
        "band_label": band.label,
        "interpretation": band.interpretation,
        "recommendation": band.recommendation,
        "disclaimer": instrument.disclaimer,
        "crisis_flag": crisis_flag,
        "escalated": escalated,
        "crisis_resources_note": instrument.crisis_resources_note if crisis_flag else "",
    }


async def _escalate_crisis_flag(
    db: AsyncSession,
    *,
    user_id: int,
    instrument: FormalInstrument,
    scored: Dict[str, Any],
) -> bool:
    """Raise counselor + admin alerts for a non-zero crisis gateway item."""
    try:
        from app.models.alerts import AlertSeverity, AlertType
        from app.services.alert_service import get_alert_service
        from app.services.event_sse_bridge import create_user_risk_counselor_alert

        detail = {
            "instrument": instrument.code,
            "total": scored["total"],
            "band": scored["band"].band,
            "crisis_item_indices": scored["crisis_item_indices"],
            "detection_type": "formal_instrument_crisis_item",
        }

        escalated = await create_user_risk_counselor_alert(
            user_id=user_id,
            title="Screening Crisis Item Flagged",
            message=(
                f"A student flagged the {instrument.code} crisis gateway item "
                f"(self-harm ideation, total {scored['total']}/{scored['max']}). "
                "Review the screening profile and reach out."
            ),
            severity=AlertSeverity.CRITICAL,
            detail=detail,
        )

        # Admin console alert (mirrors scheduler trend alerts).
        alert_service = get_alert_service(db)
        await alert_service.create_alert(
            alert_type=AlertType.SYSTEM_NOTIFICATION,
            severity=AlertSeverity.CRITICAL,
            title="Screening Crisis Item Flagged",
            message=(
                f"User flagged the {instrument.code} crisis gateway item "
                f"(total {scored['total']}/{scored['max']})."
            ),
            alert_metadata={"user_id": user_id, **detail},
        )
        return escalated
    except Exception as exc:
        logger.error(
            "Failed to escalate formal-instrument crisis flag for user %s: %s",
            user_id,
            exc,
            exc_info=True,
        )
        return False
