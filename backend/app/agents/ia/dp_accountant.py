"""Privacy-budget accountant for the Insights Agent (IA).

Enforces sequential composition across IA query executions: every
privatized query spends ``DP_EPSILON_PER_QUERY`` against a rolling
``DP_BUDGET_WINDOW_HOURS`` budget of ``DP_BUDGET_LIMIT``. When the budget
is exhausted, further queries fail closed (raise) until the window rolls
over — releasing a noised result would otherwise erode the guarantee that
the reported epsilon covers.

Storage is Redis (via the shared ``get_redis_client`` fallback to an
in-process :class:`~app.core.memory.MockRedis` when Redis is not
configured), using one key per window: ``dp:budget:{window_start_iso}``
with a TTL slightly exceeding the window so stale windows self-expire.

Note: increments use get/set rather than transactions, so concurrent
executions racing on the same window can under-count by at most the
epsilon of the racing requests. Single-process deployments and the
typical admin/analytics cadence make this immaterial in practice; the
per-process fallback is already process-local by design.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from app.core.memory import get_redis_client
from app.core.policy import PolicyViolation

logger = logging.getLogger(__name__)

_BUDGET_KEY_PREFIX = "dp:budget:"
_TTL_SLACK_SECONDS = 3600  # keep window keys alive past the window for auditing


class DPBudgetExceeded(PolicyViolation):
    """Raised when a query would spend more epsilon than the window allows."""


class DPBudgetAccountant:
    """Tracks epsilon spend for IA queries over a rolling window."""

    def __init__(
        self,
        client: Any | None = None,
        budget_limit: float | None = None,
        window_hours: int | None = None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        # Import here so tests can monkeypatch settings without import-order
        # coupling, mirroring how other services read runtime configuration.
        from app.core.settings import settings

        self._client = client
        self._budget_limit = (
            float(budget_limit) if budget_limit is not None else float(settings.dp_budget_limit)
        )
        self._window_hours = (
            int(window_hours) if window_hours is not None else int(settings.dp_budget_window_hours)
        )
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    async def check_and_reserve(
        self,
        question_id: str,
        epsilon: float,
        requested_by: str | None = None,
    ) -> float:
        """Reserve ``epsilon`` for one query execution.

        Returns:
            The remaining budget in the current window after the reserve.

        Raises:
            DPBudgetExceeded: if reserving would exceed the window budget.
            PolicyViolation: if the backing store fails (fail-closed).
        """
        if epsilon <= 0:
            raise ValueError("epsilon must be positive")

        window_start = self._window_start()
        key = f"{_BUDGET_KEY_PREFIX}{window_start.strftime('%Y%m%dT%H%M%S')}"

        client = await self._get_client()
        spent = await self._read_spend(client, key)
        if spent + epsilon > self._budget_limit:
            logger.warning(
                "IA DP budget exhausted: question_id=%s, window_start=%s, "
                "spent=%.2f, requested=%.2f, limit=%.2f",
                question_id,
                window_start.isoformat(),
                spent,
                epsilon,
                self._budget_limit,
            )
            self._record_exhausted()
            raise DPBudgetExceeded(
                "Differential privacy budget exhausted for the current "
                f"{self._window_hours}h window; try again after "
                f"{self._window_end(window_start).isoformat()}"
            )

        try:
            new_total = spent + epsilon
            await client.set(key, repr(new_total), ex=self._window_ttl_seconds())
        except Exception as exc:  # pragma: no cover - depends on backend
            # Fail closed: never release data when the budget cannot be
            # accounted for.
            raise PolicyViolation(
                f"DP budget accounting unavailable; query refused: {exc}"
            ) from exc

        remaining = max(0.0, self._budget_limit - new_total)
        logger.info(
            "IA DP spend reserved: question_id=%s, requested_by=%s, epsilon=%.2f, "
            "window_total=%.2f, remaining=%.2f",
            question_id,
            requested_by or "anonymous",
            epsilon,
            new_total,
            remaining,
        )
        self._record_metric(question_id, epsilon)
        return remaining

    async def current_spend(self) -> float:
        """Spend recorded in the current window (for observability/tests)."""
        key = f"{_BUDGET_KEY_PREFIX}{self._window_start().strftime('%Y%m%dT%H%M%S')}"
        client = await self._get_client()
        return await self._read_spend(client, key)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    def _window_start(self) -> datetime:
        now = self._clock()
        if now.tzinfo is None:
            # Defensive: treat naive clock values as UTC rather than crashing.
            now = now.replace(tzinfo=timezone.utc)
        window = timedelta(hours=self._window_hours)
        epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
        windows_since_epoch = int((now - epoch) // window)
        return epoch + windows_since_epoch * window

    def _window_end(self, window_start: datetime) -> datetime:
        return window_start + timedelta(hours=self._window_hours)

    def _window_ttl_seconds(self) -> int:
        return self._window_hours * 3600 + _TTL_SLACK_SECONDS

    async def _get_client(self) -> Any:
        if self._client is None:
            self._client = await get_redis_client()
        return self._client

    @staticmethod
    async def _read_spend(client: Any, key: str) -> float:
        try:
            raw = await client.get(key)
        except Exception as exc:  # pragma: no cover - depends on backend
            raise PolicyViolation(
                f"DP budget accounting unavailable; query refused: {exc}"
            ) from exc
        if not raw:
            return 0.0
        try:
            return float(raw)
        except (TypeError, ValueError):
            logger.warning("Unparseable DP budget value for %s: %r; resetting", key, raw)
            return 0.0

    @staticmethod
    def _record_metric(question_id: str, epsilon: float) -> None:
        try:
            from app.core.metrics import ia_dp_epsilon_spent_total

            ia_dp_epsilon_spent_total.labels(question_id=question_id).inc(epsilon)
        except Exception:  # pragma: no cover - metrics must never break the flow
            logger.debug("Failed to record DP epsilon metric", exc_info=True)

    @staticmethod
    def _record_exhausted() -> None:
        try:
            from app.core.metrics import ia_dp_budget_exhausted_total

            ia_dp_budget_exhausted_total.inc()
        except Exception:  # pragma: no cover - metrics must never break the flow
            logger.debug("Failed to record DP budget exhaustion metric", exc_info=True)
