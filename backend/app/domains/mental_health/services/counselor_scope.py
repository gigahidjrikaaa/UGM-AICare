"""Counselor scope service — the single definition of "which patients can a
counselor see".

Extracted from ``routes/counselor.py`` so the AI tool executors
(``app/agents/shared/tools/*``) can enforce the exact same access rules as
the counselor console, without importing from a routes module.

Access model
------------
- ``admin`` / ``admin_viewer``: platform-wide access (bypass).
- ``counselor``: a patient/conversation is in scope when the counselor has an
  assigned Case linking to it (by conversation id, session id, or resolved
  patient user id). Closed cases remain in scope — history stays visible.
- every other role: denied.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.role_utils import normalize_role
from app.domains.mental_health.models import (
    Case,
    Conversation,
    Counselor,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CounselorScope:
    """Everything a counselor is allowed to see, per the console's definition."""

    counselor: Counselor
    session_ids: set[str]
    user_ids: set[int]


@dataclass(frozen=True)
class ToolAccessDecision:
    allowed: bool
    reason: str


async def get_counselor_profile_for_user(
    db: AsyncSession, user_id: int
) -> Optional[Counselor]:
    """Non-raising lookup of the counselor (Counselor) profile by user id."""
    result = await db.execute(
        select(Counselor).where(Counselor.user_id == int(user_id))
    )
    return result.scalar_one_or_none()


async def get_counselor_conversation_scope(
    db: AsyncSession, profile: Counselor
) -> tuple[set[str], set[int]]:
    """Return accessible session IDs and patient user IDs for assigned cases.

    Moved verbatim from ``routes/counselor.py::_get_counselor_conversation_scope``
    so tools and routes share one definition. Closed cases stay in scope:
    history remains visible after resolution.
    """
    counselor_id_str = str(profile.id)

    case_rows = (
        await db.execute(
            select(Case.session_id, Case.conversation_id).where(
                Case.assigned_to == counselor_id_str
            )
        )
    ).all()

    session_ids: set[str] = {
        str(case_session_id) for case_session_id, _ in case_rows if case_session_id
    }
    conversation_ids: set[int] = set()
    for _, conversation_id in case_rows:
        if conversation_id is not None:
            try:
                conversation_ids.add(int(conversation_id))
            except (TypeError, ValueError):
                continue

    if conversation_ids:
        resolved_sessions = (
            await db.execute(
                select(Conversation.session_id).where(
                    Conversation.id.in_(conversation_ids)
                )
            )
        ).scalars().all()
        for resolved_session_id in resolved_sessions:
            if resolved_session_id:
                session_ids.add(str(resolved_session_id))

    if not session_ids:
        return set(), set()

    scoped_user_ids = (
        await db.execute(
            select(func.distinct(Conversation.user_id)).where(
                Conversation.session_id.in_(session_ids)
            )
        )
    ).scalars().all()

    user_ids = {int(uid) for uid in scoped_user_ids if uid is not None}
    return session_ids, user_ids


async def check_counselor_tool_access(
    db: AsyncSession,
    requester_user_id: Optional[int],
    requester_role: Optional[str],
    *,
    conversation_id: Optional[str] = None,
    conversation_row_id: Optional[int] = None,
    patient_user_id: Optional[int] = None,
) -> ToolAccessDecision:
    """Decide whether the requester may touch the target patient/conversation.

    Exactly one of ``conversation_id`` (the string conversation identifier),
    ``conversation_row_id`` (int PK), or ``patient_user_id`` should describe
    the target. Admin roles bypass; counselors must have an assigned case
    linking them to the target; everyone else is denied.
    """
    role = normalize_role(requester_role)

    if role in {"admin", "admin_viewer"}:
        return ToolAccessDecision(True, "admin bypass")

    if role != "counselor":
        return ToolAccessDecision(False, f"role '{role}' is not permitted")

    if requester_user_id is None:
        return ToolAccessDecision(False, "requester identity unavailable")

    profile = await get_counselor_profile_for_user(db, requester_user_id)
    if profile is None:
        return ToolAccessDecision(False, "requester has no counselor profile")

    session_ids, user_ids = await get_counselor_conversation_scope(db, profile)

    if patient_user_id is not None:
        if int(patient_user_id) in user_ids:
            return ToolAccessDecision(True, "patient in assigned scope")
        return ToolAccessDecision(False, "patient not in assigned scope")

    if conversation_id is not None or conversation_row_id is not None:
        stmt = select(Conversation.session_id, Conversation.user_id)
        if conversation_row_id is not None:
            stmt = stmt.where(Conversation.id == int(conversation_row_id))
        else:
            stmt = stmt.where(Conversation.conversation_id == str(conversation_id))
        row = (await db.execute(stmt.limit(1))).first()
        if row is None:
            return ToolAccessDecision(False, "conversation not found")
        row_session_id = str(row.session_id) if row.session_id else None
        row_user_id = int(row.user_id) if row.user_id is not None else None
        if (row_session_id and row_session_id in session_ids) or (
            row_user_id is not None and row_user_id in user_ids
        ):
            return ToolAccessDecision(True, "conversation in assigned scope")
        return ToolAccessDecision(False, "conversation not in assigned scope")

    return ToolAccessDecision(False, "no target specified")


def tool_access_denied(reason: str) -> dict:
    """Uniform deny envelope for scoping-aware tools."""
    return {
        "success": False,
        "access_denied": True,
        "error": f"Access denied: {reason}",
    }
