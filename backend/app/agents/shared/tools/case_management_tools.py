"""
Case Management Tools - Clinical Case Coordination

This module provides tools for managing clinical cases, counselor coordination,
and case notes. Used primarily by CMA agent.

Tools:
- get_case_details: Get details of a specific case
- get_user_cases: Get all cases for a user

Privacy: Case data is HIGHLY SENSITIVE - clinical information.
"""

from typing import Dict, Any, Optional, List
import hashlib
from datetime import datetime
from sqlalchemy import select, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import (
    Case,
    CaseStatusEnum,
    CaseSeverityEnum
)
from app.agents.shared.tools.registry import register_tool

import logging

logger = logging.getLogger(__name__)

MAX_CASES = 20


def _to_user_hash_candidates(user_id: str) -> list[str]:
    raw = str(user_id).strip()
    if not raw:
        return []
    candidates = {raw, f"user_{raw}"}
    candidates.add(hashlib.sha256(f"user_{raw}".encode()).hexdigest()[:16])
    return list(candidates)


def _normalize_case_status(status: Optional[str]) -> Optional[CaseStatusEnum]:
    if not status:
        return None
    normalized = str(status).strip().lower()
    alias_map = {
        "open": "new",
        "new": "new",
        "in_progress": "in_progress",
        "waiting": "waiting",
        "resolved": "resolved",
        "closed": "closed",
    }
    mapped = alias_map.get(normalized)
    if not mapped:
        return None
    try:
        return CaseStatusEnum(mapped)
    except ValueError:
        return None


