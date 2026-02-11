"""Unified Aika Orchestrator Graph - LangGraph with Aika as First Decision Node.

This module implements the ideal architecture where Aika is the first LangGraph node
that intelligently decides whether specialized agents are needed.

Architecture:
    START → aika_decision_node → [needs_agents?]
                                   ↓               ↓
                              [YES: STA]      [NO: END]
                                   ↓
                            [Conditional: TCA/CMA]
                                   ↓
                                 END

Enhanced with Conversational Intelligence Extraction (CIE):
    - Parallel screening runs alongside normal conversation
    - Seamlessly extracts mental health indicators
    - Builds longitudinal screening profile
    - Triggers proactive interventions when warranted

Benefits:
- Single unified LangGraph workflow
- Aika personality throughout
- Smart conditional routing (only invoke agents when needed)
- Covert mental health screening without explicit questions
- Better execution tracking
- Easier debugging
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, TYPE_CHECKING, Protocol, cast

from langgraph.graph import StateGraph, END
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types

from app.agents.graph_state import AikaOrchestratorState, IAState
from app.agents.execution_tracker import execution_tracker
# Import identity module at runtime to avoid circular imports
from app.core.llm import generate_response
from app.core.langfuse_config import trace_agent

# Lazy imports to avoid circular dependencies
if TYPE_CHECKING:
    from app.agents.sta.sta_graph import create_sta_graph
    from app.agents.tca.tca_graph import create_tca_graph
    from app.agents.cma.cma_graph import create_cma_graph
    from app.agents.ia.ia_graph import create_ia_graph

logger = logging.getLogger(__name__)


class _AsyncInvokable(Protocol):
    async def ainvoke(self, input: Any, *args: Any, **kwargs: Any) -> Any: ...


def _get_aika_prompts():
    """Lazy load Aika system prompts to avoid circular imports."""
    try:
        from app.agents.aika.identity import AIKA_SYSTEM_PROMPTS
        return AIKA_SYSTEM_PROMPTS
    except ImportError:
        # Fallback prompts if import fails
        return {
            "student": "You are Aika, a warm and empathetic mental health assistant for Indonesian university students.",
            "counselor": "You are Aika, an AI assistant helping counselors with case management and clinical insights.",
            "admin": "You are Aika, providing analytics and insights for platform administrators."
        }


def _normalize_user_role(role: str) -> str:
    """Normalize user role to match AIKA_SYSTEM_PROMPTS keys.
    
    Maps frontend role values to Aika's expected role keys:
    - "user" -> "student" (most common case)
    - "counselor" -> "counselor" (unchanged)
    - "admin" -> "admin" (unchanged)
    
    Args:
        role: Raw role from request
        
    Returns:
        Normalized role that matches AIKA_SYSTEM_PROMPTS keys
    """
    role_mapping = {
        "user": "student",
        "counselor": "counselor",
        "admin": "admin"
    }
    return role_mapping.get(role, "student")  # Default to student


def _format_personal_memory_block(state: AikaOrchestratorState) -> str:
    """Format user-consented memory facts for prompt injection.

    The source of truth is `state["personal_context"]["remembered_facts"]`.
    """
    personal_context = state.get("personal_context") or {}
    facts = personal_context.get("remembered_facts") or []
    if not isinstance(facts, list) or not facts:
        return ""

    # Keep it compact; the user can inspect/delete these in Profile.
    rendered = [str(f).strip() for f in facts if str(f).strip()]
    rendered = rendered[:20]
    if not rendered:
        return ""

    return (
        "User memory (user-provided, reviewable in Profile; use only if relevant):\n"
        + "\n".join(f"- {f}" for f in rendered)
    )


@trace_agent("AikaDecision")
async def aika_decision_node(
    state: AikaOrchestratorState,
    db: AsyncSession
) -> AikaOrchestratorState:
    """Aika Decision Node - First node in the unified orchestrator.
    
    This node embodies Aika's personality and intelligence:
    1. Analyzes user message with role-aware system prompt
    2. Classifies intent and determines urgency
    3. Decides if specialized agents are needed
    4. Provides direct response if agents not needed
    
    Decision Logic:
    - Simple greetings/casual chat → Direct response (no agents)
    - Emotional distress/crisis signals → Invoke agents (STA → TCA/CMA)
    - Complex queries (admin analytics) → Invoke agents (IA)
    - Appointment requests → Direct response with tool calling
    
    Args:
        state: Current orchestrator state
        db: Database session
        
    Returns:
        Updated state with:
        - intent: Classified user intent
        - needs_agents: Boolean decision
        - aika_direct_response: Response if no agents needed
        - agent_reasoning: Explanation of decision
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "aika::decision", "aika")
    
    start_time = time.time()
    
    try:
        # Get role-specific system prompt (lazy loaded)
        AIKA_SYSTEM_PROMPTS = _get_aika_prompts()
        user_role = state.get("user_role", "user")
        normalized_role = _normalize_user_role(user_role)
        system_instruction = AIKA_SYSTEM_PROMPTS.get(normalized_role, AIKA_SYSTEM_PROMPTS["student"])

        personal_memory_block = _format_personal_memory_block(state)

        current_message = state.get("message") or ""
        
        # Prepare conversation history for Gemini
        history_contents = []
        for msg in state.get("conversation_history") or []:
            role = "user" if msg.get("role") == "user" else "model"
            history_contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=msg.get("content", ""))]
                )
            )
        
        # Add current message
        history_contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=current_message)]
            )
        )
        
        # Create specialized decision prompt
        decision_prompt = f"""
Analyze this message and determine the next step.

User Role: {user_role}
Message: {current_message}

Decision Criteria:

FOR STUDENTS (user):
- ASSESS AND ROUTE DIRECTLY:
  * Aika is the primary responder for ALL student interactions.
  * Aika handles emotional support, crisis de-escalation, and appointment booking directly using tools.
  * Route to TCA or CMA directly if needed. DO NOT route to STA synchronously.
  * Background processes will handle deep risk analysis later.

FOR ADMINS:
- NEEDS AGENTS (invoke IA for analytics):
  * Requests complex data/analytics ("trending topics", "case statistics")
  * Aggregated reports requiring specialized processing
  * Questions about system usage, user engagement, or mental health trends

- NEEDS AGENTS (invoke STA for manual risk check):
  * Explicit requests to analyze risk for a specific text or user.
  * "Check if this message is risky: ..."
  
- NO AGENTS NEEDED:
  * Simple status checks ("is system healthy?")
  * General platform questions
  * Specific user lookups (Aika can use tools for this)

FOR COUNSELORS:
- NEEDS AGENTS (invoke CMA for case management):
  * Requests to CREATE or MODIFY cases
  * Clinical insights requiring deep analysis
  
- NEEDS AGENTS (invoke IA for analytics):
  * Requests for population-level insights or trends
  * "How many students are stressed this week?"

- NEEDS AGENTS (invoke STA for manual risk check):
  * "Analyze the risk level of this student input..."
  * "Is this text suicidal?"
  
- NO AGENTS NEEDED:
  * General clinical questions
  * Viewing patient data (Aika can use tools)

Return JSON with:
{{
  "intent": "string (MUST be one of: 'casual_chat', 'emotional_support', 'crisis_intervention', 'information_inquiry', 'appointment_scheduling', 'emergency_escalation', 'analytics_query')",
  "intent_confidence": float (0.0-1.0),
  "needs_agents": boolean,
  "next_step": "string (MUST be one of: 'tca', 'cma', 'ia', 'sta', 'none')",
  "reasoning": "string explaining decision",
  "suggested_response": "string (only if needs_agents=false, provide direct response)",
  
  "immediate_risk": "none|low|moderate|high|critical",
  "crisis_keywords": ["list of crisis keywords found, empty if none"],
  "risk_reasoning": "Brief 1-sentence explanation of risk assessment",

  "analytics_params": {{
      "question_id": "string (MUST be one of: 'crisis_trend', 'dropoffs', 'resource_reuse', 'fallback_reduction', 'cost_per_helpful', 'coverage_windows')",
      "start_date": "YYYY-MM-DD (default to 30 days ago if not specified)",
      "end_date": "YYYY-MM-DD (default to today if not specified)"
  }}
}}

INTENT DEFINITIONS:
- 'casual_chat': Greetings, small talk, thanks, closing conversation.
- 'emotional_support': Venting, sharing feelings, relationship issues, stress (non-crisis).
- 'crisis_intervention': Self-harm, suicide, severe danger, "want to die".
- 'information_inquiry': Questions about mental health concepts, app features, or general info.
- 'appointment_scheduling': Requests to book, check, or manage appointments with counselors.
- 'emergency_escalation': Explicit request for immediate human help or emergency services.
- 'analytics_query': Requests for data, statistics, trends, or reports (Admin/Counselor only).

IMMEDIATE RISK ASSESSMENT CRITERIA:
- "critical": Explicit suicide plan/intent with method and timeframe OR active crisis in progress.
  Examples: "I'm going to kill myself tonight", "I have pills ready to overdose"
  * IMPORTANT: If conversation history shows recent suicide threat, MAINTAIN "critical" or "high" risk until explicitly de-escalated.
  
- "high": Strong self-harm ideation or active suicidal thoughts
  Examples: "I keep thinking about cutting myself", "I want to die", "bunuh diri"
  
- "moderate": Significant emotional distress with concerning patterns
  Examples: "I feel completely hopeless", "nothing matters anymore", "tidak ada gunanya hidup"
  
- "low": Stress/anxiety without crisis indicators
  Examples: "I'm stressed about exams", "feeling anxious about presentation"
  
- "none": No distress signals
  Examples: "Hello, how are you?", "What is CBT?", "Thanks for the help", "Do you know me?"

CRISIS KEYWORDS TO DETECT (Indonesian + English):
suicide, bunuh diri, kill myself, end my life, tidak ingin hidup lagi, 
self-harm, cutting, mutilasi diri, menyakiti diri, overdose, 
jump from building, loncat dari gedung, gantung diri, hanging,
want to die, mau mati, ingin mati, etc.
"""

        if personal_memory_block:
            decision_prompt = f"{decision_prompt}\n\n{personal_memory_block}"
        
        # Call Gemini for decision with fallback support
        from app.core.llm import generate_gemini_response_with_fallback, DEFAULT_GEMINI_MODEL
        
        # Use user's preferred model or default
        preferred_model = state.get("preferred_model") or DEFAULT_GEMINI_MODEL
        logger.info(f"🤖 Aika decision using model: {preferred_model}")
        
        # Convert to history format for fallback function
        decision_history = [
            {"role": "user", "content": decision_prompt}
        ]
        
        response_text = await generate_gemini_response_with_fallback(
            history=decision_history,
            model=preferred_model,  # Use preferred model with fallback chain
            temperature=0.3,
            max_tokens=2048,
            system_prompt=system_instruction,
            json_mode=True  # Force valid JSON output
        )
        
        # Parse decision (response_text is already a string from fallback function)
        import json
        import re
        
        # Clean up markdown code blocks if present
        cleaned_text = response_text.strip()
        if "```" in cleaned_text:
            # Remove ```json ... ``` or just ``` ... ```
            cleaned_text = re.sub(r'^```(?:json)?\s*', '', cleaned_text, flags=re.MULTILINE)
            cleaned_text = re.sub(r'\s*```$', '', cleaned_text, flags=re.MULTILINE)
            cleaned_text = cleaned_text.strip()
            
        try:
            decision = json.loads(cleaned_text)
            
            # Validate required fields
            required_fields = ["intent", "needs_agents"]
            if not all(field in decision for field in required_fields):
                logger.warning(f"Gemini decision missing fields: {decision}")
                # Fallback logic will handle this
                raise ValueError("Missing required fields")
            
            state["intent"] = decision.get("intent", "unknown")
            state["intent_confidence"] = decision.get("intent_confidence", 0.5)
            
            # Parse next_step from decision
            next_step = decision.get("next_step", "none").lower()
            
            # Logic for Students: Direct routing, NO STA synchronous
            if normalized_role == "student":
                if next_step in ("tca", "cma"):
                    state["needs_agents"] = True
                    state["next_step"] = next_step
                elif next_step == "sta":
                    # Override STA for students - handle directly or route to TCA if moderate
                    if decision.get("immediate_risk") in ("moderate", "high", "critical"):
                         state["needs_agents"] = True
                         state["next_step"] = "cma" if decision.get("immediate_risk") in ("high", "critical") else "tca"
                    else:
                         state["needs_agents"] = False
                         state["next_step"] = "none"
                else:
                    state["needs_agents"] = False
                    state["next_step"] = "none"
            else:
                # Admin/Counselor logic
                state["needs_agents"] = decision.get("needs_agents", False)
                state["next_step"] = next_step
                
            state["agent_reasoning"] = decision.get("reasoning", "No reasoning provided")
            
            # ========================================================================
            # TWO-TIER RISK MONITORING: Parse immediate risk fields (Tier 1)
            # ========================================================================
            state["immediate_risk_level"] = decision.get("immediate_risk", "none")
            state["crisis_keywords_detected"] = decision.get("crisis_keywords", [])
            
            # ========================================================================
            # ANALYTICS PARAMS (for IA)
            # ========================================================================
            if decision.get("intent") == "analytics_query" and "analytics_params" in decision:
                params = decision["analytics_params"]
                state["question_id"] = params.get("question_id")
                
                # Parse dates
                from datetime import datetime, timedelta
                try:
                    if params.get("start_date"):
                        state["start_date"] = datetime.strptime(params["start_date"], "%Y-%m-%d")
                    else:
                        state["start_date"] = datetime.now() - timedelta(days=30)
                        
                    if params.get("end_date"):
                        state["end_date"] = datetime.strptime(params["end_date"], "%Y-%m-%d")
                    else:
                        state["end_date"] = datetime.now()
                except Exception as e:
                    logger.warning(f"Failed to parse analytics dates: {e}")
                    state["start_date"] = datetime.now() - timedelta(days=30)
                    state["end_date"] = datetime.now()

            state["risk_reasoning"] = decision.get("risk_reasoning", "")
            
            # Detect conversation end - Method 1: Time-based inactivity (5 minutes)
            now_ts = time.time()
            previous_timestamp = state.get("last_message_timestamp")
            conversation_ended = False
            if previous_timestamp:
                inactive_duration = now_ts - previous_timestamp
                if inactive_duration > 300:  # 5 minutes
                    conversation_ended = True
                    logger.info(
                        f"⏱️ Conversation ended: Inactive for {inactive_duration:.0f}s"
                    )

            # Update timestamp after computing inactivity delta
            state["last_message_timestamp"] = now_ts

            # Detect conversation end - Method 2: Explicit goodbye signals
            message_lower = state.get("message", "").lower()
            end_signals = [
                "goodbye", "bye", "terima kasih banyak", "sampai jumpa", 
                "selesai", "sudah cukup", "thanks bye", "see you", "sampai nanti"
            ]
            if any(signal in message_lower for signal in end_signals):
                conversation_ended = True
                logger.info(f"👋 Conversation ended: Explicit goodbye detected")

            state["conversation_ended"] = conversation_ended
            
            # Auto-escalate to CMA if high/critical immediate risk detected
            # REFACTOR: Direct routing logic based on risk level
            if state["immediate_risk_level"] in ("high", "critical"):
                state["needs_cma_escalation"] = True
                state["next_step"] = "cma"
                state["needs_agents"] = True
                logger.warning(
                    f"🚨 IMMEDIATE CRISIS DETECTED: {state['immediate_risk_level']} "
                    f"(keywords: {state['crisis_keywords_detected']}) "
                    f"- Auto-escalating to CMA"
                )
            elif state["immediate_risk_level"] == "moderate":
                state["next_step"] = "tca"
                state["needs_agents"] = True
                logger.info(f"⚠️ Moderate risk detected - Routing to TCA")
            elif state["immediate_risk_level"] == "low" and state["intent"] in ("emotional_support", "crisis"):
                 state["next_step"] = "tca"
                 state["needs_agents"] = True
                 logger.info(f"ℹ️ Low risk support requested - Routing to TCA")
            elif state["intent"] == "analytics_query" and normalized_role in ("admin", "counselor"):
                 state["next_step"] = "ia"
                 state["needs_agents"] = True
                 logger.info(f"📊 Analytics query detected - Routing to IA")
            else:
                state["needs_cma_escalation"] = False
                # If needs_agents was set to True by LLM but risk is None/Low (and not support), 
                # we might want to respect LLM's decision or override it.
                # For now, let's trust the LLM's 'needs_agents' but default next_step to 'tca' if it says yes.
                if state["needs_agents"] and not state.get("next_step"):
                     # Check if it might be an analytics query that wasn't explicitly caught
                     if normalized_role in ("admin", "counselor") and "analytics" in str(state.get("agent_reasoning", "")).lower():
                         state["next_step"] = "ia"
                     else:
                         # Default fallback if LLM says needs_agents but didn't specify next_step
                         state["next_step"] = "tca" 

            
            # Log risk assessment
            if state["immediate_risk_level"] != "none":
                logger.info(
                    f"⚠️ Immediate Risk: {state['immediate_risk_level']} "
                    f"(reasoning: {state['risk_reasoning'][:100]})"
                )
            
            # If agents not needed, store direct response
            if not state["needs_agents"]:
                # Get preferred model from state (use same default as decision node)
                from app.core.llm import select_gemini_model

                preferred_model = select_gemini_model(
                    intent=state.get("intent"),
                    role=normalized_role,
                    has_tools=True,
                    preferred_model=state.get("preferred_model"),
                )
                state["preferred_model"] = preferred_model
                
                # ================================================================
                # SCREENING AWARENESS: Enhance prompt with natural probing guidance
                # Only for students - gives Aika awareness of information gaps
                # ================================================================
                screening_prompt_addition = ""
                gap_analysis = None
                
                user_id = state.get("user_id")
                if normalized_role == "student" and isinstance(user_id, int) and user_id > 0:
                    try:
                        from app.agents.aika.screening_awareness import (
                            get_screening_aware_prompt_addition
                        )
                        screening_prompt_addition, gap_analysis = await get_screening_aware_prompt_addition(
                            db=db,
                            user_id=user_id,
                            conversation_history=state.get("conversation_history", []),
                            current_message=state.get("message", ""),
                            session_id=state.get("session_id"),
                        )
                        
                        if screening_prompt_addition:
                            logger.debug(
                                f"🔍 Screening awareness added for user {state.get('user_id')}: "
                                f"suggested_probe={gap_analysis.suggested_probe.dimension.value if gap_analysis and gap_analysis.suggested_probe else 'none'}"
                            )
                    except Exception as e:
                        logger.warning(f"Screening awareness failed (non-blocking): {e}")
                
                # Build enhanced system instruction with screening awareness
                enhanced_system_instruction = system_instruction
                if screening_prompt_addition:
                    enhanced_system_instruction = f"{system_instruction}\n\n{screening_prompt_addition}"

                # Inject user-consented memory facts for grounding
                if personal_memory_block:
                    enhanced_system_instruction = f"{enhanced_system_instruction}\n\n{personal_memory_block}"
                
                # Enable ReAct: Use generate_with_tools instead of simple generate_response
                from app.domains.mental_health.services.tool_calling import generate_with_tools
                from app.domains.mental_health.schemas.chat import ChatRequest
                
                # Construct ChatRequest for tool calling service
                # We need a valid ChatRequest object to use the service
                chat_request = ChatRequest(
                    google_sub=str(state.get("user_id", 0)),
                    session_id=state.get("session_id", "unknown_session"),
                    conversation_id=state.get("conversation_id") or "unknown_conversation",
                    message=state.get("message", ""),
                    history=state.get("conversation_history", []),
                    model=preferred_model,
                    temperature=0.7
                )
                
                # Generate response with potential tool usage (ReAct loop)
                response_text, tool_calls = await generate_with_tools(
                    history=[
                        {"role": h.get("role", "user"), "content": h.get("content", "")}
                        for h in state.get("conversation_history", [])
                    ] + [
                        {"role": "user", "content": state.get("message", "")}
                    ],
                    system_prompt=enhanced_system_instruction,
                    request=chat_request,
                    db=db,
                    user_id=state.get("user_id", 0),
                    max_tool_iterations=5,
                    execution_id=execution_id
                )
                
                state["aika_direct_response"] = response_text
                state["final_response"] = response_text
                
                if tool_calls:
                    state["response_source"] = "aika_react_tools"
                    state["agents_invoked"] = ["AikaTools"] # Mark that tools were used
                    state["tool_calls"] = tool_calls
                else:
                    state["response_source"] = "aika_direct"
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Gemini decision JSON: {e}")
            logger.debug(f"Raw response text: {response_text[:200]}...")
            # Fallback: assume agents needed for safety
            state["intent"] = "unknown"
            state["needs_agents"] = True
            state["agent_reasoning"] = "JSON parse failed, defaulting to agent invocation for safety"
        
        # Track execution
        state.setdefault("execution_path", []).append("aika_decision")
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id,
                "aika::decision",
                metrics={
                    "intent": state.get("intent"),
                    "needs_agents": state.get("needs_agents"),
                    "duration_ms": elapsed_ms
                }
            )
        
        logger.info(
            f"🤖 Aika Decision: intent={state.get('intent')}, "
            f"needs_agents={state.get('needs_agents')}, "
            f"duration={elapsed_ms:.0f}ms"
        )
        
        # ========================================================================
        # TWO-TIER RISK MONITORING: Trigger background STA analysis if conversation ended
        # ========================================================================
        # STA now also handles screening extraction (merged from SCA) in the same
        # LLM call to avoid redundant API calls. The screening profile is updated
        # inside trigger_sta_conversation_analysis_background() after analysis.
        if state.get("conversation_ended", False):
            logger.info("🔍 Conversation ended - triggering background STA analysis (includes screening)")
            # Fire-and-forget: create background task without awaiting
            asyncio.create_task(trigger_sta_conversation_analysis_background(state.copy(), db))
        
    except Exception as e:
        error_msg = f"Aika decision node failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        
        # Check for Rate Limit / Overload (Graceful Fallback)
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "All Gemini models failed" in error_str:
            logger.warning("⚠️ Rate limit hit in decision node. Returning graceful fallback.")
            
            # Graceful fallback: Keep as Aika, don't escalate to TCA
            state["needs_agents"] = False
            state["intent"] = "system_busy" 
            state["intent_confidence"] = 1.0
            state["immediate_risk_level"] = "none"
            state["risk_score"] = 0.0
            
            # Polite fallback response
            state["aika_direct_response"] = (
                "Maaf ya, saat ini aku sedang melayani banyak teman-teman lain. "
                "Boleh coba kirim pesan lagi dalam 1 menit? "
                "Kalau kamu butuh bantuan darurat, jangan ragu hubungi Crisis Centre UGM."
            )
            state["agent_reasoning"] = f"System overloaded (Rate Limit), returning graceful fallback: {error_str}"
            
            if execution_id:
                # Mark as warning instead of fail if possible, or just complete with fallback
                execution_tracker.complete_node(
                    execution_id, 
                    "aika::decision", 
                    metrics={"fallback": "rate_limit"}
                )
        else:
            # Standard Fallback: invoke agents for safety (unknown error)
            state["needs_agents"] = True
            state["agent_reasoning"] = f"Error occurred, invoking agents for safety: {str(e)}"
            
            if execution_id:
                execution_tracker.fail_node(execution_id, "aika::decision", str(e))
    
    return state


