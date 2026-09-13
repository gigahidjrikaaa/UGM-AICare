"""STA conversation-end analysis task.

``trigger_sta_conversation_analysis_background`` performs the LLM risk
analysis and persists the assessment + screening-profile updates. It runs
AFTER the user's response has been delivered and MUST NOT block the
real-time request path.

Execution model: the decision node enqueues this task as a durable
``AutopilotAction`` (``sta_conversation_analysis``); the autopilot worker
executes it in its own DB session with retry/backoff and dead-lettering.
It must never be launched via ``asyncio.create_task`` on a request-scoped
session — a crash or session close would silently drop a crisis analysis.

All failures are caught and logged; they never propagate to the caller.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import AikaOrchestratorState

logger = logging.getLogger(__name__)


async def trigger_sta_conversation_analysis_background(
    state: AikaOrchestratorState,
    db: AsyncSession,
) -> None:
    """Analyse a finished conversation and persist the risk assessment.

    Runs as a background task (fire-and-forget) so it never blocks the
    response that was already delivered to the user.  Also updates the
    screening profile using dimensions extracted by the STA model, replacing
    a separate TCA pass to avoid redundant LLM calls.

    Args:
        state: A *copy* of the orchestrator state at conversation end.
        db:    Database session for persistence.
    """
    if state.get("sta_analysis_completed", False):
        logger.debug("STA analysis already completed for this conversation — skipping.")
        return

    conversation_id = state.get("conversation_id")
    user_id = state.get("user_id")

    try:
        from app.agents.sta.conversation_analyzer import analyze_conversation_risk
        from app.domains.mental_health.models.assessments import ConversationRiskAssessment
        from app.domains.mental_health.services.conversation_assessments import (
            upsert_conversation_assessment,
        )

        # Skip if an assessment already exists (idempotency guard).
        force_refresh = bool(state.get("force_sta_reanalysis", False))
        if conversation_id and not force_refresh:
            existing = (
                await db.execute(
                    select(ConversationRiskAssessment).where(
                        ConversationRiskAssessment.conversation_id == conversation_id
                    )
                )
            ).scalars().first()
            if existing:
                logger.info(
                    "STA assessment already exists for conversation %s (id=%s) — skipping.",
                    conversation_id,
                    existing.id,
                )
                return

        logger.info(
            "[BACKGROUND] Starting STA analysis: conversation_id=%s, user_id=%s",
            conversation_id,
            user_id,
        )

        from app.core.llm import DEFAULT_GEMINI_MODEL as _DEFAULT_MODEL

        conversation_start = state.get("started_at")
        start_ts = conversation_start.timestamp() if conversation_start else time.time()

        assessment = await analyze_conversation_risk(
            conversation_history=state.get("conversation_history", []),
            current_message=state.get("message", ""),
            user_context=state.get("personal_context") or {},
            conversation_start_time=start_ts,
            preferred_model=state.get("preferred_model") or _DEFAULT_MODEL,
        )

        if conversation_id:
            record = await upsert_conversation_assessment(
                db,
                conversation_id=conversation_id,
                session_id=state.get("session_id"),
                user_id=user_id,
                assessment=assessment,
                force_refresh=force_refresh,
            )
            logger.info(
                "[BACKGROUND] Assessment stored: id=%s, session_id=%s",
                record.id,
                record.session_id,
            )
        else:
            await db.flush()

        logger.info(
            "[BACKGROUND] STA complete — conversation=%s, user=%s, "
            "risk=%s, trend=%s, cma_recommended=%s, duration=%.0fs",
            conversation_id,
            user_id,
            assessment.overall_risk_level,
            assessment.risk_trend,
            assessment.should_invoke_cma,
            assessment.conversation_duration_seconds,
        )

        # ------------------------------------------------------------------
        # Screening profile update
        # Based on validated instruments: PHQ-9, GAD-7, DASS-21, PSQI,
        # UCLA-LS3, RSES, AUDIT, C-SSRS.
        # ------------------------------------------------------------------
        if user_id and assessment.screening:
            await _update_screening_profile_from_assessment(
                db=db,
                user_id=user_id,
                assessment=assessment,
                session_id=state.get("session_id"),
            )

        state["sta_analysis_completed"] = True
        state["conversation_assessment"] = assessment.model_dump()

        if assessment.should_invoke_cma:
            logger.warning(
                "[BACKGROUND] STA recommends CMA escalation for conversation %s: %.200s",
                conversation_id,
                assessment.reasoning,
            )
            await _escalate_conversation_if_needed(
                db=db,
                user_id=user_id,
                conversation_id=conversation_id,
                session_id=state.get("session_id"),
                assessment=assessment,
                last_message=state.get("message", ""),
            )

    except Exception as exc:
        logger.error("[BACKGROUND] STA analysis failed: %s", exc, exc_info=True)


async def _update_screening_profile_from_assessment(
    *,
    db: AsyncSession,
    user_id: int,
    assessment: Any,
    session_id: Any,
) -> None:
    """Map STA dimension scores onto the user's longitudinal screening profile.

    Extracted as a separate helper to keep ``trigger_sta_conversation_analysis_background``
    readable.  Failures are caught and logged without re-raising.
    """
    try:
        from app.domains.mental_health.screening import (
            ExtractionResult,
            update_screening_profile,
        )

        extraction = ExtractionResult()
        extraction.crisis_detected = assessment.crisis_detected
        extraction.confidence = 0.8  # High confidence — full conversation analysed.

        _DIMENSION_FIELDS = (
            "depression", "anxiety", "stress", "sleep",
            "social", "academic", "self_worth", "substance", "crisis",
        )

        for dim_name in _DIMENSION_FIELDS:
            dim_score = getattr(assessment.screening, dim_name, None)
            if dim_score is None:
                continue

            if dim_score.is_protective:
                extraction.protective_updates[dim_name] = dim_score.score
            else:
                extraction.dimension_updates[dim_name] = dim_score.score

            extraction.indicators_found.extend(
                {
                    "dimension": dim_name,
                    "weight": dim_score.score,
                    "is_protective": dim_score.is_protective,
                    "excerpt": evidence[:100],
                }
                for evidence in dim_score.evidence
            )

        if not (extraction.dimension_updates or extraction.protective_updates):
            logger.debug("[BACKGROUND] No screening indicators extracted for user %s.", user_id)
            return

        profile = await update_screening_profile(
            db=db,
            user_id=user_id,
            extraction_result=extraction,
            session_id=session_id,
            decay_factor=0.95,  # Slow decay for longitudinal tracking.
        )
        logger.info(
            "[BACKGROUND] Screening profile updated — user=%s, risk=%s, "
            "concerns=%s, requires_attention=%s",
            user_id,
            profile.overall_risk_level.value,
            profile.primary_concerns,
            profile.requires_attention,
        )

    except Exception as exc:
        logger.warning(
            "[BACKGROUND] Screening profile update failed (non-critical): %s", exc
        )

async def _escalate_conversation_if_needed(
    *,
    db: AsyncSession,
    user_id: Any,
    conversation_id: Any,
    session_id: Any,
    assessment: Any,
    last_message: str,
) -> None:
    """Open a counselor case + alert when the conversation review demands it.

    Previously ``should_invoke_cma=True`` only logged a warning: the review
    ran, the assessment was stored, and nobody was ever notified — the
    escalation leg of the review pipeline simply did not exist. Mirrors
    ``SafetyTriageService._maybe_create_case`` (dedupe on open case, redacted
    summary, CASE_CREATED event) and adds an admin alert with the
    conversation id so a counselor can open the transcript immediately.
    Failures are logged without re-raising: the analysis itself is already
    durably stored.
    """
    import hashlib

    from app.core.redaction import prelog_redact
    from app.domains.mental_health.models.cases import (
        Case,
        CaseSeverityEnum,
        CaseStatusEnum,
    )
    from app.services.event_bus import EventType, publish_event

    if not user_id:
        return

    # Same pseudonymization scheme as the chat stream (aika_stream.py).
    user_hash = hashlib.sha256(f"user_{user_id}".encode()).hexdigest()[:16]
    risk = (assessment.overall_risk_level or "").lower()
    severity_map = {
        "critical": CaseSeverityEnum.critical,
        "high": CaseSeverityEnum.high,
        "moderate": CaseSeverityEnum.med,
    }
    severity = severity_map.get(risk, CaseSeverityEnum.high)

    case: Case | None = None
    try:
        # Dedupe: one open case per user+session is enough.
        existing = await db.execute(
            select(Case)
            .where(Case.user_hash == user_hash)
            .where(Case.status != CaseStatusEnum.closed)
            .where(Case.session_id == session_id)
        )
        existing_case = existing.scalar_one_or_none()
        if existing_case is not None:
            case = existing_case
            logger.info(
                "[BACKGROUND] Escalation deduped: open case already exists for user %s.",
                user_id,
            )
        else:
            summary_source = (
                getattr(assessment, "conversation_summary", None) or last_message or ""
            )
            case = Case(
                status=CaseStatusEnum.new,
                severity=severity,
                assigned_to=None,
                user_hash=user_hash,
                session_id=session_id,
                summary_redacted=prelog_redact(summary_source),
            )
            db.add(case)
            await db.flush()

            # Auto-assign: without this, directly-created review cases stayed
            # unassigned forever — invisible to counselors, whose case list
            # filters assigned_to == me. Reuses CMA's deterministic counselor
            # selection; status stays "new" so it still shows in the
            # escalations intake queue. Assignment publishes CASE_ASSIGNED,
            # which the event bridge turns into a counselor-scoped alert.
            try:
                from app.agents.cma.cma_graph import _select_optimal_counselor

                counselor_id = await _select_optimal_counselor(
                    db, severity.value, preferences={}
                )
                if counselor_id is not None:
                    case.assigned_to = str(counselor_id)
                    db.add(case)
                    logger.info(
                        "[BACKGROUND] Review case auto-assigned: case=%s → counselor=%s",
                        case.id,
                        counselor_id,
                    )
            except Exception as assign_exc:
                logger.warning(
                    "[BACKGROUND] Auto-assignment failed (case stays unassigned for admin triage): %s",
                    assign_exc,
                )

            try:
                event_data = {
                    "case_id": str(case.id),
                    "severity": severity.value,
                    "title": "Conversation review escalation",
                    "user_hash": user_hash,
                    "session_id": session_id,
                    "conversation_id": str(conversation_id or ""),
                }
                await publish_event(
                    event_type=EventType.CASE_CREATED,
                    source_agent="sta",
                    data=event_data,
                )
                if case.assigned_to:
                    await publish_event(
                        event_type=EventType.CASE_ASSIGNED,
                        source_agent="sta",
                        data={
                            "case_id": str(case.id),
                            "assigned_to": case.assigned_to,
                            "is_reassignment": False,
                        },
                    )
            except Exception as event_exc:
                logger.error(
                    "[BACKGROUND] Case events failed (case still created): %s",
                    event_exc,
                )

            logger.warning(
                "[BACKGROUND] Case created from conversation review: case_id=%s, "
                "severity=%s, assigned_to=%s, conversation=%s",
                case.id,
                severity.value,
                case.assigned_to,
                conversation_id,
            )

        # Counselor/admin alert pointing at the reviewed conversation.
        # audience + recipient_user_ids make it visible in the counselor bell;
        # the SSE push makes it instant (falls back to the 30s poll otherwise).
        try:
            from app.models.alerts import AlertSeverity, AlertType
            from app.services.alert_service import get_alert_service

            recipient_user_ids: list[int] = []
            if case is not None and case.assigned_to:
                from app.domains.mental_health.models import Counselor

                counselor = (
                    await db.execute(
                        select(Counselor).where(
                            Counselor.id == int(case.assigned_to)
                        )
                    )
                ).scalar_one_or_none()
                if counselor is not None and counselor.user_id is not None:
                    recipient_user_ids = [int(counselor.user_id)]

            await get_alert_service(db).create_alert(
                alert_type=AlertType.CASE_CREATED,
                severity=(
                    AlertSeverity.CRITICAL if risk == "critical" else AlertSeverity.HIGH
                ),
                title="Conversation review recommends human follow-up",
                message=(
                    f"STA conversation review flagged risk='{risk}' "
                    f"(trend={assessment.risk_trend}). Reasoning: "
                    f"{(assessment.reasoning or '')[:200]}"
                ),
                alert_metadata={
                    "audience": "counselor",
                    "recipient_user_ids": recipient_user_ids,
                    "user_id": user_id,
                    "conversation_id": str(conversation_id or ""),
                    "session_id": session_id,
                    "risk_level": risk,
                },
            )

            if recipient_user_ids:
                from app.services.sse_broadcaster import get_broadcaster

                push_payload = {
                    "title": "Conversation review recommends human follow-up",
                    "message": f"Risk '{risk}' detected in a reviewed conversation.",
                    "severity": risk,
                    "conversation_id": str(conversation_id or ""),
                }
                for recipient_user_id in recipient_user_ids:
                    await get_broadcaster().broadcast(
                        "counselor_alert", push_payload, user_id=recipient_user_id
                    )
        except Exception as alert_exc:
            logger.warning(
                "[BACKGROUND] Escalation alert failed (non-blocking): %s", alert_exc
            )

    except Exception as exc:
        logger.error(
            "[BACKGROUND] Conversation escalation failed (assessment already stored): %s",
            exc,
            exc_info=True,
        )
