# backend/app/core/cbt_module_logic.py

from typing import Dict, Any, Tuple, Optional, Callable
import logging

logger = logging.getLogger(__name__)

# Type for module data collected during the session
CBTModuleData = Dict[str, Any]

# Type for a function that processes user response and updates module data
# Returns the updated module_data
ResponseProcessor = Callable[[str, CBTModuleData], CBTModuleData]

# Type for a function that generates a dynamic prompt based on module_data
# Returns the prompt string
DynamicPromptGenerator = Callable[[CBTModuleData], str]


def default_response_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    """Default processor if no specific one is needed for a step."""
    # For now, we might not need to store every generic response,
    # but this structure allows for it.
    # module_data[f"response_step_{module_data.get('current_step', 'unknown')}"] = user_response
    return module_data

def cog_restruct_step1_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['situation_thought'] = user_response
    return module_data

def cog_restruct_step2_prompt_generator(module_data: CBTModuleData) -> str:
    situation_thought = module_data.get('situation_thought', 'situasi yang membuatmu tidak nyaman')
    return (
        f"Terima kasih sudah berbagi tentang '{situation_thought}'. "
        "Saat pikiran itu muncul, emosi apa yang paling kuat kamu rasakan? (Contoh: sedih, cemas, marah, kecewa, takut)"
    )

def cog_restruct_step2_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['emotion'] = user_response
    return module_data

def cog_restruct_step3_prompt_generator(module_data: CBTModuleData) -> str:
    emotion = module_data.get('emotion', 'emosi tersebut')
    situation_thought = module_data.get('situation_thought', 'pikiran itu')
    return (
        f"Mengerti, kamu merasa {emotion} ketika mengalami {situation_thought}. "
        "Sekarang, mari kita identifikasi lebih dalam pikiran otomatis yang muncul. "
        "Pikiran spesifik apa yang terlintas di benakmu tepat sebelum atau selama kamu merasakan {emotion} itu?"
        "Contoh: 'Saya pasti gagal', 'Tidak ada yang peduli', 'Ini tidak akan pernah membaik'."
    )

def cog_restruct_step3_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['automatic_thought'] = user_response
    return module_data

def cog_restruct_step4_prompt_generator(module_data: CBTModuleData) -> str:
    automatic_thought = module_data.get('automatic_thought', 'pikiran otomatis itu')
    return (
        f"Oke, pikiran otomatisnya adalah '{automatic_thought}'. "
        "Sekarang, mari kita cari bukti yang mendukung pikiran ini. Apa saja fakta atau pengalaman yang membuatmu percaya bahwa pikiran ini benar?"
    )

def cog_restruct_step4_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['evidence_for'] = user_response
    return module_data

def cog_restruct_step5_prompt_generator(module_data: CBTModuleData) -> str:
    automatic_thought = module_data.get('automatic_thought', 'pikiran otomatis itu')
    return (
        f"Terima kasih. Sekarang, coba kita cari bukti yang BERTENTANGAN dengan pikiran '{automatic_thought}'. "
        "Apa saja fakta, pengalaman, atau pengecualian yang menunjukkan bahwa pikiran ini mungkin tidak sepenuhnya benar atau tidak selalu benar?"
    )

def cog_restruct_step5_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['evidence_against'] = user_response
    return module_data

def cog_restruct_step6_prompt_generator(module_data: CBTModuleData) -> str:
    automatic_thought = module_data.get('automatic_thought', 'pikiran tersebut')
    evidence_for = module_data.get('evidence_for', 'tidak ada bukti pendukung yang spesifik')
    evidence_against = module_data.get('evidence_against', 'tidak ada bukti pertentangan yang spesifik')
    return (
        f"Kita sudah melihat pikiran '{automatic_thought}'.\n"
        f"Bukti yang mendukung: '{evidence_for}'.\n"
        f"Bukti yang menentang: '{evidence_against}'.\n\n"
        "Dengan mempertimbangkan kedua sisi ini, adakah cara pandang yang lebih seimbang atau alternatif terhadap situasi ini? "
        "Pikiran baru apa yang lebih membantu dan realistis yang bisa kamu gunakan untuk menggantikan pikiran otomatis tadi?"
    )

