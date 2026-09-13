from __future__ import annotations

import re
from typing import Any, Mapping, cast

from app.agents.shared.crisis_lexicon import (
    CRISIS_KEYWORDS as _CANONICAL_CRISIS_KEYWORDS,
    CRISIS_PATTERNS as _CANONICAL_CRISIS_PATTERNS,
)
from app.agents.sta.schemas import RiskLevel, STAClassifyRequest, STAClassifyResponse

# Crisis vocabulary is owned by the canonical lexicon (single source of truth
# shared with the Aika deterministic safety net and the decision prompt).
# Aliases kept for backward compatibility (gemini_classifier imports these).
_CRISIS_KEYWORDS: tuple[str, ...] = _CANONICAL_CRISIS_KEYWORDS
_CRISIS_PATTERNS: tuple[re.Pattern[str], ...] = _CANONICAL_CRISIS_PATTERNS

_HIGH_DISTRESS_KEYWORDS: tuple[str, ...] = (
    "panic",
    "panik",
    "serangan panik",
    "self harm",
    "melukai diri",
    "tidur tidak",
    "tidak bisa tidur",
    "trauma",
    "depress",
    "hopeless",
    "putus asa",
    "kosong",
    "empty inside",
    "tidak ada artinya",
    "meaningless",
    "nothing matters",
    "tidak berguna",
    "useless",
    "ga berguna",
    "tidak ada gunanya",
)

# Behavioral/academic decline markers: two or more of these indicate
# MODERATE distress (risk 1, coaching) — not a forced human handoff.
# Previously they sat in the high-distress tier, so "bolos kuliah" +
# "burnout" auto-escalated to a human, an over-trigger inconsistent with
# the canonical calibration (see app.agents.shared.risk_taxonomy).
_MODERATE_DISTRESS_KEYWORDS: tuple[str, ...] = (
    "staying in bed",
    "tidur terus",
    "skipping class",
    "bolos kuliah",
    "burnout",
    "drop out",
    "berhenti kuliah",
    "tidak bisa lagi",
)

_ACADEMIC_KEYWORDS: tuple[str, ...] = (
    "skripsi",
    "tesis",
    "kuliah",
    "ujian",
    "nilai",
    "tugas",
)

_RELATIONSHIP_KEYWORDS: tuple[str, ...] = (
    "pacar",
    "relationship",
    "orang tua",
    "family",
    "pertemanan",
)

_FINANCIAL_KEYWORDS: tuple[str, ...] = (
    "biaya",
    "uang",
    "keuangan",
    "financial",
    "bayar",
)

# Keywords for detecting need for calming techniques
_CALM_DOWN_KEYWORDS: tuple[str, ...] = (
    "cemas",
    "anxious",
    "anxiety",
    "panic",
    "panik",
    "overthink",
    "terlalu banyak pikir",
    "tidak tenang",
    "gelisah",
    "nervous",
    "worried",
    "khawatir",
    "stress banget",
    "stressed out",
    "overwhelm",
    "kewalahan",
    "racing thoughts",
    "pikiran kacau",
    "tidak bisa fokus",
    "can't focus",
    "cannot concentrate",
    "susah konsentrasi",
    "jantung berdebar",
    "heart racing",
    "breathing fast",
    "napas cepat",
    "keringat dingin",
)

# Keywords for detecting need to break down problems
_BREAK_DOWN_PROBLEM_KEYWORDS: tuple[str, ...] = (
    "tidak tahu harus mulai dari mana",
    "don't know where to start",
    "dont know where to start",
    "bingung mulai",
    "masalah terlalu besar",
    "problem too big",
    "terlalu banyak",
    "too much",
    "overwhelm",
    "kewalahan",
    "tidak bisa handle",
    "can't handle",
    "cannot handle",
    "stuck",
    "buntu",
    "mentok",
    "tidak tahu caranya",
    "don't know how",
    "dont know how",
    "complicated",
    "kompleks",
    "rumit",
    "sulit banget",
    "too difficult",
    "cara ngatasin",
    "bagaimana menghadapi",
    "how to deal with",
    "how to solve",
    "gimana solusinya",
    "need a plan",
    "butuh rencana",
    "butuh strategi",
    "need strategy",
)

