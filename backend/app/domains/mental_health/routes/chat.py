"""Chat endpoints covering REST requests and streaming WebSocket support."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, cast

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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import auth_utils
from app.agents.aika.tools import get_aika_tools
from app.agents.aika import AikaOrchestrator  # ✨ New: Meta-Agent Orchestrator
from app.core import llm
from app.core.rate_limiter import check_rate_limit_dependency, get_rate_limiter
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.models import User  # Core model
from app.domains.mental_health.models import Conversation, UserSummary
from app.domains.mental_health.schemas.chat import ChatRequest, ChatResponse, ConversationHistoryItem, AikaRequest, AikaResponse
# Note: Integrating with LangGraph AikaOrchestrator for chat processing
from app.domains.mental_health.services.personal_context import (
    build_user_personal_context,
    invalidate_user_personal_context,
)
from app.domains.mental_health.services.tool_calling import generate_with_tools
from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class ChatProcessingResult:
    """Result from chat message processing."""
    response_text: str
    provider_used: str = "google"
    model_used: str = "gemini_google"  # ✅ Fixed: Valid model name
    final_history: List[ConversationHistoryItem] = None

    module_completed_id: Optional[int] = None
    intervention_plan: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.final_history is None:
            self.final_history = []


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
        # Determine user role for routing
        user_role = "user"  # Default to student
        if hasattr(current_user, 'role'):
            if current_user.role == "admin":
                user_role = "admin"
            elif current_user.role == "counselor":
                user_role = "counselor"
        
        # Convert history to Aika format
        conversation_history = []
        if request.history:
            for item in request.history:
                if isinstance(item, dict):
                    conversation_history.append(item)
                else:
                    conversation_history.append({
                        "role": item.role,
                        "content": item.content,
                    })
        
        # Initialize Aika orchestrator
        aika = AikaOrchestrator(db=db)
        
        # Set activity callback for real-time streaming if provided (WebSocket)
        if activity_callback:
            aika.set_activity_callback(activity_callback)
        
        # Process through NEW tool-calling workflow (Oct 2025 optimization)
        logger.info(
            f"Processing message via Tool-Calling Architecture for user {current_user.id}"
        )
        
        result = await aika.process_message_with_tools(
            user_id=current_user.id,
            user_role=user_role,
            message=request.message,
            session_id=session_id,
            conversation_history=conversation_history,
        )
        
        # Convert Aika response to legacy format
        # Note: ConversationHistoryItem requires timestamp and session_id
        # For simplicity, we'll return history as dicts instead of schema objects
        updated_history = conversation_history + [
            {"role": "user", "content": request.message},
            {"role": "assistant", "content": result["response"]},
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
        
        return ChatProcessingResult(
            response_text=result["response"],
            provider_used="aika-langgraph",
            model_used="gemini_google",  # ✅ Fixed: Valid model name
            final_history=history_items,
            module_completed_id=None,
            intervention_plan=result.get("metadata", {}).get("intervention_plan"),
        )
        
    except Exception as e:
        logger.error(f"Error in process_chat_message: {e}", exc_info=True)
        raise

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Chat"])

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
        model_name = getattr(llm, "DEFAULT_GEMINI_MODEL", "gemini-2.0-flash")
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


# ===================== NEW: AIKA META-AGENT ENDPOINT =====================

@router.post("/aika", response_model=AikaResponse, dependencies=[Depends(check_rate_limit_dependency)])
async def handle_aika_request(
    request: AikaRequest = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> AikaResponse:
    """
    🌟 Aika Meta-Agent Endpoint
    
    This endpoint routes requests through Aika's orchestration graph,
    which intelligently coordinates STA, SCA, SDA, and IA based on user role.
    
    **User Roles:**
    - `student`: Safety triage → Coaching → Escalation if needed
    - `admin`: Analytics and administrative actions
    - `counselor`: Case management and clinical insights
    
    **Response Format:**
    ```json
    {
        "success": true,
        "response": "Aika's response",
        "metadata": {
            "session_id": "...",
            "agents_invoked": ["STA", "SCA"],
            "risk_level": "low",
            "processing_time_ms": 1234.56
        }
    }
    ```
    
    Args:
        request: AikaRequest with message and conversation history
        current_user: Authenticated user (auto-injected from token)
        db: Database session
        
    Returns:
        AikaResponse with Aika's response and metadata
    """
    
    try:
        # Validate user_id matches authenticated user
        if request.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="user_id in request must match authenticated user"
            )
        
        # Initialize Aika orchestrator
        aika = AikaOrchestrator(db=db)
        
        # Process message through NEW tool-calling orchestration (Oct 2025)
        logger.info(
            f"✨ Aika (tool-calling) processing request from {request.role} user {current_user.id}: "
            f"{request.message[:50]}..."
        )
        
        result = await aika.process_message_with_tools(
            user_id=request.user_id,
            user_role=request.role,
            message=request.message,
            session_id=request.session_id,
            conversation_history=request.conversation_history,
        )
        
        # Safe logging with metadata check
        if "metadata" in result:
            logger.info(
                f"✅ Aika completed: agents={result['metadata']['agents_invoked']}, "
                f"time={result['metadata']['processing_time_ms']:.2f}ms"
            )
        else:
            logger.warning(f"⚠️ Aika returned without metadata (error occurred)")
        
        return AikaResponse(
            success=result.get("success", False),
            response=result.get("response", ""),
            metadata=result.get("metadata", {}),
        )
        
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning(f"Value error in /aika endpoint: {exc}", exc_info=True)
        return AikaResponse(
            success=False,
            response="",
            metadata={},
            error=str(exc),
        )
    except Exception as exc:
        logger.error(
            f"Unhandled exception in /aika endpoint for user {current_user.id}: {exc}",
            exc_info=True,
        )
        return AikaResponse(
            success=False,
            response="",
            metadata={},
            error="Internal server error",
        )


# ===================== EXISTING LEGACY CHAT ENDPOINT =====================

@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(check_rate_limit_dependency)])
async def handle_chat_request(
    request: ChatRequest = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    enable_tools: bool = Query(default=True, description="Enable tool calling for memory access"),
) -> ChatResponse:
    """Handle traditional REST chat requests.
    
    Args:
        request: Chat request with message, history, and configuration
        current_user: Authenticated user
        db: Database session
        enable_tools: Whether to enable tool calling (default: True)
        
    Returns:
        ChatResponse with assistant's reply and updated history
    """

    session_id = request.session_id
    conversation_id = request.conversation_id

    try:
        personal_context = await build_user_personal_context(db, current_user)
        active_system_prompt = _compose_system_prompt(request.system_prompt, personal_context)
        
        # DEBUG: Log system prompt to verify it's being received
        logger.info(f"🎭 System prompt received from frontend: {request.system_prompt[:100] if request.system_prompt else 'None'}...")
        logger.info(f"👤 Personal context: {personal_context[:100] if personal_context else 'None'}...")
        logger.info(f"✅ Active system prompt (composed): {active_system_prompt[:100] if active_system_prompt else 'None'}...")

        # Choose LLM responder based on tool enablement
        if enable_tools:
            # Create a closure that includes db and user_id for tool execution
            async def tool_responder(hist, sysprompt, req, callback):
                return await _tool_aware_llm_responder(
                    history=hist,
                    system_prompt=sysprompt,
                    request=req,
                    db=db,
                    user_id=current_user.id,
                    stream_callback=callback,
                )
            llm_responder = tool_responder
            logger.info(f"Tool calling enabled for user {current_user.id}, session {session_id}")
        else:
            llm_responder = _default_llm_responder
            logger.debug(f"Tool calling disabled for user {current_user.id}, session {session_id}")

        if request.event:
            result = await process_chat_event(
                request=request,
                current_user=current_user,
                db=db,
                session_id=session_id,
                conversation_id=conversation_id,
                active_system_prompt=active_system_prompt,
            )
        elif request.message:
            result = await process_chat_message(
                request=request,
                current_user=current_user,
                db=db,
                session_id=session_id,
                conversation_id=conversation_id,
                active_system_prompt=active_system_prompt,
                schedule_summary=None,
                summarize_now=summarize_and_save,
                llm_responder=llm_responder,
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid request: Missing message or event payload")

        return ChatResponse(
            response=result.response_text,
            provider_used=result.provider_used,
            model_used=result.model_used,
            history=result.final_history,
            module_completed_id=result.module_completed_id,
            intervention_plan=result.intervention_plan,
        )

    except ValueError as exc:
        logger.warning("Value error in /chat endpoint: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        user_id_for_log = current_user.id if current_user else "unknown_user"
        logger.error(
            "Unhandled exception in /chat endpoint for user %s, session %s: %s",
            user_id_for_log,
            session_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="An internal server error occurred.") from exc


@router.websocket("/chat/ws")
async def chat_ws(
    websocket: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_async_db),
) -> None:
    """Stream chat responses to the frontend via WebSocket."""
    try:
        payload = auth_utils.decrypt_and_validate_token(token)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id_str = payload.sub
    if user_id_str is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = int(user_id_str)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = await db.get(User, user_id)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    async def emit_token(chunk: str, *, session_id: str, conversation_id: str) -> None:
        await websocket.send_json(
            {
                "type": "token",
                "token": chunk,
                "sessionId": session_id,
                "conversationId": conversation_id,
            }
        )

    try:
        while True:
            message = await websocket.receive_text()
            try:
                raw_payload = json.loads(message)
            except json.JSONDecodeError as exc:
                await websocket.send_json({"type": "error", "detail": f"Invalid JSON: {exc}"})
                continue

            try:
                chat_request = ChatRequest.model_validate(raw_payload)
            except Exception as exc:  # pragma: no cover - defensive logging
                await websocket.send_json({"type": "error", "detail": f"Invalid payload: {exc}"})
                continue

            session_id = chat_request.session_id
            conversation_id = chat_request.conversation_id

            # Rate limiting check for WebSocket
            rate_limiter = get_rate_limiter()
            # ✅ FIX: Use role attribute instead of is_admin
            role = "admin" if (hasattr(user, 'role') and user.role == "admin") else "student"
            is_allowed, remaining, reset_timestamp = await rate_limiter.check_rate_limit(
                user_id=user.id,
                endpoint="chat",
                role=role
            )
            
            if not is_allowed:
                # Send rate limit error to client
                retry_after = max(1, reset_timestamp - int(datetime.now().timestamp()))
                await websocket.send_json({
                    "type": "error",
                    "detail": {
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Please try again in {retry_after} seconds.",
                        "retry_after": retry_after,
                        "reset_at": reset_timestamp,
                    }
                })
                continue

            # DEBUG: Log system prompt flow
            logger.info(f"🎭 [WebSocket] System prompt from frontend: {chat_request.system_prompt[:100] if chat_request.system_prompt else 'None'}...")
            
            personal_context = await build_user_personal_context(db, user)
            logger.info(f"👤 [WebSocket] Personal context: {personal_context[:100] if personal_context else 'None'}...")
            
            active_system_prompt = _compose_system_prompt(chat_request.system_prompt, personal_context)
            logger.info(f"✅ [WebSocket] Active system prompt (composed): {active_system_prompt[:100] if active_system_prompt else 'None'}...")

            if chat_request.event:
                result = await process_chat_event(
                    request=chat_request,
                    current_user=user,
                    db=db,
                    session_id=session_id,
                    conversation_id=conversation_id,
                    active_system_prompt=active_system_prompt,
                )
                await websocket.send_json(
                    {
                        "type": "completed",
                        "response": result.response_text,
                        "history": result.final_history,
                        "provider": result.provider_used,
                        "model": result.model_used,
                        "moduleCompletedId": result.module_completed_id,
                        "sessionId": session_id,
                        "conversationId": conversation_id,
                    }
                )
                continue

            if not chat_request.message:
                await websocket.send_json({"type": "error", "detail": "Missing message payload."})
                continue

            async def stream_callback(chunk: str) -> None:
                await emit_token(chunk, session_id=session_id, conversation_id=conversation_id)
            
            # Activity callback for real-time agent activity streaming
            async def activity_callback(activity_data: dict) -> None:
                """Send activity logs to WebSocket in real-time"""
                await websocket.send_json(activity_data)

            # ✅ NOTE: AikaOrchestrator doesn't support streaming yet
            # The stream_callback is not used in the LangGraph workflow
            # Future enhancement: Add streaming support to orchestrator

            try:
                result = await process_chat_message(
                    request=chat_request,
                    current_user=user,
                    db=db,
                    session_id=session_id,
                    conversation_id=conversation_id,
                    active_system_prompt=active_system_prompt,
                    schedule_summary=None,
                    summarize_now=summarize_and_save,
                    llm_responder=None,  # Not used with AikaOrchestrator
                    activity_callback=activity_callback,  # Enable activity streaming
                )
            except HTTPException as exc:
                await websocket.send_json({"type": "error", "detail": exc.detail})
                continue
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.error("Streaming chat failed: %s", exc, exc_info=True)
                await websocket.send_json({"type": "error", "detail": "Internal server error."})
                continue

            await websocket.send_json(
                {
                    "type": "completed",
                    "response": result.response_text,
                    "history": result.final_history,
                    "provider": result.provider_used,
                    "model": result.model_used,
                    "moduleCompletedId": result.module_completed_id,
                    "interventionPlan": result.intervention_plan.model_dump() if result.intervention_plan else None,
                    "sessionId": session_id,
                    "conversationId": conversation_id,
                }
            )

    except WebSocketDisconnect:
        logger.debug("Chat WebSocket disconnected for user_id=%s", user_id)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Chat WebSocket error for user_id=%s: %s", user_id, exc, exc_info=True)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)


async def summarize_and_save(user_id: int, session_id_to_summarize: str) -> None:
    """Fetch history, create a summary, and persist it for future context injection."""
    logger.info(
        "Background Task: Starting summarization for user %s, session %s",
        user_id,
        session_id_to_summarize,
    )
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            stmt = (
                select(Conversation)
                .where(
                    Conversation.session_id == session_id_to_summarize,
                    Conversation.user_id == user_id,
                )
                .order_by(Conversation.timestamp.asc())
            )
            result = await db.execute(stmt)
            conversation_history = result.scalars().all()

            if not conversation_history or len(conversation_history) < MIN_TURNS_FOR_SUMMARY:
                logger.info(
                    "Background Task: Skipping summarization for session %s (too short).",
                    session_id_to_summarize,
                )
                return

            history_lines = []
            for turn in conversation_history:
                history_lines.append(f"user: {turn.message}")
                history_lines.append(f"assistant: {turn.response}")
            formatted_history = "\n".join(history_lines)

            if len(formatted_history) > MAX_HISTORY_CHARS_FOR_SUMMARY:
                original_len = len(formatted_history)
                formatted_history = formatted_history[-MAX_HISTORY_CHARS_FOR_SUMMARY :]
                logger.warning(
                    "Background Task: Truncated conversation history for session %s from %s to %s chars.",
                    session_id_to_summarize,
                    original_len,
                    len(formatted_history),
                )

            summarization_prompt = f"""Kamu adalah Aika, AI pendamping dari UGM-AICare. Tugasmu adalah membuat ringkasan singkat dari percakapan sebelumnya dengan pengguna. Ringkasan ini akan kamu gunakan untuk mengingatkan pengguna tentang apa yang telah dibahas jika mereka bertanya \"apakah kamu ingat percakapan kita?\".