async def trigger_sta_conversation_analysis_background(
    state: AikaOrchestratorState,
    db: AsyncSession
) -> None:
    """Background task to analyze conversation when it ends (fire-and-forget).
    
    This runs asynchronously without blocking the user's response.
    Analyzes full conversation history and stores assessment in database.
    
    Args:
        state: Current orchestrator state with conversation history
        db: Database session for storing assessment
    """
    try:
        from app.agents.sta.conversation_analyzer import analyze_conversation_risk
        from app.domains.mental_health.models.assessments import ConversationRiskAssessment
        from app.domains.mental_health.services.conversation_assessments import (
            upsert_conversation_assessment,
        )
        
        # Skip if already analyzed
        if state.get("sta_analysis_completed", False):
            logger.debug("STA conversation analysis already completed, skipping background task")
            return
        
        # Get conversation metadata
        conversation_id = state.get("conversation_id")
        user_id = state.get("user_id")
        conversation_start = state.get("started_at")
        start_timestamp = conversation_start.timestamp() if conversation_start else None
        
        force_refresh = state.get("force_sta_reanalysis", False)

        if conversation_id and not force_refresh:
            existing_query = await db.execute(
                select(ConversationRiskAssessment).where(
                    ConversationRiskAssessment.conversation_id == conversation_id
                )
            )
            existing_record = existing_query.scalars().first()
            if existing_record:
                logger.info(
                    "🛈 STA conversation assessment already exists for %s (record id=%s). Skipping.",
                    conversation_id,
                    existing_record.id,
                )
                return

        logger.info(
            f"🔍 [BACKGROUND] Starting STA conversation analysis for "
            f"conversation_id={conversation_id}, user_id={user_id}"
        )
        
        # Perform deep analysis (use same default model as decision node)
        from app.core.llm import DEFAULT_GEMINI_MODEL as _STA_DEFAULT_MODEL
        assessment = await analyze_conversation_risk(
            conversation_history=state.get("conversation_history", []),
            current_message=state.get("message", ""),
            user_context=state.get("personal_context") or {},
            conversation_start_time=start_timestamp or time.time(),
            preferred_model=state.get("preferred_model") or _STA_DEFAULT_MODEL
        )
        
        assessment_record = None
        if conversation_id:
            assessment_record = await upsert_conversation_assessment(
                db,
                conversation_id=conversation_id,
                session_id=state.get("session_id"),
                user_id=user_id,
                assessment=assessment,
                force_refresh=bool(force_refresh),
            )
        else:
            # Ensure pending transactions are flushed even when no persistence occurs
            await db.flush()
        
        # Log results for monitoring
        logger.info(
            f"📊 [BACKGROUND] STA Conversation Assessment Complete:\n"
            f"   Conversation ID: {conversation_id}\n"
            f"   User ID: {user_id}\n"
            f"   Messages Analyzed: {assessment.message_count_analyzed}\n"
            f"   Overall Risk: {assessment.overall_risk_level}\n"
            f"   Risk Trend: {assessment.risk_trend}\n"
            f"   CMA Recommended: {assessment.should_invoke_cma}\n"
            f"   Duration: {assessment.conversation_duration_seconds:.0f}s\n"
            f"   Summary: {assessment.conversation_summary[:150]}..."
        )

        if assessment_record:
            logger.info(
                "💾 Conversation assessment stored with id=%s (session_id=%s)",
                assessment_record.id,
                assessment_record.session_id,
            )
        
        # ====================================================================
        # SCREENING PROFILE UPDATE (Using validated psychological instruments)
        # ====================================================================
        # Update screening profile with extracted dimensions from conversation
        # Based on: PHQ-9, GAD-7, DASS-21, PSQI, UCLA-LS3, RSES, AUDIT, C-SSRS
        if user_id and assessment.screening:
            try:
                from app.domains.mental_health.screening import (
                    update_screening_profile,
                    ExtractionResult,
                )
                
                # Convert STA screening extraction to ExtractionResult format
                extraction_result = ExtractionResult()
                extraction_result.crisis_detected = assessment.crisis_detected
                extraction_result.confidence = 0.8  # High confidence from full conversation
                
                # Map dimension scores to extraction result
                dimension_mapping = [
                    ("depression", assessment.screening.depression),
                    ("anxiety", assessment.screening.anxiety),
                    ("stress", assessment.screening.stress),
                    ("sleep", assessment.screening.sleep),
                    ("social", assessment.screening.social),
                    ("academic", assessment.screening.academic),
                    ("self_worth", assessment.screening.self_worth),
                    ("substance", assessment.screening.substance),
                    ("crisis", assessment.screening.crisis),
                ]
                
                for dim_name, dim_score in dimension_mapping:
                    if dim_score is not None:
                        if dim_score.is_protective:
                            extraction_result.protective_updates[dim_name] = dim_score.score
                        else:
                            extraction_result.dimension_updates[dim_name] = dim_score.score
                        
                        # Add indicators for logging
                        for evidence in dim_score.evidence:
                            extraction_result.indicators_found.append({
                                "dimension": dim_name,
                                "weight": dim_score.score,
                                "is_protective": dim_score.is_protective,
                                "excerpt": evidence[:100],
                            })
                
                # Update the screening profile if we have any dimension data
                if extraction_result.dimension_updates or extraction_result.protective_updates:
                    screening_profile = await update_screening_profile(
                        db=db,
                        user_id=user_id,
                        extraction_result=extraction_result,
                        session_id=state.get("session_id"),
                        decay_factor=0.95  # Slow decay for longitudinal tracking
                    )
                    
                    logger.info(
                        f"📊 [BACKGROUND] Screening profile updated from STA analysis:\n"
                        f"   User ID: {user_id}\n"
                        f"   Risk Level: {screening_profile.overall_risk_level.value}\n"
                        f"   Primary Concerns: {screening_profile.primary_concerns}\n"
                        f"   Requires Attention: {screening_profile.requires_attention}"
                    )
                else:
                    logger.debug(
                        f"📊 [BACKGROUND] No screening indicators extracted for user {user_id}"
                    )
                    
            except Exception as screening_err:
                logger.warning(
                    f"[BACKGROUND] Screening profile update failed (non-critical): {screening_err}"
                )
        
        state["sta_analysis_completed"] = True
        state["conversation_assessment"] = assessment.model_dump()
        
        # If CMA escalation needed, log alert (actual invocation handled in next conversation)
        if assessment.should_invoke_cma:
            logger.warning(
                f"🚨 [BACKGROUND] STA recommends CMA escalation for conversation {conversation_id}\n"
                f"   Reasoning: {assessment.reasoning[:200]}..."
            )
        
    except Exception as e:
        logger.error(
            f"[BACKGROUND] STA conversation analysis failed: {e}",
            exc_info=True
        )


