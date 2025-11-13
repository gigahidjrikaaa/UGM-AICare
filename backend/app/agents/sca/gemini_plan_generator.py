"""
Gemini-powered Support Coach Plan Generator

This module uses Gemini AI to generate hyper-personalized support plans
based on user context, intent, and support plan type.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from app.core.llm import generate_gemini_response
from app.agents.sca.schemas import PlanStep, ResourceCard

logger = logging.getLogger(__name__)


# System prompts for different plan types
CALM_DOWN_SYSTEM_PROMPT = """You are an expert mental health support coach specializing in anxiety and panic management.
Your role is to help users calm down when they are experiencing overwhelming anxiety, panic, or stress.

Generate a personalized support plan with 3-5 specific, actionable steps that:
1. Help ground the user in the present moment
2. Reduce physiological symptoms (racing heart, fast breathing, etc.)
3. Provide immediate coping techniques
4. Are culturally sensitive to Indonesian/Asian context
5. Use clear, compassionate, non-clinical language

CRITICAL REQUIREMENTS:
- Each step must be immediately actionable (not vague)
- Include specific time durations (e.g., "5 minutes", "3 deep breaths")
- Use warm, encouraging tone
- Avoid medical jargon
- Consider the user's specific situation and context

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Take 5 deep breaths - inhale for 4 counts, hold for 4, exhale for 6", "duration_min": 2},
    {"id": "step2", "label": "Name 5 things you can see right now to ground yourself", "duration_min": 3}
  ],
  "resource_cards": [
    {"resource_id": "breathing", "title": "Guided Breathing Exercise", "summary": "Follow along with calming breathing patterns", "url": "https://aicare.example/calm/breathing"}
  ]
}
"""

BREAK_DOWN_PROBLEM_SYSTEM_PROMPT = """You are an expert problem-solving coach specializing in breaking down complex, overwhelming problems into manageable steps.
Your role is to help users who feel stuck, overwhelmed, or don't know where to start with their challenges.

Generate a personalized support plan with 4-6 specific steps that:
1. Help identify the core problem clearly
2. Break the large problem into smaller, manageable pieces
3. Prioritize what to tackle first
4. Provide concrete next actions
5. Build momentum and confidence
6. Are culturally sensitive to Indonesian/Asian context

CRITICAL REQUIREMENTS:
- Start with clarity: help user define what they're facing
- Use the "chunking" technique to break down complexity
- Prioritize steps logically (urgent/important first)
- Make each step specific and achievable
- Include both thinking steps and action steps
- Provide encouragement and normalize feeling overwhelmed
- Use warm, non-judgmental language

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Write down your main concern in one sentence", "duration_min": 3},
    {"id": "step2", "label": "List 3 smaller parts of this problem you can work on separately", "duration_min": 5},
    {"id": "step3", "label": "Choose the easiest part to start with today", "duration_min": 2}
  ],
  "resource_cards": [
    {"resource_id": "problem_solving", "title": "Problem Solving Worksheet", "summary": "Structured template to break down challenges", "url": "https://aicare.example/tools/problem-solving"}
  ]
}
"""

GENERAL_COPING_SYSTEM_PROMPT = """You are an expert mental health support coach providing general coping strategies for stress management.
Your role is to help users develop healthy coping mechanisms and resilience skills.

Generate a personalized support plan with 3-5 steps that:
1. Address the user's specific stressor (academic, relationship, financial, etc.)
2. Provide both immediate relief and longer-term coping strategies
3. Include self-care and support-seeking actions
4. Build on the user's existing strengths
5. Are culturally sensitive to Indonesian/Asian context

