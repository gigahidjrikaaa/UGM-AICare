"""
Shared chat processing helpers for REST and streaming endpoints.

This module provides lightweight memory context and delegates detailed data
retrieval to the tool calling system (get_conversation_summaries, get_journal_entries, etc.).

Memory Strategy:
- Personal context provides lightweight baseline info (see personal_context.py)
- Chat processing adds minimal hints and system prompts
- Tools fetch detailed summaries, journals, and conversation history when needed
- This prevents redundant data loading and reduces token usage

Agent Integration:
- STA (Safety Triage Agent) analyzes messages for risk in the background
- SCA (Support Coach Agent) generates intervention plans when appropriate
- Agents work alongside Aika without blocking or replacing conversational flow
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
import re
from typing import Any, Awaitable, Callable, Dict, Iterable, List, Optional

from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cbt_module_logic import (
    get_module_step_prompt,
    process_user_response_for_step,
)
from app.core.cbt_module_types import CBTModuleData
from app.core.memory import clear_module_state, get_module_state, set_module_state
from app.models import Conversation, User, UserSummary
from app.schemas.chat import ChatRequest, InterventionPlan
from app.services.personal_context import fetch_relevant_journal_entries
from app.core.settings import settings
from app.core.redaction import sanitize_text

logger = logging.getLogger(__name__)


@dataclass
class ChatTurnResult:
    response_text: str
    final_history: List[Dict[str, str]]
    provider_used: str
    model_used: str
    module_completed_id: Optional[str] = None
    intervention_plan: Optional[InterventionPlan] = None


# Callback signatures -------------------------------------------------------
StreamCallback = Callable[[str], Awaitable[None]]
SummaryScheduler = Callable[[int, str], None]
SummarizeNow = Callable[[int, str], Awaitable[None]]
LLMResponder = Callable[[List[Dict[str, str]], Optional[str], ChatRequest, Optional[StreamCallback]], Awaitable[str]]


async def process_chat_event(
    *,
    request: ChatRequest,
    current_user: User,
    db: AsyncSession,
    session_id: str,
    conversation_id: str,
    active_system_prompt: Optional[str],
) -> ChatTurnResult:
    """Handle non-message chat events (e.g., module starts)."""
    if not request.event:
        raise ValueError("process_chat_event called without event payload")

    module_id = request.event.module_id
    if request.event.type != "start_module":
        raise HTTPException(status_code=400, detail=f"Unsupported event type: {request.event.type}")

    initial_step = 1
    initial_module_data: CBTModuleData = {}
    prompt_result = get_module_step_prompt(module_id, initial_step, initial_module_data)
    if prompt_result is None:
        raise HTTPException(status_code=404, detail=f"Module {module_id} or its first step not found.")

    await set_module_state(session_id, module_id, initial_step, initial_module_data)

    final_history: List[Dict[str, str]] = []
    if request.history:
        final_history.extend(request.history)
    final_history.append({"role": "assistant", "content": prompt_result})

    provider_used = request.provider or "gemini"
    model_used = request.model or "module_start"

    return ChatTurnResult(
        response_text=prompt_result,
        final_history=final_history,
        provider_used=str(provider_used),
        model_used=str(model_used),
        module_completed_id=None,
    )


async def process_chat_message(
    *,
    request: ChatRequest,
    current_user: User,
    db: AsyncSession,
    session_id: str,
    conversation_id: str,
    active_system_prompt: Optional[str],
    schedule_summary: Optional[SummaryScheduler],
    summarize_now: Optional[SummarizeNow],
    llm_responder: LLMResponder,
    stream_callback: Optional[StreamCallback] = None,
) -> ChatTurnResult:
    """Handle standard text messages, optionally streaming via llm_responder."""
    user_id = current_user.id
    if not request.message:
        raise HTTPException(status_code=400, detail="Invalid request: Missing message content")

    user_message_content = request.message.strip()
    # Apply PII redaction on user input if enabled
    if settings.pii_redaction_enabled:
        sanitized, _meta = sanitize_text(user_message_content)
        user_message_content = sanitized
    if not user_message_content:
        raise HTTPException(status_code=400, detail="Message content is empty")

    history_from_request_api_messages: List[Dict[str, str]] = []
    if request.history:
        history_from_request_api_messages = [
            {"role": item["role"], "content": item["content"]}
            for item in request.history
        ]

    module_state_full = await get_module_state(session_id)
    if module_state_full:
        module_id = module_state_full["module_id"]
        current_step_id = module_state_full["step_id"]
        current_module_data: CBTModuleData = module_state_full["data"]

        updated_module_data, next_step_id, action = process_user_response_for_step(
            module_id, current_step_id, user_message_content, current_module_data
        )

        if action == "complete_module":
            prompt_result = get_module_step_prompt(module_id, current_step_id, updated_module_data)
            aika_response_text = (
                prompt_result
                if prompt_result is not None
                else "Modul telah selesai. Terima kasih!"
            )
            await clear_module_state(session_id)
            module_completed_id = module_id
        else:
            await set_module_state(session_id, module_id, next_step_id, updated_module_data)
            prompt_result = get_module_step_prompt(module_id, next_step_id, updated_module_data)
            if prompt_result is None:
                await clear_module_state(session_id)
                module_completed_id = module_id
                aika_response_text = (
                    "Sepertinya ada sedikit kendala dengan langkah selanjutnya di modul ini. "
                    "Mari kita coba lagi nanti atau kembali ke percakapan biasa."
                )
            else:
                module_completed_id = None
                aika_response_text = prompt_result

        # Optionally sanitize assistant output before persisting
        aika_to_store = aika_response_text
        if settings.pii_redaction_enabled:
            aika_to_store, _ = sanitize_text(aika_response_text)

        await _persist_conversation(
            db,
            user_id=user_id,
            session_id=session_id,
            conversation_id=conversation_id,
            message=user_message_content,
            response=aika_to_store,
        )

        final_history = _build_final_history(
            request_history=request.history,
            user_message=user_message_content,
            assistant_message=aika_to_store if settings.pii_redaction_enabled else aika_response_text,
        )
        provider_used = request.provider or "gemini"
        model_used = request.model or "cbt_module"
        return ChatTurnResult(
            response_text=aika_to_store if settings.pii_redaction_enabled else aika_response_text,
            final_history=final_history,
            provider_used=str(provider_used),
            model_used=str(model_used),
            module_completed_id=module_completed_id,
        )

    # Memory queries are now handled by get_conversation_summaries tool
    # Let the LLM + tools handle these naturally instead of hardcoded responses
    if _is_memory_query(user_message_content):
        logger.info("Memory query detected for user %s - will be handled by tools", user_id)

    history_for_llm_call = list(history_from_request_api_messages)

    is_new_context, previous_session_id = await _detect_session_change(
        db=db,
        user_id=user_id,
        session_id=session_id,
        conversation_id=conversation_id,
    )
    
    # Debug logging for memory system
    logger.info(
        "Memory Debug - User: %s, Session: %s, IsNewContext: %s, PreviousSession: %s",
        user_id, session_id, is_new_context, previous_session_id
    )

    if previous_session_id:
        if summarize_now:
            await summarize_now(user_id, previous_session_id)
        elif schedule_summary:
            schedule_summary(user_id, previous_session_id)

    # With tool calling enabled, we rely on tools to fetch summaries when needed
    # Only add a lightweight hint for new sessions
    if is_new_context:
        logger.info("Memory Debug - New session context for user %s", user_id)
        # Add system prompt if not already present
        if active_system_prompt and not any(h["role"] == "system" for h in history_for_llm_call):
            history_for_llm_call.insert(0, {"role": "system", "content": active_system_prompt})
    elif active_system_prompt and not any(h["role"] == "system" for h in history_for_llm_call):
        history_for_llm_call.insert(0, {"role": "system", "content": active_system_prompt})

    # With tool calling, journal entries are fetched via get_journal_entries tool
    # We only provide lightweight context for immediate relevance
    journal_context_messages: List[Dict[str, str]] = []
    
    # Check if user explicitly mentions journals
    journal_keywords = ["jurnal", "catatan", "menulis", "wrote", "journal"]
    mentions_journal = any(keyword in user_message_content.lower() for keyword in journal_keywords)
    
    if mentions_journal:
        # Provide a hint that journal data is available via tools
        journal_context_messages.append({
            "role": "system",
            "content": (
                "User menyebutkan jurnal. Gunakan get_journal_entries tool untuk mengakses "
                "catatan jurnal mereka dengan pencarian kata kunci jika diperlukan."
            ),
        })
        logger.info("Memory Debug - Journal mention detected, tool hint added for user %s", user_id)

    if journal_context_messages:
        history_for_llm_call.extend(journal_context_messages)

    history_for_llm_call.append({"role": "user", "content": user_message_content})

    has_system_message = any(msg["role"] == "system" for msg in history_for_llm_call)
    system_prompt_for_model = None if has_system_message else active_system_prompt

    try:
        aika_response_text = await llm_responder(
            history_for_llm_call,
            system_prompt_for_model,
            request,
            stream_callback,
        )
    except Exception as llm_err:  # pragma: no cover - defensive logging
        raise HTTPException(status_code=503, detail=f"LLM service unavailable or failed: {llm_err}") from llm_err

    if aika_response_text.startswith("Error:"):
        status_code_llm = 400 if "API key" in aika_response_text or "Invalid history" in aika_response_text else 503
        raise HTTPException(status_code=status_code_llm, detail=aika_response_text)

    # Optionally sanitize assistant output before persisting
    aika_to_store = aika_response_text
    if settings.pii_redaction_enabled:
        aika_to_store, _ = sanitize_text(aika_response_text)

    await _persist_conversation(
        db,
        user_id=user_id,
        session_id=session_id,
        conversation_id=conversation_id,
        message=user_message_content,
        response=aika_to_store,
    )

    # Agent Integration: Analyze message and potentially generate intervention plan
    intervention_plan: Optional[InterventionPlan] = None
    try:
        from app.services.agent_integration import AgentIntegrationService
        
        agent_service = AgentIntegrationService(db)
        agent_result = await agent_service.analyze_and_intervene(
            user_id=user_id,
            session_id=session_id,
            user_message=user_message_content,
            consent_followup=True,  # Default to True; can be made configurable
            enable_sta=True,  # Enable safety triage analysis
            enable_sca=True,  # Enable support coach interventions
        )
        
        if agent_result.should_intervene and agent_result.intervention_plan:
            logger.info(
                "Agent intervention triggered - User: %s, Reason: %s",
                user_id,
                agent_result.intervention_reason,
            )
            # Convert SCA response to InterventionPlan schema
            plan_steps_dict = [
                {
                    "id": step.id,
                    "label": step.label,
                    "duration_min": step.duration_min,
                }
                for step in agent_result.intervention_plan.plan_steps
            ]
            resource_cards_dict = [
                {
                    "resource_id": card.resource_id,
                    "title": card.title,
                    "summary": card.summary,
                    "url": card.url,
                }
                for card in agent_result.intervention_plan.resource_cards
            ]
            intervention_plan = InterventionPlan(
                plan_steps=plan_steps_dict,
                resource_cards=resource_cards_dict,
                next_check_in=agent_result.intervention_plan.next_check_in.isoformat() if agent_result.intervention_plan.next_check_in else None,
                intervention_reason=agent_result.intervention_reason,
            )
    except Exception as agent_error:
        # Don't block chat flow if agent integration fails
        logger.error(
            "Agent integration failed for user %s: %s",
            user_id,
            agent_error,
            exc_info=True,
        )

    final_history = _build_final_history(
        request_history=request.history,
        user_message=user_message_content,
        assistant_message=aika_to_store if settings.pii_redaction_enabled else aika_response_text,
    )

    provider_used = request.provider or "gemini"
    model_used = request.model or "gemini_google"
    return ChatTurnResult(
        response_text=aika_to_store if settings.pii_redaction_enabled else aika_response_text,
        final_history=final_history,
        provider_used=str(provider_used),
        model_used=str(model_used),
        intervention_plan=intervention_plan,
    )


# Internal helpers ----------------------------------------------------------
async def _persist_conversation(
    db: AsyncSession,
    *,
    user_id: int,
    session_id: str,
    conversation_id: str,
    message: str,
    response: str,
) -> None:
    conversation_entry = Conversation(
        user_id=user_id,
        session_id=session_id,
        conversation_id=conversation_id,
        message=message,
        response=response,
        timestamp=datetime.now(),
    )
    try:
        db.add(conversation_entry)
        await db.commit()
    except Exception:
        await db.rollback()
        raise


def _build_final_history(
    *,
    request_history: Optional[List[Dict[str, str]]],
    user_message: str,
    assistant_message: str,
) -> List[Dict[str, str]]:
    final_history: List[Dict[str, str]] = []
    if request_history:
        final_history.extend(request_history)
    final_history.append({"role": "user", "content": user_message})
    final_history.append({"role": "assistant", "content": assistant_message})
    return final_history


async def _detect_session_change(
    *,
    db: AsyncSession,
    user_id: int,
    session_id: str,
    conversation_id: str,
) -> tuple[bool, Optional[str]]:
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(desc(Conversation.timestamp))
    )
    result = await db.execute(stmt)
    latest_record = result.scalars().first()

    if not latest_record:
        return True, None

    if str(latest_record.session_id) != str(session_id):
        return True, latest_record.session_id

    if str(latest_record.conversation_id) != str(conversation_id):
        return True, None

    return False, None


async def _fetch_latest_summary(db: AsyncSession, user_id: int) -> Optional[UserSummary]:
    """
    DEPRECATED: Use get_conversation_summaries tool instead.
    Kept for backwards compatibility only.
    """
    stmt = (
        select(UserSummary)
        .where(UserSummary.user_id == user_id)
        .order_by(desc(UserSummary.timestamp))
    )
    result = await db.execute(stmt)
    return result.scalars().first()


def _clean_summary_prefix(summary: str) -> str:
    """
    DEPRECATED: No longer needed with tool calling system.
    Kept for backwards compatibility only.
    """
    prefixes = [
        "poin-poin utama:",
        "poin utama:",
        "ringkasan:",
        "summary:",
        "secara garis besar,",
    ]
    stripped = summary.strip()
    for prefix in prefixes:
        if stripped.lower().startswith(prefix.lower()):
            return stripped[len(prefix):].strip()
    return stripped


_memory_patterns: Iterable[re.Pattern[str]] = [
    # Indonesian patterns
    re.compile(
        r"(ingat|inget|remember)\s*(?:lagi|kah|kan|dong|ga|gak|nggak)?\s*(?:tentang|soal|mengenai|apa)?\s*(?:percakapan|obrolan|diskusi|pembicaraan|sesi|chat|history|summary|ringkasan|resume|resume kita|resume obrolan|resume percakapan)\s*(?:kita|sebelumnya|kemarin|terakhir|our|last|previous)?",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:apa|apakah|do|did)\s*(?:kah)?\s*(?:kamu|you)\s*(?:sih|ya)?\s*(?:masih\s+)?(ingat|inget|remember)\s*(?:lagi|kah|kan|dong|ga|gak|nggak)?\s*(?:tentang|soal|mengenai|apa)?\s*(?:percakapan|obrolan|diskusi|pembicaraan|sesi|chat|history|summary|ringkasan|resume)\s*(?:kita|sebelumnya|kemarin|terakhir|our|last|previous)?",
        re.IGNORECASE,
    ),
    re.compile(
        r"apa\s*(?:lagi)?\s*(?:sih|ya)?\s*(?:yang|yg)\s*(?:pernah|sempat|udah|sudah)?\s*(?:kita|we)\s*(?:bahas|bicarakan|diskusikan|obrolin|omongin|talked\s+about|discussed)",
        re.IGNORECASE,
    ),
    # Simple patterns
    re.compile(r"ingat\s+obrolan\s+kita", re.IGNORECASE),
    re.compile(r"ingat\s+percakapan\s+kita", re.IGNORECASE),
    re.compile(r"kamu\s+inget\s+gak", re.IGNORECASE),
    re.compile(r"do\s+you\s+remember", re.IGNORECASE),
    
    # Additional common patterns
    re.compile(r"\b(?:ada\s+)?(?:riwayat|history|rekam|catatan)\s*(?:chat|obrolan|percakapan)", re.IGNORECASE),
    re.compile(r"(?:bagaimana|gimana)\s*(?:dengan)?\s*(?:obrolan|percakapan)\s*(?:sebelumnya|kemarin|terakhir)", re.IGNORECASE),
    re.compile(r"(?:lanjut|sambung|continue)\s*(?:dari)?\s*(?:obrolan|percakapan|diskusi)\s*(?:sebelumnya|kemarin|terakhir)", re.IGNORECASE),
    re.compile(r"apa\s*(?:yang)?\s*(?:pernah|sudah|udah)\s*(?:kita|aku|saya)\s*(?:bahas|cerita|diskusi)", re.IGNORECASE),
    
    # Context reference patterns
    re.compile(r"seperti\s*(?:yang)?\s*(?:pernah|sudah|udah)\s*(?:kita|aku|saya)\s*(?:bahas|cerita)", re.IGNORECASE),
    re.compile(r"kayak\s*(?:yang)?\s*(?:kemarin|sebelumnya|dulu)", re.IGNORECASE),
    
    # Memory-related keywords
    re.compile(r"\b(?:masih\s+)?(?:ingat|inget)\b", re.IGNORECASE),
    re.compile(r"\b(?:ada\s+)?(?:konteks|context)\b", re.IGNORECASE),
]


def _is_memory_query(user_message: str) -> bool:
    text = user_message.lower().strip()
    for pattern in _memory_patterns:
        if pattern.search(text):
            return True
    return False


_journal_patterns: Iterable[re.Pattern[str]] = [
    re.compile(r"\b(jurnal|journal|catatan|diary|curhat)\b", re.IGNORECASE),
    re.compile(r"tulis[ai]?\s+di\s+jurnal", re.IGNORECASE),
    re.compile(r"lihat\s+catatan", re.IGNORECASE),
]


def _mentions_journal(user_message: str) -> bool:
    text = user_message.lower().strip()
    for pattern in _journal_patterns:
        if pattern.search(text):
            return True
    return False
