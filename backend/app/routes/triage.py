"""Compatibility shim for the legacy triage module.

The Safety Triage routes now live in :mod:`app.routes.safety_triage`. This module
re-exports the router to avoid breaking older imports while callers transition to
the new name.
"""

from app.routes.safety_triage import router  # noqa: F401  (re-export)

__all__ = ["router"]