CRITICAL REQUIREMENTS:
- Balance immediate relief with sustainable coping
- Include both active coping (problem-focused) and emotion-focused strategies
- Encourage social support where appropriate
- Promote self-compassion and normalize struggles
- Use warm, empowering language
- Avoid toxic positivity - validate their feelings first

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Take 10 minutes for self-care - do one thing you enjoy", "duration_min": 10},
    {"id": "step2", "label": "Write down one thing you've handled well recently", "duration_min": 3}
  ],
  "resource_cards": [
    {"resource_id": "coping", "title": "Healthy Coping Strategies", "summary": "Evidence-based techniques for managing stress", "url": "https://aicare.example/coping/strategies"}
  ]
}
"""

COGNITIVE_RESTRUCTURING_SYSTEM_PROMPT = """You are an expert Cognitive Behavioral Therapy (CBT) coach specializing in cognitive restructuring.
Your role is to help users identify and challenge unhelpful thinking patterns by examining evidence and developing more balanced perspectives.

Generate a personalized CBT-based plan with 4-6 steps following the cognitive restructuring framework:
1. Identify the situation that triggered distress
2. Recognize automatic negative thoughts
3. Label the emotions felt
4. Examine evidence for and against the thought
5. Generate alternative, more balanced thoughts
6. Re-evaluate emotions after reframing

CRITICAL CBT PRINCIPLES:
- Guide Socratic questioning (don't tell, ask)
- Help user discover their own evidence
- Validate feelings while challenging thoughts
- Use the "thought record" CBT technique
- Encourage specific, concrete examples
- Focus on realistic thinking, not positive thinking
- Be culturally sensitive to Indonesian context
- Use warm, collaborative language

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Describe the situation that made you feel upset in 2-3 sentences", "duration_min": 3},
    {"id": "step2", "label": "What thought immediately came to mind? Write it exactly as you thought it", "duration_min": 2},
    {"id": "step3", "label": "Name the emotion(s): anxious, sad, angry, frustrated, ashamed?", "duration_min": 2},
    {"id": "step4", "label": "Find evidence: What facts support this thought? What facts contradict it?", "duration_min": 5},
    {"id": "step5", "label": "Create a more balanced thought that considers all evidence", "duration_min": 4},
    {"id": "step6", "label": "How do you feel now with this new perspective? Rate 0-10", "duration_min": 2}
  ],
  "resource_cards": [
    {"resource_id": "cbt_thoughts", "title": "Common Thinking Traps", "summary": "Recognize patterns like all-or-nothing thinking, catastrophizing, mind-reading", "url": "https://aicare.example/cbt/thinking-traps"}
  ]
}
"""

BEHAVIORAL_ACTIVATION_SYSTEM_PROMPT = """You are an expert Cognitive Behavioral Therapy (CBT) coach specializing in behavioral activation for depression and low motivation.
Your role is to help users break the cycle of inactivity and avoidance by scheduling and completing small, meaningful activities.

Generate a personalized CBT-based plan with 3-5 steps following behavioral activation principles:
1. Identify values and what matters to the user
2. Choose small, achievable activities aligned with values
3. Schedule specific times for activities
4. Break activities into tiny steps if needed
5. Track mood before and after activities

