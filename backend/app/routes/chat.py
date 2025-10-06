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
from app.core import llm
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.models import Conversation, User, UserSummary
from app.schemas.chat import ChatRequest, ChatResponse, ConversationHistoryItem
from app.services.chat_processing import (
    process_chat_event,
    process_chat_message,
)
from app.services.personal_context import (
    build_user_personal_context,
    invalidate_user_personal_context,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Chat"])

MIN_TURNS_FOR_SUMMARY = 2
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
    model_name = request.model or "gemini_google"
    return await llm.generate_response(
        history=history,
        model=model_name,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        system_prompt=system_prompt,
    )


async def _streaming_llm_responder(
    history: List[Dict[str, str]],
    system_prompt: Optional[str],
    request: ChatRequest,
    stream_callback: Optional[Callable[[str], Any]] = None,
) -> str:
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


@router.post("/chat", response_model=ChatResponse)
async def handle_chat_request(
    request: ChatRequest = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> ChatResponse:
    """Handle traditional REST chat requests."""

    session_id = request.session_id
    conversation_id = request.conversation_id

    try:
        personal_context = await build_user_personal_context(db, current_user)
        active_system_prompt = _compose_system_prompt(request.system_prompt, personal_context)

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
                llm_responder=_default_llm_responder,
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid request: Missing message or event payload")

        return ChatResponse(
            response=result.response_text,
            provider_used=result.provider_used,
            model_used=result.model_used,
            history=result.final_history,
            module_completed_id=result.module_completed_id,
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

            personal_context = await build_user_personal_context(db, user)
            active_system_prompt = _compose_system_prompt(chat_request.system_prompt, personal_context)

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
                    llm_responder=_streaming_llm_responder,
                    stream_callback=stream_callback,
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
