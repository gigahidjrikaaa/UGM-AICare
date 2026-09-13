"""SLA helpers for Case Management.

The breach scan itself lives in ``app/core/scheduler.py::check_sla_breaches``
(a distributed-locked APScheduler interval job): it finds open cases whose
``sla_breach_at`` has passed and publishes ``EventType.SLA_BREACH``, which
``event_sse_bridge.handle_sla_breach_event`` turns into an admin SSE
broadcast plus a counselor-scoped Alert + push. This module keeps the
deadline formula used by the writers (cma_graph, agent_orchestrator,
autopilot_worker).
"""
from __future__ import annotations

from datetime import datetime, timedelta


def compute_sla_deadline(started_at: datetime, minutes: int) -> datetime:
    """Compute the SLA breach deadline for a case."""
    return started_at + timedelta(minutes=minutes)
