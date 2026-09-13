"""Intervention effectiveness engine (JITAI Phase 3).

Turns the ``intervention_assignments`` ledger into real, privacy-protected
effectiveness statistics — replacing the mock clinical-analytics stubs.

Aggregation model (per intervention, plan-as-unit, measured assignments only):
- n, improved/worsened/unchanged counts (majority direction per assignment)
- MCID-met count (per-assignment mean delta >= ``MCID_THRESHOLD``)
- mean improvement magnitude (mean of max(0, delta), clamped to [0, 1])
- derived rates

Privacy:
- k-anonymity: groups with raw n < ``settings.k_anon`` are suppressed.
- differential privacy (when ``DP_ENABLED``): rows are noised via the IA
  ``DifferentialPrivacyEngine`` plan ``intervention_effectiveness`` and the
  spend is charged to the shared ``DPBudgetAccountant``.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.domains.mental_health.models import InterventionAssignment

logger = logging.getLogger(__name__)

DP_QUESTION_ID = "intervention_effectiveness"
MCID_THRESHOLD = 0.10  # normalized net-score improvement that counts as clinically meaningful


@dataclass(frozen=True)
class AssignmentOutcome:
    """Lightweight projection of a measured assignment (unit-testable input)."""

    intervention_key: str
    outcome_label: Optional[str]
    mean_delta: Optional[float]


def _mean_delta(outcome: Optional[dict]) -> Optional[float]:
    if not isinstance(outcome, dict):
        return None
    deltas = [
        float(v["delta"])
        for v in outcome.values()
        if isinstance(v, dict) and isinstance(v.get("delta"), (int, float))
    ]
    if not deltas:
        return None
    return sum(deltas) / len(deltas)


def aggregate_outcomes(items: List[AssignmentOutcome]) -> List[Dict[str, Any]]:
    """Pure aggregation of measured assignments by intervention key."""
    groups: Dict[str, Dict[str, float]] = {}
    for item in items:
        key = item.intervention_key or "unknown"
        group = groups.setdefault(
            key,
            {"n": 0, "improved": 0, "unchanged": 0, "worsened": 0, "mcid_met": 0, "mag_sum": 0.0, "mag_n": 0},
        )
        group["n"] += 1
        label = item.outcome_label or "unchanged"
        if label == "improved":
            group["improved"] += 1
        elif label == "worsened":
            group["worsened"] += 1
        else:
            group["unchanged"] += 1

        if item.mean_delta is not None:
            if item.mean_delta >= MCID_THRESHOLD:
                group["mcid_met"] += 1
            group["mag_sum"] += max(0.0, min(1.0, item.mean_delta))
            group["mag_n"] += 1

    rows: List[Dict[str, Any]] = []
    for key, group in groups.items():
        magnitude = (group["mag_sum"] / group["mag_n"]) if group["mag_n"] else 0.0
        rows.append(
            {
                "intervention_key": key,
                "n": int(group["n"]),
                "improved": int(group["improved"]),
                "unchanged": int(group["unchanged"]),
                "worsened": int(group["worsened"]),
                "mcid_met": int(group["mcid_met"]),
                "mean_improvement_magnitude": round(magnitude, 4),
            }
        )
    rows.sort(key=lambda r: (-r["n"], r["intervention_key"]))
    return rows


async def collect_outcomes(db: AsyncSession, *, days: int) -> List[AssignmentOutcome]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        await db.execute(
            select(InterventionAssignment).where(
                InterventionAssignment.status == "measured",
                InterventionAssignment.measured_at >= cutoff,
            )
        )
    ).scalars().all()

    return [
        AssignmentOutcome(
            intervention_key=row.intervention_key or "unknown",
            outcome_label=row.outcome_label,
            mean_delta=_mean_delta(row.outcome),
        )
        for row in rows
    ]


def _to_dp_row(row: Dict[str, Any]) -> tuple:
    """Positional row matching the ``intervention_effectiveness`` DP plan."""
    return (
        row["intervention_key"],
        row["n"],
        row["improved"],
        row["worsened"],
        None,  # unchanged (derived)
        row["mcid_met"],
        None,  # improvement_rate (derived)
        None,  # worsening_rate (derived)
        None,  # mcid_rate (derived)
        row["mean_improvement_magnitude"],
    )


def _from_dp_row(row: tuple) -> Dict[str, Any]:
    return {
        "intervention_key": row[0],
        "n": int(row[1]),
        "improved": int(row[2]),
        "worsened": int(row[3]),
        "unchanged": int(row[4]),
        "mcid_met": int(row[5]),
        "improvement_rate": float(row[6]),
        "worsening_rate": float(row[7]),
        "mcid_rate": float(row[8]),
        "mean_improvement_magnitude": float(row[9]),
    }


async def compute_intervention_effectiveness(
    db: AsyncSession,
    *,
    days: int = 180,
    requested_by: Optional[str] = None,
) -> Dict[str, Any]:
    """Aggregate + privatize intervention outcomes over a trailing window."""
    items = await collect_outcomes(db, days=days)
    raw_rows = aggregate_outcomes(items)

    k = int(settings.k_anon)
    eligible = [r for r in raw_rows if r["n"] >= k]
    suppressed = [
        {"intervention_key": r["intervention_key"], "reason": "below_k_anonymity"}
        for r in raw_rows
        if r["n"] < k
    ]

    dp_applied = False
    released: List[Dict[str, Any]]
    if eligible and settings.dp_enabled:
        from app.agents.ia.dp import build_engine
        from app.agents.ia.dp_accountant import DPBudgetAccountant

        epsilon = float(settings.dp_epsilon_per_query)
        accountant = DPBudgetAccountant()
        await accountant.check_and_reserve(DP_QUESTION_ID, epsilon, requested_by)
        engine = build_engine(epsilon)
        result = engine.privatize_rows(DP_QUESTION_ID, [_to_dp_row(r) for r in eligible])
        released = [_from_dp_row(r) for r in result.rows]
        dp_applied = True
    else:
        released = [
            {
                **r,
                "improvement_rate": round(r["improved"] / r["n"] * 100, 2) if r["n"] else 0.0,
                "worsening_rate": round(r["worsened"] / r["n"] * 100, 2) if r["n"] else 0.0,
                "mcid_rate": round(r["mcid_met"] / r["n"] * 100, 2) if r["n"] else 0.0,
            }
            for r in eligible
        ]

    return {
        "window_days": days,
        "k_anonymity": k,
        "dp_applied": dp_applied,
        "dp_epsilon": float(settings.dp_epsilon_per_query) if dp_applied else None,
        "total_assignments": len(items),
        "interventions": released,
        "suppressed": suppressed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
