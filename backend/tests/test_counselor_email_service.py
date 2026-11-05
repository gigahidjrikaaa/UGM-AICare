"""Counselor email service tests: templates, branded rendering, scope
enforcement, rate limit, and the audit log write."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.domains.mental_health.services.counselor_email_service import (
    DAILY_LIMIT_PER_COUNSELOR,
    build_branded_email,
    get_template,
    list_templates,
    render_email,
)


@pytest.mark.unit
def test_templates_registered() -> None:
    keys = {t.key for t in list_templates()}
    assert keys == {"session_reminder", "follow_up", "resource_share", "custom"}


@pytest.mark.unit
def test_render_fills_placeholders() -> None:
    template = get_template("follow_up")
    rendered = render_email(
        template,
        counselor_name="Dr. Sari",
        student_name="Budi",
        custom_message="How are you sleeping?",
    )
    assert "Dr. Sari" in rendered["subject"]
    assert "Budi" in rendered["body"]
    assert "How are you sleeping?" in rendered["body"]


@pytest.mark.unit
def test_custom_template_requires_message() -> None:
    template = get_template("custom")
    with pytest.raises(ValueError):
        render_email(template, counselor_name="Dr. Sari", student_name="Budi", custom_message="")


@pytest.mark.unit
def test_branded_email_contains_crisis_footer_and_plain() -> None:
    template = get_template("session_reminder")
    branded = build_branded_email(
        template,
        counselor_name="Dr. Sari",
        student_name="Budi",
        custom_message="See you Thursday.",
    )
    assert "SEJIWA 119" in branded["html"]
    assert "Dr. Sari" in branded["html"]
    assert "ugm-aicare.com" in branded["html"]
    assert branded["plain"]


# ---------------------------------------------------------------------------
# Scope enforcement + rate limit (DB mocked)
# ---------------------------------------------------------------------------

class _FakeResult:
    def __init__(self, scalar=None, scalar_one_or_none=None, rows=None):
        self._scalar = scalar
        self._none = scalar_one_or_none
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self):
        return self._none

    def scalars(self):
        return SimpleNamespace(all=lambda: self._rows)

    def all(self):
        return self._rows

    def scalar(self):
        return self._scalar


class _FakeResult:
    def __init__(self, scalar=None, scalar_one_or_none=None, rows=None):
        self._scalar = scalar
        self._none = scalar_one_or_none
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self):
        return self._none

    def scalar(self):
        return self._scalar

    def scalars(self):
        return SimpleNamespace(all=lambda: self._rows)

    def all(self):
        return self._rows


class _FakeDB:
    """Sequential execute results; the scope lookup is monkeypatched."""

    def __init__(self, execute_results, scalar_results=None):
        self._execute = list(execute_results)
        self._scalars = list(scalar_results or [])
        self.added = []
        self.committed = False

    async def execute(self, stmt, *a, **k):
        if self._execute:
            return self._execute.pop(0)
        return _FakeResult()

    async def scalar(self, stmt, *a, **k):
        if self._scalars:
            return self._scalars.pop(0)
        return 0

    def add(self, obj):
        self.added.append(obj)
        if getattr(obj, "id", None) is None:
            obj.id = 1

    async def flush(self):
        return None

    async def commit(self):
        self.committed = True


@pytest.fixture()
def patched_scope(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Bypass get_counselor_conversation_scope's internal queries; record calls."""
    calls: list[dict] = []

    async def fake_scope(db, counselor_profile):
        calls.append({"counselor_profile_id": counselor_profile.id})
        return (set(), {42})

    monkeypatch.setattr(
        "app.domains.mental_health.services.counselor_scope.get_counselor_conversation_scope",
        fake_scope,
    )
    return calls


def _counselor_user() -> SimpleNamespace:
    return SimpleNamespace(id=7, role="counselor", name="Dr. Sari", is_active=True)


def _student_user(consent=True) -> SimpleNamespace:
    return SimpleNamespace(
        id=42,
        role="user",
        name="Budi",
        email="budi@ugm.ac.id",
        allow_email_checkins=consent,
        is_active=True,
    )


@pytest.mark.asyncio
async def test_send_blocked_outside_caseload(patched_scope, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.domains.mental_health.services.counselor_scope import get_counselor_conversation_scope
    from app.domains.mental_health.services.counselor_email_service import send_student_email

    async def empty_scope(db, profile):
        return (set(), set())

    monkeypatch.setattr(get_counselor_conversation_scope, "__module__", get_counselor_conversation_scope.__module__)
    monkeypatch.setattr(
        "app.domains.mental_health.services.counselor_scope.get_counselor_conversation_scope",
        empty_scope,
    )

    db = _FakeDB(
        execute_results=[
            _FakeResult(scalar_one_or_none=_student_user(consent=True)),
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=5)),
        ]
    )
    with pytest.raises(PermissionError):
        await send_student_email(
            db,
            counselor_user=_counselor_user(),
            student_user_id=42,
            template_key="follow_up",
            custom_message="hi",
        )


@pytest.mark.asyncio
async def test_send_rate_limited(patched_scope, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.domains.mental_health.services.counselor_email_service import send_student_email

    db = _FakeDB(
        execute_results=[
            _FakeResult(scalar_one_or_none=_student_user(consent=True)),
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=5)),
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=5)),
        ],
        scalar_results=[DAILY_LIMIT_PER_COUNSELOR],
    )
    with pytest.raises(RuntimeError):
        await send_student_email(
            db,
            counselor_user=_counselor_user(),
            student_user_id=42,
            template_key="follow_up",
            custom_message="hi",
        )


@pytest.mark.asyncio
async def test_send_logs_audit_row(patched_scope, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.domains.mental_health.services import counselor_email_service as cem
    from app.domains.mental_health.services.counselor_email_service import send_student_email

    student = _student_user(consent=True)
    db = _FakeDB(
        execute_results=[
            _FakeResult(scalar_one_or_none=student),                # student lookup
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=5)),  # counselor profile
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=5)),  # thread profile validate
            _FakeResult(scalar_one_or_none=None),                   # thread lookup → none
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=5)),  # thread profile validate
            _FakeResult(rows=[]),                                   # selector → no candidates
        ]
    )

    # Patch the SMTP layer (module-level import binding in the service).
    monkeypatch.setattr(cem, "send_email", lambda **kw: True)

    result = await send_student_email(
        db,
        counselor_user=_counselor_user(),
        student_user_id=42,
        template_key="follow_up",
        custom_message="Checking in!",
    )

    assert result["delivered"] is True
    assert result["thread_id"] == 1
    logs = [o for o in db.added if getattr(o, "template_key", None) is not None]
    assert len(logs) == 1
    assert logs[0].student_user_id == 42
    assert logs[0].status == "sent"
    assert logs[0].message_redacted  # custom message stored redacted
    assert db.committed
