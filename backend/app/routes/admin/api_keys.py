"""Admin endpoints for Gemini API key monitoring and management."""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.gemini_key_tracker import gemini_tracker, KeyUsageSnapshot
from app.dependencies import get_admin_user

router = APIRouter(prefix="/system/api-keys", tags=["Admin - API Keys"])


# ---------- Response schemas ----------


class KeySnapshotResponse(BaseModel):
    """Single key's usage snapshot."""

    key_index: int
    key_label: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    rate_limited_hits: int
    last_used_at: str | None
    last_error_at: str | None
    last_error_message: str | None
    is_on_cooldown: bool
    cooldown_remaining_s: float
    requests_by_model: Dict[str, int]
    requests_last_hour: int
    requests_last_24h: int
    errors_last_hour: int


class SummaryResponse(BaseModel):
    """High-level dashboard summary."""

    total_keys: int
    active_keys: int
    keys_on_cooldown: int
    total_requests: int
    total_errors: int
    total_rate_limited: int
    error_rate: float
    requests_last_hour: int
    uptime_seconds: float


class CircuitBreakerModelStatus(BaseModel):
    model: str
    is_open: bool
    open_remaining_s: float
    failures_in_window: int
    total_opens: int
    total_closes: int
    last_opened_at: float | None
    last_closed_at: float | None


class CircuitBreakerSummary(BaseModel):
    total_models: int
    open_models: int
    total_opens: int
    total_closes: int


class CircuitBreakerPayload(BaseModel):
    summary: CircuitBreakerSummary
    models: List[CircuitBreakerModelStatus]


class ModelHistoryPoint(BaseModel):
    ts: float
    count: int


class ModelHistorySeries(BaseModel):
    model: str
    points: List[ModelHistoryPoint]


class ModelHistoryPayload(BaseModel):
    window_seconds: int
    bucket_seconds: int
    series: List[ModelHistorySeries]


class ApiKeyStatusResponse(BaseModel):
    """Full monitoring payload returned to the admin UI."""

    summary: SummaryResponse
    keys: List[KeySnapshotResponse]
    models_available: List[str]
    fallback_chain: List[str]
    circuit_breakers: CircuitBreakerPayload
    model_history: ModelHistoryPayload


class AddKeyRequest(BaseModel):
    """Placeholder schema for adding a new API key."""

    api_key: str = Field(..., min_length=10, description="Google Gemini API key")


class AddKeyResponse(BaseModel):
    """Response after (placeholder) key addition."""

    message: str
    total_keys: int


# ---------- Endpoints ----------


@router.get("/status", response_model=ApiKeyStatusResponse)
async def get_api_key_status(
    admin_user: Any = Depends(get_admin_user),
) -> ApiKeyStatusResponse:
    """Return real-time Gemini API key usage, health, and quota data."""
    from app.core.llm import (
        GEMINI_API_KEYS,
        GEMINI_FALLBACK_CHAIN,
        _gemini_key_cooldowns,
        get_gemini_circuit_breaker_status,
    )

    snapshots = gemini_tracker.get_all_snapshots(GEMINI_API_KEYS, _gemini_key_cooldowns)
    summary_data = gemini_tracker.get_summary(GEMINI_API_KEYS, _gemini_key_cooldowns)

    # Collect unique models seen across all keys
    all_models: set[str] = set()
    for snap in snapshots:
        all_models.update(snap.requests_by_model.keys())

    breaker_models = get_gemini_circuit_breaker_status()
    breaker_summary = CircuitBreakerSummary(
        total_models=len(breaker_models),
        open_models=sum(1 for m in breaker_models if m.get("is_open")),
        total_opens=sum(int(m.get("total_opens", 0)) for m in breaker_models),
        total_closes=sum(int(m.get("total_closes", 0)) for m in breaker_models),
    )

    model_history = gemini_tracker.get_model_timeseries(
        GEMINI_API_KEYS,
        window_seconds=3600,
        bucket_seconds=300,
    )

    return ApiKeyStatusResponse(
        summary=SummaryResponse(**summary_data),
        keys=[KeySnapshotResponse(**snap.__dict__) for snap in snapshots],
        models_available=sorted(all_models),
        fallback_chain=list(GEMINI_FALLBACK_CHAIN),
        circuit_breakers=CircuitBreakerPayload(
            summary=breaker_summary,
            models=[CircuitBreakerModelStatus(**m) for m in breaker_models],
        ),
        model_history=ModelHistoryPayload(**model_history),
    )


@router.post("", response_model=AddKeyResponse)
async def add_api_key(
    body: AddKeyRequest,
    admin_user: Any = Depends(get_admin_user),
) -> AddKeyResponse:
    """Placeholder: accept a new Gemini API key.

    In a production build this would persist the key to a secrets vault.
    For now it appends to the in-memory list so the rotation pool grows
    immediately without a restart.
    """
    from app.core.llm import GEMINI_API_KEYS

    # Duplicate check
    if body.api_key in GEMINI_API_KEYS:
        return AddKeyResponse(
            message="Key already registered.",
            total_keys=len(GEMINI_API_KEYS),
        )

    GEMINI_API_KEYS.append(body.api_key)

    return AddKeyResponse(
        message="Key added to rotation pool (runtime only, not persisted).",
        total_keys=len(GEMINI_API_KEYS),
    )