@register_tool(
    name="get_case_details",
    description=(
        "Get details of a specific clinical case including severity, status, "
        "timeline, and — for the assigned counselor — the patient's contact "
        "details. HIGHLY SENSITIVE."
    ),
    parameters={
        "type": "object",
        "properties": {
            "case_id": {
                "type": "string",
                "description": "Case ID"
            }
        },
        "required": ["case_id"]
    },
    category="case_management",
    requires_db=True,
    requires_user_id=True  # injected requester id: gates patient identity
)
async def get_case_details(
    db: AsyncSession,
    case_id: str,
    user_id: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Get details of a specific case.
    
    Returns case information, status, severity, and timeline.
    HIGHLY SENSITIVE - clinical case data.
    """
    try:
        # Get case
        query = select(Case).where(Case.id == case_id)
        result = await db.execute(query)
        case = result.scalar_one_or_none()
        
        if not case:
            logger.warning(f"⚠️ Case {case_id} not found")
            return {
                "success": False,
                "error": f"Case {case_id} not found",
                "case_id": case_id
            }
        
        logger.info(f"✅ Retrieved case details for {case_id}")

        # Patient identity: resolved ONLY for the assigned counselor (via the
        # injected requester id — never a model-supplied argument). Identity
        # joins through case.session_id / conversation_id → Conversation.user_id.
        patient_block: Dict[str, Any] = {"patient": None}
        if user_id is not None:
            from app.domains.mental_health.models import Counselor

            counselor = (
                await db.execute(
                    select(Counselor).where(Counselor.user_id == int(user_id))
                )
            ).scalar_one_or_none()

            is_assignee = (
                counselor is not None
                and case.assigned_to is not None
                and str(case.assigned_to) == str(counselor.id)
            )
            if is_assignee:
                from app.domains.mental_health.models import Conversation
                from app.models import UserProfile

                linked_user_id = None
                if case.conversation_id:
                    conv = (
                        await db.execute(
                            select(Conversation.user_id).where(
                                Conversation.id == case.conversation_id
                            )
                        )
                    ).scalar_one_or_none()
                    linked_user_id = conv
                if linked_user_id is None and case.session_id:
                    conv = (
                        await db.execute(
                            select(Conversation.user_id)
                            .where(Conversation.session_id == case.session_id)
                            .order_by(Conversation.timestamp.desc())
                            .limit(1)
                        )
                    ).scalar_one_or_none()
                    linked_user_id = conv

                if linked_user_id is not None:
                    patient = (
                        await db.execute(
                            select(User)
                            .options(
                                __import__("sqlalchemy").orm.joinedload(User.profile)
                            )
                            .where(User.id == int(linked_user_id))
                        )
                    ).scalar_one_or_none()
                    if patient:
                        profile = patient.profile
                        patient_block["patient"] = {
                            "email": patient.email,
                            "phone": (
                                profile.phone or profile.alternate_phone
                                if profile
                                else getattr(patient, "phone", None)
                            ),
                            "telegram_username": (
                                profile.telegram_username if profile else None
                            ),
                            "preferred_name": patient.preferred_name
                            or patient.first_name
                            or patient.name,
                        }
            elif case.assigned_to is not None:
                patient_block["patient_access"] = (
                    "Ditangani counselor lain — detail pasien tidak diizinkan."
                )

        return {
            "success": True,
            "case_id": case_id,
            "user_hash": str(case.user_hash),
            "session_id": case.session_id,
            "conversation_id": case.conversation_id,
            "severity": case.severity.value if isinstance(case.severity, CaseSeverityEnum) else str(case.severity),
            "status": case.status.value if isinstance(case.status, CaseStatusEnum) else str(case.status),
            "summary_redacted": case.summary_redacted,
            "assigned_to": str(case.assigned_to) if case.assigned_to else None,
            "sla_breach_at": case.sla_breach_at.isoformat() if case.sla_breach_at else None,
            "closure_reason": case.closure_reason,
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "updated_at": case.updated_at.isoformat() if case.updated_at else None,
            **patient_block,
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting case details for {case_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "case_id": case_id
        }


@register_tool(
    name="get_user_cases",
    description="Get all cases for a user with optional status filter. Returns case history. HIGHLY SENSITIVE.",
    parameters={
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID"
            },
            "status": {
                "type": "string",
                "description": "Optional status filter (new, in_progress, waiting, resolved, closed)",
                "enum": ["new", "in_progress", "waiting", "resolved", "closed"]
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of cases to return (default 20, max 20)",
                "default": 20
            }
        },
        "required": ["user_id"]
    },
    category="case_management",
    requires_db=True,
    requires_user_id=False
)
async def get_user_cases(
    db: AsyncSession,
    user_id: str,
    status: Optional[str] = None,
    limit: int = MAX_CASES,
    requester_user_id: Optional[int] = None,
    requester_role: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Get all cases for a user.
    
    Returns list of cases with optional status filter.
    HIGHLY SENSITIVE - clinical case history.
    """
    try:
        # Counselor scoping: target patient must be in assigned scope.
        from app.domains.mental_health.services.counselor_scope import (
            check_counselor_tool_access,
            tool_access_denied,
        )

        try:
            _target_patient = int(user_id)
        except (TypeError, ValueError):
            _target_patient = None

        _access = await check_counselor_tool_access(
            db, requester_user_id, requester_role, patient_user_id=_target_patient
        )
        if not _access.allowed:
            logger.warning("Tool access denied: get_user_cases (%s)", _access.reason)
            return tool_access_denied(_access.reason)
        if limit > MAX_CASES:
            limit = MAX_CASES
        if limit < 1:
            limit = 1

        user_hash_candidates = _to_user_hash_candidates(user_id)
        if not user_hash_candidates:
            return {
                "success": False,
                "error": "Invalid user_id",
                "user_id": user_id,
            }
            
        # Query cases
        query = select(Case).where(Case.user_hash.in_(user_hash_candidates))
        if status:
            normalized_status = _normalize_case_status(status)
            if normalized_status is None:
                return {
                    "success": False,
                    "error": f"Invalid status filter: {status}",
                    "user_id": user_id,
                }
            query = query.where(Case.status == normalized_status)
        query = query.order_by(desc(Case.created_at)).limit(limit)
        
        result = await db.execute(query)
        cases = result.scalars().all()
        
        case_list = []
        for case in cases:
            updated_at_value = None
            if case.updated_at is not None:
                updated_at_value = case.updated_at.isoformat()
                
            case_list.append({
                "case_id": str(case.id),
                "severity": case.severity.value if isinstance(case.severity, CaseSeverityEnum) else str(case.severity),
                "status": case.status.value if isinstance(case.status, CaseStatusEnum) else str(case.status),
                "summary_redacted": case.summary_redacted,
                "assigned_to": str(case.assigned_to) if case.assigned_to else None,
                "session_id": case.session_id,
                "conversation_id": case.conversation_id,
                "created_at": case.created_at.isoformat() if case.created_at else None,
                "updated_at": updated_at_value
            })
        
        logger.info(f"✅ Retrieved {len(case_list)} cases for user {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "status_filter": status,
            "total_cases": len(case_list),
            "cases": case_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting cases for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id
        }


@register_tool(
    name="get_my_assigned_cases",
    description=(
        "List the clinical cases currently assigned to YOU (the requesting "
        "counselor), with patient contact details for each. Call this when a "
        "counselor asks about 'kasus saya', 'kasus yang ditugaskan', "
        "'pasien saya', or wants an overview of their workload. The "
        "assignment filter uses the requester's own identity and cannot be "
        "changed from the model side. HIGHLY SENSITIVE."
    ),
    parameters={
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "description": "Optional status filter: new, in_progress, waiting, resolved, closed",
            },
            "limit": {
                "type": "integer",
                "description": "Max cases to return (default 10, max 20)",
            },
        },
        "required": [],
    },
    category="case_management",
    requires_db=True,
    requires_user_id=True,  # injected requester id — never model-supplied
)
async def get_my_assigned_cases(
    db: AsyncSession,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 10,
    **kwargs,
) -> Dict[str, Any]:
    """List cases assigned to the requesting counselor, with patient details.

    Patient identity is resolved the same way the counselor console does it:
    case.session_id / conversation_id → Conversation.user_id → User (+profile).
    The counselor sees real contact details because the assignment check
    guarantees the requester owns these cases.
    """
    from app.domains.mental_health.models import Conversation, Counselor
    from sqlalchemy.orm import joinedload as _joinedload

    limit = max(1, min(int(limit or 10), 20))

    try:
        if user_id is None:
            return {"success": False, "error": "Requester identity unavailable"}

        counselor = (
            await db.execute(
                select(Counselor).where(Counselor.user_id == int(user_id))
            )
        ).scalar_one_or_none()
        if counselor is None:
            return {
                "success": True,
                "cases": [],
                "total_cases": 0,
                "note": "Akun ini belum memiliki profil counselor (Counselor).",
            }

        query = (
            select(Case)
            .where(Case.assigned_to == str(counselor.id))
            .order_by(Case.created_at.desc())
            .limit(limit)
        )
        status_enum = _normalize_case_status(status)
        if status_enum is not None:
            query = query.where(Case.status == status_enum)

        cases = (await db.execute(query)).scalars().all()

        # Resolve patient identity via Conversation → User (console pattern).
        conversation_ids = {c.conversation_id for c in cases if c.conversation_id}
        session_ids = {c.session_id for c in cases if c.session_id}

        user_by_conversation: dict[int, int] = {}
        user_by_session: dict[str, int] = {}
        if conversation_ids or session_ids:
            filters = []
            if conversation_ids:
                filters.append(Conversation.id.in_(conversation_ids))
            if session_ids:
                filters.append(Conversation.session_id.in_(session_ids))
            conv_rows = (
                await db.execute(
                    select(Conversation.id, Conversation.user_id, Conversation.session_id).where(
                        or_(*filters)
                    )
                )
            ).all()
            for conv_id, owner_id, sess_id in conv_rows:
                if conv_id is not None:
                    user_by_conversation[int(conv_id)] = int(owner_id)
                if sess_id:
                    user_by_session[str(sess_id)] = int(owner_id)

        linked_user_ids = set(user_by_conversation.values()) | set(user_by_session.values())
        users_by_id: dict[int, Any] = {}
        if linked_user_ids:
            from app.models import User as _User

            user_rows = (
                await db.execute(
                    select(_User)
                    .options(_joinedload(_User.profile))
                    .where(_User.id.in_(linked_user_ids))
                )
            ).scalars().all()
            users_by_id = {u.id: u for u in user_rows}

        payload = []
        for case in cases:
            linked_user_id = None
            if case.conversation_id and int(case.conversation_id) in user_by_conversation:
                linked_user_id = user_by_conversation[int(case.conversation_id)]
            elif case.session_id and str(case.session_id) in user_by_session:
                linked_user_id = user_by_session[str(case.session_id)]

            patient_user = users_by_id.get(linked_user_id) if linked_user_id else None
            profile = getattr(patient_user, "profile", None)

            payload.append({
                "case_id": str(case.id),
                "status": case.status.value if hasattr(case.status, "value") else str(case.status),
                "severity": case.severity.value if hasattr(case.severity, "value") else str(case.severity),
                "created_at": case.created_at.isoformat() if case.created_at else None,
                "summary_redacted": case.summary_redacted,
                "session_id": case.session_id,
                "conversation_id": case.conversation_id,
                "patient": {
                    "email": patient_user.email if patient_user else None,
                    "preferred_name": (
                        patient_user.preferred_name
                        or patient_user.first_name
                        or patient_user.name
                        if patient_user
                        else None
                    ),
                    "phone": (
                        profile.phone or profile.alternate_phone
                        if profile
                        else getattr(patient_user, "phone", None)
                    ),
                    "telegram_username": profile.telegram_username if profile else None,
                },
            })

        logger.info("✅ get_my_assigned_cases: %d case(s) for counselor user %s", len(payload), user_id)
        return {
            "success": True,
            "total_cases": len(payload),
            "cases": payload,
        }

    except Exception as e:
        logger.error("❌ Error listing assigned cases: %s", e)
        return {"success": False, "error": str(e)}
