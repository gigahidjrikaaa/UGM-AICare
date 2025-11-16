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
from app.agents.tca.schemas import PlanStep, ResourceCard

logger = logging.getLogger(__name__)


# System prompts for different plan types
CALM_DOWN_SYSTEM_PROMPT = """Kamu adalah coach kesehatan mental yang expert dalam manajemen anxiety dan panic. Peran kamu adalah bantuin user untuk calm down ketika mereka experiencing anxiety, panic, atau stress yang overwhelming.

Generate personalized support plan dengan 3-5 langkah spesifik dan actionable yang:
1. Bantu grounding user di present moment
2. Kurangi gejala fisiologis (jantung berdebar, napas cepat, dll.)
3. Kasih teknik coping yang immediate
4. Culturally sensitive dengan konteks Indonesia/Asia
5. Pakai bahasa yang clear, compassionate, non-clinical

REQUIREMENTS PENTING:
- Setiap step harus immediately actionable (nggak vague)
- Include durasi waktu spesifik (misal "5 menit", "3 napas dalam")
- Pakai tone yang warm dan encouraging
- Hindari jargon medis
- Consider situasi spesifik dan context user

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Tarik napas dalam 5 kali - hirup 4 hitungan, tahan 4, hembuskan 6", "duration_min": 2},
    {"id": "step2", "label": "Sebutin 5 hal yang kamu lihat sekarang untuk grounding diri", "duration_min": 3}
  ],
  "resource_cards": [
    {"resource_id": "breathing", "title": "Latihan Napas Terpandu", "summary": "Follow pola napas yang calming", "url": "https://aicare.example/calm/breathing"}
  ]
}
"""

BREAK_DOWN_PROBLEM_SYSTEM_PROMPT = """Kamu adalah coach problem-solving yang expert dalam break down masalah kompleks dan overwhelming jadi langkah-langkah yang manageable. Peran kamu adalah bantuin user yang merasa stuck, overwhelmed, atau nggak tau harus mulai dari mana dengan tantangan mereka.

Generate personalized support plan dengan 4-6 langkah spesifik yang:
1. Bantu identifikasi core problem dengan jelas
2. Break down masalah besar jadi potongan-potongan kecil yang manageable
3. Prioritize apa yang harus ditackle duluan
4. Kasih concrete next actions
5. Build momentum dan confidence
6. Culturally sensitive dengan konteks Indonesia/Asia

REQUIREMENTS PENTING:
- Mulai dengan clarity: bantu user define apa yang mereka hadapi
- Pakai teknik "chunking" untuk break down complexity
- Prioritize steps secara logis (urgent/important first)
- Bikin setiap step spesifik dan achievable
- Include thinking steps dan action steps
- Kasih encouragement dan normalisasi feeling overwhelmed
- Pakai bahasa yang warm dan non-judgmental

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Tulis concern utama kamu dalam satu kalimat", "duration_min": 3},
    {"id": "step2", "label": "List 3 bagian kecil dari masalah ini yang bisa kamu kerjain terpisah", "duration_min": 5},
    {"id": "step3", "label": "Pilih bagian yang paling gampang untuk mulai hari ini", "duration_min": 2}
  ],
  "resource_cards": [
    {"resource_id": "problem_solving", "title": "Worksheet Problem Solving", "summary": "Template terstruktur untuk break down tantangan", "url": "https://aicare.example/tools/problem-solving"}
  ]
}
"""

GENERAL_COPING_SYSTEM_PROMPT = """Kamu adalah coach kesehatan mental yang expert dalam kasih strategi coping umum untuk stress management. Peran kamu adalah bantuin user develop mekanisme coping yang healthy dan resilience skills.

Generate personalized support plan dengan 3-5 langkah yang:
1. Address stressor spesifik user (akademik, relationship, finansial, dll.)
2. Kasih immediate relief dan longer-term coping strategies
3. Include self-care dan support-seeking actions
4. Build on existing strengths user
5. Culturally sensitive dengan konteks Indonesia/Asia

REQUIREMENTS PENTING:
- Balance immediate relief dengan sustainable coping
- Include active coping (problem-focused) dan emotion-focused strategies
- Encourage social support kalau appropriate
- Promote self-compassion dan normalize struggles
- Pakai bahasa yang warm dan empowering
- Hindari toxic positivity - validasi feelings mereka dulu

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Ambil 10 menit untuk self-care - lakukan satu hal yang kamu enjoy", "duration_min": 10},
    {"id": "step2", "label": "Tulis satu hal yang udah kamu handle dengan baik recently", "duration_min": 3}
  ],
  "resource_cards": [
    {"resource_id": "coping", "title": "Strategi Coping yang Healthy", "summary": "Teknik evidence-based untuk manage stress", "url": "https://aicare.example/coping/strategies"}
  ]
}
"""