def cog_restruct_step6_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['balanced_thought'] = user_response
    return module_data

def cog_restruct_step7_prompt_generator(module_data: CBTModuleData) -> str:
    balanced_thought = module_data.get('balanced_thought', 'pikiran yang lebih seimbang')
    return (
         f"Pikiran baru seperti '{balanced_thought}' terdengar lebih suportif. "
        "Bagaimana perasaanmu setelah mencoba melihatnya dari sisi yang berbeda dan menemukan alternatif pikiran ini? "
        "Latihan ini selesai. Ingatlah, mengenali dan menantang pikiran otomatis adalah sebuah keterampilan yang berkembang seiring waktu. Kamu bisa kembali ke latihan ini kapan saja."
    )

# --- Cognitive Restructuring Module Definition ---
COGNITIVE_RESTRUCTURING_MODULE = {
    "id": "cbt_cognitive_restructuring",
    "name": "Menantang Pikiran Negatif (Restrukturisasi Kognitif)",
    "description": "Latihan untuk mengidentifikasi, menantang, dan mengubah pola pikir negatif atau tidak membantu.",
    "steps": {
        1: {
            "prompt_template": (
                "Selamat datang di latihan Menantang Pikiran Negatif. Latihan ini akan membantumu mengidentifikasi "
                "dan mengubah pola pikir yang mungkin membuatmu merasa tidak nyaman.\n\n"
                "Untuk memulai, coba pikirkan satu situasi atau pikiran yang sering mengganggumu atau membuatmu merasa cemas/sedih akhir-akhir ini. Bisa ceritakan sedikit?"
            ),
            "response_processor": cog_restruct_step1_processor,
        },
        2: {
            "dynamic_prompt_generator": cog_restruct_step2_prompt_generator,
            "response_processor": cog_restruct_step2_processor,
        },
        3: {
            "dynamic_prompt_generator": cog_restruct_step3_prompt_generator,
            "response_processor": cog_restruct_step3_processor,
        },
        4: {
            "dynamic_prompt_generator": cog_restruct_step4_prompt_generator,
            "response_processor": cog_restruct_step4_processor,
        },
        5: {
            "dynamic_prompt_generator": cog_restruct_step5_prompt_generator,
            "response_processor": cog_restruct_step5_processor,
        },
        6: {
            "dynamic_prompt_generator": cog_restruct_step6_prompt_generator,
            "response_processor": cog_restruct_step6_processor,
        },
        7: {
            "dynamic_prompt_generator": cog_restruct_step7_prompt_generator,
            "action": "complete_module", # Mark module as complete
        }
    }
}

# --- Problem Solving Module Definition (Structure + Initial Prompts) ---
def problem_solving_step1_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['problem_description'] = user_response
    return module_data

def problem_solving_step2_prompt_generator(module_data: CBTModuleData) -> str:
    problem = module_data.get('problem_description', 'masalah tersebut')
    return (
        f"Oke, masalah yang ingin kamu atasi adalah '{problem}'. "
        "Sekarang, mari kita pecah menjadi bagian-bagian yang lebih kecil atau lebih spesifik jika memungkinkan. "
        "Apa saja aspek-aspek utama dari masalah ini?"
    )
# ... (Define more processors and prompt generators for problem solving) ...

