from __future__ import annotations

from fastapi import Depends

from app.agents.sta.classifiers import SafetyTriageClassifier
from app.agents.sta.schemas import STAClassifyRequest, STAClassifyResponse


class SafetyTriageService:
    """Service façade orchestrating STA classification and event capture."""

    def __init__(self, classifier: SafetyTriageClassifier = Depends(SafetyTriageClassifier)) -> None:
        self._classifier = classifier

    async def classify(self, payload: STAClassifyRequest) -> STAClassifyResponse:
        # TODO: invoke classifier, apply redaction, emit events via core.events
        return await self._classifier.classify(payload)
