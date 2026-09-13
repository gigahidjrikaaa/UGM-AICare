"""Tests for the security-hardening pass: OAuth identity verification,
internal-API fail-closed, Google verifier claim checks, per-IP rate limits,
and end-session ownership."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.core.ip_rate_limiter import enforce_ip_rate_limit


# ============================================================================
# OAuth exchange — identity comes from a verified id_token
# ============================================================================
def _async_db():
    db = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    return db


@pytest.fixture()
def oauth_db():
    """DB mock whose `execute` returns no users by default."""
    db = _async_db()

    async def execute(*_args, **_kwargs):
        return SimpleNamespace(scalar_one_or_none=lambda: None)

    db.execute = execute
    return db


@pytest.mark.asyncio
async def test_oauth_rejects_missing_id_token_by_default(
    monkeypatch: pytest.MonkeyPatch, oauth_db
) -> None:
    from app.routes import auth as auth_module

    monkeypatch.setattr(auth_module.settings, "oauth_require_id_token", True)
    payload = SimpleNamespace(
        provider="google",
        provider_account_id="attacker-sub",
        id_token=None,
        email="victim@ugm.ac.id",
        name=None,
        picture=None,
        role=None,
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.exchange_oauth_token(
            payload=payload, response=MagicMock(), http_request=MagicMock(), db=oauth_db
        )
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_oauth_legacy_path_never_links_by_email(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Legacy migration path: an existing account with the same email must
    NOT be linked to a client-asserted google_sub (the old takeover vector)."""
    from app.routes import auth as auth_module

    monkeypatch.setattr(auth_module.settings, "oauth_require_id_token", False)

    victim = SimpleNamespace(
        id=1,
        google_sub=None,  # password-only account: the old hijack target
        email="victim@ugm.ac.id",
        name="Victim",
        is_active=True,
        email_verified=True,
        last_login=None,
        role="admin",
    )
    looked_up: list[str] = []

    class FakeResult:
        def __init__(self, value):
            self._value = value

        def scalar_one_or_none(self):
            return self._value

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        if "google_sub" in compiled:
            looked_up.append("sub")
            return FakeResult(None)  # no account with the attacker's sub
        if "email" in compiled:
            looked_up.append("email")
            return FakeResult(victim)
        return FakeResult(None)

    db = _async_db()
    db.execute = execute

    payload = SimpleNamespace(
        provider="google",
        provider_account_id="attacker-sub",
        id_token=None,
        email="victim@ugm.ac.id",
        name="Attacker",
        picture=None,
        role=None,
    )

    result = await auth_module.exchange_oauth_token(
        payload=payload, response=MagicMock(), http_request=MagicMock(), db=db
    )

    # The victim row was NOT adopted: its google_sub stays unset and its
    # role stays admin — the attacker got a fresh low-privilege account.
    assert result["user"]["role"] in {"guest", "user"}  # fresh account, not victim's 'admin'
    assert victim.google_sub is None  # never linked
    assert victim.role == "admin"  # never mutated
    assert "email" not in str(victim.google_sub)