Buatlah ringkasan dalam 1-2 kalimat saja, dalam Bahasa Indonesia yang alami dan kasual, seolah-olah kamu sedang berbicara santai dengan teman. Fokus pada inti atau perasaan utama yang diungkapkan pengguna.
Hindari penggunaan daftar, poin-poin, judul seperti \"Poin Utama\", atau format markdown. Cukup tuliskan sebagai paragraf singkat yang mengalir.

Contoh output yang baik:
\"kita sempat ngobrolin soal kamu yang lagi ngerasa nggak nyaman karena pernah gagal memimpin organisasi.\"
\"kamu cerita tentang perasaanmu yang campur aduk setelah kejadian di kampus.\"
\"kita kemarin membahas tentang kesulitanmu mencari teman dan bagaimana itu membuatmu merasa kesepian.\"

Percakapan yang perlu diringkas:
{formatted_history}

Ringkasan singkat dan kasual:"""

            summary_llm_history = [{"role": "user", "content": summarization_prompt}]

            summary_text = await llm.generate_response(
                history=summary_llm_history,
                model="gemini_google",
                max_tokens=2048,
                temperature=0.5,
            )

            if summary_text.startswith("Error:"):
                logger.error(
                    "Background Task: LLM error during summarization for session %s: %s",
                    session_id_to_summarize,
                    summary_text,
                )
                raise RuntimeError("LLM error during summarization")

            new_summary = UserSummary(
                user_id=user_id,
                summarized_session_id=session_id_to_summarize,
                summary_text=summary_text.strip(),
                timestamp=datetime.now(),
            )
            db.add(new_summary)
            await db.commit()
            logger.info(
                "Background Task: Saved summary for user %s from session %s",
                user_id,
                session_id_to_summarize,
            )
            await invalidate_user_personal_context(user_id)

        except Exception as exc:  # pragma: no cover - defensive logging
            await db.rollback()
            logger.error(
                "Background Task: Failed to summarize session %s for user %s: %s",
                session_id_to_summarize,
                user_id,
                exc,
                exc_info=True,
            )


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
