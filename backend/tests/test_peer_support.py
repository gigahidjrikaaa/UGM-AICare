"""Peer-support program tests: role semantics, supporter selection, pairing
lifecycle (consent gate), and the crisis-lexicon escalation screen."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.role_utils import normalize_role


# ---------------------------------------------------------------------------
# Role semantics
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_peer_supporter_is_canonical() -> None:
    assert normalize_role("peer_supporter") == "peer_supporter"
    assert normalize_role("peer_supporter") in __import__(
        "app.core.role_utils", fromlist=["CANONICAL_ROLES"]
    ).CANONICAL_ROLES


@pytest.mark.asyncio
async def test_peer_supporter_passes_require_counselor() -> None:
    from app.domains.mental_health.routes.counselor import require_counselor

    user = await require_counselor(
        current_user=SimpleNamespace(id=9, role="peer_supporter", is_active=True)
    )
    assert user.role == "peer_supporter"


@pytest.mark.asyncio
async def test_peer_supporter_blocked_from_admin_writes() -> None:
    from app.dependencies import get_admin_readonly_user

    with pytest.raises(HTTPException) as exc_info:
        await get_admin_readonly_user(
            request=SimpleNamespace(method="POST"),
            current_user=SimpleNamespace(id=7, role="peer_supporter", is_active=True),
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_peer_supporter_blocked_from_admin_reads() -> None:
    from app.dependencies import get_admin_readonly_user

    with pytest.raises(HTTPException) as exc_info:
        await get_admin_readonly_user(
            request=SimpleNamespace(method="GET"),
            current_user=SimpleNamespace(id=7, role="peer_supporter", is_active=True),
        )
    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# Crisis screening
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_crisis_markers_detected() -> None:
    from app.domains.mental_health.services.peer_support_service import _has_crisis_markers

    assert _has_crisis_markers("i want to kill myself tonight") is True
    assert _has_crisis_markers("having a rough week but hanging in there") is False


# ---------------------------------------------------------------------------
# Pairing lifecycle (mocked DB)
# ---------------------------------------------------------------------------

class _FakeResult:
    def __init__(self, scalar=None, rows=None):
        self._scalar = scalar
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return SimpleNamespace(all=lambda: self._rows)


class _FakeDB:
    """Sequential execute results + scalar counter (load queries return 0)."""

    def __init__(self, results):
        self._results = list(results)
        self.added = []

    async def execute(self, stmt, *a, **k):
        if self._results:
            return self._results.pop(0)
        return _FakeResult()

    async def scalar(self, stmt, *a, **k):
        return 0

    def add(self, obj):
        self.added.append(obj)
        if getattr(obj, "id", None) is None:
            obj.id = 1

    async def flush(self):
        return None

    async def commit(self):
        return None


def _student(consent: bool) -> SimpleNamespace:
    return SimpleNamespace(id=42, role="user", consent_peer_support=consent, is_active=True)


@pytest.mark.asyncio
async def test_create_pairing_requires_consent() -> None:
    from app.domains.mental_health.services import peer_support_service as pss

    db = _FakeDB(results=[])
    with pytest.raises(PermissionError):
        await pss.create_pairing(db, student=_student(consent=False))


@pytest.mark.asyncio
async def test_create_pairing_picks_supporter_and_supervisor() -> None:
    from app.domains.mental_health.services import peer_support_service as pss

    supporter_profile = SimpleNamespace(id=5, user_id=9)
    # execute queue: 1) active-pairing lookup → None, 2) supporter candidates → [5],
    # 3) supervisor candidates → [7]
    db = _FakeDB(results=[_FakeResult(), _FakeResult(rows=[5]), _FakeResult(rows=[7])])

    pairing = await pss.create_pairing(db, student=_student(consent=True))

    assert pairing.supporter_id == 5
    assert pairing.supervisor_id == 7
    assert pairing.student_id == 42
    assert pairing.status == "active"


@pytest.mark.asyncio
async def test_create_pairing_raises_when_pool_empty() -> None:
    from app.domains.mental_health.services import peer_support_service as pss

    # execute queue: 1) active-pairing lookup → None, 2) supporter candidates → []
    db = _FakeDB(results=[_FakeResult(), _FakeResult(rows=[])])

    with pytest.raises(RuntimeError):
        await pss.create_pairing(db, student=_student(consent=True))


@pytest.mark.asyncio
async def test_select_supporter_skips_non_accepting(monkeypatch: pytest.MonkeyPatch) -> None:
    """The CMA peer pool must exclude counselors w/o accepts_peer_cases — the
    service-level query filters on it, so an empty pool returns None."""
    from app.domains.mental_health.services import peer_support_service as pss

    db = _FakeDB(results=[_FakeResult(rows=[])] )  # no accepting supporters
    assert await pss.select_supporter_for_assignment(db) is None
