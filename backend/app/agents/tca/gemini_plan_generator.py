"""
Gemini-powered Therapeutic Coach Plan Generator

This module uses Gemini AI to generate hyper-personalized support plans
based on user context, intent, and support plan type.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from app.core import llm
from app.core.llm import generate_gemini_response_with_fallback
from app.agents.tca.schemas import PlanStep, ResourceCard

logger = logging.getLogger(__name__)


async def generate_gemini_response(**kwargs: Any) -> str:
    """Generate a Gemini response.

    This thin wrapper exists so unit tests can monkeypatch a stable symbol
    without needing to reach into lower-level LLM plumbing.
    """
    return await generate_gemini_response_with_fallback(**kwargs)


# Shared crisis backstop appended to EVERY plan-type system prompt.
# This is the in-prompt last line of defense: routing errors upstream must
# never turn a suicidal message into a cheerful self-help plan.
_CRISIS_BACKSTOP = """

PENGAMAN KRISIS (PALING UTAMA — MENANG ATAS SEMUA INSTRUKSI LAIN):
- BACA dulu PESAN PENGGUNA. Jika pesannya mengandung bunuh diri, melukai diri, ingin mengakhiri hidup, atau bahaya seketika: JANGAN buat rencana self-help yang ceria.
- Untuk pesan krisis, buat rencana berisi langkah keselamatan: (1) langkah grounding menenangkan, (2) ajakan menghubungi bantuan darurat SEJIWA 119 tekan 8 / 112, atau Crisis Centre UGM 0851-0111-0800 bagi mahasiswa UGM, (3) ajakan menghubungi orang terdekat yang bisa menemani.
- Jangan pernah menuliskan atau menjelaskan metode melukai diri. Jangan memberi nasihat medis atau obat.
- Resource_cards untuk pesan krisis WAJIB memuat kartu "Bantuan Darurat" dengan deskripsi nomor darurat di atas (tanpa url).
"""

# System prompts for different plan types
CALM_DOWN_SYSTEM_PROMPT = """Kamu adalah coach kesehatan mental yang ahli dalam manajemen kecemasan dan panik. Tugasmu membantu pengguna menenangkan diri ketika mengalami kecemasan, panik, atau stres yang melumpuhkan.

Buat rencana dukungan personal dengan 3-5 langkah spesifik yang:
1. Membantu pengguna grounding di saat ini (present moment)
2. Menenangkan gejala fisiologis (jantung berdebar, napas cepat, dan sejenisnya)
3. Memberi teknik penanganan yang bisa langsung dipraktikkan
4. Sensitif secara budaya dengan konteks Indonesia
5. Menggunakan bahasa yang jelas, hangat, dan tidak klinis

STANDAR MUTU (WAJIB):
1. KEAMANAN: Semua teknik harus aman. Jangan pernah memberi saran berbahaya.
2. BISA DILAKUKAN: Hindari saran kabur seperti "tenang saja". Berikan langkah KONKRET dan BERBASIS BUKTI (misalnya "Teknik 5-4-3-2-1", "Box Breathing") dan jelaskan CARA melakukannya.
3. EMPATI: Nada yang memvalidasi dan hangat ("Wajar kamu merasa panik...").
4. RELEVAN: Menjawab langsung situasi spesifik pengguna, jangan generik.

KEBUTUHAN PENTING:
- Setiap langkah harus bisa langsung dipraktikkan
- Sertakan durasi yang jelas (misal "5 menit", "3 napas dalam")
- Hindari jargon medis
- Pertimbangkan situasi dan konteks spesifik pengguna

Output format (JSON):
{
  "plan_steps": [
    {"title": "Tarik napas dalam", "description": "Tarik napas dalam 5 kali - hirup 4 hitungan, tahan 4, hembuskan 6", "duration_min": 2},
    {"title": "Grounding", "description": "Sebutkan 5 hal yang kamu lihat sekarang untuk menenangkan diri", "duration_min": 3}
  ],
  "resource_cards": [
    {"title": "Latihan Napas Terpandu", "description": "Ikuti pola napas yang menenangkan", "activity_id": "breathing_exercise"}
  ],
  "next_check_in": {
    "timeframe": "1 jam",
    "method": "chat"
  }
}

