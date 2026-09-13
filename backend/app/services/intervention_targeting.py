"""Pure helpers for deriving an intervention assignment's target + key.

Kept dependency-light (no DB) so the mapping logic is unit-testable and shared
between assignment creation and any future adaptive selector.
"""
from __future__ import annotations

from typing import List, Optional

from app.agents.tca.activities_catalog import ACTIVITIES_CATALOG

SCREENING_DIMENSIONS = (
    "depression",
    "anxiety",
    "stress",
    "sleep",
    "social",
    "academic",
    "self_worth",
    "substance",
    "crisis",
)

# Activity tags (see activities_catalog) → screening dimension.
ACTIVITY_TAG_TO_DIMENSION = {
    "anxiety": "anxiety",
    "panic": "anxiety",
    "calming": "anxiety",
    "grounding": "anxiety",
    "present-moment": "anxiety",
    "dissociation": "anxiety",
    "stress": "stress",
    "focus": "stress",
    "sleep": "sleep",
    "relaxation": "sleep",
    "insomnia": "sleep",
}

DEFAULT_DIMENSIONS = ("anxiety", "depression")


def primary_activity_id(plan_data: Optional[dict]) -> Optional[str]:
    """The first interactive activity referenced by the plan, if any."""
    for card in (plan_data or {}).get("resource_cards", []) or []:
        if isinstance(card, dict) and card.get("resource_type") == "activity":
            activity_id = card.get("activity_id")
            if activity_id:
                return str(activity_id)
    return None


def dimensions_for_activity(activity_id: Optional[str]) -> List[str]:
    """Map an activity's tags to screening dimensions (ordered, de-duped)."""
    if not activity_id:
        return []
    activity = ACTIVITIES_CATALOG.get(activity_id)
    if activity is None:
        return []
    dims: List[str] = []
    for tag in activity.tags:
        dim = ACTIVITY_TAG_TO_DIMENSION.get(tag)
        if dim and dim not in dims:
            dims.append(dim)
    return dims


def derive_target_dimensions(
    plan_data: Optional[dict],
    primary_concerns: Optional[List[str]],
    activity_dims: Optional[List[str]] = None,
) -> List[str]:
    """Pick up to 3 target dimensions.

    Priority: activity tags → the user's current primary concerns → defaults.
    """
    dims = list(
        activity_dims
        if activity_dims is not None
        else dimensions_for_activity(primary_activity_id(plan_data))
    )
    if not dims:
        dims = [d for d in (primary_concerns or []) if d in SCREENING_DIMENSIONS]
    if not dims:
        dims = list(DEFAULT_DIMENSIONS)

    seen: List[str] = []
    for dim in dims:
        if dim not in seen:
            seen.append(dim)
    return seen[:3]


def derive_intervention_key(
    plan_data: Optional[dict], activity_id: Optional[str], plan_id: int
) -> str:
    """A stable key identifying the intervention (for effectiveness grouping)."""
    if activity_id:
        return f"activity:{activity_id}"
    intervention_type = (plan_data or {}).get("intervention_type")
    if intervention_type:
        return f"plan_type:{intervention_type}"
    return f"plan:{plan_id}"
