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

Benefits:
- Single unified LangGraph workflow
- Aika personality throughout
- Smart conditional routing (only invoke agents when needed)
- Better execution tracking
- Easier debugging
"""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime
from typing import Dict, Any, List, TYPE_CHECKING

from langgraph.graph import StateGraph, END
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types

from app.agents.graph_state import AikaOrchestratorState
from app.agents.execution_tracker import execution_tracker
# Import identity module at runtime to avoid circular imports
from app.core.llm import generate_response

# Lazy imports to avoid circular dependencies
if TYPE_CHECKING:
    from app.agents.sta.sta_graph import create_sta_graph
    from app.agents.tca.tca_graph import create_tca_graph
    from app.agents.cma.cma_graph import create_cma_graph

logger = logging.getLogger(__name__)


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
        
        # Prepare conversation history for Gemini
        history_contents = []
        if state.get("conversation_history"):
            for msg in state["conversation_history"]:
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
                parts=[types.Part(text=state["message"])]
            )
        )
        
        # Create specialized decision prompt
        decision_prompt = f"""
Analyze this message and determine if specialized safety agents are needed.

User Role: {user_role}
Message: {state["message"]}

Decision Criteria:

FOR STUDENTS (user):
- NEEDS AGENTS (invoke STA → TCA/CMA):
  * Mentions stress, anxiety, depression, crisis
  * Expresses emotional distress or overwhelm
  * Contains self-harm or suicide signals
  * Requests therapeutic support or coping strategies
  * Asks for intervention plan, action plan, or structured exercises
  * Wants personalized guidance or step-by-step help
  * Requests CBT modules, coping techniques, or skill-building activities
  
- NO AGENTS NEEDED (direct response):
  * Simple greetings ("hi", "hello", "hai")
  * Casual questions ("how are you?", "what can you do?")
  * General mental health education ("what is CBT?" - definition only)
  * Simple factual questions about the system

FOR ADMINS:
- NEEDS AGENTS (invoke IA for analytics):
  * Requests data/analytics ("trending topics", "case statistics")
  * Complex queries requiring database aggregation
  
- NO AGENTS NEEDED:
  * Simple status checks ("is system healthy?")
  * General platform questions

FOR COUNSELORS:
- NEEDS AGENTS (invoke CMA for case management):
  * Requests assigned cases or patient data
  * Clinical insights or treatment recommendations
  
- NO AGENTS NEEDED:
  * General clinical questions

Return JSON with:
{{
  "intent": "string (e.g., 'emotional_support', 'crisis', 'casual_chat')",
  "intent_confidence": float (0.0-1.0),
  "needs_agents": boolean,
  "reasoning": "string explaining decision",
  "suggested_response": "string (only if needs_agents=false, provide direct response)",
  
  "immediate_risk": "none|low|moderate|high|critical",
  "crisis_keywords": ["list of crisis keywords found, empty if none"],
  "risk_reasoning": "Brief 1-sentence explanation of risk assessment"
}}

IMMEDIATE RISK ASSESSMENT CRITERIA:
- "critical": Explicit suicide plan/intent with method and timeframe
  Examples: "I'm going to kill myself tonight", "I have pills ready to overdose"
  
- "high": Strong self-harm ideation or active suicidal thoughts
  Examples: "I keep thinking about cutting myself", "I want to die", "bunuh diri"
  
- "moderate": Significant emotional distress with concerning patterns
  Examples: "I feel completely hopeless", "nothing matters anymore", "tidak ada gunanya hidup"
  
- "low": Stress/anxiety without crisis indicators
  Examples: "I'm stressed about exams", "feeling anxious about presentation"
  
- "none": No distress signals
  Examples: "Hello, how are you?", "What is CBT?", "Thanks for the help"

