"""DB-backed adaptive activity selection (JITAI Phase 4).

Loads activity posteriors from the intervention-assignment ledger (population +
the requesting user's own outcomes), then delegates the pick to the pure
Thompson-sampling selector. Experiment-gated: returns a ``control`` selection
unless both ``JITAI_ENABLED`` and ``JITAI_EXPERIMENT_ENABLED`` are on.

Safety: this only chooses among acceptable low-risk self-help activities; it
never withholds an intervention and never touches the safety/escalation path.
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tca.activities_catalog import ACTIVITIES_CATALOG
from app.core.settings import settings
from app.domains.mental_health.models import InterventionAssignment
from app.services.adaptive_selector import Selection, bucketed_arm, select_activity

logger = logging.getLogger(__name__)

EXPERIMENT_KEY = "adaptive_vs_static_v1"
ARMS = ("control", "adaptive")
POSTERIOR_WINDOW_DAYS = 180
_ACTIVITY_PREFIX = "activity:"


def activity_id_from_key(intervention_key: Optional[str]) -> Optional[str]:
    if intervention_key and intervention_key.startswith(_ACTIVITY_PREFIX):
        return intervention_key[len(_ACTIVITY_PREFIX):]
    return None


def experiment_eligible(
    *, jitai_enabled: bool, experiment_enabled: bool, consent: bool
) -> bool:
    """The adaptive experiment runs only with flags ON *and* explicit consent."""
    return bool(jitai_enabled and experiment_enabled and consent)


async def _posteriors(
    db: AsyncSession, cutoff: datetime, *, user_id: Optional[int] = None
) -> Dict[str, Tuple[float, float]]:
    """Raw (improved, not_improved) counts per activity from the ledger."""
    stmt = select(
        InterventionAssignment.intervention_key,
        InterventionAssignment.outcome_label,
    ).where(
        InterventionAssignment.status == "measured",
        InterventionAssignment.measured_at >= cutoff,
    )
    if user_id is not None:
        stmt = stmt.where(InterventionAssignment.user_id == user_id)

    counts: Dict[str, List[int]] = {}
    for intervention_key, label in (await db.execute(stmt)).all():
        activity_id = activity_id_from_key(intervention_key)
        if not activity_id:
            continue
        slot = counts.setdefault(activity_id, [0, 0])  # improved, total
        slot[1] += 1
        if label == "improved":
            slot[0] += 1

    return {aid: (improved, total - improved) for aid, (improved, total) in counts.items()}


def _merge_priors(
    population: Dict[str, Tuple[float, float]],
    user: Dict[str, Tuple[float, float]],
) -> Dict[str, Tuple[float, float]]:
    """Beta(1 + improved, 1 + not_improved) blending population + user counts."""
    posteriors: Dict[str, Tuple[float, float]] = {}
    for activity_id in set(population) | set(user):
        pop_improved, pop_not = population.get(activity_id, (0.0, 0.0))
        usr_improved, usr_not = user.get(activity_id, (0.0, 0.0))
        posteriors[activity_id] = (
            1.0 + pop_improved + usr_improved,
            1.0 + pop_not + usr_not,
        )
    return posteriors


def candidate_activities(target_dimensions: Optional[Sequence[str]] = None) -> List[str]:
    """Activity ids, optionally filtered to the target dimensions."""
    from app.services.intervention_targeting import dimensions_for_activity

    ids = list(ACTIVITIES_CATALOG.keys())
    if target_dimensions:
        wanted = set(target_dimensions)
        filtered = [aid for aid in ids if wanted & set(dimensions_for_activity(aid))]
        return filtered or ids
    return ids


async def recommend_activity(
    db: AsyncSession,
    *,
    user_id: int,
    target_dimensions: Optional[Sequence[str]] = None,
    rng: Optional[random.Random] = None,
) -> Optional[Selection]:
    """Return the selection for this user, or None when the experiment is off."""
    if not (settings.jitai_enabled and settings.jitai_experiment_enabled):
        return None

    # Explicit per-user opt-in: no personalization/randomization without consent.
    from app.models import User

    consent = (
        await db.execute(select(User.consent_personalization).where(User.id == user_id))
    ).scalar_one_or_none()
    if not experiment_eligible(
        jitai_enabled=True, experiment_enabled=True, consent=bool(consent)
    ):
        logger.info("Adaptive selection skipped: user %s has not consented", user_id)
        return None

    try:
        arm = bucketed_arm(user_id, EXPERIMENT_KEY, ARMS)
    except Exception as exc:  # bucketing must never break plan generation
        logger.warning("Adaptive selection bucketing failed for user %s: %s", user_id, exc)
        return None

    if arm == "control":
        return Selection(activity_id=None, method="rule", arm="control", experiment_key=EXPERIMENT_KEY)

    cutoff = datetime.now(timezone.utc) - timedelta(days=POSTERIOR_WINDOW_DAYS)
    population = await _posteriors(db, cutoff)
    user_stats = await _posteriors(db, cutoff, user_id=user_id)
    posteriors = _merge_priors(population, user_stats)

    candidates = candidate_activities(target_dimensions)
    picked = select_activity(
        candidates,
        posteriors,
        exploration_rate=float(settings.jitai_exploration_rate),
        rng=rng,
    )
    logger.info(
        "Adaptive selection: user=%s arm=%s activity=%s method=%s",
        user_id,
        arm,
        picked.activity_id,
        picked.method,
    )
    return Selection(
        activity_id=picked.activity_id,
        method=picked.method,
        arm="adaptive",
        experiment_key=EXPERIMENT_KEY,
    )