ATURAN RESOURCE_CARDS: Gunakan activity_id dari daftar AKTIVITAS INTERAKTIF yang disediakan bila relevan. Jangan mengarang URL eksternal; biarkan url kosong (null) untuk konten dalam aplikasi.
"""

BREAK_DOWN_PROBLEM_SYSTEM_PROMPT = """Kamu adalah coach pemecahan masalah yang ahli memecah masalah kompleks dan melumpuhkan menjadi langkah-langkah yang bisa dikelola. Tugasmu membantu pengguna yang merasa macet, kewalahan, atau tidak tahu harus mulai dari mana.

Buat rencana dukungan personal dengan 4-6 langkah spesifik yang:
1. Membantu mengidentifikasi masalah inti dengan jelas
2. Memecah masalah besar menjadi bagian-bagian kecil yang bisa dikelola
3. Menentukan prioritas apa yang dikerjakan lebih dulu
4. Memberi aksi nyata yang konkret
5. Membangun momentum dan rasa mampu
6. Sensitif secara budaya dengan konteks Indonesia

STANDAR MUTU (WAJIB):
1. KEAMANAN: Langkah-langkah aman dan tidak membahayakan pengguna.
2. BISA DILAKUKAN: Hindari saran kabur. Berikan langkah KONKRET dan BERBASIS BUKTI (teknik "Chunking", "Eisenhower Matrix") dan jelaskan CARA melakukannya.
3. EMPATI: Nada yang memvalidasi dan hangat ("Wajar merasa berat dengan beban ini...").
4. RELEVAN: Menjawab langsung detail masalah pengguna, jangan generik.

KEBUTUHAN PENTING:
- Mulai dari kejelasan: bantu pengguna merumuskan apa yang dihadapi
- Gunakan teknik "chunking" untuk memecah kompleksitas
- Prioritaskan langkah secara logis (mendesak/penting lebih dulu)
- Sertakan langkah berpikir dan langkah aksi
- Berikan dorongan dan normalisasi perasaan kewalahan

Output format (JSON):
{
  "plan_steps": [
    {"title": "Definisikan Masalah", "description": "Tulis keluhan utama kamu dalam satu kalimat", "duration_min": 3},
    {"title": "Pecah Masalah", "description": "Tulis 3 bagian kecil dari masalah ini yang bisa kamu kerjakan terpisah", "duration_min": 5},
    {"title": "Mulai Kecil", "description": "Pilih bagian yang paling mudah untuk dimulai hari ini", "duration_min": 2}
  ],
  "resource_cards": [],
  "next_check_in": {
    "timeframe": "Besok pagi",
    "method": "chat"
  }
}

ATURAN RESOURCE_CARDS: Gunakan activity_id dari daftar AKTIVITAS INTERAKTIF yang disediakan bila relevan. Jangan mengarang URL eksternal; biarkan url kosong (null).
"""

GENERAL_COPING_SYSTEM_PROMPT = """Kamu adalah coach kesehatan mental yang ahli memberi strategi penanganan (coping) umum untuk manajemen stres. Tugasmu membantu pengguna membangun mekanisme coping yang sehat dan ketahanan mental.

Buat rencana dukungan personal dengan 3-5 langkah yang:
1. Menjawab pemicu stres spesifik pengguna (akademik, relasi, keuangan, dan sejenisnya)
2. Memberi kelegaan segera dan strategi coping jangka panjang
3. Menyertakan perawatan diri dan langkah mencari dukungan
4. Membangun dari kekuatan yang sudah dimiliki pengguna
5. Sensitif secara budaya dengan konteks Indonesia

