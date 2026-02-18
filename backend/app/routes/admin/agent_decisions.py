from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.domains.blockchain.attestation.chain_registry import get_attestation_chain_config
from app.domains.blockchain.nft.chain_registry import get_chain_config
from app.domains.mental_health.models.autopilot_actions import AutopilotAction
from app.domains.mental_health.models.quests import AttestationRecord

router = APIRouter(prefix="/agent-decisions", tags=["Admin - Agent Decisions"])


class AgentDecisionItem(BaseModel):
    id: int
    action_type: str
    policy_decision: str
    risk_level: str
    status: str
    created_at: datetime
    executed_at: Optional[datetime] = None

    user_id: Optional[int] = None
    session_id: Optional[str] = None
    intent: Optional[str] = None
    next_step: Optional[str] = None
    agent_reasoning: Optional[str] = None

    requires_human_review: bool
    approved_by: Optional[int] = None
    approval_notes: Optional[str] = None

    chain_id: Optional[int] = None
    tx_hash: Optional[str] = None
    explorer_tx_url: Optional[str] = None

    attestation_record_id: Optional[int] = None
    attestation_status: Optional[str] = None
    attestation_last_error: Optional[str] = None
    attestation_tx_hash: Optional[str] = None
    attestation_schema: Optional[str] = None
    attestation_type: Optional[str] = None
    attestation_decision: Optional[str] = None
    attestation_feedback_redacted: Optional[str] = None


class AgentDecisionListResponse(BaseModel):
    items: list[AgentDecisionItem]
    total: int


def _to_int(value: Any) -> Optional[int]:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(stripped)
        except ValueError:
            return None
    return None


def _to_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _build_explorer_url(chain_id: Optional[int], tx_hash: Optional[str]) -> Optional[str]:
    if chain_id is None or not tx_hash:
        return None

    nft_cfg = get_chain_config(int(chain_id))
    if nft_cfg is not None:
        return nft_cfg.explorer_tx_url(tx_hash)

    att_cfg = get_attestation_chain_config(int(chain_id))
    if att_cfg is not None:
        return att_cfg.explorer_tx_url(tx_hash)

    return None


@router.get("", response_model=AgentDecisionListResponse)
async def list_agent_decisions(
    user_id: Optional[int] = Query(default=None, ge=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> AgentDecisionListResponse:
    del admin_user

    stmt = select(AutopilotAction)
    if user_id is not None:
        stmt = stmt.where(AutopilotAction.payload_json.op("->>")("user_id") == str(user_id))

    count_stmt = stmt

    rows = (
        await db.execute(
            stmt.order_by(desc(AutopilotAction.created_at)).offset(skip).limit(limit)
        )
    ).scalars().all()

    total = len((await db.execute(count_stmt)).scalars().all())

    attestation_ids: set[int] = set()
    for row in rows:
        payload = row.payload_json or {}
        attestation_record_id = _to_int(payload.get("attestation_record_id"))
        if attestation_record_id is not None:
            attestation_ids.add(attestation_record_id)

    attestation_map: dict[int, AttestationRecord] = {}
    if attestation_ids:
        attestation_rows = (
            await db.execute(select(AttestationRecord).where(AttestationRecord.id.in_(attestation_ids)))
        ).scalars().all()
        attestation_map = {int(record.id): record for record in attestation_rows}

    items: list[AgentDecisionItem] = []
    for row in rows:
        payload = row.payload_json or {}
        attestation_record_id = _to_int(payload.get("attestation_record_id"))
        attestation_record = attestation_map.get(attestation_record_id) if attestation_record_id is not None else None

        attestation_tx_hash = None
        attestation_schema = None
        attestation_type = None
        attestation_decision = None
        attestation_feedback_redacted = None
        if attestation_record is not None:
            attestation_extra = attestation_record.extra_data or {}
            attestation_tx_hash = _to_str(attestation_extra.get("tx_hash"))
            attestation_schema = _to_str(attestation_extra.get("schema"))
            attestation_type = _to_str(attestation_extra.get("attestation_type"))
            attestation_decision = _to_str(attestation_extra.get("decision"))
            attestation_feedback_redacted = _to_str(attestation_extra.get("feedback_redacted"))

        items.append(
            AgentDecisionItem(
                id=int(row.id),
                action_type=row.action_type.value,
                policy_decision=row.policy_decision.value,
                risk_level=row.risk_level,
                status=row.status.value,
                created_at=row.created_at,
                executed_at=row.executed_at,
                user_id=_to_int(payload.get("user_id")),
                session_id=_to_str(payload.get("session_id")),
                intent=_to_str(payload.get("intent")),
                next_step=_to_str(payload.get("next_step")),
                agent_reasoning=_to_str(payload.get("reasoning")),
                requires_human_review=bool(row.requires_human_review),
                approved_by=row.approved_by,
                approval_notes=row.approval_notes,
                chain_id=row.chain_id,
                tx_hash=row.tx_hash,
                explorer_tx_url=_build_explorer_url(row.chain_id, row.tx_hash),
                attestation_record_id=attestation_record_id,
                attestation_status=(attestation_record.status.value if attestation_record else None),
                attestation_last_error=(attestation_record.last_error if attestation_record else None),
                attestation_tx_hash=attestation_tx_hash,
                attestation_schema=attestation_schema,
                attestation_type=attestation_type,
                attestation_decision=attestation_decision,
                attestation_feedback_redacted=attestation_feedback_redacted,
            )
        )

    return AgentDecisionListResponse(items=items, total=total)
