"""Intervention assignment + outcome measurement (JITAI Phase 2).

Creates one ``InterventionAssignment`` per intervention plan (baseline scores +
target dimensions), then measures the post-intervention outcome once a later
screening sample arrives. This closes the loop: "did this plan help this
student?" — the substrate for the effectiveness engine (Phase 3) and the
adaptive selector (Phase 4).

Design:
- plan-as-unit: one assignment row per plan (idempotent via unique plan_id).
- measurement is driven by sample arrival (hooked from the screening engine)
  plus a scheduled sweeper that expires assignments that never got a post
  sample.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import (
    InterventionAssignment,
    InterventionPlanRecord,
    ScreeningDimensionSample,
    UserScreeningProfile,
)
from app.services.intervention_targeting import (
    derive_intervention_key,
    derive_target_dimensions,
    primary_activity_id,
)

logger = logging.getLogger(__name__)

MEASURE_DELAY = timedelta(hours=24)      # earliest a post sample can count
MEASURE_MAX_WINDOW = timedelta(days=21)  # after this, give up -> unmeasured
IMPROVEMENT_EPS = 0.05                   # net-score delta that counts as change


# ---------------------------------------------------------------------------
# Pure helpers (unit-testable)
# ---------------------------------------------------------------------------
def _sample_to_scores(sample: ScreeningDimensionSample) -> Dict[str, float]:
    return {
        "current": float(sample.current_score),
        "protective": float(sample.protective_score),
        "net": float(sample.net_score),
    }


def compute_outcome(
    baseline_scores: Dict[str, Any],
    post_scores: Dict[str, Any],
) -> Tuple[Dict[str, Any], str]:
    """Compare baseline vs post net scores (lower net = better).

    Returns ``(outcome_by_dimension, overall_label)`` where delta > 0 means
    improvement. Overall label is the majority direction.
    """
    outcome: Dict[str, Any] = {}
    improved = worsened = 0

    for dim, base in (baseline_scores or {}).items():
        base_net = base.get("net") if isinstance(base, dict) else None
        post = (post_scores or {}).get(dim)
        post_net = post.get("net") if isinstance(post, dict) else None
        if base_net is None or post_net is None:
            continue

        delta = float(base_net) - float(post_net)  # positive = improvement
        if delta > IMPROVEMENT_EPS:
            direction = "improved"
            improved += 1
        elif delta < -IMPROVEMENT_EPS:
            direction = "worsened"
            worsened += 1
        else:
            direction = "unchanged"

        outcome[dim] = {
            "baseline_net": float(base_net),
            "post_net": float(post_net),
            "delta": round(delta, 4),
            "direction": direction,
        }

    if not outcome:
        label = "unchanged"
    elif improved > worsened:
        label = "improved"
    elif worsened > improved:
        label = "worsened"
    else:
        label = "unchanged"

    return outcome, label


def build_assignment(
    *,
    user_id: int,
    plan_id: int,
    intervention_key: str,
    primary_activity_id: Optional[str],
    target_dimensions: List[str],
    baseline_scores: Dict[str, Any],
    assigned_at: datetime,
    due_at: Optional[datetime],
    measure_after: datetime,
    assignment_method: str = "rule",
    arm: Optional[str] = None,
    experiment_key: Optional[str] = None,
    policy_decision: Optional[str] = None,
) -> InterventionAssignment:
    return InterventionAssignment(
        user_id=user_id,
        plan_id=plan_id,
        intervention_key=intervention_key,
        primary_activity_id=primary_activity_id,
        target_dimensions=list(target_dimensions),
        baseline_scores=baseline_scores or {},
        assigned_at=assigned_at,
        due_at=due_at,
        measure_after=measure_after,
        assignment_method=assignment_method,
        arm=arm,
        experiment_key=experiment_key,
        policy_decision=policy_decision,
        status="assigned",
    )


# ---------------------------------------------------------------------------
# DB-backed helpers
# ---------------------------------------------------------------------------
async def _primary_concerns(db: AsyncSession, user_id: int) -> List[str]:
    profile = (
        await db.execute(
            select(UserScreeningProfile).where(UserScreeningProfile.user_id == user_id)
        )
    ).scalar_one_or_none()
    if profile and isinstance(profile.profile_data, dict):
        return list(profile.profile_data.get("primary_concerns") or [])
    return []


async def _latest_scores(
    db: AsyncSession,
    user_id: int,
    dimensions: List[str],
    *,
    after: Optional[datetime] = None,
    before: Optional[datetime] = None,
) -> Dict[str, Dict[str, float]]:
    scores: Dict[str, Dict[str, float]] = {}
    for dim in dimensions:
        stmt = (
            select(ScreeningDimensionSample)
            .where(
                ScreeningDimensionSample.user_id == user_id,
                ScreeningDimensionSample.dimension == dim,
            )
            .order_by(ScreeningDimensionSample.created_at.desc())
            .limit(1)
        )
        if after is not None:
            stmt = stmt.where(ScreeningDimensionSample.created_at >= after)
        if before is not None:
            stmt = stmt.where(ScreeningDimensionSample.created_at <= before)
        sample = (await db.execute(stmt)).scalar_one_or_none()
        if sample is not None:
            scores[dim] = _sample_to_scores(sample)
    return scores


async def ensure_assignment_for_plan(
    db: AsyncSession,
    plan: InterventionPlanRecord,
    *,
    commit: bool = False,
) -> Optional[InterventionAssignment]:
    """Create the assignment for *plan* if missing (idempotent)."""
    existing = (
        await db.execute(
            select(InterventionAssignment).where(InterventionAssignment.plan_id == plan.id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    plan_data = plan.plan_data or {}
    activity_id = primary_activity_id(plan_data)
    concerns = await _primary_concerns(db, plan.user_id)
    dimensions = derive_target_dimensions(plan_data, concerns)
    key = derive_intervention_key(plan_data, activity_id, plan.id)

    # JITAI Phase 4: adaptive experiment bookkeeping (present only when the
    # selector ran for this plan).
    selection = plan_data.get("jitai") if isinstance(plan_data, dict) else None
    selection = selection if isinstance(selection, dict) else {}

    assigned_at = datetime.now(timezone.utc)
    due_at: Optional[datetime] = None
    try:
        from app.services.plan_followup_service import parse_timeframe_id

        timeframe = (plan_data.get("next_check_in") or {}).get("timeframe")
        if timeframe:
            due_at = assigned_at + parse_timeframe_id(timeframe)
    except Exception:  # timeframe parsing is best-effort
        due_at = None

    measure_after = assigned_at + MEASURE_DELAY
    baseline = await _latest_scores(db, plan.user_id, dimensions)

    assignment = build_assignment(
        user_id=plan.user_id,
        plan_id=plan.id,
        intervention_key=key,
        primary_activity_id=activity_id,
        target_dimensions=dimensions,
        baseline_scores=baseline,
        assigned_at=assigned_at,
        due_at=due_at,
        measure_after=measure_after,
        assignment_method=selection.get("method") or "rule",
        arm=selection.get("arm"),
        experiment_key=selection.get("experiment_key"),
    )
    db.add(assignment)
    if commit:
        await db.commit()
    logger.info(
        "Intervention assignment created: plan=%s user=%s key=%s dims=%s baseline=%s",
        plan.id,
        plan.user_id,
        key,
        dimensions,
        list(baseline.keys()),
    )
    return assignment


async def _measure_one(
    db: AsyncSession, assignment: InterventionAssignment, now: datetime
) -> bool:
    """Attempt to measure one assignment. Returns True if its status changed."""
    dimensions = list(assignment.target_dimensions or [])
    if not dimensions:
        assignment.status = "unmeasured"
        assignment.unmeasured_reason = "no_target_dimensions"
        return True

    after = assignment.measure_after or assignment.assigned_at
    deadline = assignment.assigned_at + MEASURE_MAX_WINDOW
    post = await _latest_scores(
        db, assignment.user_id, dimensions, after=after, before=min(deadline, now)
    )

    if not post:
        if now >= deadline:
            assignment.status = "unmeasured"
            assignment.unmeasured_reason = "no_post_sample"
            return True
        return False  # still waiting for a post sample

    outcome, label = compute_outcome(assignment.baseline_scores or {}, post)
    assignment.post_scores = post
    assignment.outcome = outcome
    assignment.outcome_label = label
    assignment.measured_at = now
    assignment.status = "measured"
    logger.info(
        "Outcome measured: assignment=%s key=%s label=%s",
        assignment.id,
        assignment.intervention_key,
        label,
    )
    return True


async def measure_open_assignments_for_user(
    db: AsyncSession, user_id: int, *, now: Optional[datetime] = None
) -> int:
    """Measure any open assignments for a user (called when samples arrive)."""
    now = now or datetime.now(timezone.utc)
    rows = (
        await db.execute(
            select(InterventionAssignment).where(
                InterventionAssignment.user_id == user_id,
                InterventionAssignment.status == "assigned",
                InterventionAssignment.measure_after <= now,
            )
        )
    ).scalars().all()

    changed = 0
    for assignment in rows:
        try:
            if await _measure_one(db, assignment, now):
                changed += 1
        except Exception as exc:  # one bad row must not block the rest
            logger.warning("Outcome measurement failed for assignment %s: %s", assignment.id, exc)

    if changed:
        await db.flush()
    return changed


async def expire_stale_assignments(
    db: AsyncSession, *, now: Optional[datetime] = None
) -> int:
    """Mark assignments that never got a post sample as ``unmeasured``."""
    now = now or datetime.now(timezone.utc)
    cutoff = now - MEASURE_MAX_WINDOW
    rows = (
        await db.execute(
            select(InterventionAssignment).where(
                InterventionAssignment.status == "assigned",
                InterventionAssignment.assigned_at < cutoff,
            )
        )
    ).scalars().all()

    for assignment in rows:
        assignment.status = "unmeasured"
        assignment.unmeasured_reason = assignment.unmeasured_reason or "no_post_sample"

    if rows:
        await db.flush()
    return len(rows)