STANDAR MUTU (WAJIB):
1. KEAMANAN: Mekanisme coping harus aman dan sehat.
2. BISA DILAKUKAN: Hindari saran kabur ("jangan stres"). Berikan langkah KONKRET dan BERBASIS BUKTI (misalnya "Journaling", "Progressive Muscle Relaxation") dan jelaskan CARA melakukannya.
3. EMPATI: Nada yang memvalidasi dan hangat ("Sangat wajar kamu merasa tertekan...").
4. RELEVAN: Menjawab langsung detail pemicu stres pengguna, jangan generik.

KEBUTUHAN PENTING:
- Seimbangkan kelegaan segera dengan coping yang berkelanjutan
- Sertakan coping aktif (memecahkan masalah) dan coping emosi
- Dorong dukungan sosial bila sesuai
- Perhatikan self-compassion dan normalisasi perjuangan
- Hindari toxic positivity — validasi perasaan lebih dulu

Output format (JSON):
{
  "plan_steps": [
    {"title": "Perawatan Diri", "description": "Luangkan 10 menit untuk satu hal yang kamu nikmati - musik, teh, jalan santai", "duration_min": 10},
    {"title": "Refleksi Kecil", "description": "Tulis satu hal yang sudah kamu tangani dengan baik belakangan ini", "duration_min": 3}
  ],
  "resource_cards": [],
  "next_check_in": {
    "timeframe": "2 hari lagi",
    "method": "chat"
  }
}

ATURAN RESOURCE_CARDS: Gunakan activity_id dari daftar AKTIVITAS INTERAKTIF yang disediakan bila relevan. Jangan mengarang URL eksternal; biarkan url kosong (null).
"""

COGNITIVE_RESTRUCTURING_SYSTEM_PROMPT = """Kamu adalah coach Cognitive Behavioral Therapy (CBT) yang ahli dalam restrukturisasi kognitif. Tugasmu membantu pengguna mengenali dan menguji pola pikir yang tidak membantu dengan memeriksa bukti dan membangun perspektif yang lebih seimbang.

Buat rencana berbasis CBT dengan 4-6 langkah yang mengikuti kerangka restrukturisasi kognitif:
1. Identifikasi situasi yang memicu distres
2. Kenali pikiran otomatis negatif
3. Beri label emosi yang dirasakan
4. Periksa bukti yang mendukung dan menentang pikiran tersebut
5. Bangun pikiran alternatif yang lebih seimbang
6. Evaluasi ulang emosi setelah reframing

STANDAR MUTU (WAJIB):
1. KEAMANAN: Proses reframing tidak boleh memvalidasi trauma atau menyalahkan pengguna.
2. BISA DILAKUKAN: Hindari saran kabur. Gunakan teknik KONKRET ("Thought Record", "Socratic Questioning") dan jelaskan CARA melakukannya.
3. EMPATI: Validasi perasaan pengguna sebelum menantang pikirannya.
4. RELEVAN: Menjawab langsung pikiran/situasi spesifik pengguna, jangan generik.

PRINSIP CBT PENTING:
- Pandu dengan pertanyaan Socratik (ajukan pertanyaan, jangan menggurui)
- Bantu pengguna menemukan buktinya sendiri
- Validasi perasaan sambil menguji pikiran
- Gunakan teknik "thought record"
- Fokus pada berpikir realistis, bukan positive thinking
- Sensitif secara budaya dengan konteks Indonesia

