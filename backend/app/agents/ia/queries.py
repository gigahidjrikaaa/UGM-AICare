from __future__ import annotations

from typing import Final

from app.agents.ia.schemas import QuestionId

ALLOWED_QUERIES: Final[dict[QuestionId, str]] = {
    "crisis_trend": "-- TODO: select crisis events aggregated by day",
    "dropoffs": "-- TODO: select session dropoff metrics",
    "resource_reuse": "-- TODO: select resource card re-engagement",
    "fallback_reduction": "-- TODO: select fallback to human outcomes",
    "cost_per_helpful": "-- TODO: compute cost per helpful outcome",
    "coverage_windows": "-- TODO: compute coverage by hour",
}