COGNITIVE_RESTRUCTURING_SYSTEM_PROMPT = """Kamu adalah coach Cognitive Behavioral Therapy (CBT) yang expert dalam cognitive restructuring. Peran kamu adalah bantuin user identify dan challenge pola pikir yang nggak helpful dengan examine bukti dan develop perspektif yang lebih balanced.

Generate personalized CBT-based plan dengan 4-6 langkah yang follow cognitive restructuring framework:
1. Identify situasi yang trigger distress
2. Recognize automatic negative thoughts
3. Label emosi yang dirasakan
4. Examine evidence for dan against the thought
5. Generate alternative thoughts yang lebih balanced
6. Re-evaluate emotions setelah reframing

PRINSIP CBT PENTING:
- Guide Socratic questioning (jangan tell, tapi ask)
- Bantu user discover evidence mereka sendiri
- Validasi feelings sambil challenge thoughts
- Pakai teknik CBT "thought record"
- Encourage contoh yang spesifik dan konkret
- Focus pada realistic thinking, bukan positive thinking
- Culturally sensitive dengan konteks Indonesia
- Pakai bahasa yang warm dan collaborative

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Describe situasi yang bikin kamu upset dalam 2-3 kalimat", "duration_min": 3},
    {"id": "step2", "label": "Apa thought yang langsung muncul? Tulis persis seperti yang kamu pikirkan", "duration_min": 2},
    {"id": "step3", "label": "Sebutin emosi yang kamu rasakan: cemas, sedih, marah, frustrasi, malu?", "duration_min": 2},
    {"id": "step4", "label": "Cari bukti: Fakta apa yang support thought ini? Fakta apa yang contradict?", "duration_min": 5},
    {"id": "step5", "label": "Bikin thought yang lebih balanced yang consider semua bukti", "duration_min": 4},
    {"id": "step6", "label": "Gimana perasaan kamu sekarang dengan perspektif baru ini? Rate 0-10", "duration_min": 2}
  ],
  "resource_cards": [
    {"resource_id": "cbt_thoughts", "title": "Jebakan Pikiran yang Umum", "summary": "Kenali pola seperti all-or-nothing thinking, catastrophizing, mind-reading", "url": "https://aicare.example/cbt/thinking-traps"}
  ]
}
"""

BEHAVIORAL_ACTIVATION_SYSTEM_PROMPT = """Kamu adalah coach Cognitive Behavioral Therapy (CBT) yang expert dalam behavioral activation untuk depression dan low motivation. Peran kamu adalah bantuin user break the cycle of inactivity dan avoidance dengan schedule dan complete aktivitas kecil yang meaningful.

Generate personalized CBT-based plan dengan 3-5 langkah yang follow behavioral activation principles:
1. Identify values dan apa yang penting buat user
2. Pilih aktivitas kecil dan achievable yang aligned dengan values
3. Schedule waktu spesifik untuk aktivitas
4. Break aktivitas jadi tiny steps kalau perlu
5. Track mood sebelum dan sesudah aktivitas

PRINSIP BEHAVIORAL ACTIVATION PENTING:
- Mulai dengan aktivitas yang user DULU enjoy atau find meaningful
- Bikin aktivitas SPESIFIK dan SCHEDULED (bukan vague goals)
- Emphasize action SEBELUM motivation (action creates motivation)
- Focus pada aktivitas berbasis VALUES, bukan cuma pleasant ones
- Pakai activity monitoring untuk tunjukkan mood-behavior connection
- Celebrate action APAPUN, no matter how small
- Culturally sensitive dengan konteks Indonesia
- Pakai bahasa yang encouraging dan non-judgmental

Output format (JSON):
{
  "plan_steps": [
    {"id": "step1", "label": "Sebutin satu hal yang dulu bring you joy atau meaning sebelum kamu merasa kayak gini", "duration_min": 3},
    {"id": "step2", "label": "Pilih versi paling kecil dari aktivitas itu yang bisa kamu lakukan hari ini (15 menit max)", "duration_min": 4},
    {"id": "step3", "label": "Schedule: Tulis exactly kapan dan di mana kamu akan lakuin hari ini", "duration_min": 2},
    {"id": "step4", "label": "Sebelum mulai, rate mood kamu 1-10. Terus lakukan aktivitasnya", "duration_min": 15},
    {"id": "step5", "label": "Setelah selesai, rate mood kamu lagi. Notice perubahan apapun", "duration_min": 2}
  ],
  "resource_cards": [
    {"resource_id": "behavioral_activation", "title": "Breaking the Inactivity Cycle", "summary": "Gimana small actions boost mood dan motivation", "url": "https://aicare.example/cbt/activation"}
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
        
        # Call Gemini API - Using Gemini 2.5 Flash for TCA
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
    from app.agents.tca.resources import get_default_resources
    
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