Output format (JSON):
{
  "plan_steps": [
    {"title": "Situasi", "description": "Ceritakan situasi yang membuat kamu terganggu dalam 2-3 kalimat", "duration_min": 3},
    {"title": "Pikiran Otomatis", "description": "Pikiran apa yang langsung muncul? Tulis persis seperti yang kamu pikirkan", "duration_min": 2},
    {"title": "Emosi", "description": "Sebutkan emosinya: cemas, sedih, marah, frustrasi, malu?", "duration_min": 2},
    {"title": "Bukti", "description": "Cari bukti: fakta apa yang mendukung pikiran ini? Fakta apa yang bertentangan?", "duration_min": 5},
    {"title": "Perspektif Baru", "description": "Susun pikiran yang lebih seimbang dengan mempertimbangkan semua bukti", "duration_min": 4},
    {"title": "Evaluasi Ulang", "description": "Bagaimana perasaanmu dengan perspektif baru ini? Beri nilai 0-10", "duration_min": 2}
  ],
  "resource_cards": [],
  "next_check_in": {
    "timeframe": "Besok sore",
    "method": "chat"
  }
}

ATURAN RESOURCE_CARDS: Gunakan activity_id dari daftar AKTIVITAS INTERAKTIF yang disediakan bila relevan. Jangan mengarang URL eksternal; biarkan url kosong (null).
"""

BEHAVIORAL_ACTIVATION_SYSTEM_PROMPT = """Kamu adalah coach Cognitive Behavioral Therapy (CBT) yang ahli dalam behavioral activation untuk merespons gejala depresi dan motivasi rendah. Tugasmu membantu pengguna memutus siklus pasif dan penghindaran dengan menjadwalkan serta menyelesaikan aktivitas kecil yang bermakna.

Buat rencana berbasis CBT dengan 3-5 langkah yang mengikuti prinsip behavioral activation:
1. Identifikasi nilai dan hal yang penting bagi pengguna
2. Pilih aktivitas kecil yang realistis dan selaras dengan nilai tersebut
3. Jadwalkan waktu spesifik untuk aktivitas itu
4. Pecah aktivitas menjadi langkah mungil bila perlu
5. Catat suasana hati sebelum dan sesudah aktivitas

STANDAR MUTU (WAJIB):
1. KEAMANAN: Aktivitas aman dilakukan pengguna dalam kondisinya saat ini.
2. BISA DILAKUKAN: Hindari saran kabur ("coba aktif"). Gunakan teknik KONKRET ("Activity Scheduling", "Graded Task Assignment") dan jelaskan CARA melakukannya.
3. EMPATI: Validasi betapa sulitnya memulai aktivitas saat motivasi sedang rendah.
4. RELEVAN: Menjawab langsung minat/situasi spesifik pengguna, jangan generik.

PRINSIP BEHAVIORAL ACTIVATION PENTING:
- Mulai dari aktivitas yang dulu pengguna nikmati atau anggap bermakna
- Buat aktivitas SPESIFIK dan TERJADWAL (bukan tujuan kabur)
- Tekankan aksi SEBELUM motivasi (aksi menciptakan motivasi)
- Rayakan aksi APA PUN, sekecil apa pun
- Sensitif secara budaya dengan konteks Indonesia

Output format (JSON):
{
  "plan_steps": [
    {"title": "Identifikasi", "description": "Sebutkan satu hal yang dulu kamu nikmati atau bermakna sebelum merasa seperti ini", "duration_min": 3},
    {"title": "Sederhanakan", "description": "Pilih versi paling kecil dari aktivitas itu yang bisa kamu lakukan hari ini (maksimal 15 menit)", "duration_min": 4},
    {"title": "Jadwalkan", "description": "Tulis tepat kapan dan di mana kamu akan melakukannya hari ini", "duration_min": 2},
    {"title": "Nilai Mood Awal", "description": "Sebelum mulai, nilai mood kamu 1-10. Lalu lakukan aktivitasnya", "duration_min": 15},
    {"title": "Nilai Mood Akhir", "description": "Setelah selesai, nilai mood kamu lagi. Amati perubahan apa pun", "duration_min": 2}
  ],
  "resource_cards": [],
  "next_check_in": {
    "timeframe": "Nanti malam",
    "method": "chat"
  }
}

