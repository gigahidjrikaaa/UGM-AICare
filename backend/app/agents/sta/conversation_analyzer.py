"""STA Conversation-Level Risk Analyzer.

This module performs deep analysis of entire conversations (not individual messages)
to identify risk patterns, trends, and user context. Runs ONLY at conversation end.
"""
import logging
import time
import json
import re
from typing import List, Dict, Any
from datetime import datetime

from app.agents.sta.conversation_assessment import ConversationAssessment
from app.core.llm import generate_gemini_response_with_fallback, DEFAULT_GEMINI_MODEL

logger = logging.getLogger(__name__)


async def analyze_conversation_risk(
    conversation_history: List[Dict[str, str]],
    current_message: str,
    user_context: Dict[str, Any] = None,
    conversation_start_time: float = None,
    preferred_model: str = None
) -> ConversationAssessment:
    """Perform comprehensive conversation-level risk analysis.
    
    This is the Tier 2 analysis that runs ONCE at conversation end to assess
    overall risk trends and patterns with full conversational context.
    
    Args:
        conversation_history: List of previous messages in format:
            [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        current_message: Latest user message (the ending message)
        user_context: Additional user data (wellness state, profile) if available
        conversation_start_time: Unix timestamp of conversation start (for duration calc)
        preferred_model: Gemini model to use (defaults to DEFAULT_GEMINI_MODEL)
    
    Returns:
        ConversationAssessment with comprehensive risk evaluation
    
    Raises:
        ValueError: If conversation_history is empty
        json.JSONDecodeError: If Gemini returns invalid JSON
    """
    if not conversation_history:
        raise ValueError("Cannot analyze empty conversation")
    
    # Build full conversation text (last 30 messages for context)
    recent_history = conversation_history[-30:] if len(conversation_history) > 30 else conversation_history
    
    conversation_text = "\n\n".join([
        f"{'User' if msg['role'] == 'user' else 'Aika'}: {msg['content']}"
        for msg in recent_history
    ])
    conversation_text += f"\n\nUser: {current_message}"
    
    # Calculate conversation duration
    duration = time.time() - conversation_start_time if conversation_start_time else 0.0
    
    # Build analysis prompt
    analysis_prompt = f"""
You are a clinical mental health analyst reviewing a complete conversation between a university student and Aika (AI mental health assistant).

CONVERSATION HISTORY ({len(conversation_history) + 1} total messages, duration: {duration:.0f}s):
{'='*80}
{conversation_text}
{'='*80}

TASK: Perform comprehensive conversation-level risk assessment

Analyze the ENTIRE conversation (not just individual messages) for:

1. OVERALL RISK LEVEL: Considering all messages together, what is the overall mental health risk?
   - low: General stress, manageable challenges
   - moderate: Significant distress, concerning patterns emerging
   - high: Serious risk indicators, needs professional intervention soon
   - critical: Immediate danger, crisis intervention required NOW

2. RISK TREND: How did the user's state change throughout the conversation?
   - stable: Consistent emotional state throughout
   - escalating: User's distress increased during conversation
   - de-escalating: User's state improved with support
   - insufficient_data: Too few messages to determine trend

3. CONVERSATION SUMMARY: What were the main themes and concerns? (2-3 sentences)

4. USER CONTEXT: Extract specific information about:
   - recent_stressors: What problems/challenges are they facing?
   - coping_mechanisms: How do they currently handle stress?
   - protective_factors: What positive supports do they have?

5. CONCERNS: What specific patterns are worrying? (e.g., "sleep deprivation for 3 days", "social withdrawal")

6. RECOMMENDED ACTIONS: What specific interventions would help? (e.g., "CBT for anxiety", "sleep hygiene plan")

7. CASE MANAGEMENT: Does this require immediate human counselor involvement?
   - true if: Critical risk, escalating pattern with high severity, user requests human help
   - false if: Manageable with AI support, user improving, low-moderate stable risk

Return ONLY valid JSON (no markdown):
{{
  "overall_risk_level": "low|moderate|high|critical",
  "risk_trend": "stable|escalating|de-escalating|insufficient_data",
  "conversation_summary": "2-3 sentence summary of main themes and user state",
  "user_context": {{
    "recent_stressors": ["specific stressor 1", "specific stressor 2"],
    "coping_mechanisms": ["coping method 1", "coping method 2"],
    "protective_factors": ["support 1", "support 2"]
  }},
  "protective_factors": ["Detailed protective factor 1", "Detailed protective factor 2"],
  "concerns": ["Specific concern 1", "Specific concern 2"],
  "recommended_actions": ["Specific action 1", "Specific action 2"],
  "should_invoke_cma": true or false,
  "reasoning": "Detailed chain-of-thought explanation: Why this risk level? Why this trend? Why CMA decision?"
}}

Be thorough but concise. Focus on actionable clinical insights.
"""
    
    model = preferred_model or DEFAULT_GEMINI_MODEL
    logger.info(
        f"🔍 STA analyzing full conversation "
        f"({len(conversation_history) + 1} messages, {duration:.0f}s duration)"
    )
    
    start_time = time.time()
    
    try:
        response_text = await generate_gemini_response_with_fallback(
            history=[{"role": "user", "content": analysis_prompt}],
            model=model,
            temperature=0.2,  # Low temp for consistent clinical analysis
            max_tokens=4096
        )
        
        # Clean markdown code blocks if present
        response_text = re.sub(r'^```json\s*', '', response_text.strip())
        response_text = re.sub(r'\s*```$', '', response_text.strip())
        
        assessment_data = json.loads(response_text)
        
        # Create assessment object
        assessment = ConversationAssessment(
            **assessment_data,
            message_count_analyzed=len(conversation_history) + 1,
            analysis_timestamp=datetime.utcnow(),
            conversation_duration_seconds=duration
        )
        
        analysis_time_ms = (time.time() - start_time) * 1000
        
        logger.info(
            f"✅ STA conversation analysis complete: "
            f"risk={assessment.overall_risk_level}, "
            f"trend={assessment.risk_trend}, "
            f"cma={assessment.should_invoke_cma}, "
            f"time={analysis_time_ms:.0f}ms"
        )
        
        return assessment
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse STA assessment JSON: {e}")
        logger.debug(f"Raw response: {response_text[:500]}...")
        raise
    except Exception as e:
        logger.error(f"STA conversation analysis failed: {e}", exc_info=True)
        raise
