# backend/app/core/cbt_modules/cognitive_restructuring_module.py
from app.core.cbt_module_types import CBTModule, CBTStep, CBTModuleData

# --- Module-Specific Helper Functions (Processors & Generators) ---

def _cr_step1_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['consent_cr'] = user_response.lower()
    if 'tidak' in user_response.lower() or 'belum' in user_response.lower():
        module_data['next_action'] = 'offer_exit_cr'
    return module_data

def _cr_step2_prompt_generator(module_data: CBTModuleData) -> str:
    if module_data.get('next_action') == 'offer_exit_cr':
        return "Baiklah, tidak masalah. Kamu bisa mencoba modul ini lain waktu jika merasa lebih siap. Ada hal lain yang bisa kubantu saat ini?"
    return "Mari kita mulai. Coba ceritakan sebuah situasi yang baru-baru ini membuatmu merasa tidak nyaman atau tertekan, dan pikiran otomatis apa yang muncul saat itu?"

def _cr_step2_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    # Simple parsing, could be improved with NLP later if needed
    module_data['situation_and_thought'] = user_response
    # Try to extract thought, or ask for clarification in next step if too combined
    # For now, assume user provides something like "Situasi: Gagal ujian. Pikiran: Saya bodoh."
    # Or we can guide them in the prompt more explicitly.
    # Let's refine the prompt for step 2 for clarity.
    return module_data

# Refined prompt for step 2, and new step 3 for emotion
def _cr_step2_refined_prompt_generator(module_data: CBTModuleData) -> str:
    if module_data.get('next_action') == 'offer_exit_cr':
        return "Baiklah, tidak masalah. Kamu bisa mencoba modul ini lain waktu jika merasa lebih siap. Ada hal lain yang bisa kubantu saat ini?"
    return ("Mari kita mulai. Coba pikirkan sebuah situasi yang baru-baru ini membuatmu merasa tidak nyaman atau tertekan. "
            "Ceritakan singkat situasinya.")

def _cr_step2_refined_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['situation'] = user_response
    return module_data

def _cr_step3_prompt_generator(module_data: CBTModuleData) -> str:
    situation = module_data.get('situation', 'Situasi tersebut')
    return f"Untuk situasi '{situation}', pikiran otomatis apa yang langsung muncul di benakmu?"

def _cr_step3_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['automatic_thought'] = user_response
    return module_data

def _cr_step4_prompt_generator(module_data: CBTModuleData) -> str:
    thought = module_data.get('automatic_thought', 'Pikiran tersebut')
    return f"Ketika pikiran '{thought}' muncul, perasaan apa yang kamu alami? (Contoh: sedih, cemas, marah, kecewa)"

def _cr_step4_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['emotion'] = user_response
    return module_data

def _cr_step5_prompt_generator(module_data: CBTModuleData) -> str:
    thought = module_data.get('automatic_thought', 'Pikiranmu')
    return (f"Sekarang, mari kita periksa {thought}. "
            "Apa bukti yang mendukung kebenaran pikiran ini? Dan apa bukti yang menentangnya atau menunjukkan bahwa pikiran ini mungkin tidak sepenuhnya benar?")

def _cr_step5_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['evidence_for_against'] = user_response
    return module_data

def _cr_step6_prompt_generator(module_data: CBTModuleData) -> str:
    thought = module_data.get('automatic_thought', 'Pikiran awalmu')
    return (f"Setelah mempertimbangkan bukti-bukti tadi, apakah ada cara pandang alternatif atau yang lebih seimbang terhadap situasi tersebut, selain '{thought}'? "
            "Coba rumuskan pikiran baru yang lebih realistis atau membantu.")

def _cr_step6_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['alternative_thought'] = user_response
    return module_data

def _cr_step7_prompt_generator(module_data: CBTModuleData) -> str:
    alternative_thought = module_data.get('alternative_thought', 'Pikiran alternatifmu')
    return (f"Bagaimana perasaanmu sekarang setelah memikirkan '{alternative_thought}'? "
            "Apakah ada perubahan dibandingkan perasaan awalmu?")

def _cr_step7_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['emotion_after_alternative'] = user_response
    return module_data

# --- Module Definition ---
COGNITIVE_RESTRUCTURING_MODULE: CBTModule = {
    "id": "cbt_cognitive_restructuring",
    "name": "Menantang Pikiran Negatif (Restrukturisasi Kognitif)",
    "description": "Latihan untuk mengidentifikasi, menantang, dan mengubah pola pikir yang tidak membantu.",
    "steps": {
        1: {
            "prompt_template": (
                "Selamat datang di modul Restrukturisasi Kognitif. Dalam modul ini, kita akan belajar "
                "mengidentifikasi pikiran-pikiran otomatis yang mungkin kurang membantu dan mencoba melihatnya dari sudut pandang yang berbeda. "
                "Ini bisa membantu mengurangi perasaan tidak nyaman. Apakah kamu mau mencobanya?"
            ),
            "response_processor": _cr_step1_processor,
        },
        2: { # Identifying the situation
            "dynamic_prompt_generator": _cr_step2_refined_prompt_generator,
            "response_processor": _cr_step2_refined_processor,
        },
        3: { # Identifying the automatic thought
            "dynamic_prompt_generator": _cr_step3_prompt_generator,
            "response_processor": _cr_step3_processor,
        },
        4: { # Identifying the emotion
            "dynamic_prompt_generator": _cr_step4_prompt_generator,
            "response_processor": _cr_step4_processor,
        },
        5: { # Examining evidence
            "dynamic_prompt_generator": _cr_step5_prompt_generator,
            "response_processor": _cr_step5_processor,
        },
        6: { # Forming an alternative thought
            "dynamic_prompt_generator": _cr_step6_prompt_generator,
            "response_processor": _cr_step6_processor,
        },
        7: { # Re-evaluating emotion
            "dynamic_prompt_generator": _cr_step7_prompt_generator,
            "response_processor": _cr_step7_processor,
        },
        8: {
            "prompt_template": (
                "Bagus sekali! Kamu telah menyelesaikan latihan restrukturisasi kognitif. "
                "Ingat, ini adalah keterampilan yang perlu dilatih. Semakin sering kamu melakukannya, "
                "semakin mudah untuk mengenali dan mengubah pikiran yang tidak membantu. "
                "Modul selesai. Apakah ada hal lain yang ingin kita diskusikan?"
            ),
            "action": "complete_module",
        }
    }
}