@trace_agent("STA_Subgraph")
async def execute_sta_subgraph(
    state: AikaOrchestratorState,
    db: AsyncSession
) -> AikaOrchestratorState:
    """Execute Safety Triage Agent subgraph.
    
    Runs the STA workflow to assess risk level and determine routing.
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "aika::sta", "aika")
    
    try:
        # Lazy import to avoid circular dependency
        from app.agents.sta.sta_graph import create_sta_graph
        
        # Create and execute STA subgraph
        sta_graph = cast(_AsyncInvokable, create_sta_graph(db))
        sta_result = cast(dict[str, Any], await sta_graph.ainvoke(cast(dict[str, Any], state)))
        
        # Merge STA outputs into orchestrator state
        cast(dict[str, Any], state).update(sta_result)
        state.setdefault("agents_invoked", []).append("STA")
        state.setdefault("execution_path", []).append("sta_subgraph")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id,
                "aika::sta",
                metrics={
                    "severity": sta_result.get("severity", "unknown"),
                    "next_step": sta_result.get("next_step", "unknown")
                }
            )
        
        logger.info(
            f"✅ STA completed: severity={sta_result.get('severity')}, "
            f"next_step={sta_result.get('next_step')}"
        )
        
    except Exception as e:
        error_msg = f"STA subgraph failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        state["next_step"] = "end"  # Safe fallback
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "aika::sta", str(e))
    
    return state


@trace_agent("TCA_Subgraph")
async def execute_sca_subgraph(
    state: AikaOrchestratorState,
    db: AsyncSession
) -> AikaOrchestratorState:
    """Execute Therapeutic Coach Agent subgraph.
    
    Runs the TCA workflow to generate intervention plans.
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "aika::sca", "aika")
    
    try:
        # Lazy import to avoid circular dependency
        from app.agents.tca.tca_graph import create_tca_graph
        
        # Create and execute TCA subgraph
        tca_graph = cast(_AsyncInvokable, create_tca_graph(db))
        sca_result = cast(dict[str, Any], await tca_graph.ainvoke(cast(dict[str, Any], state)))
        
        # Merge TCA outputs into orchestrator state
        cast(dict[str, Any], state).update(sca_result)
        state.setdefault("agents_invoked", []).append("TCA")
        state.setdefault("execution_path", []).append("sca_subgraph")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id,
                "aika::sca",
                metrics={
                    "should_intervene": sca_result.get("should_intervene", False),
                    "plan_id": sca_result.get("intervention_plan_id")
                }
            )
        
        logger.info(
            f"✅ TCA completed: should_intervene={sca_result.get('should_intervene')}, "
            f"plan_id={sca_result.get('intervention_plan_id')}"
        )
        
    except Exception as e:
        error_msg = f"TCA subgraph failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "aika::sca", str(e))
    
    return state


