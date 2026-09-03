"""Deterministic routing-safety evaluation harness for the Aika decision layer.

Ground truth is the deterministic routing policy itself: these cases assert
that the SAFETY INVARIANTS hold no matter what the decision LLM returns
(including adversarially under-triaged outputs). Because the checks run
against the pure functions (``_compute_routing``, ``detect_crisis_keywords``,
``is_smalltalk_message``, ``_parse_llm_decision``), they need no API keys and
run fast in CI — this is the regression net that makes every later prompt /
model / routing change measurable.

Usage:
    python -m evaluation.eval_routing_safety            # run from backend/
    pytest tests/test_eval_routing_safety.py -q         # CI wrapper
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

# Minimal env so importing the agent package does not require a live backend.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/ci")
os.environ.setdefault("EMAIL_ENCRYPTION_KEY", "k" * 32)
os.environ.setdefault("JWT_SECRET_KEY", "k" * 32)

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

_FIXTURES = Path(__file__).resolve().parent / "routing_safety_cases.json"

# Expected-update keys extracted from the routing result dict.
_EXPECT_FIELDS = ("needs_agents", "needs_cma_escalation", "immediate_risk_level")


def _load_cases() -> list[dict[str, Any]]:
    with open(_FIXTURES, encoding="utf-8") as fh:
        return json.load(fh)["cases"]


def evaluate_one(case: dict[str, Any]) -> tuple[bool, list[str]]:
    """Run one fixture through ``_compute_routing`` and diff against expectations.

    Returns (passed, failure_messages).
    """
    from app.agents.aika.decision_node import _compute_routing

    role = case["role"]
    normalized_role = "user" if role == "user" else role  # admin/counselor passthrough
    result = _compute_routing(
        decision=case["llm_decision"],
        normalized_role=normalized_role,
        message=case["message"],
    )
    expect = case["expect"]
    failures: list[str] = []

    for key in _EXPECT_FIELDS:
        if key in expect and result.get(key) != expect[key]:
            failures.append(
                "  %s: expected=%r got=%r" % (key, expect[key], result.get(key))
            )

    exp_next = expect.get("sta_next_step")
    if exp_next is not None:
        got_next = (result.get("sta_context") or {}).get("next_step")
        if got_next != exp_next:
            failures.append(
                "  sta_context.next_step: expected=%r got=%r" % (exp_next, got_next)
            )

    return not failures, failures


def evaluate_all() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Evaluate every fixture; return (results, failed_results)."""
    results: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    for case in _load_cases():
        passed, messages = evaluate_one(case)
        entry = {
            "id": case["id"],
            "role": case["role"],
            "passed": passed,
            "failures": messages,
        }
        results.append(entry)
        if not passed:
            failed.append(entry)
    return results, failed


def main() -> int:
    results, failed = evaluate_all()
    passed_count = sum(1 for r in results if r["passed"])

    print("=" * 72)
    print("Aika Routing-Safety Evaluation (deterministic invariants)")
    print("=" * 72)
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        print("  [%s] %-45s (role=%s)" % (status, r["id"], r["role"]))
        for msg in r["failures"]:
            print(msg)

    print("-" * 72)
    print("Total: %d/%d passed" % (passed_count, len(results)))
    if failed:
        print("FAILED: %d case(s) — routing-safety invariant violated." % len(failed))
        return 1
    print("All routing-safety invariants hold.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
