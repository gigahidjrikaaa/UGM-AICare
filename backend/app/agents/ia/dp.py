"""Differential privacy engine for the Insights Agent (IA).

Implements pure epsilon-differential privacy (eps-DP) via the Laplace
mechanism (Dwork & Roth, "The Algorithmic Foundations of Differential
Privacy", §3.3) over the per-group rows returned by the allow-listed
aggregate queries in ``app.agents.ia.queries``.

Privacy model
-------------
Event-level (record-level) DP: one database row (one conversation, case,
assessment, ...) is the unit of privacy. This composes cleanly with the
existing k-anonymity groups (k >= 5) which protect against small-group
re-identification; DP additionally bounds what any released number reveals
about any single record.

Sensitivity analysis (per released statistic)
---------------------------------------------
- ``COUNT`` / ``COUNT(DISTINCT)``: L1 sensitivity 1 (adding or removing one
  record changes the value by at most 1).
- ``SUM`` of values clamped to ``[0, U]``: L1 sensitivity U.
- ``AVG``: never released directly. Released as
  ``noisy_sum / noisy_count`` where ``true_sum`` is approximated as
  ``clamp(avg * n, 0, U * n)``. Sensitivity of the clamped sum is U.
- Ratios / percentages / differences of already-noised columns: derived by
  deterministic post-processing of DP outputs, so they cost no additional
  budget (post-processing theorem).

Composition
-----------
- *Parallel composition* across groups: each query groups rows by date or
  hour/day bucket, so any single record contributes to exactly one output
  row. The per-group releases therefore cost only the max group epsilon,
  not the sum.
- *Basic composition* within a group: a query releases ``d`` noisy
  statistics per group, each at ``eps_query / d``; the group cost sums to
  exactly ``eps_query``.
- *Sequential composition* across query executions is enforced by
  :class:`app.agents.ia.dp_accountant.DPBudgetAccountant`.

Everything downstream of :meth:`DifferentialPrivacyEngine.privatize_rows`
(chart series, notes, totals computed by the formatters, LLM
interpretation, PDF export) is a deterministic function of noised values
and is therefore covered by the same eps guarantee.
"""
from __future__ import annotations

import logging
import math
import random
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Any, Callable, Sequence

logger = logging.getLogger(__name__)


class ColumnStrategy(str, Enum):
    """How a numeric column in a query result row is privatized."""

    #: Group key or label (date, severity, topic, hour, ...). Released as-is.
    PASSTHROUGH = "passthrough"
    #: COUNT / COUNT(DISTINCT): sensitivity 1, Laplace noise, clamp >= 0.
    COUNT = "count"
    #: AVG over a group: released as noisy_sum / noisy_count where the raw
    #: mean is rescaled by the (noised) group cardinality column.
    BOUNDED_MEAN = "bounded_mean"
    #: Deterministic function of other (already-noised) columns. Post-
    #: processing of DP outputs: no extra budget, keeps rows self-consistent.
    DERIVED = "derived"


@dataclass(frozen=True)
class ColumnPlan:
    """Privatization plan for a single column (by positional index)."""

    index: int
    name: str
    strategy: ColumnStrategy
    # BOUNDED_MEAN only: upper clamp bound U for a single record's value.
    upper_bound: float = 0.0
    # BOUNDED_MEAN only: index of the column holding the group cardinality
    # (the COUNT the mean is taken over). Must be a COUNT column, i.e. an
    # index that appears earlier in the same plan.
    cardinality_index: int = -1
    # DERIVED only: callable receiving the list of already-privatized values.
    derive: Callable[[list[Any]], Any] | None = None


@dataclass(frozen=True)
class QueryDPPlan:
    """Privatization plan for one allow-listed query."""

    question_id: str
    columns: tuple[ColumnPlan, ...]

    @property
    def noise_draws_per_row(self) -> int:
        """Number of Laplace draws per row (count + bounded-mean sum + count).

        Used to split the query's epsilon across statistics via basic
        composition within a group.
        """
        draws = 0
        for col in self.columns:
            if col.strategy == ColumnStrategy.COUNT:
                draws += 1
            elif col.strategy == ColumnStrategy.BOUNDED_MEAN:
                draws += 2  # one for the clamped sum, one for the count
        return draws


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _ratio_percent(numerator: float, denominator: float) -> float:
    """Percentage of two noised counts, clamped to [0, 100] and rounded 2dp."""
    if denominator <= 0:
        return 0.0
    return round(_clamp(numerator / denominator * 100.0, 0.0, 100.0), 2)


