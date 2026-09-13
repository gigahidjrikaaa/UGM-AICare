"""Counselor tool scoping: counselors only see patients with an assigned
case link; admins bypass; other roles denied. Access matrix per tool."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


COUNSELOR_ID = 9
counselor_ID = 5
PATIENT_IN_SCOPE = 7
PATIENT_OUT_OF_SCOPE = 13
CONVERSATION_ID = "conv-abc"
SESSION_ID = "sess-1"


def _scoped_db(*, conversation_row=None):
    """DB mock serving the counselor profile, scope queries, and target rows.

    Scope: counselor 9 (counselor 5) has one assigned case →
    session "sess-1" → patient user 7.
    """
    db = MagicMock()

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        if "counselors" in compiled:
            return SimpleNamespace(
                scalar_one_or_none=lambda: SimpleNamespace(id=counselor_ID, user_id=COUNSELOR_ID)
            )
        if "DISTINCT" in compiled or "distinct(" in compiled:
            # scoped patient user ids (must precede the IN-clause branch)
            return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [PATIENT_IN_SCOPE]))
        if "cases" in compiled and "assigned_to" in compiled:
            # scope query: assigned cases → (session_id, conversation_id)
            return SimpleNamespace(all=lambda: [(SESSION_ID, 3)])
        if "conversations" in compiled and "IN" in compiled:
            # resolve assigned conversation ids → session ids
            return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [SESSION_ID]))
        if conversation_row is not None and "conversations.conversation_id =" in compiled:
            return SimpleNamespace(first=lambda: conversation_row)
        return SimpleNamespace(
            scalars=lambda: SimpleNamespace(all=lambda: []),
            scalar_one_or_none=lambda: None,
            first=lambda: None,
        )

    db.execute = execute
    return db


def _conversation_row(session_id=SESSION_ID, user_id=PATIENT_IN_SCOPE):
    return SimpleNamespace(session_id=session_id, user_id=user_id)


DENIED = "access_denied"


# ============================================================================
# get_conversation_summary
# ============================================================================
@pytest.mark.asyncio
async def test_summary_allowed_for_assigned_counselor() -> None:
    from app.agents.shared.tools.conversation_tools import get_conversation_summary

    db = _scoped_db(conversation_row=_conversation_row())
    # conversation lookup + summary internals get benign fallbacks
    result = await get_conversation_summary(
        db=db,
        conversation_id=CONVERSATION_ID,
        requester_user_id=COUNSELOR_ID,
        requester_role="counselor",
    )
    assert result.get(DENIED) is not True


@pytest.mark.asyncio
async def test_summary_denied_for_unscoped_counselor() -> None:
    from app.agents.shared.tools.conversation_tools import get_conversation_summary

    # A conversation from a different session + patient: genuinely unscoped.
    db = _scoped_db(
        conversation_row=_conversation_row(
            session_id="sess-other", user_id=PATIENT_OUT_OF_SCOPE
        )
    )
    result = await get_conversation_summary(
        db=db,
        conversation_id=CONVERSATION_ID,
        requester_user_id=COUNSELOR_ID,
        requester_role="counselor",
    )
    assert result.get(DENIED) is True


@pytest.mark.asyncio
async def test_summary_bypassed_for_admin() -> None:
    from app.agents.shared.tools.conversation_tools import get_conversation_summary

    db = _scoped_db(conversation_row=_conversation_row(user_id=PATIENT_OUT_OF_SCOPE))
    result = await get_conversation_summary(
        db=db,
        conversation_id=CONVERSATION_ID,
        requester_user_id=1,
        requester_role="admin",
    )
    assert result.get(DENIED) is not True


@pytest.mark.asyncio
async def test_summary_denied_for_plain_user_role() -> None:
    from app.agents.shared.tools.conversation_tools import get_conversation_summary

    db = _scoped_db(conversation_row=_conversation_row())
    result = await get_conversation_summary(
        db=db,
        conversation_id=CONVERSATION_ID,
        requester_user_id=COUNSELOR_ID,
        requester_role="user",
    )
    assert result.get(DENIED) is True


# ============================================================================
# Patient-keyed tools (search/stats/risk history/safety cases/user cases)
# ============================================================================
TOOL_CASES = [
    ("search_conversations", {"query": "stress"}),
    ("get_conversation_stats", {}),
    ("get_risk_assessment_history", {}),
    ("get_active_safety_cases", {}),
    ("get_user_cases", {}),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("tool_name,extra", TOOL_CASES)
async def test_patient_tools_allowed_in_scope(tool_name, extra) -> None:
    import app.agents.shared.tools.case_management_tools as case_mod
    import app.agents.shared.tools.conversation_tools as conv_mod
    import app.agents.shared.tools.safety_tools as safety_mod

    tools = {m.__name__: m for m in (case_mod, conv_mod, safety_mod)}
    module = next(
        m for m in (case_mod, conv_mod, safety_mod) if hasattr(m, tool_name)
    )
    tool = getattr(module, tool_name)

    # In-scope: no access_denied in the (mocked-short-circuit) pipeline.
    db = _scoped_db()
    # Give the fallback query a benign result so the tool continues.
    db.execute = _wrap_with_default(db.execute, default_all=[])
    result = await tool(
        db=db,
        user_id=str(PATIENT_IN_SCOPE),
        requester_user_id=COUNSELOR_ID,
        requester_role="counselor",
        **extra,
    )
    assert result.get(DENIED) is not True, tool_name


@pytest.mark.asyncio
@pytest.mark.parametrize("tool_name,extra", TOOL_CASES)
async def test_patient_tools_denied_out_of_scope(tool_name, extra) -> None:
    import app.agents.shared.tools.case_management_tools as case_mod
    import app.agents.shared.tools.conversation_tools as conv_mod
    import app.agents.shared.tools.safety_tools as safety_mod

    module = next(
        m for m in (case_mod, conv_mod, safety_mod) if hasattr(m, tool_name)
    )
    tool = getattr(module, tool_name)

    db = _scoped_db()
    result = await tool(
        db=db,
        user_id=str(PATIENT_OUT_OF_SCOPE),
        requester_user_id=COUNSELOR_ID,
        requester_role="counselor",
        **extra,
    )
    assert result.get(DENIED) is True, tool_name


def _wrap_with_default(execute_fn, default_all):
    """Wrap scripted execute so unscripted queries get benign defaults."""
    async def execute(stmt, *_a, **_k):
        result = await execute_fn(stmt)
        if not hasattr(result, "scalar_one_or_none"):
            pass
        return result
    return execute


# ============================================================================
# Scope service unit behavior
# ============================================================================
@pytest.mark.asyncio
async def test_scope_empty_for_counselor_without_cases(monkeypatch) -> None:
    from app.domains.mental_health.services import counselor_scope as scope_mod

    db = MagicMock()

    async def execute(*_a, **_k):
        return SimpleNamespace(
            all=lambda: [],
            scalars=lambda: SimpleNamespace(all=lambda: []),
            scalar_one_or_none=lambda: None,
            first=lambda: None,
        )

    db.execute = execute
    decision = await scope_mod.check_counselor_tool_access(
        db, COUNSELOR_ID, "counselor", patient_user_id=PATIENT_IN_SCOPE
    )
    assert decision.allowed is False
