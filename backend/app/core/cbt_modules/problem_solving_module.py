# backend/app/core/cbt_modules/problem_solving_module.py
from app.core.cbt_module_types import CBTModule, CBTStep, CBTModuleData

# --- Module-Specific Helper Functions (Processors & Generators) ---

def _ps_step1_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['consent_ps'] = user_response.lower()
    if 'tidak' in user_response.lower() or 'belum' in user_response.lower():
        module_data['next_action'] = 'offer_exit_ps'
    return module_data

def _ps_step2_prompt_generator(module_data: CBTModuleData) -> str:
    if module_data.get('next_action') == 'offer_exit_ps':
        return "Tidak apa-apa. Kapanpun kamu siap, modul ini akan ada di sini. Ada yang bisa kubantu untuk saat ini?"
    return "Oke, mari kita mulai. Coba sebutkan satu masalah atau tantangan spesifik yang sedang kamu hadapi dan ingin kamu cari solusinya."

def _ps_step2_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['problem_definition'] = user_response
    return module_data

def _ps_step3_prompt_generator(module_data: CBTModuleData) -> str:
    problem = module_data.get('problem_definition', 'masalah tersebut')
    return (f"Untuk masalah '{problem}', mari kita coba pikirkan beberapa kemungkinan solusi atau langkah yang bisa diambil. "
            "Tidak perlu sempurna, tuliskan saja ide-ide yang muncul di benakmu, sebanyak mungkin.")

def _ps_step3_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['brainstormed_solutions'] = user_response # User might list several, separated by commas or newlines
    return module_data

def _ps_step4_prompt_generator(module_data: CBTModuleData) -> str:
    solutions = module_data.get('brainstormed_solutions', 'solusi-solusi tadi')
    return (f"Bagus! Dari daftar solusi ini:\n---\n{solutions}\n---\n "
            "Sekarang, untuk setiap solusi, coba pertimbangkan kelebihan dan kekurangannya. "
            "Misalnya, 'Solusi A: Kelebihannya X, Kekurangannya Y'.")

def _ps_step4_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['pros_cons_solutions'] = user_response
    return module_data

def _ps_step5_prompt_generator(module_data: CBTModuleData) -> str:
    # We might need to show the analyzed solutions here if it's complex.
    # For now, just ask them to choose.
    analyzed_solutions = module_data.get('pros_cons_solutions', 'analisis solusi tadi')
    return (f"Setelah mengevaluasi kelebihan dan kekurangan dari:\n---\n{analyzed_solutions}\n---\n"
            "Solusi atau kombinasi solusi mana yang menurutmu paling baik atau paling mungkin untuk dicoba saat ini?")

def _ps_step5_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['chosen_solution'] = user_response
    return module_data

def _ps_step6_prompt_generator(module_data: CBTModuleData) -> str:
    chosen_solution = module_data.get('chosen_solution', 'solusi yang kamu pilih')
    return (f"Luar biasa! Kamu memilih '{chosen_solution}'. "
            "Sekarang, mari kita buat rencana aksi. Langkah-langkah kecil apa saja yang perlu kamu ambil untuk menerapkan solusi ini? "
            "Coba buat daftarnya.")

def _ps_step6_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['action_plan'] = user_response
    return module_data

# --- Module Definition ---
PROBLEM_SOLVING_MODULE: CBTModule = {
    "id": "cbt_problem_solving",
    "name": "Latihan Memecahkan Masalah",
    "description": "Mengatasi rasa kewalahan dengan memecah masalah menjadi langkah-langkah yang lebih mudah dikelola.",
    "steps": {
        1: {
            "prompt_template": (
                "Selamat datang di modul Latihan Memecahkan Masalah. Terkadang, masalah bisa terasa besar dan membuat kita bingung harus mulai dari mana. "
                "Modul ini akan membantumu memecah masalah menjadi bagian-bagian yang lebih kecil dan mencari solusi secara sistematis. "
                "Apakah kamu ingin mencobanya?"
            ),
            "response_processor": _ps_step1_processor,
        },
        2: { # Define the problem
            "dynamic_prompt_generator": _ps_step2_prompt_generator,
            "response_processor": _ps_step2_processor,
        },
        3: { # Brainstorm solutions
            "dynamic_prompt_generator": _ps_step3_prompt_generator,
            "response_processor": _ps_step3_processor,
        },
        4: { # Evaluate pros and cons
            "dynamic_prompt_generator": _ps_step4_prompt_generator,
            "response_processor": _ps_step4_processor,
        },
        5: { # Choose the best solution
            "dynamic_prompt_generator": _ps_step5_prompt_generator,
            "response_processor": _ps_step5_processor,
        },
        6: { # Create an action plan
            "dynamic_prompt_generator": _ps_step6_prompt_generator,
            "response_processor": _ps_step6_processor,
        },
        7: {
            "prompt_template": (
                "Kamu sudah membuat rencana aksi yang bagus! Ingat, memecahkan masalah adalah proses. "
                "Tidak semua solusi akan berjalan sempurna, dan tidak apa-apa untuk menyesuaikan rencanamu di tengah jalan. "
                "Yang terpenting adalah kamu sudah mengambil langkah maju. Modul selesai. "
                "Apakah ada hal lain yang bisa kubantu?"
            ),
            "action": "complete_module",
        }
    }
}