@trace_agent("CMA_Subgraph")
async def execute_sda_subgraph(
    state: AikaOrchestratorState,
    db: AsyncSession
) -> AikaOrchestratorState:
    """Execute Case Management Agent subgraph.
    
    Runs the CMA workflow to create cases for escalation.
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "aika::sda", "aika")
    
    try:
        # Lazy import to avoid circular dependency
        from app.agents.cma.cma_graph import create_cma_graph
        
        # Create and execute CMA subgraph
        cma_graph = cast(_AsyncInvokable, create_cma_graph(db))
        sda_result = cast(dict[str, Any], await cma_graph.ainvoke(cast(dict[str, Any], state)))
        
        # Merge CMA outputs into orchestrator state
        cast(dict[str, Any], state).update(sda_result)
        state.setdefault("agents_invoked", []).append("CMA")
        state.setdefault("execution_path", []).append("sda_subgraph")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id,
                "aika::sda",
                metrics={
                    "case_created": sda_result.get("case_created", False),
                    "case_id": str(sda_result.get("case_id")) if sda_result.get("case_id") else None
                }
            )
        
        logger.info(
            f"✅ CMA completed: case_id={sda_result.get('case_id')}, "
            f"case_created={sda_result.get('case_created')}"
        )
        
    except Exception as e:
        error_msg = f"CMA subgraph failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "aika::sda", str(e))
    
    return state


async def execute_ia_subgraph(
    state: AikaOrchestratorState,
    db: AsyncSession
) -> AikaOrchestratorState:
    """Execute Insights Agent subgraph.
    
    Runs the IA workflow to generate analytics and reports.
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "aika::ia", "aika")
    
    try:
        # Lazy import to avoid circular dependency
        from app.agents.ia.ia_graph import create_ia_graph
        
        # Create and execute IA subgraph
        ia_graph = cast(_AsyncInvokable, create_ia_graph(db))

        now = datetime.utcnow()
        ia_input: IAState = {
            "question_id": state.get("question_id") or "crisis_trend",
            "start_date": state.get("start_date") or (now - timedelta(days=30)),
            "end_date": state.get("end_date") or now,
            "user_hash": state.get("user_hash") or f"user_{state.get('user_id', 'unknown')}",
        }
        ia_result = cast(dict[str, Any], await ia_graph.ainvoke(ia_input))
        
        # Construct ia_report from IA outputs
        if ia_result.get("interpretation"):
            ia_report = f"**Summary:** {ia_result.get('summary', '')}\n\n**Interpretation:** {ia_result.get('interpretation', '')}"
            if ia_result.get("pdf_url"):
                ia_report += f"\n\n[Download PDF Report]({ia_result.get('pdf_url')})"
            ia_result["ia_report"] = ia_report
        
        # Merge IA outputs into orchestrator state
        cast(dict[str, Any], state).update(ia_result)
        state.setdefault("agents_invoked", []).append("IA")
        state.setdefault("execution_path", []).append("ia_subgraph")
        
        if execution_id:
            execution_tracker.complete_node(
                execution_id,
                "aika::ia",
                metrics={
                    "report_generated": bool(ia_result.get("ia_report")),
                    "query_type": ia_result.get("query_type")
                }
            )
        
        logger.info(
            f"✅ IA completed: report_generated={bool(ia_result.get('ia_report'))}"
        )
        
    except Exception as e:
        error_msg = f"IA subgraph failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "aika::ia", str(e))
    
    return state