CRITICAL BEHAVIORAL ACTIVATION PRINCIPLES:
- Start with activities the user USED to enjoy or find meaningful
- Make activities SPECIFIC and SCHEDULED (not vague goals)
- Emphasize action BEFORE motivation (action creates motivation)
- Focus on VALUES-based activities, not just pleasant ones
- Use activity monitoring to show mood-behavior connection
- Celebrate ANY action, no matter how small
- Be culturally sensitive to Indonesian context
- Use encouraging, non-judgmental language

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Name one thing that used to bring you joy or meaning before you felt this way", "duration_min": 3},
    {"id": "step2", "label": "Choose the smallest version of that activity you can do today (15 min max)", "duration_min": 4},
    {"id": "step3", "label": "Schedule it: Write exactly when and where you'll do it today", "duration_min": 2},
    {"id": "step4", "label": "Before starting, rate your mood 1-10. Then do the activity", "duration_min": 15},
    {"id": "step5", "label": "After finishing, rate your mood again. Notice any change", "duration_min": 2}
  ],
  "resource_cards": [
    {"resource_id": "behavioral_activation", "title": "Breaking the Inactivity Cycle", "summary": "How small actions boost mood and motivation", "url": "https://aicare.example/cbt/activation"}
  ]
}
"""


def _get_system_prompt(plan_type: str) -> str:
    """Get appropriate system prompt based on plan type."""
    prompts = {
        "calm_down": CALM_DOWN_SYSTEM_PROMPT,
        "break_down_problem": BREAK_DOWN_PROBLEM_SYSTEM_PROMPT,
        "general_coping": GENERAL_COPING_SYSTEM_PROMPT,
        "cognitive_restructuring": COGNITIVE_RESTRUCTURING_SYSTEM_PROMPT,
        "behavioral_activation": BEHAVIORAL_ACTIVATION_SYSTEM_PROMPT,
    }
    return prompts.get(plan_type, GENERAL_COPING_SYSTEM_PROMPT)


def _build_user_prompt(
    user_message: str,
    intent: str,
    plan_type: str,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """Build personalized user prompt with context."""
    prompt_parts = [
        f"USER'S MESSAGE: \"{user_message}\"\n",
        f"DETECTED INTENT: {intent}\n",
        f"PLAN TYPE NEEDED: {plan_type}\n",
    ]
    
    if context:
        if context.get("risk_level"):
            prompt_parts.append(f"RISK LEVEL: {context['risk_level']}/3\n")
        if context.get("previous_sessions"):
            prompt_parts.append(f"PREVIOUS SESSIONS: User has {context['previous_sessions']} prior support sessions\n")
        if context.get("demographics"):
            demo = context['demographics']
            if demo.get("age"):
                prompt_parts.append(f"USER AGE: {demo['age']} years old\n")
            if demo.get("student_status"):
                prompt_parts.append(f"STUDENT STATUS: {demo['student_status']}\n")
    
    prompt_parts.append("\nBased on the above information, generate a hyper-personalized support plan that directly addresses this user's specific situation.")
    prompt_parts.append("\nIMPORTANT: Respond ONLY with valid JSON in the exact format specified. No additional text or explanation.")
    
    return "".join(prompt_parts)


async def generate_personalized_plan(
    user_message: str,
    intent: str,
    plan_type: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate hyper-personalized support plan using Gemini AI.
    
    Args:
        user_message: The user's original message
        intent: Detected intent from STA (e.g., "academic_stress")
        plan_type: Type of plan needed ("calm_down", "break_down_problem", "general_coping")
        context: Optional additional context (risk_level, demographics, history, etc.)
    
    Returns:
        Dict with plan_steps and resource_cards
        
    Raises:
        Exception: If Gemini API fails or returns invalid response
    """
    response_text = ""  # Initialize to avoid unbound variable error
    
    try:
        logger.info(f"Generating personalized plan: type={plan_type}, intent={intent}")
        
        # Get appropriate system prompt
        system_prompt = _get_system_prompt(plan_type)
        
        # Build user prompt with context
        user_prompt = _build_user_prompt(user_message, intent, plan_type, context)
        
        logger.debug(f"User prompt: {user_prompt[:200]}...")
        
        # Call Gemini API - Using Gemini 2.5 Flash for SCA
        response_text = await generate_gemini_response(
            history=[{"role": "user", "content": user_prompt}],
            model="gemini-2.5-flash",  # Gemini 2.5 Flash for Support Coach Agent
            max_tokens=2048,
            temperature=0.7,  # Balance between creativity and consistency
            system_prompt=system_prompt,
            return_full_response=False
        )
        
        logger.debug(f"Gemini raw response: {response_text[:200]}...")
        
        # Try to extract JSON if wrapped in markdown code blocks
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        parsed_response = json.loads(response_text)
        
        # Validate response structure
        if "plan_steps" not in parsed_response:
            logger.error("Gemini response missing 'plan_steps'")
            raise ValueError("Invalid response structure from Gemini")
        
        if "resource_cards" not in parsed_response:
            # Provide default resource cards if missing
            parsed_response["resource_cards"] = _get_default_resources(intent)
        
        logger.info(f"Successfully generated plan with {len(parsed_response['plan_steps'])} steps")
        
        return parsed_response
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}\nResponse: {response_text}")
        # Fallback to static plan
        return _get_fallback_plan(plan_type, intent)
    except Exception as e:
        logger.error(f"Error generating personalized plan with Gemini: {e}", exc_info=True)
        # Fallback to static plan
        return _get_fallback_plan(plan_type, intent)


