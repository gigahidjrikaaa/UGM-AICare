from __future__ import annotations

from typing import Any, Mapping, cast

from app.agents.sta.schemas import RiskLevel, STAClassifyRequest, STAClassifyResponse


_CRISIS_KEYWORDS: tuple[str, ...] = (
    "bunuh diri",
    "suicide",
    "mengakhiri hidup",
    "kill myself",
    "gantung diri",
    "overdose",
    "tidak mau hidup",
    "better off without me",
    "ending it all",
    "end my life",
    "tidak ingin hidup",
    "ingin mati",
    "lebih baik mati",
    "goodbye note",
    "goodbye letter",
    "surat perpisahan",
)

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
    "tidak berguna",
    "useless",
    "ga berguna",
    "tidak ada gunanya",
    "staying in bed",
    "tidur terus",
    "skipping class",
    "bolos kuliah",
    "nothing matters",
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


class SafetyTriageClassifier:
    """Rule-based interim triage classifier until ML models are wired."""

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

        if any(keyword in text for keyword in _CRISIS_KEYWORDS):
            risk_score = 3
            intent = "crisis_support"
            next_step = "human"
            handoff = True
            diagnostic_notes.append("Keyword match indicates crisis intent")
        elif any(keyword in text for keyword in _HIGH_DISTRESS_KEYWORDS):
            risk_score = 2
            intent = "acute_distress"
            next_step = "human"
            handoff = True
            diagnostic_notes.append("Elevated distress keywords detected")
        else:
            if any(keyword in text for keyword in _ACADEMIC_KEYWORDS):
                intent = "academic_stress"
                next_step = "sca"
                risk_score = max(risk_score, 1)
            if any(keyword in text for keyword in _RELATIONSHIP_KEYWORDS):
                intent = "relationship_strain"
                risk_score = max(risk_score, 1)
            if any(keyword in text for keyword in _FINANCIAL_KEYWORDS):
                intent = "financial_pressure"
                risk_score = max(risk_score, 1)

        notes = "; ".join(diagnostic_notes) if diagnostic_notes else None
        risk_level = cast(RiskLevel, max(0, min(3, risk_score)))

        return STAClassifyResponse(
            risk_level=risk_level,
            intent=intent,
            next_step=next_step,
            handoff=handoff,
            diagnostic_notes=notes,
        )
