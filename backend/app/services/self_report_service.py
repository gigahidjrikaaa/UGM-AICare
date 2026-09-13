"""Opt-in weekly self-report (PHQ-2 / GAD-2) → screening samples.

The covert engine extracts indicators from conversation; this module handles
the *explicit* self-report channel so the JITAI loop has a validated,
low-burden signal that does not depend on the user chatting.

Scoring:
- PHQ-2: 2 items (0-3) → total 0-6; >=3 is a positive screen for depression.
- GAD-2: 2 items (0-3) → total 0-6; >=3 is a positive screen for anxiety.

Normalized to 0-1 (divided by the instrument max, 6) to match the covert
engine's scale, while keeping raw/max for instrument-aware analysis.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import ScreeningDimensionSample

logger = logging.getLogger(__name__)

PHQ2_ITEMS: Tuple[str, ...] = (
    "Sedikit minat atau kesenangan dalam melakukan sesuatu",
    "Merasa murung, tertekan, atau putus asa",
)
GAD2_ITEMS: Tuple[str, ...] = (
    "Merasa gugup, cemas, atau tegang",
    "Tidak mampu menghentikan atau mengendalikan rasa khawatir",
)

_ITEMS_PER_SCALE = 2
_MAX_PER_ITEM = 3
_MAX_TOTAL = _ITEMS_PER_SCALE * _MAX_PER_ITEM  # 6
_POSITIVE_THRESHOLD = 3


def _validate(items: Optional[Sequence[int]], label: str) -> List[int]:
    if items is None:
        return []
    if len(items) != _ITEMS_PER_SCALE:
        raise ValueError(f"{label} must have exactly {_ITEMS_PER_SCALE} items")
    out: List[int] = []
    for value in items:
        try:
            v = int(value)
        except (TypeError, ValueError):
            raise ValueError(f"{label} items must be integers")
        if v < 0 or v > _MAX_PER_ITEM:
            raise ValueError(f"{label} items must be between 0 and {_MAX_PER_ITEM}")
        out.append(v)
    return out


def _scale_sample(
    *,
    user_id: int,
    dimension: str,
    instrument: str,
    total: int,
    source_entity_id: Optional[str],
) -> ScreeningDimensionSample:
    normalized = total / _MAX_TOTAL
    return ScreeningDimensionSample(
        user_id=user_id,
        dimension=dimension,
        current_score=normalized,
        protective_score=0.0,
        net_score=normalized,
        instrument=instrument,
        raw_score=float(total),
        max_score=float(_MAX_TOTAL),
        normalized_score=normalized,
        source="self_report",
        source_entity_id=source_entity_id,
        confidence=1.0,  # explicit self-report
    )


def build_self_report_samples(
    *,
    user_id: int,
    phq2: Optional[Sequence[int]] = None,
    gad2: Optional[Sequence[int]] = None,
    source_entity_id: Optional[str] = None,
) -> Tuple[List[ScreeningDimensionSample], Dict[str, Any]]:
    """Validate answers and build samples + a summary result.

    Raises ``ValueError`` on malformed input (wrong count / out-of-range).
    """
    phq = _validate(phq2, "phq2")
    gad = _validate(gad2, "gad2")
    if not phq and not gad:
        raise ValueError("Provide at least one of phq2 or gad2")

    samples: List[ScreeningDimensionSample] = []
    result: Dict[str, Any] = {"source": "self_report"}

    if phq:
        total = sum(phq)
        samples.append(
            _scale_sample(
                user_id=user_id,
                dimension="depression",
                instrument="PHQ-2",
                total=total,
                source_entity_id=source_entity_id,
            )
        )
        result["phq2"] = {
            "raw": total,
            "max": _MAX_TOTAL,
            "normalized": round(total / _MAX_TOTAL, 4),
            "positive": total >= _POSITIVE_THRESHOLD,
        }

    if gad:
        total = sum(gad)
        samples.append(
            _scale_sample(
                user_id=user_id,
                dimension="anxiety",
                instrument="GAD-2",
                total=total,
                source_entity_id=source_entity_id,
            )
        )
        result["gad2"] = {
            "raw": total,
            "max": _MAX_TOTAL,
            "normalized": round(total / _MAX_TOTAL, 4),
            "positive": total >= _POSITIVE_THRESHOLD,
        }

    positive = bool(
        result.get("phq2", {}).get("positive") or result.get("gad2", {}).get("positive")
    )
    result["positive_screen"] = positive
    result["recommendation"] = "full_assessment" if positive else "none"
    return samples, result


async def record_self_report(
    db: AsyncSession,
    *,
    user_id: int,
    phq2: Optional[Sequence[int]] = None,
    gad2: Optional[Sequence[int]] = None,
    source_entity_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist a self-report as screening samples and return the summary."""
    samples, result = build_self_report_samples(
        user_id=user_id, phq2=phq2, gad2=gad2, source_entity_id=source_entity_id
    )
    for sample in samples:
        db.add(sample)
    await db.flush()
    logger.info(
        "Self-report recorded for user %s: %s",
        user_id,
        {k: v for k, v in result.items() if k in ("phq2", "gad2", "positive_screen")},
    )
    return result
