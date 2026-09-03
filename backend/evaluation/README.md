# Aika Agentic AI — Evaluation Harness

Deterministic regression evaluations for the agentic routing/safety layer.
These run **without LLM API keys or a database** — they test the pure
decision functions against a golden fixture set, so they are fast and CI-safe.

## What it evaluates

`routing_safety_cases.json` contains golden cases asserting **safety
invariants of the deterministic routing policy** (`_compute_routing` in
`app/agents/aika/decision_node.py`), which is the safety net underneath the
routing LLM. Several cases feed *adversarially under-triaged* LLM decisions
(e.g. a suicide message the LLM labelled low-risk) and assert the
deterministic layer still escalates to CMA. This guards against regressions
in:

- crisis-keyword → CMA escalation (incl. when the LLM under-triages)
- high/critical risk → CMA, moderate → TCA
- low-risk emotional support → direct (unless a structured plan is requested)
- admin/counselor analytics → IA
- ambiguous `needs_agents=true` without a route → safe direct response

## Run it

```bash
python -m evaluation.eval_routing_safety    # CLI, exit 0/1, from backend/
pytest tests/test_eval_routing_safety.py    # CI wrapper
```

Add a case to `routing_safety_cases.json` whenever you change the routing
prompt, routing rules, crisis vocabulary, or decision model — if it changes
the *deterministic* outcome you intended, this net will catch it.

## Planned extensions

- **LLM-as-judge** rubric eval (empathy/safety tone) on a small sample —
  needs Gemini keys; separate from this deterministic harness.
  See `research_evaluation/` for thesis-grade, keyed evaluation runs.