def _get_default_resources(intent: str) -> List[Dict[str, Any]]:
    """Get default resource cards based on intent."""
    from app.agents.sca.resources import get_default_resources
    
    resource_objs = list(get_default_resources(intent))
    return [
        {
            "resource_id": r.resource_id,
            "title": r.title,
            "summary": r.summary,
            "url": r.url
        }
        for r in resource_objs
    ]


def _get_fallback_plan(plan_type: str, intent: str) -> Dict[str, Any]:
    """Fallback static plans if Gemini fails."""
    fallback_plans = {
        "calm_down": {
            "plan_steps": [
                {"id": "breathing", "label": "Box breathing: Inhale 4 counts, hold 4, exhale 4, hold 4", "duration_min": 3},
                {"id": "grounding", "label": "5-4-3-2-1 grounding: Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste", "duration_min": 5},
                {"id": "self_talk", "label": "Say to yourself: 'I am safe. This feeling will pass. I can handle this.'", "duration_min": 2},
            ],
            "resource_cards": _get_default_resources(intent)
        },
        "break_down_problem": {
            "plan_steps": [
                {"id": "define", "label": "Write down your main problem in 1-2 sentences", "duration_min": 3},
                {"id": "chunk", "label": "Break it into 3-4 smaller, specific parts", "duration_min": 5},
                {"id": "prioritize", "label": "Number them from easiest to hardest", "duration_min": 2},
                {"id": "first_step", "label": "Write one tiny action you can take on the easiest part today", "duration_min": 3},
            ],
            "resource_cards": _get_default_resources(intent)
        },
        "general_coping": {
            "plan_steps": [
                {"id": "self_care", "label": "Take 10 minutes for something you enjoy - music, tea, walk, anything", "duration_min": 10},
                {"id": "validate", "label": "Write: 'It's okay to struggle. I'm doing my best.'", "duration_min": 2},
                {"id": "support", "label": "Reach out to one trusted person today - even just to say hi", "duration_min": 5},
            ],
            "resource_cards": _get_default_resources(intent)
        },
        "cognitive_restructuring": {
            "plan_steps": [
                {"id": "situation", "label": "Describe the situation that upset you in 2-3 sentences", "duration_min": 3},
                {"id": "thought", "label": "What automatic thought came to mind? Write it exactly", "duration_min": 2},
                {"id": "emotion", "label": "Name the emotion: anxious, sad, angry, frustrated, ashamed?", "duration_min": 2},
                {"id": "evidence", "label": "List facts that support AND contradict this thought", "duration_min": 5},
                {"id": "reframe", "label": "Create a more balanced thought considering all evidence", "duration_min": 4},
                {"id": "reassess", "label": "How do you feel now? Rate your emotion 0-10", "duration_min": 2},
            ],
            "resource_cards": _get_default_resources(intent)
        },
        "behavioral_activation": {
            "plan_steps": [
                {"id": "identify", "label": "Name one activity you used to enjoy or find meaningful", "duration_min": 3},
                {"id": "simplify", "label": "Choose the smallest version you can do today (15 min max)", "duration_min": 3},
                {"id": "schedule", "label": "Write exactly when and where you'll do it today", "duration_min": 2},
                {"id": "track_before", "label": "Rate your mood 1-10 before starting the activity", "duration_min": 1},
                {"id": "do_it", "label": "Do the activity you scheduled", "duration_min": 15},
                {"id": "track_after", "label": "Rate your mood 1-10 again. Notice any change", "duration_min": 2},
            ],
            "resource_cards": _get_default_resources(intent)
        }
    }
    
    return fallback_plans.get(plan_type, fallback_plans["general_coping"])
