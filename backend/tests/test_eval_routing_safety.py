"""CI wrapper around the deterministic routing-safety evaluation.

Runs the golden routing-safety fixtures through the pure decision policy.
No API keys or database required — only the deterministic layer.
"""

from __future__ import annotations

from evaluation.eval_routing_safety import evaluate_all


def test_all_routing_safety_invariants_hold() -> None:
    _results, failed = evaluate_all()
    assert not failed, (
        "Routing-safety invariant violations:\n%s"
        % "\n".join(
            "  [%s] %s\n%s" % (r["id"], r["id"], "\n".join(r["failures"]))
            for r in failed
        )
    )