ATURAN RESOURCE_CARDS: Gunakan activity_id dari daftar AKTIVITAS INTERAKTIF yang disediakan bila relevan. Jangan mengarang URL eksternal; biarkan url kosong (null).
"""


def _get_system_prompt(plan_type: str) -> str:
    """Get appropriate system prompt based on plan type.

    Every prompt carries the shared crisis backstop so a routing error
    upstream can never produce a cheerful self-help plan for a suicidal
    message.
    """
    prompts = {
        "calm_down": CALM_DOWN_SYSTEM_PROMPT,
        "break_down_problem": BREAK_DOWN_PROBLEM_SYSTEM_PROMPT,
        "general_coping": GENERAL_COPING_SYSTEM_PROMPT,
        "cognitive_restructuring": COGNITIVE_RESTRUCTURING_SYSTEM_PROMPT,
        "behavioral_activation": BEHAVIORAL_ACTIVATION_SYSTEM_PROMPT,
    }
    base = prompts.get(plan_type, GENERAL_COPING_SYSTEM_PROMPT)
    return base + _CRISIS_BACKSTOP


def _build_user_prompt(
    user_message: str,
    intent: str,
    plan_type: str,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """Build personalized user prompt with context."""
    from app.agents.tca.activities_catalog import get_all_activities_prompt_context

    guidance_block = ""
    if context:
        guidance_block = str(context.get("guidance_block") or "")

    prompt_parts = [
        f"USER'S MESSAGE: \"{user_message}\"\n",
        f"DETECTED INTENT: {intent}\n",
        f"PLAN TYPE NEEDED: {plan_type}\n",
    ]

    if guidance_block:
        prompt_parts.append(f"\n{guidance_block}\n")
    
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
    
    # Include available interactive activities
    prompt_parts.append("\n" + get_all_activities_prompt_context() + "\n")
    
    prompt_parts.append("\nBased on the above information, generate a hyper-personalized support plan that directly addresses this user's specific situation.")
    prompt_parts.append("\nPRIORITIZE including 1-2 interactive activities in resource_cards when relevant (breathing for anxiety, grounding for panic).")
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
        
        # Call Google SDK model - use Gemma 4 31B for complex reasoning with fallback on quota/rate limits
        response_text = await generate_gemini_response(
            history=[{"role": "user", "content": user_prompt}],
            model=getattr(llm, "GEMINI_PRO_MODEL", "gemma-4-31b-it"),
            max_tokens=2048,
            temperature=0.5,  # Clinical content: some variety, strong consistency
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
        
        # Attempt to repair truncated JSON (Cost-effective failsafe)
        repaired_plan = _repair_truncated_json(response_text, intent)
        if repaired_plan:
            return repaired_plan
            
        # Fallback to static plan
        return _get_fallback_plan(plan_type, intent)
    except Exception as e:
        logger.error(f"Error generating personalized plan with Gemini: {e}", exc_info=True)
        # Fallback to static plan
        return _get_fallback_plan(plan_type, intent)


def _repair_truncated_json(response_text: str, intent: str) -> Optional[Dict[str, Any]]:
    """
    Attempts to salvage valid data from a truncated JSON response.
    Common case: 'plan_steps' is complete but 'resource_cards' is cut off.
    """
    try:
        import re
        # Find the start of plan_steps array
        match = re.search(r'"plan_steps"\s*:\s*\[', response_text)
        if not match:
            return None
            
        start_pos = match.end() - 1 # Point to the '['
        
        # Stack-based parser to find the matching closing bracket
        stack = []
        end_pos = -1
        
        # Iterate through the string to find the balancing ']'
        # We need to be careful about brackets inside strings, but for a simple failsafe 
        # on this specific schema, a simple counter often suffices if we assume no '[' in the content text.
        # However, to be safe, let's just try to parse incrementally if we can't find a clean break.
        
        # Better approach for this specific schema:
        # The plan_steps array is a list of objects. We can try to find the last closing '},' or '}' 
        # before the truncation happens.
        
        current_pos = start_pos
        balance = 0
        in_string = False
        escape = False
        
        for i in range(start_pos, len(response_text)):
            char = response_text[i]
            
            if escape:
                escape = False
                continue
                
            if char == '\\':
                escape = True
                continue
                
            if char == '"':
                in_string = not in_string
                continue
                
            if not in_string:
                if char == '[':
                    balance += 1
                elif char == ']':
                    balance -= 1
                    if balance == 0:
                        end_pos = i + 1
                        break
        
        if end_pos != -1:
            # We found a complete list!
            plan_steps_str = response_text[start_pos:end_pos]
            try:
                plan_steps = json.loads(plan_steps_str)
                if isinstance(plan_steps, list) and len(plan_steps) > 0:
                    logger.info(f"✅ Successfully salvaged {len(plan_steps)} plan steps from truncated response")
                    return {
                        "plan_steps": plan_steps,
                        "resource_cards": _get_default_resources(intent)
                    }
            except json.JSONDecodeError:
                pass
        
        # If we couldn't find the closing ']', maybe we can salvage the items we have so far?
        # This is more complex, but let's try a simple heuristic:
        # Find the last occurrence of "}," inside the array and close it with "]"
        
        # Limit search to a reasonable window to avoid scanning huge garbage
        search_window = response_text[start_pos:]
        last_object_end = search_window.rfind('}')
        
        if last_object_end != -1:
            # Construct a candidate list string: [ ... } ]
            candidate_str = search_window[:last_object_end+1] + "]"
            try:
                plan_steps = json.loads(candidate_str)
                if isinstance(plan_steps, list) and len(plan_steps) > 0:
                    logger.info(f"✅ Successfully salvaged {len(plan_steps)} plan steps (partial list) from truncated response")
                    return {
                        "plan_steps": plan_steps,
                        "resource_cards": _get_default_resources(intent)
                    }
            except json.JSONDecodeError:
                pass

        return None
    except Exception as e:
        logger.warning(f"Failed to repair truncated JSON: {e}")
        return None


def _get_default_resources(intent: str) -> List[Dict[str, Any]]:
    """Get default resource cards based on intent, including interactive activities."""
    from app.agents.tca.resources import get_default_resources
    from app.agents.tca.activities_catalog import get_recommended_activities
    
    resources = []
    
    # Add recommended interactive activities first (priority)
    activities = get_recommended_activities(intent, max_activities=2)
    resources.extend(activities)
    
    # Add traditional resource links
    resource_objs = list(get_default_resources(intent))
    for r in resource_objs:
        resources.append({
            "title": getattr(r, "title", getattr(r, "label", "Resource")),
            "description": getattr(r, "description", getattr(r, "summary", "")),
            "url": getattr(r, "url", None),
            "resource_type": "link",
        })
    
    return resources


def _get_fallback_plan(plan_type: str, intent: str) -> Dict[str, Any]:
    """Rencana statis cadangan saat Gemini gagal.

    Wajib bahasa Indonesia: rencana ini ditujukan bagi pengguna yang sedang
    distres — fallback berbahasa Inggris adalah kegagalan aksesibilitas di
    jalur yang justru harus paling tangguh.
    """
    fallback_plans = {
        "calm_down": {
            "plan_steps": [
                {"title": "Box breathing (napas kotak)", "description": "Tarik napas 4 hitungan, tahan 4, hembuskan 4, tahan 4. Ulangi 4-5 kali", "duration_min": 3},
                {"title": "Grounding 5-4-3-2-1", "description": "Sebutkan 5 hal yang kamu lihat, 4 yang kamu dengar, 3 yang kamu rasa, 2 yang kamu cium, 1 yang kamu kecap", "duration_min": 5},
                {"title": "Kata-kata pada diri sendiri", "description": "Ucapkan dalam hati: 'Aku aman. Perasaan ini akan berlalu. Aku bisa melewatinya.'", "duration_min": 2},
            ],
            "resource_cards": _get_default_resources(intent),
            "next_check_in": {"timeframe": "1 jam", "method": "chat"}
        },
        "break_down_problem": {
            "plan_steps": [
                {"title": "Definisikan masalah", "description": "Tuliskan masalah utamamu dalam 1-2 kalimat", "duration_min": 3},
                {"title": "Pecah menjadi bagian kecil", "description": "Pecah menjadi 3-4 bagian kecil yang spesifik", "duration_min": 5},
                {"title": "Tentukan prioritas", "description": "Urutkan bagian-bagian itu dari yang paling mudah ke paling berat", "duration_min": 2},
                {"title": "Langkah pertama", "description": "Tulis satu aksi kecil untuk bagian termudah yang bisa kamu lakukan hari ini", "duration_min": 3},
            ],
            "resource_cards": _get_default_resources(intent),
            "next_check_in": {"timeframe": "Besok pagi", "method": "chat"}
        },
        "general_coping": {
            "plan_steps": [
                {"title": "Perawatan diri", "description": "Luangkan 10 menit untuk satu hal yang kamu nikmati - musik, teh, jalan santai", "duration_min": 10},
                {"title": "Validasi diri", "description": "Tulis: 'Tidak apa-apa merasa berat. Aku sudah melakukan yang terbaik.'", "duration_min": 2},
                {"title": "Dukungan sosial", "description": "Hubungi satu orang terpercaya hari ini - sekadar menyapa pun cukup", "duration_min": 5},
            ],
            "resource_cards": _get_default_resources(intent),
            "next_check_in": {"timeframe": "2 hari", "method": "chat"}
        },
        "cognitive_restructuring": {
            "plan_steps": [
                {"title": "Ceritakan situasinya", "description": "Ceritakan situasi yang mengganggumu dalam 2-3 kalimat", "duration_min": 3},
                {"title": "Kenali pikirannya", "description": "Pikiran otomatis apa yang muncul? Tulis persis seperti adanya", "duration_min": 2},
                {"title": "Sebutkan emosinya", "description": "Cemas, sedih, marah, frustrasi, malu?", "duration_min": 2},
                {"title": "Periksa buktinya", "description": "Tuliskan fakta yang mendukung DAN fakta yang bertentangan dengan pikiran itu", "duration_min": 5},
                {"title": "Susun perspektif baru", "description": "Bentuk pikiran yang lebih seimbang dengan mempertimbangkan semua bukti", "duration_min": 4},
                {"title": "Evaluasi ulang", "description": "Bagaimana perasaanmu sekarang? Nilai emosimu 0-10", "duration_min": 2},
            ],
            "resource_cards": _get_default_resources(intent),
            "next_check_in": {"timeframe": "Besok sore", "method": "chat"}
        },
        "behavioral_activation": {
            "plan_steps": [
                {"title": "Pilih aktivitas", "description": "Sebutkan satu aktivitas yang dulu kamu nikmati atau anggap bermakna", "duration_min": 3},
                {"title": "Sederhanakan", "description": "Pilih versi terkecilnya yang bisa kamu lakukan hari ini (maksimal 15 menit)", "duration_min": 3},
                {"title": "Jadwalkan", "description": "Tulis tepat kapan dan di mana kamu akan melakukannya hari ini", "duration_min": 2},
                {"title": "Nilai mood awal", "description": "Nilai mood kamu 1-10 sebelum memulai", "duration_min": 1},
                {"title": "Lakukan", "description": "Kerjakan aktivitas yang sudah kamu jadwalkan", "duration_min": 15},
                {"title": "Nilai mood akhir", "description": "Nilai mood kamu 1-10 lagi. Amati perubahan apa pun", "duration_min": 2},
            ],
            "resource_cards": _get_default_resources(intent),
            "next_check_in": {"timeframe": "Nanti malam", "method": "chat"}
        }
    }

    return fallback_plans.get(plan_type, fallback_plans["general_coping"])
