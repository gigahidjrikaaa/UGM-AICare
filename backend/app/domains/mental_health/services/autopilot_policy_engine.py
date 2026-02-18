from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from app.domains.mental_health.models.autopilot_actions import (
    AutopilotActionType,
    AutopilotPolicyDecision,
)


@dataclass(frozen=True)
class PolicyEvaluationResult:
    decision: AutopilotPolicyDecision
    requires_human_review: bool
    rationale: str


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "t", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "f", "no", "n", "off"}:
        return False
    return default


def _normalize_risk_level(risk_level: str | None) -> str:
    raw = (risk_level or "none").strip().lower()
    aliases = {
        "med": "moderate",
        "medium": "moderate",
    }
    normalized = aliases.get(raw, raw)
    if normalized not in {"none", "low", "moderate", "high", "critical"}:
        return "none"
    return normalized


def evaluate_action_policy(
    *,
    risk_level: str | None,
    action_type: AutopilotActionType,
    context: dict[str, Any] | None = None,
) -> PolicyEvaluationResult:
    level = _normalize_risk_level(risk_level)
    _ = context or {}

    require_approval_high = _parse_bool(
        os.getenv("AUTOPILOT_REQUIRE_APPROVAL_HIGH_RISK"),
        default=True,
    )
    require_approval_critical = _parse_bool(
        os.getenv("AUTOPILOT_REQUIRE_APPROVAL_CRITICAL_RISK"),
        default=True,
    )

    if action_type == AutopilotActionType.create_case:
        if level in {"high", "critical"}:
            return PolicyEvaluationResult(
                decision=AutopilotPolicyDecision.allow,
                requires_human_review=False,
                rationale="Safety escalation is allowed for high/critical risk",
            )
        if level == "moderate":
            return PolicyEvaluationResult(
                decision=AutopilotPolicyDecision.require_approval,
                requires_human_review=True,
                rationale="Moderate-risk case creation requires reviewer approval",
            )
        return PolicyEvaluationResult(
            decision=AutopilotPolicyDecision.deny,
            requires_human_review=False,
            rationale="Case creation denied for none/low risk",
        )

    if action_type == AutopilotActionType.create_checkin:
        if level in {"none", "low", "moderate"}:
            return PolicyEvaluationResult(
                decision=AutopilotPolicyDecision.allow,
                requires_human_review=False,
                rationale="Check-ins are allowed for none/low/moderate risk",
            )
        if level == "high" and require_approval_high:
            return PolicyEvaluationResult(
                decision=AutopilotPolicyDecision.require_approval,
                requires_human_review=True,
                rationale="High-risk check-ins require reviewer approval",
            )
        if level == "critical" and require_approval_critical:
            return PolicyEvaluationResult(
                decision=AutopilotPolicyDecision.require_approval,
                requires_human_review=True,
                rationale="Critical-risk check-ins require reviewer approval",
            )

    if action_type == AutopilotActionType.publish_attestation:
        return PolicyEvaluationResult(
            decision=AutopilotPolicyDecision.allow,
            requires_human_review=False,
            rationale="Attestation publishing is automatic for auditability of agentic flow",
        )

    if action_type == AutopilotActionType.mint_badge:
        if level in {"none", "low", "moderate"}:
            return PolicyEvaluationResult(
                decision=AutopilotPolicyDecision.allow,
                requires_human_review=False,
                rationale="Onchain action allowed for none/low/moderate risk",
            )
        return PolicyEvaluationResult(
            decision=AutopilotPolicyDecision.require_approval,
            requires_human_review=True,
            rationale="Onchain actions are approval-gated for high/critical risk",
        )

    return PolicyEvaluationResult(
        decision=AutopilotPolicyDecision.deny,
        requires_human_review=False,
        rationale="No policy rule matched",
    )
