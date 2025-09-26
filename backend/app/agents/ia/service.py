from __future__ import annotations

from typing import Any

from fastapi import Depends

from app.agents.ia.queries import ALLOWED_QUERIES
from app.agents.ia.schemas import IAQueryRequest, IAQueryResponse


class InsightsAgentService:
    """Executes allow-listed analytics questions with k-anonymity enforcement."""

    async def query(self, payload: IAQueryRequest) -> IAQueryResponse:
        if payload.question_id not in ALLOWED_QUERIES:
            raise ValueError(f"Unsupported question_id: {payload.question_id}")
        # TODO: execute read-only query and apply k-anonymity suppression
        raise NotImplementedError("InsightsAgentService.query is not implemented yet")
