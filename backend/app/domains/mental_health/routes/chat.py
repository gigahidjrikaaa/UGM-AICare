"""Chat endpoints covering REST requests and streaming WebSocket support."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, cast, AsyncGenerator
import hashlib
from uuid import uuid4

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import auth_utils
from app.agents.aika.tools import get_aika_tools
from app.agents.execution_tracker import execution_tracker
# ✅ REMOVED: Legacy AikaOrchestrator - Now using unified orchestrator only
from app.agents.aika_orchestrator_graph import create_aika_agent_with_checkpointing  # ✨ Direct LangGraph invocation
from app.core import llm
from app.core.llm_request_tracking import get_stats, prompt_context
from app.core.rate_limiter import check_rate_limit_dependency, get_rate_limiter
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.models import User  # Core model
from app.domains.mental_health.models import Conversation, UserSummary
from app.domains.mental_health.schemas.chat import (
    AikaRequest,
    AikaResponse,
    ChatRequest,
    ConversationHistoryItem,
)
# Note: Integrating with LangGraph AikaOrchestrator for chat processing
from app.domains.mental_health.services.personal_context import (
    build_user_personal_context,
    invalidate_user_personal_context,
)
from app.domains.mental_health.services.tool_calling import generate_with_tools

from app.core.langgraph_checkpointer import get_langgraph_checkpointer
from app.services.ai_memory_facts_service import (
    list_user_fact_texts_for_agent,
    remember_from_user_message,
)

from dataclasses import dataclass, field


@dataclass
class ChatProcessingResult:
    """Result from chat message processing."""
    response_text: str
    provider_used: str = "google"
    model_used: str = "gemini_google"  # ✅ Fixed: Valid model name
    final_history: List[ConversationHistoryItem] = field(default_factory=list)

    module_completed_id: Optional[int] = None
    intervention_plan: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    



async def process_chat_event(*args, **kwargs):
    """Process chat events (e.g., typing indicators)."""
    # Events don't need LangGraph processing
    return ChatProcessingResult(
        response_text="",
        final_history=[],
    )


async def process_chat_message(
    request: ChatRequest,
    current_user: User,
    db: AsyncSession,
    session_id: str,
    conversation_id: int,
    active_system_prompt: Optional[str] = None,
    schedule_summary: Any = None,
    summarize_now: bool = False,
    llm_responder: Any = None,
    activity_callback: Optional[Callable] = None,  # NEW: Activity callback for WebSocket
) -> ChatProcessingResult:
    """Process chat message using AikaOrchestrator (LangGraph workflow).
    
    This integrates the legacy /chat endpoint with the new LangGraph-based
    Aika Meta-Agent architecture for consistent behavior across all endpoints.
    
    Args:
        activity_callback: Optional callback for real-time activity streaming (WebSocket)
    """
    try:
        if request.message is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="'message' is required for chat message processing.",
            )

        # Determine user role for routing
        user_role = "user"  # Default to student
        if hasattr(current_user, 'role'):
            if current_user.role == "admin":
                user_role = "admin"
            elif current_user.role == "counselor":
                user_role = "counselor"
        
        # Convert history to Aika format
        conversation_history: List[Dict[str, str]] = []
        if request.history:
            for i, item in enumerate(request.history):
                # Skip the last message if it matches the current request message
                # This prevents double-input since frontend might send optimistic history
                if i == len(request.history) - 1 and item.get("content") == request.message:
                    continue

                conversation_history.append(item)
        
        # ============================================================================
        # ✨ NEW ARCHITECTURE: Direct LangGraph Invocation (Nov 2025)
        # ============================================================================
        # Uses unified Aika orchestrator with LangGraph checkpointing
        # Benefits:
        # - Aika as first decision node (agents only when needed)
        # - Built-in conversation memory via checkpointing
        # - Deterministic routing with LangGraph
        # - Better execution tracking and debugging
        # ============================================================================
        
        prompt_id = str(uuid4())
        logger.info(
            f"🤖 Invoking Aika Agent (LangGraph) for user {current_user.id}, role={user_role}",
            extra={
                "user_id": current_user.id,
                "session_id": session_id,
                "prompt_id": prompt_id,
            },
        )
        
        # Create Aika agent with app-lifetime checkpointing (Postgres when available)
        checkpointer = get_langgraph_checkpointer()
        if checkpointer is None:
            # Dev fallback
            from langgraph.checkpoint.memory import MemorySaver
            checkpointer = MemorySaver()
        aika_agent = create_aika_agent_with_checkpointing(db, checkpointer=checkpointer)

        # Inject user-controlled cross-conversation memory facts (consent-gated for agent use)
        remembered_facts = await list_user_fact_texts_for_agent(db, current_user, limit=20)
        
        # Prepare initial state for LangGraph
        initial_state = {
            "user_id": current_user.id,
            "user_role": user_role,
            "message": request.message,
            "conversation_history": conversation_history,
            "session_id": session_id,
            "personal_context": {
                "remembered_facts": remembered_facts,
            },
        }
        
        # Invoke Aika agent directly (no wrapper needed - the graph IS the agent)
        llm_stats = None
        with prompt_context(prompt_id=prompt_id, user_id=current_user.id, session_id=session_id):
            result = await aika_agent.ainvoke(
                initial_state,
                config={
                    "configurable": {
                        "thread_id": f"user_{current_user.id}_session_{session_id}"
                    }
                }
            )
            llm_stats = get_stats()
        
        # Extract final response from LangGraph state
        final_response = result.get("final_response", "Maaf, terjadi kesalahan.")
        response_source = result.get("response_source", "unknown")
        agents_invoked = result.get("agents_invoked", [])
        
        logger.info(
            f"✅ Aika response: source={response_source}, "
            f"agents={agents_invoked}, "
            f"execution_path={result.get('execution_path', [])}"
        )
        
        # Convert Aika response to legacy format
        # Note: ConversationHistoryItem requires timestamp and session_id
        # For simplicity, we'll return history as dicts instead of schema objects
        updated_history = conversation_history + [
            {"role": "user", "content": request.message},
            {"role": "assistant", "content": final_response},
        ]
        
        # Convert to schema objects with required fields
        now = datetime.now()
        history_items = []
        for h in updated_history:
            history_items.append(
                ConversationHistoryItem(
                    role=h["role"],
                    content=h["content"],
                    timestamp=now,
                    session_id=session_id,
                )
            )
        
        # Build metadata for testing/verification
        metadata = {
            "agents_invoked": agents_invoked,
            "response_source": response_source,
            "execution_path": result.get("execution_path", []),
            "intent": result.get("intent"),
            "risk_level": result.get("sta_risk_assessment", {}).get("risk_level") or result.get("severity"),
            "risk_score": result.get("sta_risk_assessment", {}).get("risk_score") or result.get("risk_score"),
        }

        # Attach per-user-prompt LLM request totals (includes tool-call followups).
        if llm_stats is not None:
            metadata["llm_request_count"] = llm_stats.total_requests
            metadata["llm_requests_by_model"] = llm_stats.requests_by_model
        metadata["llm_prompt_id"] = prompt_id

        # Best-effort memory write (consent-gated)
        await remember_from_user_message(db, current_user, request.message, source="conversation")

        return ChatProcessingResult(
            response_text=final_response,
            provider_used="aika-langgraph",
            model_used=getattr(llm, "DEFAULT_GEMINI_MODEL", "gemini-2.5-flash"),
            final_history=history_items,
            module_completed_id=None,
            intervention_plan=result.get("intervention_plan"),
            metadata=metadata,
        )
        
    except Exception as e:
        logger.error(f"Error in process_chat_message: {e}", exc_info=True)
        raise

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Chat"])

# Streaming endpoint is now included in main.py directly

MIN_TURNS_FOR_SUMMARY = 1  # Reduced from 2 to 1 for better memory capture
MAX_HISTORY_CHARS_FOR_SUMMARY = 15000


def _compose_system_prompt(base_prompt: Optional[str], personal_context: str) -> Optional[str]:
    base = (base_prompt or "").strip()
    context = (personal_context or "").strip()
    if base and context:
        return f"{base}\n\n{context}"
    if context:
        return context
    if base:
        return base
    return None


async def _default_llm_responder(
    history: List[Dict[str, str]],
    system_prompt: Optional[str],
    request: ChatRequest,
    _stream_callback: Optional[Callable[[str], Any]] = None,
) -> str:
    """Default LLM responder without tool calling."""
    model_name = request.model or "gemini_google"
    return await llm.generate_response(
        history=history,
        model=model_name,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        system_prompt=system_prompt,
    )


async def _tool_aware_llm_responder(
    history: List[Dict[str, str]],
    system_prompt: Optional[str],
    request: ChatRequest,
    db: AsyncSession,
    user_id: int,
    stream_callback: Optional[Callable[[str], Any]] = None,
) -> str:
    """LLM responder with tool calling capabilities.
    
    This responder enables Aika to actively query the database for:
    - Conversation summaries from previous sessions
    - Journal entries with optional keyword search
    - Detailed conversation context from specific sessions
    
    Args:
        history: Conversation history
        system_prompt: System instruction
        request: Chat request configuration
        db: Database session for tool execution
        user_id: User ID for scoping tool queries
        stream_callback: Optional callback for streaming
        
    Returns:
        Generated response text
    """
    # Use the proper tool calling service
    from app.domains.mental_health.services.tool_calling import generate_with_tools
    
    response_text, tool_calls = await generate_with_tools(
        history=history,
        system_prompt=system_prompt,
        request=request,
        db=db,
        user_id=user_id,
        stream_callback=stream_callback,
    )
    
    if tool_calls:
        logger.info(f"Tool calling completed with {len(tool_calls)} tool call(s)")
    
    return response_text


async def _streaming_llm_responder(
    history: List[Dict[str, str]],
    system_prompt: Optional[str],
    request: ChatRequest,
    stream_callback: Optional[Callable[[str], Any]] = None,
) -> str:
    """Streaming LLM responder without tool calling."""
    if stream_callback is None:
        # Fallback to default behaviour if no callback is provided.
        return await _default_llm_responder(history, system_prompt, request, None)

    requested_model = request.model or "gemini_google"
    if requested_model == "gemini_google":
        # Use Gemini 2.5 Flash Lite for conversational (or use GEMINI_LITE_MODEL from llm.py)
        model_name = getattr(llm, "GEMINI_LITE_MODEL", "gemini-2.5-flash-lite")
    else:
        model_name = requested_model
    full_text = ""
    async for chunk in llm.stream_gemini_response(
        history=history,
        model=model_name,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        system_prompt=system_prompt,
    ):
        if not chunk:
            continue
        full_text += chunk
        try:
            await stream_callback(chunk)
        except Exception as callback_err:  # pragma: no cover - defensive logging
            logger.warning("Streaming callback failed: %s", callback_err)
    return full_text


async def _streaming_tool_aware_llm_responder(
    history: List[Dict[str, str]],
    system_prompt: Optional[str],
    request: ChatRequest,
    db: AsyncSession,
    user_id: int,
    stream_callback: Optional[Callable[[str], Any]] = None,
) -> str:
    """Streaming LLM responder with tool calling capabilities.
    
    Note: Tool calling in streaming mode is complex. This implementation
    enables tools but may need enhancements for full tool calling loop support.
    
    Args:
        history: Conversation history
        system_prompt: System instruction
        request: Chat request configuration
        db: Database session for tool execution
        user_id: User ID for scoping tool queries
        stream_callback: Callback for streaming chunks
        
    Returns:
        Complete response text
    """
    if stream_callback is None:
        # Fallback to non-streaming tool-aware responder
        return await _tool_aware_llm_responder(history, system_prompt, request, db, user_id, None)

    # Use the proper tool calling service with streaming
    from app.domains.mental_health.services.tool_calling import generate_with_tools
    
    response_text, tool_calls = await generate_with_tools(
        history=history,
        system_prompt=system_prompt,
        request=request,
        db=db,
        user_id=user_id,
        stream_callback=stream_callback,
    )
    
    if tool_calls:
        logger.info(f"Streaming with tools completed, {len(tool_calls)} tool call(s)")
    
    return response_text


# ===================== AIKA ENDPOINT MOVED TO aika_stream.py =====================
# The /aika endpoint has been consolidated into aika_stream.py for cleaner code.
# See: app/domains/mental_health/routes/aika_stream.py
# =================================================================================


@router.get("/history", response_model=List[ConversationHistoryItem])
async def get_chat_history(
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ConversationHistoryItem]:
    """Return conversation history for the authenticated user."""
    try:
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == current_user.id)
            .order_by(Conversation.timestamp.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        conversation_turns = result.scalars().all()

        history_items: List[Dict[str, Any]] = []
        for turn in conversation_turns:
            history_items.append(
                {
                    "role": "user",
                    "content": turn.message,
                    "timestamp": turn.timestamp,
                    "session_id": turn.session_id,
                }
            )
            history_items.append(
                {
                    "role": "assistant",
                    "content": turn.response,
                    "timestamp": turn.timestamp,
                    "session_id": turn.session_id,
                }
            )

        history_items.sort(key=lambda item: item["timestamp"], reverse=False)
        paginated_history = history_items[skip : skip + limit]
        return [ConversationHistoryItem(**item) for item in paginated_history]

    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error(
            "Error fetching chat history for user %s: %s",
            current_user.id,
            exc,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history") from exc
