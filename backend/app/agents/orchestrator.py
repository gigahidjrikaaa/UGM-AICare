from __future__ import annotations
from typing import Dict, Callable, Awaitable
from dataclasses import dataclass
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.qa_handlers import (
    answer_triage_question,
)
from app.services.analytics_service import (
    interpret_question_to_spec,
    run_analytics_spec,
    explain_analytics_result,
)

@dataclass
class OrchestratorResult:
    agent: str
    answer: str
    metrics: Dict
    route: str

class AdminOrchestrator:
    """Deterministic Phase 1 orchestrator: maps NL question to specific agent handler.
    Expansion points:
      - Add intervention routing
      - Add multi-step plan generation later
    """
    def __init__(self):
        self._patterns: list[tuple[re.Pattern, str]] = [
            # Triage oriented questions
            (re.compile(r"(how many|count).*(critical|dangerous|high).*triage", re.I), "triage"),
            (re.compile(r"high[- ]risk.*triage", re.I), "triage"),
            # Analytics oriented
            (re.compile(r"most flagged|flagged behaviours|flagged behaviors|top risky user", re.I), "analytics"),
            (re.compile(r"trend|compare.*(this|last).*week", re.I), "analytics"),
        ]

    def classify(self, question: str) -> str:
        q = question.strip()
        for pattern, agent in self._patterns:
            if pattern.search(q):
                return agent
        # Fallback heuristics
        if "triage" in q.lower():
            return "triage"
        if "flagged" in q.lower() or "behaviour" in q.lower() or "behavior" in q.lower():
            return "analytics"
        return "analytics"  # default to analytics for general queries

    async def route(self, db: AsyncSession, question: str, explicit_agent: str | None = None) -> OrchestratorResult:
        agent = (explicit_agent or self.classify(question)).lower()
        if agent == "triage":
            result = await answer_triage_question(db, question)
            route = "triage"
        elif agent == "analytics":
            # Structured 3-step pipeline: interpret -> run -> explain
            spec = await interpret_question_to_spec(question)
            run_result = await run_analytics_spec(db, spec)
            explained = await explain_analytics_result(run_result)
            result = {"answer": explained.answer, "metrics": explained.metrics}
            route = "analytics_structured"
        else:
            # For now unsupported, future: raise custom error
            raise ValueError(f"Unsupported agent '{agent}' in orchestrator")
        return OrchestratorResult(agent=agent, answer=result["answer"], metrics=result.get("metrics", {}), route=route)

__all__ = ["AdminOrchestrator", "OrchestratorResult"]
