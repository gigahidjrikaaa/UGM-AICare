"""Chat endpoints covering REST requests and streaming WebSocket support."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, cast, AsyncGenerator
import hashlib

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
from app.core.rate_limiter import check_rate_limit_dependency, get_rate_limiter
from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.models import User  # Core model
from app.domains.mental_health.models import Conversation, UserSummary
from app.domains.mental_health.schemas.chat import ConversationHistoryItem, AikaRequest, AikaResponse
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
    metadata: Optional[Dict[str, Any]] = None
    
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
            for i, item in enumerate(request.history):
                # Skip the last message if it matches the current request message
                # This prevents double-input since frontend might send optimistic history
                if i == len(request.history) - 1 and item.content == request.message:
                    continue
                    
                if isinstance(item, dict):
                    conversation_history.append(item)
                else:
                    conversation_history.append({
                        "role": item.role,
                        "content": item.content,
                    })
        
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
        
        logger.info(
            f"🤖 Invoking Aika Agent (LangGraph) for user {current_user.id}, role={user_role}"
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
        result = await aika_agent.ainvoke(
            initial_state,
            config={
                "configurable": {
                    "thread_id": f"user_{current_user.id}_session_{session_id}"
                }
            }
        )
        
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

        # Best-effort memory write (consent-gated)
        await remember_from_user_message(db, current_user, request.message, source="conversation")

        return ChatProcessingResult(
            response_text=final_response,
            provider_used="aika-langgraph",
            model_used="gemini-2.0-flash-exp",
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


# ===================== NEW: AIKA META-AGENT ENDPOINT =====================

# ===================== NEW: AIKA META-AGENT ENDPOINT (STREAMING) =====================

@router.post("/aika", response_class=StreamingResponse, dependencies=[Depends(check_rate_limit_dependency)])
async def handle_aika_request(
    request: AikaRequest = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> StreamingResponse:
    """
    🌟 Aika Meta-Agent Endpoint (Streaming)
    
    Routes requests through Aika's orchestration graph with real-time SSE updates.
    
    **SSE Events:**
    - `agent_start`: When an agent starts working
    - `agent_update`: Progress updates from agents
    - `agent_complete`: When an agent finishes
    - `final_response`: The final text response
    - `metadata`: Final execution metadata
    - `error`: If something goes wrong
    """
    
    # Validate user_id matches authenticated user
    if request.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="user_id in request must match authenticated user"
        )
    
    logger.info(
        f"🤖 Processing Aika request via unified orchestrator (STREAMING): "
        f"user={request.user_id}, role={request.role}, msg_len={len(request.message)}"
    )
    
    async def event_generator() -> AsyncGenerator[str, None]:
        execution_id = None
        try:
            start_time = datetime.now()
            
            # Determine effective session ID
            effective_session_id = request.session_id or f"sess_{request.user_id}_{int(datetime.now().timestamp())}"
            
            # Start execution tracking
            execution_id = execution_tracker.start_execution(
                graph_id="aika_unified_graph",
                agent_name="aika",
                input_data={
                    "user_id": request.user_id,
                    "message": request.message,
                    "role": request.role,
                    "session_id": effective_session_id
                }
            )
            
            # Create Aika agent with app-lifetime checkpointing (Postgres when available)
            checkpointer = get_langgraph_checkpointer()
            if checkpointer is None:
                from langgraph.checkpoint.memory import MemorySaver
                checkpointer = MemorySaver()
            aika_agent = create_aika_agent_with_checkpointing(db, checkpointer=checkpointer)

            # Inject user-controlled cross-conversation memory facts (consent-gated for agent use)
            user_obj = await db.get(User, request.user_id)
            remembered_facts = (
                await list_user_fact_texts_for_agent(db, user_obj, limit=20)
                if user_obj is not None
                else []
            )
            
            # Generate user hash for privacy
            import hashlib
            user_hash = hashlib.sha256(f"user_{request.user_id}".encode()).hexdigest()[:16]
            
            # Prepare initial state
            initial_state = {
                "user_id": request.user_id,
                "user_role": request.role,
                "user_hash": user_hash,
                "message": request.message,
                "conversation_history": request.conversation_history,
                "session_id": effective_session_id,
                "personal_context": {
                    "remembered_facts": remembered_facts,
                },
                "execution_id": execution_id,  # ✅ Added for tracking
                "execution_path": [],
                "agents_invoked": [],
                "errors": [],
            }
            
            config = {
                "configurable": {
                    "thread_id": f"user_{request.user_id}_session_{effective_session_id}"
                }
            }
            
            # Stream events from LangGraph
            final_state = None
            
            async for event in aika_agent.astream_events(
                initial_state,
                config=config,
                version="v2"
            ):
                kind = event["event"]
                
                # Handle different event types
                if kind == "on_chain_start":
                    if event["name"] == "LangGraph":
                        continue
                        
                elif kind == "on_chain_end":
                    if event["name"] == "LangGraph":
                        # Capture final state
                        final_state = event["data"].get("output")
                        
                elif kind == "on_chat_model_stream":
                    # Stream tokens if needed (optional, adds verbosity)
                    pass
                    
                elif kind == "on_tool_start":
                    # Notify tool usage
                    yield f"event: agent_update\ndata: {json.dumps({'status': 'tool_start', 'tool': event['name']})}\n\n"
                    
                elif kind == "on_tool_end":
                    yield f"event: agent_update\ndata: {json.dumps({'status': 'tool_end', 'tool': event['name']})}\n\n"

                # NEW: Handle custom events from tool_calling.py for transparency
                elif kind == "on_custom_event":
                    if event["name"] == "partial_response":
                        text = event["data"]["text"]
                        # Send as a special event that frontend can interpret as "append text"
                        yield f"event: agent_update\ndata: {json.dumps({'status': 'partial_response', 'text': text})}\n\n"
                    
                    elif event["name"] == "tool_use":
                        tools = event["data"]["tools"]
                        yield f"event: agent_update\ndata: {json.dumps({'status': 'tool_use', 'tools': tools})}\n\n"

                # Custom node events (mapped from graph node names)
                if kind == "on_chain_start" and event["name"] in ["aika_decision_node", "execute_sta_subgraph", "execute_sca_subgraph", "execute_sda_subgraph", "synthesize_final_response"]:
                    node_name = event["name"]
                    agent_name = {
                        "aika_decision_node": "Aika",
                        "execute_sta_subgraph": "STA",
                        "execute_sca_subgraph": "TCA",
                        "execute_sda_subgraph": "CMA",
                        "synthesize_final_response": "Aika"
                    }.get(node_name, "System")
                    
                    yield f"event: agent_start\ndata: {json.dumps({'agent': agent_name, 'node': node_name})}\n\n"

            # Process final result
            if final_state:
                final_response = final_state.get("final_response") or final_state.get("response") or "Maaf, terjadi kesalahan."
                response_source = final_state.get("response_source", "unknown")
                agents_invoked = final_state.get("agents_invoked", [])
                
                processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
                
                # Build metadata
                metadata = {
                    "session_id": final_state.get("session_id", request.session_id),
                    "agents_invoked": agents_invoked,
                    "response_source": response_source,
                    "processing_time_ms": processing_time_ms,
                    "execution_path": final_state.get("execution_path", []),
                    "agent_reasoning": final_state.get("agent_reasoning", ""),
                    "intent": final_state.get("intent", "unknown"),
                    "intent_confidence": final_state.get("intent_confidence", 0.0),
                    "needs_agents": final_state.get("needs_agents", False),
                }
                
                # Add risk info
                # Debug: Add keys to metadata
                metadata["debug_keys"] = list(final_state.keys())
                metadata["debug_immediate_risk"] = final_state.get("immediate_risk_level")
                metadata["debug_severity"] = final_state.get("severity")

                if final_state.get("sta_risk_assessment"):
                    metadata["risk_level"] = final_state["sta_risk_assessment"].get("risk_level", "unknown")
                    metadata["risk_score"] = final_state["sta_risk_assessment"].get("risk_score", 0.0)
                elif final_state.get("severity"):
                    metadata["risk_level"] = final_state.get("severity")
                    metadata["risk_score"] = final_state.get("risk_score", 0.0)
                else:
                    # Fallback to immediate risk from Aika (Tier 1) if STA hasn't run yet
                    metadata["risk_level"] = final_state.get("immediate_risk_level", "unknown")
                    metadata["risk_score"] = 0.0 # No score from Tier 1
                
                # Hack: If CMA invoked, force risk to high/critical if unknown (inference from routing)
                if "CMA" in agents_invoked and metadata["risk_level"] == "unknown":
                     metadata["risk_level"] = "high"
                
                # Send final response
                yield f"event: final_response\ndata: {json.dumps({'response': final_response})}\n\n"
                
                # Send metadata
                yield f"event: metadata\ndata: {json.dumps(metadata)}\n\n"
                
                # Save conversation to DB
                import uuid
                conversation_entry = Conversation(
                    user_id=request.user_id,
                    session_id=effective_session_id,
                    conversation_id=str(uuid.uuid4()),
                    message=request.message,
                    response=final_response,
                    timestamp=datetime.now()
                )
                db.add(conversation_entry)
                
                # Log metadata since we can't store it in the model yet
                logger.info(f"Conversation metadata: {json.dumps(metadata)}")
                
                # Commit DB changes
                await db.commit()
                
                # Complete execution tracking
                if execution_id:
                    execution_tracker.complete_execution(
                        execution_id, 
                        success=True, 
                        output_data={
                            "response": final_response,
                            "agents_invoked": agents_invoked
                        }
                    )
                
            else:
                if execution_id:
                    execution_tracker.complete_execution(execution_id, success=False, error="No final state received")
                yield f"event: error\ndata: {json.dumps({'message': 'No final state received'})}\n\n"
        
        except asyncio.CancelledError:
            logger.warning(f"Client disconnected during Aika request for user {request.user_id}")
            if execution_id:
                execution_tracker.complete_execution(execution_id, success=False, error="Client disconnected (Cancelled)")
            raise
                
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            if execution_id:
                execution_tracker.complete_execution(execution_id, success=False, error=str(e))
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ===================== EXISTING LEGACY CHAT ENDPOINT =====================

# ===================== LEGACY ENDPOINTS REMOVED =====================
# The /chat and /chat/ws endpoints have been removed in favor of the unified
# Aika Meta-Agent endpoint (/api/v1/aika) which supports streaming.
# ====================================================================



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
