# backend/app/core/cbt_modules/express_feelings_module.py
from app.core.cbt_module_types import CBTModule, CBTStep, CBTModuleData, ResponseProcessor, DynamicPromptGenerator

# --- Module-Specific Helper Functions (Processors & Generators) ---

def _step1_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['consent_express_feelings'] = user_response.lower()
    if 'tidak' in user_response.lower() or 'belum' in user_response.lower():
        module_data['next_action'] = 'offer_exit' # Custom internal signal
    return module_data

def _step2_prompt_generator(module_data: CBTModuleData) -> str:
    if module_data.get('next_action') == 'offer_exit':
        # This prompt can be made more generic if 'offer_exit' is a common pattern
        return "Tidak masalah. Kamu bisa kembali ke modul ini kapan saja kamu siap. Apakah ada hal lain yang ingin kamu diskusikan sekarang?"
    return "Baik. Coba ceritakan satu situasi ringan yang baru-baru ini kamu alami, di mana kamu merasa ada sesuatu yang ingin kamu sampaikan tapi mungkin ragu atau bingung bagaimana caranya."

def _step2_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['situation_description'] = user_response
    return module_data

def _step3_prompt_generator(module_data: CBTModuleData) -> str:
    situation = module_data.get('situation_description', 'situasi tersebut')
    return (
        f"Mengerti tentang situasi '{situation}'. "
        "Saat itu, perasaan apa yang paling dominan kamu rasakan? (Contoh: senang, sedih, marah, cemas, kecewa, gugup, dll.) "
        "Coba sebutkan satu atau dua yang paling kuat."
    )

def _step3_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['identified_feelings'] = user_response
    return module_data

def _step4_prompt_generator(module_data: CBTModuleData) -> str:
    feelings = module_data.get('identified_feelings', 'perasaan itu')
    return f"Kamu merasa {feelings}. Pikiran apa yang muncul di benakmu saat itu, terkait situasi tersebut dan perasaanmu?"

def _step4_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['associated_thoughts'] = user_response
    return module_data

def _step5_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['obstacles_to_expression'] = user_response
    return module_data

def _step6_prompt_generator(module_data: CBTModuleData) -> str:
    situation = module_data.get('situation_description', 'situasi itu')
    feelings = module_data.get('identified_feelings', 'perasaan tersebut')
    return (
        f"Mari kita coba latih satu cara mengungkapkannya. Menggunakan 'Saya merasa...', bagaimana kamu akan mengungkapkan {feelings} terkait '{situation}'? "
        "Contoh: 'Saya merasa kecewa ketika jadwalku berubah mendadak karena saya sudah punya rencana lain.'"
    )

def _step6_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['feeling_i_statement'] = user_response
    return module_data

def _step7_prompt_generator(module_data: CBTModuleData) -> str:
    thoughts = module_data.get('associated_thoughts', 'pikiran itu')
    return (
        f"Bagus! Sekarang, untuk pikiran '{thoughts}', bagaimana kamu bisa mengkomunikasikannya atau kebutuhanmu dengan jelas dan sopan? "
        "Contoh: 'Saya berpikir bahwa akan lebih baik jika kita bisa diskusi dulu sebelum mengubah rencana, dan saya membutuhkan pemberitahuan setidaknya satu hari sebelumnya.'"
    )

def _step7_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['thought_need_i_statement'] = user_response
    return module_data

# --- Module Definition ---
EXPRESS_FEELINGS_MODULE: CBTModule = {
    "id": "cbt_express_feelings",
    "name": "Belajar Mengekspresikan Perasaan dan Pikiran",
    "description": "Latihan interaktif untuk membantumu mengenali dan mengungkapkan perasaan serta pikiran secara sehat.",
    "steps": {
        1: {
            "prompt_template": (
                "Selamat datang di modul 'Belajar Mengekspresikan Perasaan dan Pikiran'. "
                "Modul ini bertujuan membantumu lebih nyaman dalam mengenali dan mengungkapkan apa yang kamu rasakan dan pikirkan. "
                "Di sini kita akan berlatih bersama. Apakah kamu siap untuk memulai?"
            ),
            "response_processor": _step1_processor,
        },
        2: {
            "dynamic_prompt_generator": _step2_prompt_generator,
            "response_processor": _step2_processor,
        },
        3: {
            "dynamic_prompt_generator": _step3_prompt_generator,
            "response_processor": _step3_processor,
        },
        4: {
            "dynamic_prompt_generator": _step4_prompt_generator,
            "response_processor": _step4_processor,
        },
        5: {
            "prompt_template": (
                "Kadang kita merasa sulit mengungkapkan perasaan atau pikiran. Menurutmu, apa yang biasanya membuatmu ragu atau menahan diri untuk mengungkapkannya dalam situasi seperti itu?"
            ),
            "response_processor": _step5_processor,
        },
        6: {
            "dynamic_prompt_generator": _step6_prompt_generator,
            "response_processor": _step6_processor,
        },
        7: {
            "dynamic_prompt_generator": _step7_prompt_generator,
            "response_processor": _step7_processor,
        },
        8: {
            "prompt_template": (
                "Latihan ini selesai. Bagaimana perasaanmu setelah mencoba merumuskan dan 'mengucapkan' perasaan serta pikiranmu tadi? "
                "Ingat, ini adalah latihan, dan semakin sering dilatih akan semakin mudah. Kamu bisa kembali lagi jika butuh. "
                "Apakah ada hal lain yang ingin kamu diskusikan sekarang atau kamu ingin mencoba modul lain?"
            ),
            "action": "complete_module",
        }
    }
}

# You would do the same for deal_with_guilt_module.py,
# cognitive_restructuring_module.py, and problem_solving_module.py
# by migrating their respective logic and definitions.