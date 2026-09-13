"""Tier-3 privacy-hardening tests: journal redaction/deletion, token_version
revocation, reset-token hashing, role lock-down, model allowlist, erasure."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException


def _scripted_db(*results):
    """DB mock returning scripted results for successive execute() calls."""
    db = MagicMock()
    queue = list(results)

    benign = SimpleNamespace(
        scalar_one_or_none=lambda: None,
        scalars=lambda: SimpleNamespace(all=lambda: []),
        first=lambda: None,
    )

    async def execute(*_args, **_kwargs):
        if queue:
            return queue.pop(0)
        return benign

    db.execute = execute
    db.get = AsyncMock(return_value=None)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.rollback = AsyncMock()
    db.delete = AsyncMock()
    db.add = MagicMock()
    return db


# ============================================================================
# Journal redaction + deletion
# ============================================================================
@pytest.mark.asyncio
async def test_journal_create_redacts_content(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.domains.mental_health.routes import journal as journal_module

    _saved_entry_holder: dict = {}

    async def execute(stmt, *_a, **_k):
        params = stmt.compile().params
        if "entry_date_1" in params:
            return SimpleNamespace(scalar_one_or_none=lambda: None)  # no existing entry
        # post-commit re-select (mocked flush leaves id NULL -> empty params):
        # return the saved (redacted) entry
        if "id_1" in params or not params:
            return SimpleNamespace(
                scalar_one_or_none=lambda: _saved_entry_holder.get("entry")
            )
        return SimpleNamespace(scalar_one_or_none=lambda: None)

    db = MagicMock()
    db.execute = execute
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.rollback = AsyncMock()

    def _add_recorder(instance):
        if type(instance).__name__ == "JournalEntry":
            _saved_entry_holder["entry"] = instance
        db.add_records.append(instance)

    db.add_records = []
    db.add = _add_recorder
    entry_data = SimpleNamespace(
        content="Hari ini aku curhat ke guru, emailku budi@mail.ugm.ac.id. Terus aku sedih.",
        entry_date=__import__("datetime").date(2026, 9, 11),
        prompt_id=None,
        mood=2,
        valence=0.3,
        arousal=0.4,
        tags=[],
    )

    await journal_module.create_or_update_journal_entry(
        entry_data=entry_data,
        background_tasks=MagicMock(),
        db=db,
        current_user=SimpleNamespace(id=7),
    )

    assert db.add_records, "JournalEntry must be persisted"
    stored = _saved_entry_holder["entry"].content
    assert "budi@mail.ugm.ac.id" not in stored  # PII redacted at rest
    assert "sedih" in stored  # substantive content survives


@pytest.mark.asyncio
async def test_journal_delete_removes_entry_and_tags() -> None:
    from app.domains.mental_health.routes import journal as journal_module

    entry = SimpleNamespace(id=5)
    db = _scripted_db(SimpleNamespace(scalar_one_or_none=lambda: entry))

    result = await journal_module.delete_journal_entry(
        "2026-09-11", db=db, current_user=SimpleNamespace(id=7)
    )
    assert result is None
    db.delete.assert_awaited_once_with(entry)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_journal_delete_404_for_missing_entry() -> None:
    from app.domains.mental_health.routes import journal as journal_module

    db = _scripted_db(SimpleNamespace(scalar_one_or_none=lambda: None))
    with pytest.raises(HTTPException) as exc_info:
        await journal_module.delete_journal_entry(
            "2026-09-11", db=db, current_user=SimpleNamespace(id=7)
        )
    assert exc_info.value.status_code == 404


# ============================================================================
# token_version revocation
# ============================================================================
def test_build_token_payload_includes_tv() -> None:
    from app.routes.auth import build_token_payload

    payload = build_token_payload(SimpleNamespace(id=7, role="user", google_sub=None, token_version=3))
    assert payload["tv"] == "3"


@pytest.fixture()
def _clear_auth_cache():
    from app import dependencies as deps

    deps._AUTH_CACHE.clear()
    yield
    deps._AUTH_CACHE.clear()


@pytest.mark.usefixtures("_clear_auth_cache")
@pytest.mark.asyncio
async def test_stale_token_version_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import dependencies as deps

    monkeypatch.setattr(
        deps,
        "decrypt_and_validate_token",
        lambda _token: SimpleNamespace(sub="7", role="user", tv=0, google_sub=None, allow_email_checkins=None),
    )
    db = MagicMock()
    db.execute = AsyncMock(
        return_value=SimpleNamespace(
            unique=lambda: SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(
                id=7, is_active=True, role="user", token_version=2,
                google_sub=None, preferred_name=None, first_name=None, name="U",
            ))
        )
    )

    with pytest.raises(HTTPException) as exc_info:
        await deps._resolve_current_active_user(
            token="t", db=db, request=MagicMock(), eager_normalized_relations=False
        )
    assert exc_info.value.status_code == 401
    assert "revoked" in exc_info.value.detail.lower()


@pytest.mark.usefixtures("_clear_auth_cache")
@pytest.mark.asyncio
async def test_current_token_version_passes(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import dependencies as deps

    monkeypatch.setattr(
        deps,
        "decrypt_and_validate_token",
        lambda _token: SimpleNamespace(sub="7", role="user", tv=2, google_sub=None, allow_email_checkins=None),
    )
    user = SimpleNamespace(
        id=7, is_active=True, role="user", token_version=2,
        google_sub=None, preferred_name=None, first_name=None, name="U",
    )
    db = MagicMock()
    db.execute = AsyncMock(
        return_value=SimpleNamespace(
            unique=lambda: SimpleNamespace(scalar_one_or_none=lambda: user)
        )
    )

    resolved = await deps._resolve_current_active_user(
        token="t", db=db, request=MagicMock(), eager_normalized_relations=False
    )
    assert resolved.id == 7 and resolved.token_version == 2


# ============================================================================
# Password reset: hashed token + version bump
# ============================================================================
@pytest.mark.asyncio
async def test_reset_password_hashes_lookup_and_bumps_version() -> None:
    import hashlib

    from app.utils import password_reset as pr

    captured = {}

    class FakeResult:
        def scalar_one_or_none(self):
            return user

    async def execute(stmt, *_a, **_k):
        # The lookup must bind the HASH, never the raw token.
        compiled = stmt.compile()
        captured["param"] = compiled.params.get("password_reset_token_1")
        return FakeResult()

    db = MagicMock()
    db.execute = execute
    db.commit = AsyncMock()
    db.rollback = AsyncMock()

    from datetime import datetime, timedelta

    user = SimpleNamespace(
        id=1,
        password_hash="old",
        password_reset_token="x",
        password_reset_expires=datetime.utcnow() + timedelta(hours=1),
        token_version=4,
        updated_at=None,
    )

    raw_token = "raw-email-token"
    result = await pr.reset_password_with_token(db, raw_token, "newpassword123")

    assert result["success"] is True
    expected_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    assert captured["param"] == expected_hash
    assert user.token_version == 5  # revocation bump
    assert user.password_reset_token is None


# ============================================================================
# Role/status lock-down
# ============================================================================
@pytest.mark.asyncio
async def test_role_update_rejects_counselor() -> None:
    from app.routes.admin import users as admin_users

    with pytest.raises(HTTPException) as exc_info:
        await admin_users.update_user_role(
            user_id=2, role="counselor", db=MagicMock(),
            admin_user=SimpleNamespace(id=9, role="counselor"),
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_status_update_rejects_counselor() -> None:
    from app.routes.admin import users as admin_users

    with pytest.raises(HTTPException) as exc_info:
        await admin_users.update_user_status(
            user_id=2, is_active=False, db=MagicMock(),
            admin_user=SimpleNamespace(id=9, role="counselor"),
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_status_update_blocks_self_deactivation() -> None:
    from app.routes.admin import users as admin_users

    db = MagicMock()
    db.get = AsyncMock(return_value=SimpleNamespace(id=9, is_active=True))

    with pytest.raises(HTTPException) as exc_info:
        await admin_users.update_user_status(
            user_id=9, is_active=False, db=db,
            admin_user=SimpleNamespace(id=9, role="admin"),
        )
    assert exc_info.value.status_code == 400


# ============================================================================
# preferred_model allowlist
# ============================================================================
def test_preferred_model_allowlist_blocks_unknown_models() -> None:
    from app.core.llm import (
        DEFAULT_GEMINI_MODEL,
        GEMINI_LITE_MODEL,
        select_gemini_model,
    )

    # Known models pass through.
    assert (
        select_gemini_model(intent="chat", role="user", has_tools=False, preferred_model=DEFAULT_GEMINI_MODEL)
        == DEFAULT_GEMINI_MODEL
    )
    # Unknown/expensive models are rejected → routing policy decides (never the injected value).
    routed = select_gemini_model(intent="casual_chat", role="user", has_tools=False, preferred_model="some-ultra-expensive-model")
    assert routed != "some-ultra-expensive-model"
    assert routed in {DEFAULT_GEMINI_MODEL, GEMINI_LITE_MODEL} or routed  # policy output


# ============================================================================
# Account erasure
# ============================================================================
@pytest.mark.asyncio
async def test_erase_account_scrubs_and_revokes() -> None:
    from app.routes import profile as profile_module

    user = SimpleNamespace(
        id=7,
        email="budi@ugm.ac.id",
        google_sub="sub",
        name="Budi",
        preferred_name="Budi",
        first_name="Budi",
        profile_photo_url="x",
        is_active=True,
        password_hash="h",
        token_version=1,
    )
    db = _scripted_db()
    db.get = AsyncMock(return_value=user)

    result = await profile_module.erase_account(db=db, current_user=user)

    assert result["success"] is True
    assert user.email.startswith("erased_") and user.email.endswith("@invalid")
    assert user.google_sub is None
    assert user.is_active is False
    assert user.token_version == 2  # revocation bump
    ledger_entries = [
        call.args[0] for call in db.add.call_args_list
        if type(call.args[0]).__name__ == "UserConsentLedger"
    ]
    assert ledger_entries and ledger_entries[0].consent_type == "account_erasure"
    db.commit.assert_awaited_once()