CRISIS KEYWORDS TO DETECT (Indonesian + English):
suicide, bunuh diri, kill myself, end my life, tidak ingin hidup lagi, 
self-harm, cutting, mutilasi diri, menyakiti diri, overdose, 
jump from building, loncat dari gedung, gantung diri, hanging,
want to die, mau mati, ingin mati, etc.
"""
        
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
            system_prompt=system_instruction
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
            state["needs_agents"] = decision.get("needs_agents", False)
            state["agent_reasoning"] = decision.get("reasoning", "No reasoning provided")
            
            # ========================================================================
            # TWO-TIER RISK MONITORING: Parse immediate risk fields (Tier 1)
            # ========================================================================
            state["immediate_risk_level"] = decision.get("immediate_risk", "none")
            state["crisis_keywords_detected"] = decision.get("crisis_keywords", [])
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
            if state["immediate_risk_level"] in ("high", "critical"):
                state["needs_cma_escalation"] = True
                logger.warning(
                    f"🚨 IMMEDIATE CRISIS DETECTED: {state['immediate_risk_level']} "
                    f"(keywords: {state['crisis_keywords_detected']}) "
                    f"- Auto-escalating to CMA"
                )
            else:
                state["needs_cma_escalation"] = False
            
            # Log risk assessment
            if state["immediate_risk_level"] != "none":
                logger.info(
                    f"⚠️ Immediate Risk: {state['immediate_risk_level']} "
                    f"(reasoning: {state['risk_reasoning'][:100]})"
                )
            
            # If agents not needed, store direct response
            if not state["needs_agents"]:
                # Get preferred model from state
                preferred_model = state.get("preferred_model")
                
                # Generate conversational response with Aika personality
                aika_response = await generate_response(
                    history=[{
                        "role": "system",
                        "content": system_instruction
                    }] + [
                        {"role": h.get("role", "user"), "content": h.get("content", "")}
                        for h in state.get("conversation_history", [])
                    ] + [
                        {"role": "user", "content": state["message"]}
                    ],
                    model="gemini_google",
                    temperature=0.7,
                    preferred_gemini_model=preferred_model  # Pass user's preferred model
                )
                
                # Clean up any accidental tool call syntax (shouldn't happen but safety net)
                import re
                aika_response = re.sub(r'<tool_code>.*?</tool_code>', '', aika_response, flags=re.DOTALL)
                aika_response = aika_response.strip()
                
                state["aika_direct_response"] = aika_response
                state["final_response"] = aika_response
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
        if state.get("conversation_ended", False):
            logger.info("🔍 Conversation ended - triggering background STA analysis")
            # Fire-and-forget: create background task without awaiting
            import asyncio
            asyncio.create_task(trigger_sta_conversation_analysis_background(state.copy(), db))
        
    except Exception as e:
        error_msg = f"Aika decision node failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        state.setdefault("errors", []).append(error_msg)
        
        # Fallback: invoke agents for safety
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
        
        # Perform deep analysis
        assessment = await analyze_conversation_risk(
            conversation_history=state.get("conversation_history", []),
            current_message=state.get("message", ""),
            user_context=state.get("personal_context", {}),
            conversation_start_time=start_timestamp,
            preferred_model=state.get("preferred_model")
        )
        
        assessment_record = None
        if conversation_id:
            assessment_record = await upsert_conversation_assessment(
                db,
                conversation_id=conversation_id,
                session_id=state.get("session_id"),
                user_id=user_id,
                assessment=assessment,
                force_refresh=force_refresh,
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
        sta_graph = create_sta_graph(db)
        sta_result = await sta_graph.ainvoke(state)
        
        # Merge STA outputs into orchestrator state
        state.update(sta_result)
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
        tca_graph = create_tca_graph(db)
        sca_result = await tca_graph.ainvoke(state)
        
        # Merge TCA outputs into orchestrator state
        state.update(sca_result)
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
        cma_graph = create_cma_graph(db)
        sda_result = await cma_graph.ainvoke(state)
        
        # Merge CMA outputs into orchestrator state
        state.update(sda_result)
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
        
        # Build synthesis prompt with agent results
        agents_invoked = state.get("agents_invoked", [])
        
        synthesis_prompt = f"""
You are Aika. Synthesize a final response based on the specialized agent outputs.

Original Message: {state.get('message')}

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
        
        synthesis_prompt += """

Create a warm, empathetic response that:
1. Acknowledges the user's feelings
2. Explains what you've done (if intervention/case created)
3. Provides next steps or encouragement
4. Maintains Aika's personality (caring, supportive)

Keep response natural and conversational in Indonesian (for students) or professional (for admins/counselors).
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
        "invoke_sta" if agents needed for normal flow,
        "end" if direct response
    """
    needs_agents = state.get("needs_agents", False)
    needs_cma = state.get("needs_cma_escalation", False)
    
    execution_id = state.get("execution_id")
    
    # TWO-TIER: Check immediate crisis escalation first (Tier 1)
    if needs_cma:
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
    
    # Normal flow: invoke agents or respond directly
    if execution_id:
        target = "invoke_sta" if needs_agents else "end"
        execution_tracker.trigger_edge(
            execution_id,
            f"aika::decision->{target}",
            condition_result=True
        )
    
    logger.info(
        f"🔀 Routing after Aika: needs_agents={needs_agents} → "
        f"{'invoke agents' if needs_agents else 'direct response'}"
    )
    
    return "invoke_sta" if needs_agents else "end"


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
    if state.get("execution_id"):
        execution_tracker.trigger_edge(
            state["execution_id"],
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
    workflow.add_node("synthesize", partial(synthesize_final_response, db=db))
    
    # Entry point: Aika decision node
    workflow.set_entry_point("aika_decision")
    
    # Conditional routing after Aika decision
    workflow.add_conditional_edges(
        "aika_decision",
        should_invoke_agents,
        {
            "invoke_cma": "execute_sda",  # TWO-TIER: Immediate crisis escalation
            "invoke_sta": "execute_sta",
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
