# backend/app/core/cbt_modules/deal_with_guilt_module.py
from app.core.cbt_module_types import CBTModule, CBTStep, CBTModuleData

# --- Module-Specific Helper Functions (Processors & Generators) ---

def _step1_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['consent_deal_guilt'] = user_response.lower()
    if 'tidak' in user_response.lower() or 'belum' in user_response.lower():
        module_data['next_action'] = 'offer_exit_guilt'
    return module_data

def _step2_prompt_generator(module_data: CBTModuleData) -> str:
    if module_data.get('next_action') == 'offer_exit_guilt':
        return "Tentu saja, tidak apa-apa. Mengelola perasaan bersalah memang butuh waktu dan kesiapan. Kamu bisa kembali ke modul ini kapan saja. Ada yang lain yang ingin kita bahas?"
    return "Baik. Coba ceritakan situasi atau tindakan spesifik yang membuatmu merasa bersalah saat ini. Apa yang terjadi?"

def _step2_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['guilt_source_situation'] = user_response
    return module_data

def _step3_prompt_generator(module_data: CBTModuleData) -> str:
    situation = module_data.get('guilt_source_situation', 'situasi itu')
    return (
        f"Terima kasih sudah berbagi tentang '{situation}'. "
        "Rasa bersalah itu bisa datang dari berbagai sumber. Kadang karena kita merasa melanggar nilai penting bagi diri sendiri, "
        "kadang karena merasa tidak memenuhi ekspektasi orang lain, atau mungkin ada campuran keduanya. "
        "Menurutmu, rasa bersalah yang kamu rasakan ini lebih condong ke mana? Atau mungkin ada penyebab lain yang kamu sadari?"
    )

def _step3_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['guilt_type_reflection'] = user_response
    return module_data

def _step4_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['responsibility_steps'] = user_response
    return module_data

def _step5_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['learning_and_forgiveness'] = user_response
    return module_data

def _step6_processor(user_response: str, module_data: CBTModuleData) -> CBTModuleData:
    module_data['moving_forward_step'] = user_response
    return module_data

# --- Module Definition ---
DEAL_WITH_GUILT_MODULE: CBTModule = {
    "id": "cbt_deal_with_guilt",
    "name": "Belajar Mengatasi Rasa Bersalah",
    "description": "Modul untuk membantumu memahami dan mengelola perasaan bersalah secara konstruktif.",
    "steps": {
        1: {
            "prompt_template": (
                "Selamat datang di modul 'Belajar Mengatasi Rasa Bersalah'. Rasa bersalah itu wajar dialami siapa saja, "
                "tapi kadang bisa terasa sangat memberatkan jika tidak dikelola dengan baik. "
                "Modul ini bertujuan membantumu melihat perasaan bersalahmu dengan lebih jernih dan menemukan cara yang lebih sehat untuk meresponsnya. "
                "Apakah kamu bersedia menjelajahi perasaan bersalah yang mungkin sedang kamu rasakan?"
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
            "prompt_template": (
                "Sekarang, mari kita pikirkan tentang tanggung jawab. Jika kamu merasa ada tindakanmu dalam situasi tersebut yang memang perlu dipertanggungjawabkan, "
                "langkah konkret apa yang menurutmu bisa kamu ambil? Ini bisa berupa permintaan maaf, mencoba memperbaiki situasi, atau hal lain. "
                "Namun, jika kamu merasa rasa bersalah ini bukan sepenuhnya karena kesalahanmu, itu juga tidak apa-apa."
            ),
            "response_processor": _step4_processor,
        },
        5: {
            "prompt_template": (
                "Setiap pengalaman, termasuk yang menimbulkan rasa bersalah, bisa menjadi pelajaran berharga. "
                "Apa yang bisa kamu pelajari dari situasi ini untuk dirimu ke depannya? "
                "Dan, yang tidak kalah penting, bagaimana kamu bisa mulai proses memaafkan dirimu sendiri, terlepas dari apa yang sudah terjadi?"
            ),
            "response_processor": _step5_processor,
        },
        6: {
            "prompt_template": (
                "Mengelola rasa bersalah adalah sebuah proses, bukan sesuatu yang instan. "
                "Melihat ke depan, apa satu langkah kecil dan realistis yang bisa kamu lakukan hari ini atau dalam waktu dekat untuk membantu dirimu merasa sedikit lebih baik atau mulai melepaskan sebagian beban rasa bersalah ini?"
            ),
            "response_processor": _step6_processor,
        },
        7: {
            "prompt_template": (
                "Terima kasih sudah berbagi dan menjalani modul ini bersamaku. "
                "Ingatlah bahwa kamu tidak sendirian dalam merasakan ini, dan belajar mengelola rasa bersalah adalah bagian penting dari pertumbuhan diri. "
                "Kamu bisa kembali ke modul ini atau modul lain kapan saja kamu butuh. Modul selesai. "
                "Apakah ada hal lain yang ingin kamu diskusikan sekarang?"
            ),
            "action": "complete_module",
        }
    }
}