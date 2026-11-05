"""Shared role normalization utilities.

The system has five canonical roles:

    admin           full administrative access (read + write on all admin routes)
    counselor       elevated access for counselors (case management, clinical views)
    user            any authenticated app user (students, lecturers, staff)
    admin_viewer    read-only admin access for demo and auditors
    peer_supporter  trained student volunteer; counselor portal scoped to their
                    own caseload, mild/moderate case assignments, supervised

Legacy aliases that may still exist in the database or arrive from older
frontend builds are silently resolved to their canonical equivalents:

    "therapist"                          → counselor  (renamed, no longer distinct)
    "student"                            → user       (renamed; lecturers also use the app)
    "administrator" / "superadmin" /
    "super-admin"                        → admin

All functions here are pure — no side effects, no I/O — and safe to call on
every authenticated request.

Usage:
    from app.core.role_utils import normalize_role, ALLOWED_ADMIN_ROLES, ALLOWED_PRIVILEGED_ROLES
"""
from __future__ import annotations

from typing import Optional

# ── Canonical role constants ───────────────────────────────────────────────────
ROLE_ADMIN = "admin"
ROLE_COUNSELOR = "counselor"
ROLE_USER = "user"  # Any authenticated app user — students, lecturers, staff
ROLE_ADMIN_VIEWER = "admin_viewer"
# Trained student volunteer providing supervised peer support. Sits between
# user and counselor: gets the counselor portal scoped to their own caseload,
# case-read AI tools, and mild/moderate case assignments — never high/critical.
ROLE_PEER_SUPPORTER = "peer_supporter"

# Backward-compat alias — code that imported ROLE_STUDENT still works.
ROLE_STUDENT = ROLE_USER

# Full set of canonical roles (guest is legacy-OAuth only, kept for compat).
CANONICAL_ROLES: frozenset[str] = frozenset(
    {ROLE_ADMIN, ROLE_COUNSELOR, ROLE_USER, ROLE_ADMIN_VIEWER, ROLE_PEER_SUPPORTER}
)

# Roles permitted to access admin-protected routes.
# NOTE: peer_supporter deliberately absent — the admin console exposes
# cross-user data (PII browser, campaigns) that supporters must not reach.
ALLOWED_ADMIN_ROLES: frozenset[str] = frozenset(
    {ROLE_ADMIN, ROLE_COUNSELOR, ROLE_ADMIN_VIEWER}
)

# Roles that receive privileged tool access (without full admin panel access).
# peer_supporter included: their Aika gets case-read tools for their caseload.
ALLOWED_PRIVILEGED_ROLES: frozenset[str] = frozenset(
    {ROLE_ADMIN, ROLE_COUNSELOR, ROLE_PEER_SUPPORTER}
)

# ── Internal alias map (module-private) ───────────────────────────────────────
_ALIAS_MAP: dict[str, str] = {
    # user aliases
    "student": ROLE_USER,   # legacy name — renamed because lecturers also use the app
    # counselor aliases
    "therapist": ROLE_COUNSELOR,   # legacy name — now a counselor
    # admin aliases
    "administrator": ROLE_ADMIN,
    "superadmin": ROLE_ADMIN,
    "super-admin": ROLE_ADMIN,
    # admin_viewer is canonical, no alias needed
}


# ── Public API ─────────────────────────────────────────────────────────────────

def normalize_role(user_role: Optional[str]) -> str:
    """Map any role label (including legacy aliases) to its canonical form.

    Returns 'user' as the fallback when the role is absent or unrecognised.
    This is a pure function — safe to call on every authenticated request.

    >>> normalize_role("therapist")
    'counselor'
    >>> normalize_role("administrator")
    'admin'
    >>> normalize_role("student")
    'user'
    >>> normalize_role(None)
    'user'
    """
    role = (user_role or "").strip().lower()
    if not role:
        return ROLE_USER
    if role in CANONICAL_ROLES:
        return role
    return _ALIAS_MAP.get(role, ROLE_USER)


# Backward-compatible alias used by agent/tool routing code.
normalize_agent_role = normalize_role