PROBLEM_SOLVING_MODULE = {
    "id": "cbt_problem_solving",
    "name": "Latihan Memecahkan Masalah",
    "description": "Latihan terstruktur untuk membantumu mengidentifikasi dan menyelesaikan masalah langkah demi langkah.",
    "steps": {
        1: {
            "prompt_template": (
                "Selamat datang di latihan Memecahkan Masalah. Latihan ini dirancang untuk membantumu "
                "mengatasi masalah yang mungkin terasa berat dengan cara yang lebih terstruktur.\n\n"
                "Untuk memulai, apa masalah spesifik yang sedang kamu hadapi dan ingin coba selesaikan?"
            ),
            "response_processor": problem_solving_step1_processor,
        },
        2: {
            "dynamic_prompt_generator": problem_solving_step2_prompt_generator,
            # "response_processor": problem_solving_step2_processor, # Define this
        },
        # ... More steps:
        # 3. Brainstorming Solutions: "Sekarang, mari kita pikirkan sebanyak mungkin solusi untuk {problem_aspect}. Jangan khawatir soal bagus atau tidaknya dulu, tulis saja semua yang terpikirkan."
        # 4. Evaluating Solutions: "Dari daftar solusi tadi, mari kita evaluasi pro dan kontra untuk masing-masing solusi yang paling menjanjikan."
        # 5. Choosing a Solution: "Berdasarkan evaluasi, solusi mana yang menurutmu paling baik untuk dicoba saat ini?"
        # 6. Action Plan: "Oke, kita pilih solusi '{chosen_solution}'. Apa langkah-langkah kecil pertama yang bisa kamu ambil untuk menerapkan solusi ini?"
        # 7. Review & Reflection: "Latihan selesai. Ingat, memecahkan masalah adalah proses. Bagaimana perasaanmu setelah merencanakan langkah-langkah ini?"
        # Add "action": "complete_module" to the last step.
    }
}


CBT_MODULES_REGISTRY: Dict[str, Dict[str, Any]] = {
    COGNITIVE_RESTRUCTURING_MODULE["id"]: COGNITIVE_RESTRUCTURING_MODULE,
    PROBLEM_SOLVING_MODULE["id"]: PROBLEM_SOLVING_MODULE,
}


def get_module_intro(module_id: str) -> Optional[str]:
    """Returns the initial prompt (step 1) for a module."""
    module = CBT_MODULES_REGISTRY.get(module_id)
    if module and 1 in module["steps"]:
        return module["steps"][1].get("prompt_template")
    return None

def get_module_step_prompt(module_id: str, step: int, module_data: CBTModuleData) -> Optional[str]:
    """Returns the prompt for a given step, processing dynamic prompts if necessary."""
    module = CBT_MODULES_REGISTRY.get(module_id)
    if not module or step not in module["steps"]:
        logger.warning(f"Module {module_id} or step {step} not found.")
        return None
    
    step_config = module["steps"][step]
    
    if "dynamic_prompt_generator" in step_config:
        generator: DynamicPromptGenerator = step_config["dynamic_prompt_generator"]
        return generator(module_data)
    elif "prompt_template" in step_config:
        return step_config["prompt_template"]
    
    logger.warning(f"No prompt generator or template for module {module_id}, step {step}.")
    return None


def process_user_response_for_step(
    module_id: str, 
    step: int, 
    user_response: str, 
    module_data: CBTModuleData
) -> Tuple[CBTModuleData, Optional[int], Optional[str]]:
    """
    Processes user's response for the current step, updates module_data,
    and determines the next step and action.

    Returns:
        Tuple of (updated_module_data, next_step_number, action_or_none)
    """
    module = CBT_MODULES_REGISTRY.get(module_id)
    if not module or step not in module["steps"]:
        logger.error(f"Cannot process response: Module {module_id} or step {step} not found.")
        return module_data, None, None # Error or end

    step_config = module["steps"][step]
    
    # Update current step in module_data for context if needed by processors
    module_data['current_step'] = step

    # Process response and update module_data
    if "response_processor" in step_config:
        processor: ResponseProcessor = step_config["response_processor"]
        try:
            module_data = processor(user_response, module_data)
        except Exception as e:
            logger.error(f"Error in response processor for module {module_id}, step {step}: {e}")
            # Potentially return an error message or revert state

    action = step_config.get("action")
    if action == "complete_module":
        return module_data, None, action # Module completion

    # Determine next step (simple linear progression for now)
    next_step = step + 1
    if next_step not in module["steps"]:
        # This might mean the module is implicitly finished if no "complete_module" action
        # Or it's an error in module definition
        logger.info(f"No next step explicitly defined after step {step} for module {module_id}. Assuming completion or end of defined path.")
        return module_data, None, "complete_module" # Treat as completion

    return module_data, next_step, None