"""Google ID-token verification for the OAuth account exchange.

Closes the account-takeover hole in ``POST /auth/oauth/token``: the endpoint
used to trust a client-supplied ``provider_account_id`` (google_sub) and even
fell back to matching accounts by raw email. Identity decisions are now made
ONLY from a cryptographically verified Google ID token:

    claims = await verify_google_id_token(id_token)   # raises 401 on failure

Verification follows the same JWKS pattern as ``app/routes/link_ocid.py``
(RS256 via python-jose), plus the checks Google requires for this use case:
``aud`` must equal the backend's ``GOOGLE_CLIENT_ID``, ``iss`` must be a
Google accounts issuer, and ``exp`` must be in the future. The JWKS document
is cached for one hour to keep login latency low without trusting the token
itself.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwk, jwt

from app.core.settings import settings

logger = logging.getLogger(__name__)

_GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
_JWKS_CACHE_TTL_SECONDS = 3600

_jwks_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}


async def _fetch_google_jwks() -> dict[str, Any]:
    now = time.monotonic()
    if (
        _jwks_cache["data"] is not None
        and now - _jwks_cache["fetched_at"] < _JWKS_CACHE_TTL_SECONDS
    ):
        return _jwks_cache["data"]
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(_GOOGLE_JWKS_URL)
        response.raise_for_status()
        data = response.json()
    _jwks_cache["data"] = data
    _jwks_cache["fetched_at"] = now
    return data


async def verify_google_id_token(id_token: str) -> dict[str, Any]:
    """Verify a Google ID token and return its claims.

    Raises HTTPException 401 on any verification failure so sign-in attempts
    fail with a clear error instead of a stack trace.
    """
    client_id = settings.google_client_id
    if not client_id:
        logger.error("GOOGLE_CLIENT_ID is not configured; cannot verify Google sign-ins.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured on the server.",
        )

    try:
        jwks = await _fetch_google_jwks()
    except Exception as exc:
        logger.error("Failed to fetch Google JWKS: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Google's identity service. Please try again.",
        ) from exc

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed Google token."
        ) from exc

    kid = header.get("kid")
    matching_key = None
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            matching_key = key_data
            break
    if matching_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token was not signed by a known key.",
        )

    try:
        public_key = jwk.construct(matching_key)
        claims = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=client_id,
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {exc}",
        ) from exc

    if claims.get("iss") not in _GOOGLE_ISSUERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token has an unexpected issuer.",
        )
    if not claims.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email is not verified.",
        )
    return claims