async def synthesize_final_response(
    state: AikaOrchestratorState,
    db: AsyncSession
) -> AikaOrchestratorState:
    """Synthesize final response from agent outputs.
    
    Takes results from STA/TCA/CMA and creates a cohesive response
    with Aika's personality.
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.start_node(execution_id, "aika::synthesize", "aika")
    
    try:
        # If direct response already provided, skip synthesis
        if state.get("aika_direct_response"):
            state.setdefault("execution_path", []).append("synthesize_skipped")
            return state
        
        # Get user role for personality (lazy loaded)
        AIKA_SYSTEM_PROMPTS = _get_aika_prompts()
        user_role = state.get("user_role", "user")
        normalized_role = _normalize_user_role(user_role)
        system_instruction = AIKA_SYSTEM_PROMPTS.get(normalized_role, AIKA_SYSTEM_PROMPTS["student"])

        personal_memory_block = _format_personal_memory_block(state)
        
        # Build synthesis prompt with agent results
        agents_invoked = state.get("agents_invoked", [])
        
        synthesis_prompt = f"""
You are Aika. Synthesize a final response based on the specialized agent outputs.

Original Message: {state.get('message')}

{personal_memory_block if personal_memory_block else ''}

Agent Results:
"""
        
        if "STA" in agents_invoked:
            synthesis_prompt += f"""
