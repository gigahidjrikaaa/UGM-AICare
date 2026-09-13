"""Adaptive activity selection (JITAI Phase 4).

Thompson-sampling bandit over therapeutic activities, with an epsilon
exploration floor and a stable experiment-bucketing helper.

Pure — no DB and no LLM — so it is deterministic under a seeded RNG and easy to
test. DB-backed posterior loading lives in ``adaptive_selection_service``.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from typing import Dict, Optional, Sequence, Tuple


@dataclass(frozen=True)
class Selection:
    """The selector's decision for one plan."""

    activity_id: Optional[str]
    method: str  # cold_start | adaptive | explore | rule
    arm: Optional[str]  # control | adaptive | None
    experiment_key: Optional[str] = None


def bucketed_arm(user_id: int, experiment_key: str, arms: Sequence[str]) -> str:
    """Deterministically assign *user_id* to one arm (stable across calls)."""
    if not arms:
        raise ValueError("arms must be non-empty")
    digest = hashlib.sha256(f"{experiment_key}:{user_id}".encode("utf-8")).hexdigest()
    bucket = int(digest[:8], 16) % len(arms)
    return arms[bucket]


def select_activity(
    candidate_ids: Sequence[str],
    posteriors: Dict[str, Tuple[float, float]],
    *,
    exploration_rate: float = 0.1,
    rng: Optional[random.Random] = None,
) -> Selection:
    """Pick an activity via Thompson sampling with an epsilon exploration floor.

    ``posteriors`` maps activity_id -> (alpha, beta) of a Beta success belief;
    missing entries fall back to the uniform Beta(1, 1) prior.
    """
    candidates = [c for c in candidate_ids if c]
    if not candidates:
        return Selection(activity_id=None, method="cold_start", arm=None)

    rng = rng or random.Random()

    if rng.random() < max(0.0, min(1.0, float(exploration_rate))):
        return Selection(activity_id=rng.choice(candidates), method="explore", arm=None)

    best_id = candidates[0]
    best_theta = -1.0
    informed = False
    for activity_id in candidates:
        alpha, beta = posteriors.get(activity_id, (1.0, 1.0))
        alpha = max(0.01, float(alpha))
        beta = max(0.01, float(beta))
        if alpha + beta > 2.0:
            informed = True
        theta = rng.betavariate(alpha, beta)
        if theta > best_theta:
            best_theta = theta
            best_id = activity_id

    return Selection(
        activity_id=best_id,
        method="adaptive" if informed else "cold_start",
        arm=None,
    )
