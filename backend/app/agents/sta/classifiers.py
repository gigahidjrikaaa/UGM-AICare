from __future__ import annotations

from typing import Any, Mapping

from app.agents.sta.schemas import STAClassifyRequest, STAClassifyResponse


class SafetyTriageClassifier:
    """Thin wrapper around risk/intent classifiers.

    TODO: Implement real ML classifiers and heuristics.
    """

    async def classify(self, payload: STAClassifyRequest, *, context: Mapping[str, Any] | None = None) -> STAClassifyResponse:
        # Placeholder ensures callers have deterministic shape while implementation is pending.
        raise NotImplementedError("SafetyTriageClassifier.classify is not implemented yet")