- Safety Triage (STA):
  * Risk Level: {state.get('severity', 'unknown')}
  * Intent: {state.get('intent', 'unknown')}
  * Risk Score: {state.get('risk_score', 0.0)}
"""
        
        if "TCA" in agents_invoked:
            synthesis_prompt += f"""
- Support Coach (TCA):
  * Intervention Created: {state.get('should_intervene', False)}
  * Intervention Type: {state.get('intervention_type', 'none')}
  * Plan ID: {state.get('intervention_plan_id', 'none')}
"""
        
        if "CMA" in agents_invoked:
            synthesis_prompt += f"""
- Service Desk (CMA):
  * Case Created: {state.get('case_created', False)}
  * Case ID: {state.get('case_id', 'none')}
  * Assigned Counselor: {state.get('assigned_counsellor_id', 'none')}
"""

        if "IA" in agents_invoked:
            synthesis_prompt += f"""
- Insights Agent (IA):
  * Report: {state.get('ia_report', 'No report generated')}
  * Query Type: {state.get('query_type', 'unknown')}
"""
        
        synthesis_prompt += """

Create a warm, empathetic response that:
1. Acknowledges the user's feelings
2. Explains what you've done (if intervention/case created)
3. Provides next steps or encouragement
4. Maintains Aika's personality (caring, supportive)