# ---------------------------------------------------------------------------
# Per-query plans. Column indices MUST match the SELECT order in
# app.agents.ia.queries.ALLOWED_QUERIES. Any change to a query's SELECT
# list requires updating its plan here — privatize_rows() validates
# row width and fails closed on mismatch.
# ---------------------------------------------------------------------------
QUERY_DP_PLANS: dict[str, QueryDPPlan] = {
    # date, crisis_count, severity, unique_users_affected
    "crisis_trend": QueryDPPlan(
        "crisis_trend",
        (
            ColumnPlan(0, "date", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(1, "crisis_count", ColumnStrategy.COUNT),
            ColumnPlan(2, "severity", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(3, "unique_users_affected", ColumnStrategy.COUNT),
        ),
    ),
    # date, total_sessions, early_dropoffs, dropoff_percentage, avg_messages_per_conversation
    "dropoffs": QueryDPPlan(
        "dropoffs",
        (
            ColumnPlan(0, "date", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(1, "total_sessions", ColumnStrategy.COUNT),
            ColumnPlan(2, "early_dropoffs", ColumnStrategy.COUNT),
            ColumnPlan(
                3,
                "dropoff_percentage",
                ColumnStrategy.DERIVED,
                derive=lambda v: _ratio_percent(v[2], v[1]),
            ),
            # AVG over conversations in the group; messages per conversation
            # clamped to [0, 500] (matches the 500/day chat rate limit).
            ColumnPlan(
                4,
                "avg_messages_per_conversation",
                ColumnStrategy.BOUNDED_MEAN,
                upper_bound=500.0,
                cardinality_index=1,
            ),
        ),
    ),
    # date, total_plans_created, unique_users, plans_revisited, revisit_rate, avg_completion_percentage
    "resource_reuse": QueryDPPlan(
        "resource_reuse",
        (
            ColumnPlan(0, "date", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(1, "total_plans_created", ColumnStrategy.COUNT),
            ColumnPlan(2, "unique_users", ColumnStrategy.COUNT),
            ColumnPlan(3, "plans_revisited", ColumnStrategy.COUNT),
            ColumnPlan(
                4,
                "revisit_rate",
                ColumnStrategy.DERIVED,
                derive=lambda v: _ratio_percent(v[3], v[1]),
            ),
            # Completion percentage per plan is naturally in [0, 100].
            ColumnPlan(
                5,
                "avg_completion_percentage",
                ColumnStrategy.BOUNDED_MEAN,
                upper_bound=100.0,
                cardinality_index=1,
            ),
        ),
    ),
    # date, total_conversations, escalated_to_human, handled_by_ai, ai_resolution_rate
    "fallback_reduction": QueryDPPlan(
        "fallback_reduction",
        (
            ColumnPlan(0, "date", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(1, "total_conversations", ColumnStrategy.COUNT),
            ColumnPlan(2, "escalated_to_human", ColumnStrategy.COUNT),
            ColumnPlan(
                3,
                "handled_by_ai",
                ColumnStrategy.DERIVED,
                derive=lambda v: max(0, round(v[1] - v[2])),
            ),
            ColumnPlan(
                4,
                "ai_resolution_rate",
                ColumnStrategy.DERIVED,
                derive=lambda v: _ratio_percent(max(0, v[1] - v[2]), v[1]),
            ),
        ),
    ),
    # date, total_assessments, avg_processing_time_ms, successful_interventions, success_rate_percentage
    "cost_per_helpful": QueryDPPlan(
        "cost_per_helpful",
        (
            ColumnPlan(0, "date", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(1, "total_assessments", ColumnStrategy.COUNT),
            # Processing time clamped to [0, 60000] ms per assessment.
            ColumnPlan(
                2,
                "avg_processing_time_ms",
                ColumnStrategy.BOUNDED_MEAN,
                upper_bound=60000.0,
                cardinality_index=1,
            ),
            ColumnPlan(3, "successful_interventions", ColumnStrategy.COUNT),
            ColumnPlan(
                4,
                "success_rate_percentage",
                ColumnStrategy.DERIVED,
                derive=lambda v: _ratio_percent(v[3], v[1]),
            ),
        ),
    ),
    # hour_of_day, day_of_week, conversation_count, unique_users, avg_messages_per_conversation, high_risk_conversations
    "coverage_windows": QueryDPPlan(
        "coverage_windows",
        (
            ColumnPlan(0, "hour_of_day", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(1, "day_of_week", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(2, "conversation_count", ColumnStrategy.COUNT),
            ColumnPlan(3, "unique_users", ColumnStrategy.COUNT),
            ColumnPlan(
                4,
                "avg_messages_per_conversation",
                ColumnStrategy.BOUNDED_MEAN,
                upper_bound=500.0,
                cardinality_index=2,
            ),
            ColumnPlan(5, "high_risk_conversations", ColumnStrategy.COUNT),
        ),
    ),
    # topic, frequency, unique_users
    "topic_analysis": QueryDPPlan(
        "topic_analysis",
        (
            ColumnPlan(0, "topic", ColumnStrategy.PASSTHROUGH),
            ColumnPlan(1, "frequency", ColumnStrategy.COUNT),
            ColumnPlan(2, "unique_users", ColumnStrategy.COUNT),
        ),
    ),
    # date, avg_risk_score, low_risk_count, med_risk_count, high_risk_count, critical_risk_count, total_assessments
    "sentiment_trends": QueryDPPlan(
        "sentiment_trends",
        (
            ColumnPlan(0, "date", ColumnStrategy.PASSTHROUGH),
            # risk_score is bounded [0, 1]; AVG is over all assessments in
            # the group (the total_assessments COUNT column).
            ColumnPlan(
                1,
                "avg_risk_score",
                ColumnStrategy.BOUNDED_MEAN,
                upper_bound=1.0,
                cardinality_index=6,
            ),
            ColumnPlan(2, "low_risk_count", ColumnStrategy.COUNT),
            ColumnPlan(3, "med_risk_count", ColumnStrategy.COUNT),
            ColumnPlan(4, "high_risk_count", ColumnStrategy.COUNT),
            ColumnPlan(5, "critical_risk_count", ColumnStrategy.COUNT),
            ColumnPlan(6, "total_assessments", ColumnStrategy.COUNT),
        ),
    ),
    # date, avg_latency_seconds, sample_size
    "intervention_latency": QueryDPPlan(
        "intervention_latency",
        (
            ColumnPlan(0, "date", ColumnStrategy.PASSTHROUGH),
            # Latency clamped to [0, 3600] s per assessment.
            ColumnPlan(
                1,
                "avg_latency_seconds",
                ColumnStrategy.BOUNDED_MEAN,
                upper_bound=3600.0,
                cardinality_index=2,
            ),
            ColumnPlan(2, "sample_size", ColumnStrategy.COUNT),
        ),
    ),
}


@dataclass
class DPResult:
    """Outcome of privatizing one query's rows."""

    rows: list[tuple]
    #: Total Laplace draws performed (rows * draws_per_row).
    statistics_noised: int = 0
    #: Epsilon actually allocated per group (basic composition within group).
    epsilon_per_group: float = 0.0
    #: Lower and upper clamp bounds applied, keyed by column name (audit).
    bounds_applied: dict[str, float] = field(default_factory=dict)


class DifferentialPrivacyEngine:
    """Adds calibrated Laplace noise to allow-listed query result rows."""

    def __init__(self, epsilon: float, rng: random.Random | None = None) -> None:
        if epsilon <= 0:
            raise ValueError("epsilon must be positive")
        self.epsilon = float(epsilon)
        self._rng = rng or random.Random()

    # ------------------------------------------------------------------
    # Laplace mechanism
    # ------------------------------------------------------------------
    def _laplace(self, scale: float) -> float:
        """Draw Laplace(0, scale) via inverse-CDF transform of Uniform(0,1)."""
        if scale <= 0:
            return 0.0
        u = 0.0
        while u == 0.0:  # random() may return exactly 0; resample
            u = self._rng.random()
        # u in (0, 1): shifted inverse CDF, |u - 0.5| < 0.5 strictly.
        shifted = u - 0.5
        return -scale * math.copysign(1.0, shifted) * math.log(1.0 - 2.0 * abs(shifted))

    # ------------------------------------------------------------------
    # Row privatization
    # ------------------------------------------------------------------
    def privatize_rows(self, question_id: str, rows: Sequence[Sequence[Any]]) -> DPResult:
        """Privatize all numeric columns of ``rows`` per the query's plan.

        Returns a :class:`DPResult` whose ``rows`` are plain tuples with the
        same positional layout, safe to pass to the existing formatters.

        Raises:
            ValueError: if the query has no plan (unknown question_id) or a
                row's width does not match the plan (fail-closed: a schema
                drift must never silently bypass privatization).
        """
        plan = QUERY_DP_PLANS.get(question_id)
        if plan is None:
            raise ValueError(f"No differential privacy plan for question_id: {question_id!r}")

        draws_per_row = plan.noise_draws_per_row
        if draws_per_row == 0:
            # Nothing numeric to release; pass rows through unchanged.
            return DPResult(rows=[tuple(row) for row in rows])

        # Basic composition within a group: split the query epsilon evenly
        # across all noisy statistics released per group.
        epsilon_per_stat = self.epsilon / draws_per_row

        noised_rows: list[tuple] = []
        statistics_noised = 0
        bounds: dict[str, float] = {}

        # Two passes per row: keys/counts first, then bounded means and
        # derived columns — the latter reference already-noised counts (a
        # plan's BOUNDED_MEAN cardinality and DERIVED inputs must therefore
        # be COUNT columns or earlier DERIVED columns).
        first_pass = (ColumnStrategy.PASSTHROUGH, ColumnStrategy.COUNT)
        second_pass = (ColumnStrategy.BOUNDED_MEAN, ColumnStrategy.DERIVED)

        for row in rows:
            if len(row) != len(plan.columns):
                raise ValueError(
                    f"Row width {len(row)} does not match DP plan width "
                    f"{len(plan.columns)} for {question_id!r}; refusing to release."
                )
            values: list[Any] = [None] * len(plan.columns)
            for strategies in (first_pass, second_pass):
                for col in plan.columns:
                    if col.strategy not in strategies:
                        continue
                    raw = row[col.index]
                    if col.strategy == ColumnStrategy.PASSTHROUGH:
                        values[col.index] = self._normalize_key(raw)
                    elif col.strategy == ColumnStrategy.COUNT:
                        values[col.index] = self._noisy_count(raw, epsilon_per_stat)
                        statistics_noised += 1
                    elif col.strategy == ColumnStrategy.BOUNDED_MEAN:
                        cardinality = values[col.cardinality_index]
                        values[col.index] = self._noisy_bounded_mean(
                            raw, cardinality, col.upper_bound, epsilon_per_stat
                        )
                        statistics_noised += 2
                        bounds[col.name] = col.upper_bound
                    elif col.strategy == ColumnStrategy.DERIVED:
                        assert col.derive is not None, col.name
                        values[col.index] = col.derive(values)
                    else:  # pragma: no cover - enum exhaustiveness
                        raise ValueError(f"Unknown column strategy: {col.strategy}")
            noised_rows.append(tuple(values))

        return DPResult(
            rows=noised_rows,
            statistics_noised=statistics_noised,
            epsilon_per_group=self.epsilon,
            bounds_applied=bounds,
        )

    # ------------------------------------------------------------------
    # Per-strategy noising helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _normalize_key(raw: Any) -> Any:
        """Normalize passthrough group keys (datetime/date -> ISO string).

        The service formatters already coerce these; normalizing here keeps
        downstream behavior identical whether or not DP ran.
        """
        if isinstance(raw, (datetime, date)):
            return raw.isoformat()
        return raw

    def _noisy_count(self, raw: Any, epsilon: float) -> int:
        """Laplace(1/epsilon) noise on a count, clamped >= 0 and rounded."""
        if raw is None:
            return 0
        value = float(raw)
        scale = 1.0 / epsilon
        return max(0, int(round(value + self._laplace(scale))))

    def _noisy_bounded_mean(
        self, raw: Any, cardinality: Any, upper_bound: float, epsilon: float
    ) -> float | None:
        """Release an average as noisy_sum / noisy_count.

        ``raw`` is the true per-group mean; the group sum is reconstructed as
        ``clamp(mean * n, 0, U * n)`` (sensitivity U at event level) and noised
        with Laplace(U/epsilon). The cardinality comes from an already-noised
        COUNT column, so the quotient is pure post-processing.
        """
        if raw is None:
            # SQL NULLIF(...) groups carry no information; pass through.
            return None
        n = float(cardinality) if cardinality else 0.0
        if n <= 0:
            return 0.0
        mean = _clamp(float(raw), 0.0, upper_bound)
        approx_sum = _clamp(mean * n, 0.0, upper_bound * n)
        scale = upper_bound / epsilon
        noisy_sum = max(0.0, approx_sum + self._laplace(scale))
        # Final clamp to [0, U] is post-processing of the DP quotient and
        # keeps released averages inside their semantic bounds.
        return round(_clamp(noisy_sum / n, 0.0, upper_bound), 4)


def build_engine(epsilon: float, seed: int | None = None) -> DifferentialPrivacyEngine:
    """Factory used by the service; injects a seed only for deterministic tests."""
    rng = random.Random(seed) if seed is not None else None
    return DifferentialPrivacyEngine(epsilon=epsilon, rng=rng)