@pytest.mark.asyncio
async def test_oauth_rejects_linking_when_already_bound_to_other_sub(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verified-token flow: an email match bound to a DIFFERENT google_sub
    must be rejected instead of silently re-bound."""
    from app.routes import auth as auth_module

    # Bypass real JWKS: verified claims come back from a stub verifier.
    async def fake_verify(id_token):
        return {
            "sub": "attacker-sub",
            "email": "victim@ugm.ac.id",
            "email_verified": True,
            "name": "Attacker",
        }

    monkeypatch.setattr(
        "app.core.google_auth.verify_google_id_token", fake_verify
    )

    victim = SimpleNamespace(
        id=1,
        google_sub="victim-real-sub",
        email="victim@ugm.ac.id",
        name="Victim",
        is_active=True,
        email_verified=True,
        last_login=None,
        role="admin",
    )

    class FakeResult:
        def __init__(self, value):
            self._value = value

        def scalar_one_or_none(self):
            return self._value

    async def execute(stmt, *_a, **_k):
        compiled = str(stmt)
        # Route by bind param (the SELECT column list always contains
        # users.google_sub, so match on the WHERE bind instead).
        if ":google_sub_1" in compiled:
            return FakeResult(None)  # no account with the attacker's sub
        if ":email_1" in compiled:
            return FakeResult(victim)
        return FakeResult(None)

    db = _async_db()
    db.execute = execute
    db.add = MagicMock()
    db.rollback = AsyncMock()

    payload = SimpleNamespace(
        provider="google",
        provider_account_id=None,
        id_token="fake-but-stubbed",
        email=None,
        name=None,
        picture=None,
        role=None,
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.exchange_oauth_token(
            payload=payload, response=MagicMock(), http_request=MagicMock(), db=db
        )
    assert exc_info.value.status_code == 403
    assert victim.google_sub == "victim-real-sub"  # untouched


# ============================================================================
# Google verifier — claim checks without network
# ============================================================================
@pytest.mark.asyncio
async def test_verifier_fails_closed_without_client_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import google_auth

    monkeypatch.setattr(google_auth.settings, "google_client_id", None)
    with pytest.raises(HTTPException) as exc_info:
        await google_auth.verify_google_id_token("any")
    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_verifier_rejects_malformed_token(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core import google_auth

    monkeypatch.setattr(google_auth.settings, "google_client_id", "client-id")
    monkeypatch.setattr(
        google_auth,
        "_fetch_google_jwks",
        _AsyncReturn({"keys": [{"kid": "k1", "kty": "RSA", "n": "x", "e": "AQAB"}]}),
    )
    with pytest.raises(HTTPException) as exc_info:
        await google_auth.verify_google_id_token("not-a-jwt")
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_verifier_rejects_unknown_key(monkeypatch: pytest.MonkeyPatch) -> None:
    import base64
    import json

    from app.core import google_auth

    monkeypatch.setattr(google_auth.settings, "google_client_id", "client-id")
    monkeypatch.setattr(
        google_auth,
        "_fetch_google_jwks",
        _AsyncReturn({"keys": [{"kid": "real-key", "kty": "RSA", "n": "x", "e": "AQAB"}]}),
    )

    def _b64(obj) -> str:
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()

    # get_unverified_header only parses part 1: a structurally valid token
    # whose kid is NOT in the JWKS must be rejected before signature checks.
    token = f"{_b64({'alg': 'RS256', 'kid': 'other', 'typ': 'JWT'})}.{_b64({'sub': 'x'})}.fakesig"
    with pytest.raises(HTTPException) as exc_info:
        await google_auth.verify_google_id_token(token)
    assert exc_info.value.status_code == 401


class _AsyncReturn:
    def __init__(self, value):
        self.value = value

    async def __call__(self, * _args, **_kwargs):
        return self.value


# ============================================================================
# Internal API — fail closed
# ============================================================================
@pytest.mark.asyncio
async def test_internal_api_fails_closed_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.routes import internal

    monkeypatch.setattr(internal, "INTERNAL_API_KEY", None)
    from fastapi import Security

    with pytest.raises(HTTPException) as exc_info:
        await internal.get_api_key(api_key=Security(internal.api_key_header) and None)
    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_internal_api_accepts_correct_key(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.routes import internal

    monkeypatch.setattr(internal, "INTERNAL_API_KEY", "secret")
    result = await internal.get_api_key(api_key="secret")
    assert result == "secret"


# ============================================================================
# Per-IP rate limiter
# ============================================================================
class FakeRedis:
    def __init__(self):
        self.data: dict[str, str] = {}

    async def get(self, key):
        return self.data.get(key)

    async def set(self, key, value, ex=None):
        self.data[key] = str(value)
        return True

    async def ttl(self, key):  # real client returns remaining ttl
        return 60


def _request_with_ip(ip="1.2.3.4"):
    request = MagicMock()
    request.headers = {"x-forwarded-for": f"{ip}, 10.0.0.1"}
    request.client = SimpleNamespace(host="127.0.0.1")
    return request


@pytest.mark.asyncio
async def test_ip_limiter_blocks_after_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core import ip_rate_limiter as module

    fake = FakeRedis()
    monkeypatch.setattr(module, "get_redis_client", _AsyncReturn(fake))

    request = _request_with_ip()
    for _ in range(3):
        await module.enforce_ip_rate_limit(request, bucket="login:m", limit=3, window_seconds=60)
    with pytest.raises(HTTPException) as exc_info:
        await module.enforce_ip_rate_limit(request, bucket="login:m", limit=3, window_seconds=60)
    assert exc_info.value.status_code == 429
    assert "Retry-After" in (exc_info.value.headers or {})


@pytest.mark.asyncio
async def test_ip_limiter_is_per_ip(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core import ip_rate_limiter as module

    fake = FakeRedis()
    monkeypatch.setattr(module, "get_redis_client", _AsyncReturn(fake))

    for _ in range(3):
        await enforce_ip_rate_limit(_request_with_ip("9.9.9.9"), bucket="login:m", limit=3, window_seconds=60)
    # A different IP is unaffected.
    await enforce_ip_rate_limit(_request_with_ip("8.8.8.8"), bucket="login:m", limit=3, window_seconds=60)


@pytest.mark.asyncio
async def test_ip_limiter_fails_open_on_store_error(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core import ip_rate_limiter as module

    async def broken():
        raise RuntimeError("redis down")

    monkeypatch.setattr(module, "get_redis_client", broken)
    # Must not raise.
    await enforce_ip_rate_limit(_request_with_ip(), bucket="login:m", limit=1, window_seconds=60)


# ============================================================================
# End-session ownership
# ============================================================================
@pytest.mark.asyncio
async def test_end_session_rejects_non_owner(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.domains.mental_health.routes import session_events as se

    conversation = SimpleNamespace(user_id=999)  # session belongs to someone else

    class FakeResult:
        def first(self):
            return conversation

    async def execute(*_a, **_k):
        return FakeResult()

    db = MagicMock()
    db.execute = execute

    with pytest.raises(HTTPException) as exc_info:
        await se.end_chat_session(
            request=se.SessionEndRequest(session_id="s1"),
            background_tasks=MagicMock(),
            db=db,
            current_user=SimpleNamespace(id=7),
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_end_session_schedules_summarization_for_owner() -> None:
    from app.domains.mental_health.routes import session_events as se

    conversation = SimpleNamespace(user_id=7)

    class FakeResult:
        def first(self):
            return conversation

    async def execute(*_a, **_k):
        return FakeResult()

    db = MagicMock()
    db.execute = execute
    bg = MagicMock()

    result = await se.end_chat_session(
        request=se.SessionEndRequest(session_id="s1"),
        background_tasks=bg,
        db=db,
        current_user=SimpleNamespace(id=7),
    )
    assert "acknowledged" in result["message"]
    bg.add_task.assert_called_once()
