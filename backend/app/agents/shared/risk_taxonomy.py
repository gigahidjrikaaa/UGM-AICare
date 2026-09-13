"""Canonical risk taxonomy for the Safety Agent Suite (single source of truth).

Before this module, three incompatible risk scales coexisted:

- The Aika decision prompt used ``none|low|moderate|high|critical`` with
  calibration examples ("stressed about exams" → low).
- The STA Gemini classifier used ``0..3`` labeled low/moderate/high/critical
  but calibrated a *single stressor* as level 1 ("moderate") — so the same
  utterance was "low" in one prompt and "moderate" in another.
- The background conversation analyzer used ``low|moderate|high|critical``
  with no calibration table at all.

This module defines the ONE scale, the ONE calibration table, and the
STA integer mapping. Prompts render their risk sections from here so the
clinical calibration can never drift apart again.
"""
from __future__ import annotations

__all__ = [
    "CANONICAL_RISK_LEVELS",
    "STA_SCORE_TO_CANONICAL",
    "render_risk_calibration_for_prompt",
]

# The canonical 5-level scale (Aika decision vocabulary).
CANONICAL_RISK_LEVELS: tuple[str, ...] = (
    "none",
    "low",
    "moderate",
    "high",
    "critical",
)

# STA integer scores (0-3) → canonical level. STA has no "none" floor: a
# triaged message is at least "low".
STA_SCORE_TO_CANONICAL: dict[int, str] = {
    0: "low",
    1: "moderate",
    2: "high",
    3: "critical",
}

_CALIBRATION_TABLE: tuple[tuple[str, str, str], ...] = (
    (
        "critical",
        "Explicit suicide plan/intent with method and timeframe, or active crisis in progress.",
        '"Aku mau bunuh diri malam ini", "I have pills ready to overdose"',
    ),
    (
        "high",
        "Strong self-harm ideation or active suicidal thoughts without an immediate plan.",
        '"I keep thinking about cutting myself", "ingin mati", "gantung diri"',
    ),
    (
        "moderate",
        "Significant emotional distress with concerning patterns (hopelessness, withdrawal, functional decline).",
        '"I feel completely hopeless", "tidak ada gunanya hidup", "nothing matters anymore"',
    ),
    (
        "low",
        "Stress or anxiety WITHOUT crisis indicators; everyday academic/relationship pressure.",
        '"Aku stres ujian", "feeling anxious about my presentation", single stressor WITH coping',
    ),
    (
        "none",
        "No distress signals at all (decision-scale only; STA triage never returns this).",
        '"Halo apa kabar?", "What is CBT?"',
    ),
)


def render_risk_calibration_for_prompt(*, include_none: bool = True) -> str:
    """Render the shared calibration table for injection into risk prompts.

    ``include_none=False`` for STA/conversation-analyzer prompts whose
    output scale starts at "low".
    """
    lines = ["RISK CALIBRATION (shared platform-wide scale):"]
    for level, definition, examples in _CALIBRATION_TABLE:
        if level == "none" and not include_none:
            continue
        lines.append(f"- {level.upper()}: {definition}")
        lines.append(f"  Examples: {examples}")
    return "\n".join(lines)
