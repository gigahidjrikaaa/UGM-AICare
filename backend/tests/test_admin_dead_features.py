"""Admin console hardening tests: counselor write-lockout and CBT modules CRUD."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.dependencies import get_admin_readonly_user


def _request(method: str) -> SimpleNamespace:
    return SimpleNamespace(method=method)


@pytest.mark.asyncio
async def test_counselor_blocked_from_admin_writes() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_admin_readonly_user(
            request=_request("POST"),
            current_user=SimpleNamespace(id=9, role="counselor", is_active=True),
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_counselor_allowed_admin_reads() -> None:
    user = await get_admin_readonly_user(
        request=_request("GET"),
        current_user=SimpleNamespace(id=9, role="counselor", is_active=True),
    )
    assert user.role == "counselor"


@pytest.mark.asyncio
async def test_admin_write_still_allowed() -> None:
    user = await get_admin_readonly_user(
        request=_request("POST"),
        current_user=SimpleNamespace(id=1, role="admin", is_active=True),
    )
    assert user.role == "admin"


@pytest.mark.asyncio
async def test_admin_viewer_still_read_only() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_admin_readonly_user(
            request=_request("DELETE"),
            current_user=SimpleNamespace(id=2, role="admin_viewer", is_active=True),
        )
    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# CBT modules CRUD (fake session — no real DB)
# ---------------------------------------------------------------------------

class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalar_one(self):
        return self._value if isinstance(self._value, int) else 0

    def scalars(self):
        return SimpleNamespace(all=lambda: [self._value] if self._value else [])


class _FakeDB:
    def __init__(self, lookup_value=None):
        self.lookup_value = lookup_value
        self.added = []

    async def execute(self, stmt):
        return _FakeResult(self.lookup_value)

    def add(self, obj):
        self.added.append(obj)
        if getattr(obj, "id", None) is None:
            obj.id = 1

    async def commit(self):
        return None

    async def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = 1


@pytest.mark.asyncio
async def test_cbt_module_create_and_list_roundtrip() -> None:
    from app.routes.admin.cbt_modules import (
        CbtModuleListOut,
        CbtModulePayload,
        create_cbt_module,
        list_cbt_modules,
    )

    db = _FakeDB()
    created = await create_cbt_module(
        payload=CbtModulePayload(title="Reframing", description="Challenge negative thoughts"),
        db=db,
        _admin=SimpleNamespace(id=1),
    )
    assert created.id == 1
    assert created.title == "Reframing"

    listing = await list_cbt_modules(page=1, limit=10, db=db, _admin=SimpleNamespace(id=1))
    assert isinstance(listing, CbtModuleListOut)


@pytest.mark.asyncio
async def test_cbt_step_create_requires_existing_module() -> None:
    from app.routes.admin.cbt_modules import (
        CbtStepPayload,
        create_cbt_step,
    )

    db = _FakeDB(lookup_value=None)  # module lookup returns None
    with pytest.raises(HTTPException) as exc_info:
        await create_cbt_step(
            module_id=99,
            payload=CbtStepPayload(step_order=1, step_type="psychoeducation", content="Intro"),
            db=db,
            _admin=SimpleNamespace(id=1),
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_cbt_step_create_happy_path() -> None:
    from app.routes.admin.cbt_modules import (
        CbtStepPayload,
        create_cbt_step,
    )

    module = SimpleNamespace(id=7, title="Reframing", description="d")
    db = _FakeDB(lookup_value=module)
    step = await create_cbt_step(
        module_id=7,
        payload=CbtStepPayload(
            step_order=1,
            step_type="psychoeducation",
            content="What is cognitive reframing?",
        ),
        db=db,
        _admin=SimpleNamespace(id=1),
    )
    assert step.module_id == 7
    assert step.step_order == 1
    assert db.added  # step was persisted