# Regex patterns for crisis detection come from the canonical lexicon
# (see app.agents.shared.crisis_lexicon) — no STA-local pattern list.


class SafetyTriageClassifier:
    """Rule-based interim triage classifier until ML models are wired."""

    def _check_crisis_patterns(self, text: str) -> bool:
        """Check text against the canonical lexicon's compiled regex patterns.

        Args:
            text: Lowercased user message

        Returns:
            True if any crisis pattern matches
        """
        return any(pattern.search(text) for pattern in _CRISIS_PATTERNS)

    async def classify(
        self,
        payload: STAClassifyRequest,
        *,
        context: Mapping[str, Any] | None = None,
    ) -> STAClassifyResponse:
        text = payload.text.lower()

        risk_score = 0
        intent = "general_support"
        next_step = "resource"
        handoff = False
        diagnostic_notes: list[str] = []
        needs_support_plan = False
        plan_type = "none"

        # Check for crisis keywords OR regex patterns
        has_crisis_keyword = any(keyword in text for keyword in _CRISIS_KEYWORDS)
        has_crisis_pattern = self._check_crisis_patterns(text)
        
        if has_crisis_keyword or has_crisis_pattern:
            risk_score = 3
            intent = "crisis_support"
            next_step = "human"
            handoff = True
            if has_crisis_keyword:
                diagnostic_notes.append("Keyword match indicates crisis intent")
            if has_crisis_pattern:
                diagnostic_notes.append("Pattern match indicates crisis intent")
        elif any(keyword in text for keyword in _HIGH_DISTRESS_KEYWORDS):
            risk_score = 2
            intent = "acute_distress"
            next_step = "human"
            handoff = True
            diagnostic_notes.append("Strong distress markers detected")
        elif len([kw for kw in _MODERATE_DISTRESS_KEYWORDS if kw in text]) >= 2:
            # Behavioral/academic decline: moderate distress → coaching,
            # not a forced human handoff (canonical calibration).
            risk_score = 1
            intent = "acute_distress"
            next_step = "tca"
            diagnostic_notes.append("Multiple behavioral-decline markers detected")
        else:
            if any(keyword in text for keyword in _ACADEMIC_KEYWORDS):
                intent = "academic_stress"
                next_step = "tca"
                risk_score = max(risk_score, 1)
            if any(keyword in text for keyword in _RELATIONSHIP_KEYWORDS):
                intent = "relationship_strain"
                risk_score = max(risk_score, 1)
            if any(keyword in text for keyword in _FINANCIAL_KEYWORDS):
                intent = "financial_pressure"
                risk_score = max(risk_score, 1)

        # Detect need for Therapeutic Coach Plan (independent of risk level)
        # Check for calm down indicators
        has_calm_keywords = any(keyword in text for keyword in _CALM_DOWN_KEYWORDS)
        if has_calm_keywords:
            needs_support_plan = True
            plan_type = "calm_down"
            diagnostic_notes.append("User shows signs of anxiety/panic - recommend calming techniques")
        
        # Check for problem breakdown indicators (higher priority than calm down)
        has_breakdown_keywords = any(keyword in text for keyword in _BREAK_DOWN_PROBLEM_KEYWORDS)
        if has_breakdown_keywords:
            needs_support_plan = True
            plan_type = "break_down_problem"
            diagnostic_notes.append("User overwhelmed by problem complexity - recommend breaking down approach")
        
        # If moderate/high risk and next_step is TCA, also recommend support plan
        if risk_score >= 1 and next_step == "tca" and not needs_support_plan:
            needs_support_plan = True
            plan_type = "general_coping"
            diagnostic_notes.append("Moderate stress detected - recommend general coping support plan")

        notes = "; ".join(diagnostic_notes) if diagnostic_notes else None
        risk_level = cast(RiskLevel, max(0, min(3, risk_score)))

        return STAClassifyResponse(
            risk_level=risk_level,
            intent=intent,
            next_step=next_step,
            handoff=handoff,
            diagnostic_notes=notes,
            needs_therapeutic_coach_plan=needs_support_plan,
            therapeutic_plan_type=plan_type,
        )