Keep response natural and conversational in Indonesian (for students) or professional (for admins/counselors).

IMPORTANT: If an intervention plan was created (TCA), you MUST explicitly mention it in your response.
Say something like: "Aku sudah buatkan rencana khusus buat kamu. Cek di sidebar ya!" or "I've prepared a plan for you, please check the sidebar."

If the Risk Level is 'low' or 'none' and no other agents were active:
- Just respond naturally to the user's message.
- Do NOT mention "Safety Triage" or "Risk Level" explicitly.
- Keep the response concise (under 100 words).
"""
        
        # Get preferred model from state
        preferred_model = state.get("preferred_model")
        
        # Generate synthesized response
        final_response = await generate_response(
            history=[{
                "role": "system",
                "content": system_instruction
            }, {
                "role": "user",
                "content": synthesis_prompt
            }],
            model="gemini_google",
            temperature=0.7,
            preferred_gemini_model=preferred_model  # Pass user's preferred model
        )
        
        state["final_response"] = final_response
        state["response_source"] = "agents"
        state.setdefault("execution_path", []).append("synthesize_response")
        
        if execution_id:
            execution_tracker.complete_node(execution_id, "aika::synthesize")
        
        logger.info("✅ Final response synthesized from agent outputs")
        
    except Exception as e:
        error_msg = f"Response synthesis failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        
        # Fallback response
        state["final_response"] = (
            "Maaf ya, aku mengalami sedikit kendala. "
            "Kalau urgent, hubungi Crisis Centre UGM: 0851-0111-0800"
        )
        
        if execution_id:
            execution_tracker.fail_node(execution_id, "aika::synthesize", str(e))
    
    return state


# ============================================================================
# CONDITIONAL ROUTING FUNCTIONS
# ============================================================================

def should_invoke_agents(state: AikaOrchestratorState) -> str:
    """Conditional edge after Aika decision node.
    
    Returns:
        "invoke_cma" if immediate crisis escalation needed (Tier 1),
        "invoke_tca" if support needed (Moderate/Low risk),
        "end" if direct response
    """
    needs_agents = state.get("needs_agents", False)
    next_step = state.get("next_step", "end")
    
    execution_id = state.get("execution_id")
    
    # Direct routing based on next_step
    if next_step == "cma":
        if execution_id:
            execution_tracker.trigger_edge(
                execution_id,
                "aika::decision->cma",
                condition_result=True
            )
        logger.warning(
            f"🚨 Routing after Aika: IMMEDIATE CMA ESCALATION "
            f"(risk={state.get('immediate_risk_level')})"
        )
        return "invoke_cma"
    
    if next_step == "tca":
        if execution_id:
            execution_tracker.trigger_edge(
                execution_id,
                "aika::decision->tca",
                condition_result=True
            )
        logger.info(f"🔀 Routing after Aika: TCA (Support)")
        return "invoke_tca"

    if next_step == "ia":
        if execution_id:
            execution_tracker.trigger_edge(
                execution_id,
                "aika::decision->ia",
                condition_result=True
            )
        logger.info(f"🔀 Routing after Aika: IA (Analytics)")
        return "invoke_ia"

    if next_step == "sta":
        if execution_id:
            execution_tracker.trigger_edge(
                execution_id,
                "aika::decision->sta",
                condition_result=True
            )
        logger.info(f"🔀 Routing after Aika: STA (Manual Invocation)")
        return "invoke_sta"

    # Fallback: if needs_agents is True but next_step not set, default to TCA
    if needs_agents:
        if execution_id:
            execution_tracker.trigger_edge(
                execution_id,
                "aika::decision->tca",
                condition_result=True
            )
        return "invoke_tca"
    
    # Direct response
    if execution_id:
        execution_tracker.trigger_edge(
            execution_id,
            "aika::decision->end",
            condition_result=True
        )
    
    logger.info("🔀 Routing after Aika: Direct Response")
    return "end"


def should_route_to_sca(state: AikaOrchestratorState) -> str:
    """Conditional edge after STA.
    
    Returns:
        "route_sda" for high/critical,
        "invoke_sca" for moderate needing support,
        "synthesize" for low/moderate without support need
    """
    severity = state.get("severity", "low")
    next_step = state.get("next_step", "end")
    
    execution_id = state.get("execution_id")
    
    # High/critical → straight to CMA
    if severity in ("high", "critical"):
        if execution_id:
            execution_tracker.trigger_edge(
                execution_id,
                "aika::sta->sda",
                condition_result=True
            )
        logger.info(f"🔀 STA routing: severity={severity} → CMA (crisis escalation)")
        return "route_sda"
    
    # Moderate with TCA recommendation
    if next_step == "tca":
        if execution_id:
            execution_tracker.trigger_edge(
                execution_id,
                "aika::sta->sca",
                condition_result=True
            )
        logger.info(f"🔀 STA routing: severity={severity}, next_step=sca → TCA (support)")
        return "invoke_sca"
    
    # Low or moderate without intervention need → synthesize directly
    if execution_id:
        execution_tracker.trigger_edge(
            execution_id,
            "aika::sta->synthesize",
            condition_result=True
        )
    logger.info(f"🔀 STA routing: severity={severity}, next_step={next_step} → Synthesize")
    return "synthesize"


def should_route_to_sda_after_sca(state: AikaOrchestratorState) -> str:
    """Conditional edge after TCA.
    
    Currently always routes to synthesize (TCA doesn't escalate to CMA).
    Future: Could check if TCA detected escalation need.
    """
    execution_id = state.get("execution_id")
    if execution_id:
        execution_tracker.trigger_edge(
            execution_id,
            "aika::sca->synthesize",
            condition_result=True
        )
    
    logger.info("🔀 TCA routing: → Synthesize")
    return "synthesize"


# ============================================================================
# GRAPH CONSTRUCTION
# ============================================================================

def create_aika_unified_graph(db: AsyncSession) -> StateGraph:
    """Create unified Aika orchestrator graph.
    
    Graph Structure:
        START → aika_decision_node → [needs_agents?]
                                       ↓               ↓
                                  [YES: STA]      [NO: END]
                                       ↓
                                  [Conditional: severity check]
                                   ↓       ↓        ↓
                              [High]  [Moderate]  [Low]
                                ↓       ↓           ↓
                              CMA     TCA      Synthesize
                                ↓       ↓           ↓
                            Synthesize Synthesize  END
                                ↓       ↓
                               END     END
    
    This is the ideal architecture combining:
    - Aika's personality and intelligence (first node)
    - LangGraph's deterministic routing
    - Specialized agent subgraphs
    - Smart conditional invocation
    
    Args:
        db: Database session for all subgraph operations
        
    Returns:
        Compiled StateGraph ready for execution
    """
    from functools import partial
    
    workflow = StateGraph(AikaOrchestratorState)
    
    # Add nodes - use functools.partial to bind db parameter to async functions
    # LangGraph will handle the async execution properly
    workflow.add_node("aika_decision", partial(aika_decision_node, db=db))
    workflow.add_node("execute_sta", partial(execute_sta_subgraph, db=db))
    workflow.add_node("execute_sca", partial(execute_sca_subgraph, db=db))
    workflow.add_node("execute_sda", partial(execute_sda_subgraph, db=db))
    workflow.add_node("execute_ia", partial(execute_ia_subgraph, db=db))
    workflow.add_node("synthesize", partial(synthesize_final_response, db=db))
    
    # Entry point: Aika decision node
    workflow.set_entry_point("aika_decision")
    
    # Conditional routing after Aika decision
    workflow.add_conditional_edges(
        "aika_decision",
        should_invoke_agents,
        {
            "invoke_cma": "execute_sda",  # Direct to CMA
            "invoke_tca": "execute_sca",  # Direct to TCA
            "invoke_ia": "execute_ia",    # Direct to IA
            "invoke_sta": "execute_sta",  # Manual STA invocation
            "end": END
        }
    )
    
    # Conditional routing after STA
    workflow.add_conditional_edges(
        "execute_sta",
        should_route_to_sca,
        {
            "invoke_sca": "execute_sca",
            "route_sda": "execute_sda",
            "synthesize": "synthesize"
        }
    )
    
    # Conditional routing after TCA
    workflow.add_conditional_edges(
        "execute_sca",
        should_route_to_sda_after_sca,
        {
            "invoke_sda": "execute_sda",
            "synthesize": "synthesize"
        }
    )
    
    # Terminal nodes → END
    workflow.add_edge("execute_sda", "synthesize")
    workflow.add_edge("execute_ia", "synthesize")
    workflow.add_edge("synthesize", END)
    
    logger.info("✅ Unified Aika orchestrator graph created")
    
    return workflow


def create_aika_agent_with_checkpointing(
    db: AsyncSession,
    checkpointer = None
):
    """Create Aika agent with optional checkpointing for conversation persistence.
    
    This is the RECOMMENDED way to create the Aika agent for production use.
    Uses LangGraph's native checkpointing for multi-turn conversation memory.
    
    Benefits of checkpointing:
    - Automatic conversation history persistence
    - Resume conversations across sessions
    - Time-travel debugging (replay conversations)
    - State rollback capabilities
    
    Example Usage (In-Memory for Testing):
    ```python
    from langgraph.checkpoint.memory import MemorySaver
    
    memory = MemorySaver()
    aika_agent = create_aika_agent_with_checkpointing(db, checkpointer=memory)
    
    result = await aika_agent.ainvoke(
        state,
        config={"configurable": {"thread_id": f"user_{user_id}"}}
    )
    ```
    
    Example Usage (SQLite for Production):
    ```python
    from langgraph.checkpoint.aiosqlite import AsyncSqliteSaver
    
    memory = await AsyncSqliteSaver.from_conn_string("checkpoints.db")
    aika_agent = create_aika_agent_with_checkpointing(db, checkpointer=memory)
    
    # Same invocation as above
    ```
    
    Args:
        db: Database session for agent operations
        checkpointer: Optional LangGraph checkpointer (MemorySaver, AsyncSqliteSaver, etc.)
                     If None, creates stateless graph (no conversation memory)
        
    Returns:
        CompiledGraph ready for direct invocation with .ainvoke() or .astream()
    """
    workflow = create_aika_unified_graph(db)
    
    if checkpointer:
        logger.info(f"✅ Aika agent compiled WITH checkpointing: {type(checkpointer).__name__}")
        return workflow.compile(checkpointer=checkpointer)
    else:
        logger.info("⚠️ Aika agent compiled WITHOUT checkpointing (stateless)")
        return workflow.compile()
