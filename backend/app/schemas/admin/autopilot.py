from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class AutopilotActionResponse(BaseModel):
    id: int
    action_type: str
    risk_level: str
    policy_decision: str
    status: str
    idempotency_key: str
    payload_hash: str
    payload_json: dict[str, Any]
    requires_human_review: bool
    approved_by: Optional[int] = None
    approval_notes: Optional[str] = None
    tx_hash: Optional[str] = None
    explorer_tx_url: Optional[str] = None
    chain_id: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: int
    next_retry_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AutopilotActionListResponse(BaseModel):
    items: list[AutopilotActionResponse]
    total: int


class AutopilotActionReviewRequest(BaseModel):
    note: Optional[str] = None


class AutopilotActionReviewResponse(BaseModel):
    status: str
    action_id: int
