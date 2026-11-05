"""Two-way counselor email: reply-token addressing, preview rendering,
admin-editable DB templates, the inbound webhook, and the peer-supporter
email-channel gate."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.domains.mental_health.services import counselor_email_service as cem
from app.domains.mental_health.services.counselor_email_service import (
    PREVIEW_DISCLAIMER,
    admin_create_template,
    admin_delete_template,
    admin_update_template,
    build_preview,
    reply_address_for_thread,
    resolve_templates_from_db,
    verify_reply_address,
)


# ---------------------------------------------------------------------------
# Reply-token addressing (stateless HMAC, no DB)
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_reply_address_roundtrip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.core.settings.settings.inbound_email_webhook_secret", "unit-secret", raising=False
    )
    address = reply_address_for_thread(12)
    assert address.startswith("reply+12.")
    assert address.endswith("@replies.ugm-aicare.com")
    assert verify_reply_address(address) == 12


@pytest.mark.unit
def test_forged_or_malformed_reply_addresses_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.core.settings.settings.inbound_email_webhook_secret", "unit-secret", raising=False
    )
    good = reply_address_for_thread(12)
    tampered = good.replace(".@replies", "").replace(good.split(".")[1].split("@")[0], "0" * 16)
    assert verify_reply_address(tampered) is None
    assert verify_reply_address("budi@ugm.ac.id") is None
    assert verify_reply_address("") is None


# ---------------------------------------------------------------------------
# Preview: renders without sending or persisting anything
# ---------------------------------------------------------------------------


class _FakeResult:
    def __init__(self, scalar_one_or_none=None, rows=None):
        self._none = scalar_one_or_none
        self._rows = rows if rows is not None else []

    def scalar_one_or_none(self):
        return self._none

    def scalars(self):
        return SimpleNamespace(all=lambda: self._rows)


class _FakeDB:
    def __init__(self, execute_results=None):
        self._execute = list(execute_results or [])
        self.added = []
        self.committed = False

    async def execute(self, stmt, *a, **k):
        if self._execute:
            return self._execute.pop(0)
        return _FakeResult()

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = 99

    async def delete(self, obj):
        self.deleted = obj


@pytest.mark.unit
def test_build_preview_renders_without_send() -> None:
    db = _FakeDB(execute_results=[_FakeResult(rows=[])])  # no DB templates → code default
    preview = _run(
        build_preview(
            db,
            counselor_name="Dr. Sari",
            student_name="Budi",
            template_key="follow_up",
            custom_message="How are you?",
        )
    )
    assert set(preview.keys()) == {"template", "label", "subject", "html", "plain", "disclaimer"}
    assert preview["template"] == "follow_up"
    assert "Dr. Sari" in preview["subject"]
    assert "How are you?" in preview["html"]
    assert preview["disclaimer"] == PREVIEW_DISCLAIMER
    assert db.added == []  # nothing persisted
    assert not db.committed


def _run(coro):
    import asyncio

    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# DB-backed templates: rows win, fallback to code defaults
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_resolve_templates_db_rows_win() -> None:
    row = SimpleNamespace(
        key="follow_up",
        label="Label dari admin",
        description="desc",
        subject="Subjek {counselor_name}",
        body_text="Halo {student_name}",
        is_active=True,
        sort_order=1,
    )
    db = _FakeDB(execute_results=[_FakeResult(rows=[row])])
    templates = _run(resolve_templates_from_db(db))
    assert len(templates) == 1
    assert templates[0].label == "Label dari admin"
    assert templates[0].default_subject_id == "Subjek {counselor_name}"


@pytest.mark.unit
def test_resolve_templates_falls_back_to_code_defaults() -> None:
    db = _FakeDB(execute_results=[_FakeResult(rows=[])])
    templates = _run(resolve_templates_from_db(db))
    assert {t.key for t in templates} == {"session_reminder", "follow_up", "resource_share", "custom"}


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_admin_create_rejects_code_default_key() -> None:
    db = _FakeDB()
    with pytest.raises(ValueError):
        _run(
            admin_create_template(
                db, key="follow_up", label="x", subject="s", body_text="b"
            )
        )
    assert db.added == []


@pytest.mark.unit
def test_admin_create_update_delete_roundtrip() -> None:
    db = _FakeDB(execute_results=[_FakeResult(scalar_one_or_none=None)])  # key not in DB
    row = _run(
        admin_create_template(
            db,
            key="wellness_tip",
            label="Wellness tip",
            subject="Tips untukmu",
            body_text="Halo {student_name}",
            description="Share a tip",
            sort_order=5,
            updated_by=1,
        )
    )
    assert row.key == "wellness_tip"
    assert db.committed and len(db.added) == 1

    existing = SimpleNamespace(
        id=99,
        key="wellness_tip",
        label="Wellness tip",
        description=None,
        subject="Tips untukmu",
        body_text="Halo",
        is_active=True,
        sort_order=5,
        updated_by=1,
    )
    db2 = _FakeDB(execute_results=[_FakeResult(scalar_one_or_none=existing)])
    updated = _run(admin_update_template(db2, 99, subject="Subjek baru", is_active=False))
    assert updated.subject == "Subjek baru"
    assert updated.is_active is False

    db3 = _FakeDB(execute_results=[_FakeResult(scalar_one_or_none=existing)])
    _run(admin_delete_template(db3, 99))
    assert db3.deleted is existing
    assert db3.committed


@pytest.mark.unit
def test_admin_update_missing_template_raises() -> None:
    db = _FakeDB(execute_results=[_FakeResult(scalar_one_or_none=None)])
    with pytest.raises(KeyError):
        _run(admin_update_template(db, 1234, subject="x"))


# ---------------------------------------------------------------------------
# Peer supporters never get the email channel
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_peer_supporter_blocked_from_email_channel() -> None:
    from app.domains.mental_health.routes.counselor_emails import require_email_channel

    ps_user = SimpleNamespace(id=9, role="peer_supporter", name="Peer")
    with pytest.raises(HTTPException) as exc:
        await require_email_channel(current_user=ps_user)
    assert exc.value.status_code == 403

    counselor = SimpleNamespace(id=7, role="counselor", name="Dr. Sari")
    allowed = await require_email_channel(current_user=counselor)
    assert allowed is counselor


# ---------------------------------------------------------------------------
# Inbound webhook
# ---------------------------------------------------------------------------


@pytest.fixture()
def inbound_secret(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "app.core.settings.settings.inbound_email_webhook_secret", "hook-secret", raising=False
    )
    return "hook-secret"


def _thread_row(status="active"):
    return SimpleNamespace(
        id=12,
        counselor_id=5,
        student_id=42,
        status=status,
        last_message_at=None,
        student_read_at=None,
    )


@pytest.mark.asyncio
async def test_inbound_requires_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.domains.mental_health.routes.email_inbound import receive_inbound_email

    monkeypatch.setattr(
        "app.core.settings.settings.inbound_email_webhook_secret", "", raising=False
    )
    with pytest.raises(HTTPException) as exc:
        await receive_inbound_email(
            payload=SimpleNamespace(from_email="s@x.co", to_email="reply+12.abc@x.co", text="hi"),
            request=SimpleNamespace(),
            db=_FakeDB(),
            x_inbound_secret="anything",
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_inbound_rejects_bad_secret(inbound_secret) -> None:
    from app.domains.mental_health.routes.email_inbound import receive_inbound_email

    with pytest.raises(HTTPException) as exc:
        await receive_inbound_email(
            payload=SimpleNamespace(from_email="s@x.co", to_email="x@x.co", text="hi"),
            request=SimpleNamespace(),
            db=_FakeDB(),
            x_inbound_secret="wrong",
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_inbound_rejects_unrecognized_address(inbound_secret) -> None:
    from app.domains.mental_health.routes.email_inbound import receive_inbound_email

    with pytest.raises(HTTPException) as exc:
        await receive_inbound_email(
            payload=SimpleNamespace(from_email="s@x.co", to_email="budi@ugm.ac.id", text="hi"),
            request=SimpleNamespace(),
            db=_FakeDB(),
            x_inbound_secret=inbound_secret,
        )
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_inbound_stores_reply_and_broadcasts(
    inbound_secret, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.domains.mental_health.routes import email_inbound
    from app.domains.mental_health.routes.email_inbound import receive_inbound_email

    broadcasts: list[tuple] = []

    class _Broadcaster:
        async def broadcast(self, event_type, data, user_id=None):
            broadcasts.append((event_type, data, user_id))
            return 1

    monkeypatch.setattr(
        "app.services.sse_broadcaster.get_broadcaster", lambda: _Broadcaster()
    )

    db = _FakeDB(
        execute_results=[
            _FakeResult(scalar_one_or_none=_thread_row()),  # thread lookup
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=42)),  # student lookup
            _FakeResult(scalar_one_or_none=SimpleNamespace(id=5, user_id=7)),  # counselor
        ]
    )
    address = reply_address_for_thread(12)
    result = await receive_inbound_email(
        payload=SimpleNamespace(
            from_email="budi@ugm.ac.id", to_email=address, text="Terima kasih, dok."
        ),
        request=SimpleNamespace(),
        db=db,
        x_inbound_secret=inbound_secret,
    )

    assert result == {"ok": True, "thread_id": 12, "crisis_flagged": False}
    assert len(db.added) == 2  # PeerMessage + updated thread
    message = db.added[0]
    assert message.thread_type == "counseling"
    assert message.thread_id == 12
    assert message.sender_id == 42
    assert db.committed
    assert broadcasts and broadcasts[0][0] == "peer_message"
    assert broadcasts[0][1]["via_email"] is True
    assert broadcasts[0][2] == 7  # counselor user id


@pytest.mark.asyncio
async def test_inbound_closed_thread_404(inbound_secret) -> None:
    from app.domains.mental_health.routes.email_inbound import receive_inbound_email

    db = _FakeDB(execute_results=[_FakeResult(scalar_one_or_none=_thread_row(status="closed"))])
    with pytest.raises(HTTPException) as exc:
        await receive_inbound_email(
            payload=SimpleNamespace(
                from_email="s@x.co", to_email=reply_address_for_thread(12), text="hi"
            ),
            request=SimpleNamespace(),
            db=db,
            x_inbound_secret=inbound_secret,
        )
    assert exc.value.status_code == 404
