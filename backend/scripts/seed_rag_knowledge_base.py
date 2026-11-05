#!/usr/bin/env python
"""Seed the RAG knowledge base with starter Bahasa Indonesia content.

WHY THIS EXISTS
---------------
The RAG pipeline in ``app/services/knowledge_retrieval_service.py`` is
code-complete, but a read-only check of the live database on 2026-10-15
found ``content_resources`` = 0 rows and ``content_resource_chunks`` = 0
rows. Retrieval therefore returns ``[]`` on every call and all agent
responses run ungrounded — silently, because the retrieval service is
designed to degrade gracefully ("grounding is an enhancement, never a
hard dependency").

This script closes that gap with starter content so grounding can be
verified end-to-end.

    ⚠️  THE CONTENT BELOW IS DRAFT, NOT CLINICALLY APPROVED.
    Every resource is stored with ``review_status="draft"`` in
    ``resource_metadata``. It is written to be reasonable and
    evidence-aligned (CBT-informed, WHO/Puskesmas-style guidance), but it
    MUST be reviewed and rewritten by UGM counselors / clinical staff
    before this platform serves students. Do not ship the drafts as-is.

USAGE
-----
    cd backend
    python scripts/seed_rag_knowledge_base.py --dry-run   # show plan only
    python scripts/seed_rag_knowledge_base.py             # insert + embed
    python scripts/seed_rag_knowledge_base.py --no-embed  # insert only

Idempotent: re-running skips resources whose title already exists. Use
``--force`` to re-embed existing ones (the embedding pipeline is
delete-then-insert, so re-embedding is safe).

The script embeds synchronously via ``process_embedding`` rather than
enqueueing autopilot actions, so it works even when the autopilot worker
is not running. It then runs a live retrieval self-check and prints the
result, so you can see grounding working (or exactly why it is not).
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Make ``app`` importable when run as a plain script from backend/.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy import select  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.domains.mental_health.models import ContentResource  # noqa: E402


# --------------------------------------------------------------------------
# DRAFT CONTENT
# --------------------------------------------------------------------------
# Categories match the enum in
# ``app/agents/shared/tools/knowledge_tools.py::_CATEGORY_QUERY_HINTS``
# (coping_strategies, relaxation_techniques, emergency_contacts,
#  educational_content, ugm_services).
#
# Markdown headings are deliberate: ``knowledge_chunking.split_into_sections``
# is heading-aware, so each ``##`` becomes a labelled section that survives
# into the retrieved passage and is shown to the model as its source label.
# Aim for 1500–4000 chars per resource so each yields 2–4 chunks.

_SEED_RESOURCES: list[dict] = [
    # ---------------------------------------------------------------- #
    # 1. EMERGENCY CONTACTS — must stay consistent with the crisis
    #    script hard-coded in app/agents/aika/identity.py (SEJIWA 119
    #    ext 8, 112, UGM Crisis Centre 0851-0111-0800).
    # ---------------------------------------------------------------- #
    {
        "title": "Kontak Darurat Krisis Kesehatan Mental (Indonesia & UGM)",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Nomor darurat yang harus diberikan saat terdeteksi sinyal krisis.",
        "tags": ["emergency_contacts", "krisis", "hotline", "darurat"],
        "content": """# Kontak Darurat Krisis Kesehatan Mental

## Jika Anda dalam bahaya langsung
Jika Anda atau orang di sekitar Anda berada dalam bahaya langsung untuk menyakiti diri sendiri atau orang lain, segera hubungi layanan darurat. Jangan menunggu. Keselamatan Anda adalah hal yang paling utama.

- **112** — Nomor darurat nasional (gratis, 24 jam) untuk keadaan darurat yang mengancam nyawa.
- **SEJIWA 119 tekan 8** — Layanan dukungan krisis kesehatan jiwa dari Kementerian Kesehatan (gratis, 24 jam).
- **Crisis Centre Universitas Gadjah Mada: 0851-0111-0800** — Pendampingan krisis untuk mahasiswa UGM.

## Apa yang perlu Anda lakukan saat menghubungi
Sebutkan dengan jelas bahwa ini situasi krisis. Ceritakan lokasi Anda dan kondisi Anda saat ini. Jika Anda sedang bersama seseorang, minta orang tersebut untuk tetap bersama Anda sampai bantuan datang. Jika memungkinkan, jauhkan benda-benda yang berpotensi membahayakan.

## Jika Anda merasa tidak aman tetapi tidak dalam bahaya langsung
Tetap hubungi salah satu nomor di atas, atau hubungi layanan konseling UGM pada jam kerja. Anda tidak perlu menunggu kondisinya memburuk untuk mencari bantuan. Berbicara lebih awal membuat pilihan yang tersedia jauh lebih banyak.

## Untuk teman atau orang terdekat
Jika Anda menemani seseorang yang sedang dalam krisis, tetaplah bersama mereka. Dengarkan tanpa menghakimi, hindari memberi ceramah, dan jangan berjanji merahasiakan hal yang membahayakan keselamatan. Bantu mereka menghubungi layanan di atas dan tetap dampingi sampai bantuan diterima.

## Yang perlu dihindari
Jangan meremehkan perasaan orang yang sedang krisis, dan jangan menantang mereka untuk membuktikan sesuatu. Jangan memberikan metode menyakiti diri dalam bentuk apa pun. Fokuslah pada keselamatan saat ini, bukan pada penyelesaian seluruh masalah.
""",
    },
    # ---------------------------------------------------------------- #
    # 2. UGM SERVICES
    # ---------------------------------------------------------------- #
    {
        "title": "Layanan Kesehatan Mental di Universitas Gadjah Mada",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Jalur layanan konseling dan dukungan kesehatan mental bagi mahasiswa UGM.",
        "tags": ["ugm_services", "konseling", "kampus", "rujukan"],
        "content": """# Layanan Kesehatan Mental di Universitas Gadjah Mada

## Layanan yang tersedia untuk mahasiswa
Universitas Gadjah Mada menyediakan layanan pendampingan psikologis bagi mahasiswa melalui unit layanan kesehatan dan konseling kampus. Layanan ini umumnya tersedia tanpa biaya bagi mahasiswa yang terdaftar, dengan tenaga profesional (psikolog/konselor) yang terikat pada kerahasiaan profesional.

## Cara mengakses layanan
Umumnya mahasiswa dapat menghubungi layanan konseling kampus untuk membuat jadwal pertemuan, baik secara langsung maupun melalui kanal daring yang disediakan. Untuk situasi yang memerlukan perhatian segera, sebutkan hal tersebut saat pertama kali menghubungi agar dapat diprioritaskan.

## Kerahasiaan
Percakapan dengan konselor bersifat rahasia sesuai kode etik profesi. Kerahasiaan hanya dapat dikecualikan dalam kondisi tertentu yang menyangkut keselamatan (misalnya risiko serius terhadap diri sendiri atau orang lain), dan konselor akan menjelaskan hal ini kepada Anda.

## Rujukan ke luar kampus
Jika kebutuhan Anda melampaui layanan yang tersedia di kampus, konselor dapat membantu merujuk ke layanan psikolog atau psikiater di luar kampus, termasuk layanan rumah sakit pendidikan. Rujukan kolaboratif ini bertujuan memastikan Anda mendapatkan tingkat dukungan yang sesuai.

## Bila Anda ragu untuk mencari bantuan
Rasa ragu sebelum berbicara dengan orang lain tentang kondisi mental adalah hal yang umum. Anda tidak harus memiliki "masalah yang cukup besar" untuk berhak mendapatkan bantuan. Banyak mahasiswa memanfaatkan layanan konseling untuk hal seperti tekanan akademik, kesulitan tidur, kecemasan menjelang ujian, atau perasaan kewalahan yang belum berlangsung lama.
""",
    },
    # ---------------------------------------------------------------- #
    # 3. COPING STRATEGIES
    # ---------------------------------------------------------------- #
    {
        "title": "Strategi Coping Sehat Menghadapi Stres Akademik",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Cara praktis menghadapi tekanan akademik tanpa menambah beban pikiran.",
        "tags": ["coping_strategies", "stres", "akademik", "ujian"],
        "content": """# Strategi Coping Sehat Menghadapi Stres Akademik

## Memahami stres akademik
Stres akademik adalah respons yang wajar ketika tuntutan kuliah melebihi sumber daya yang Anda rasakan tersedia. Stres pada tingkat tertentu bahkan membantu fokus. Yang menjadi masalah adalah stres yang berlangsung terus-menerus, mengganggu tidur, atau membuat Anda menghindari pekerjaan sama sekali.

## Memecah tugas besar menjadi langkah kecil
Perasaan kewalahan sering kali berasal dari tugas yang terlihat sebagai satu blok besar. Coba tuliskan tugas itu, lalu pecah menjadi langkah-langkah yang bisa diselesaikan dalam 20–30 menit. Fokuslah hanya pada satu langkah berikutnya, bukan pada keseluruhan tugas. Menyelesaikan langkah kecil memberi rasa kendali yang nyata.

## Menetapkan prioritas, bukan kesempurnaan
Tidak semua tugas sama pentingnya. Identifikasi dua atau tiga hal yang paling berdampak, kerjakan itu lebih dulu. Menetapkan standar "cukup baik" pada tugas yang bernilai kecil adalah keterampilan, bukan kemalasan.

## Mengatur waktu istirahat
Belajar tanpa istirahat justru menurunkan daya ingat. Coba pola kerja dengan jeda teratur, misalnya 25 menit belajar diikuti 5 menit jeda. Gunakan jeda untuk bergerak, bukan untuk membuka media sosial tanpa batas, karena jeda yang menguras perhatian tidak memulihkan energi.

## Menjaga dasar-dasar fisik
Tidur yang cukup, makan teratur, dan bergerak singkat setiap hari memberi dampak besar pada suasana hati dan kemampuan fokus. Menjaga hal-hal dasar ini sering kali lebih membantu daripada menambah jam belajar.

## Berbicara dengan orang lain
Menceritakan beban kepada teman yang dipercaya atau konselor dapat mengurangi rasa sendirian. Anda tidak perlu menyelesaikan masalah untuk membicarakannya; menjelaskan apa yang Anda rasakan sering kali sudah membuatnya lebih mudah dikelola.

## Kapan mencari bantuan profesional
Jika stres sudah mengganggu tidur selama berminggu-minggu, membuat Anda menarik diri, atau membuat Anda berpikir bahwa hidup ini tidak layak dijalani, itu adalah tanda untuk mencari bantuan profesional. Hubungi layanan konseling kampus atau tenaga kesehatan mental.
""",
    },
    {
        "title": "Mengelola Kecemasan dan Pikiran yang Berulang",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Prinsip dasar mengenali dan menangani kecemasan serta pikiran berulang.",
        "tags": ["coping_strategies", "kecemasan", "anxiety", "overthinking"],
        "content": """# Mengelola Kecemasan dan Pikiran yang Berulang

## Apa itu kecemasan
Kecemasan adalah sistem peringatan tubuh yang aktif ketika kita memperkirakan adanya ancaman. Ketika sistem ini menyala terus-menerus tanpa bahaya nyata, kecemasan berubah menjadi beban. Jantung berdebar, otot tegang, sulit tidur, dan pikiran yang berputar adalah tanda tubuh sedang dalam mode waspada.

## Mengenali pola pikiran
Kecemasan sering disertai pola pikir yang memperbesar risiko dan memperkecil kemampuan kita, misalnya "kalau saya gagal ujian ini, hidup saya hancur". Langkah pertama adalah menyadari bahwa pikiran itu adalah pikiran, bukan fakta. Coba tuliskan kekhawatiran Anda, lalu tanyakan: seberapa besar kemungkinan ini benar-benar terjadi, dan seberapa buruk dampaknya jika terjadi?

## Menantang pikiran secara seimbang
Setelah menuliskan kekhawatiran, cari bukti yang mendukung dan bukti yang menentangnya. Lalu susun satu kalimat alternatif yang lebih seimbang dan tetap realistis, bukan sekadar kalimat positif. Misalnya: "Ini ujian yang penting, dan saya sudah menyiapkan sebagian. Saya akan mengerjakan yang bisa saya kerjakan."

## Membatasi waktu untuk khawatir
Alih-alih melarang diri khawatir, tetapkan "waktu khawatir" tertentu, misalnya 15 menit menjelang sore. Ketika kekhawatiran muncul di luar waktu itu, catat singkat dan tunda. Teknik ini membantu menunjukkan bahwa kekhawatiran dapat ditunda tanpa kehilangan kendali.

## Kembali ke saat ini
Ketika pikiran berputar ke masa depan, bawa perhatian ke hal konkret di sekitar Anda: apa yang Anda lihat, dengar, dan rasakan saat ini. Latihan pernapasan dan grounding dapat membantu tubuh keluar dari mode waspada.

## Kapan mencari bantuan profesional
Jika kecemasan membuat Anda menghindari hal-hal penting, mengganggu tidur terus-menerus, atau disertai serangan panik yang terasa menakutkan, bicarakan dengan konselor atau tenaga kesehatan mental. Kecemasan sangat bisa ditangani dengan pendekatan yang tepat.
""",
    },
    # ---------------------------------------------------------------- #
    # 4. RELAXATION TECHNIQUES
    # ---------------------------------------------------------------- #
    {
        "title": "Teknik Relaksasi: Pernapasan dan Grounding 5-4-3-2-1",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Latihan singkat untuk menenangkan tubuh saat cemas atau panik.",
        "tags": ["relaxation_techniques", "pernapasan", "grounding", "panik"],
        "content": """# Teknik Relaksasi: Pernapasan dan Grounding 5-4-3-2-1

## Mengapa latihan tubuh membantu
Kecemasan dan panik melibatkan respons fisik: napas menjadi cepat, jantung berdebar, otot menegang. Karena itu, bekerja langsung pada tubuh sering kali lebih cepat menenangkan dibanding mencoba "berpikir agar tenang". Latihan berikut bisa dilakukan di mana saja dan tidak perlu peralatan.

## Pernapasan kotak (box breathing)
Bayangkan sebuah kotak. Tarik napas melalui hidung sambil menghitung sampai empat. Tahan napas selama empat hitungan. Buang napas melalui mulut selama empat hitungan. Tahan lagi selama empat hitungan. Ulangi siklus ini 4–6 kali. Membuat fase buang napas sedikit lebih panjang dari fase tarik napas membantu tubuh beralih ke mode tenang.

## Grounding 5-4-3-2-1
Teknik ini mengembalikan perhatian ke saat ini melalui pancaindra, berguna saat pikiran berputar atau saat panik:
- Sebutkan **5** hal yang Anda lihat di sekitar Anda.
- Sebutkan **4** hal yang Anda bisa sentuh atau rasakan pada tubuh.
- Sebutkan **3** hal yang Anda dengar.
- Sebutkan **2** hal yang Anda cium.
- Sebutkan **1** hal yang Anda bisa rasakan atau cicipi.

Lakukan perlahan. Tujuannya bukan menyelesaikan masalah, tetapi membuat tubuh dan pikiran keluar dari mode waspada agar Anda bisa berpikir lebih jernih.

## Relaksasi otot secara bertahap
Tegangkan satu kelompok otot (misalnya tangan) selama lima detik, lalu lepaskan selama sepuluh detik dan rasakan perbedaannya. Lanjutkan ke lengan, bahu, wajah, lalu kaki. Teknik ini membantu Anda mengenali ketegangan yang sering tidak kita sadari.

## Catatan penting
Teknik relaksasi adalah alat bantu, bukan pengganti penanganan. Jika Anda mengalami serangan panik yang berulang, atau jika latihan pernapasan justru membuat Anda lebih cemas, hentikan dan bicarakan dengan konselor atau tenaga kesehatan mental. Ada pendekatan lain yang lebih cocok untuk kondisi tertentu.
""",
    },
    {
        "title": "Tidur yang Menyehatkan dan Kaitannya dengan Kesehatan Mental",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Kebiasaan tidur yang mendukung suasana hati dan kemampuan fokus.",
        "tags": ["relaxation_techniques", "tidur", "insomnia", "kebiasaan"],
        "content": """# Tidur yang Menyehatkan dan Kaitannya dengan Kesehatan Mental

## Hubungan tidur dan kondisi emosi
Tidur dan kesehatan mental saling memengaruhi. Kurang tidur membuat kita lebih mudah tersinggung, sulit berkonsentrasi, dan lebih rentan terhadap kecemasan. Sebaliknya, kecemasan dan tekanan pikiran membuat kita sulit tidur. Karena itu, memperbaiki tidur sering kali juga memperbaiki suasana hati.

## Kebiasaan yang membantu tidur
Cobalah bangun pada jam yang sama setiap hari, termasuk akhir pekan, karena jam bangun yang konsisten lebih berpengaruh pada ritme tidur daripada jam tidur. Dapatkan cahaya terang di pagi hari, misalnya dengan membuka jendela atau berjalan sebentar di luar.

## Menyiapkan waktu menjelang tidur
Hentikan aktivitas yang menuntut perhatian tinggi sekitar satu jam sebelum tidur. Redupkan cahaya dan hindari layar terang. Jika pikiran mulai berputar tentang tugas esok hari, tuliskan dalam daftar singkat lalu letakkan — tujuannya agar otak tidak perlu terus mengingatnya.

## Jika tidak bisa tidur
Jika Anda belum tidur setelah sekitar 20 menit, bangun dan lakukan sesuatu yang menenangkan dengan cahaya redup sampai mengantuk, lalu kembali ke tempat tidur. Berbaring sambil berusaha keras untuk tidur justru membuat tempat tidur terasa seperti tempat berjuang.

## Yang perlu diperhatikan
Hindari kafein menjelang malam dan batasi tidur siang yang panjang karena dapat menggeser rasa kantuk di malam hari. Alkohol memang membuat mengantuk, tetapi mengganggu kualitas tidur di paruh malam.

## Kapan mencari bantuan
Jika kesulitan tidur berlangsung lebih dari beberapa minggu, mengganggu aktivitas harian, atau disertai perasaan sedih dan cemas yang menetap, bicarakan dengan konselor atau layanan kesehatan. Gangguan tidur yang berkelanjutan perlu ditangani, bukan hanya diatasi sendiri.
""",
    },
    # ---------------------------------------------------------------- #
    # 5. EDUCATIONAL CONTENT
    # ---------------------------------------------------------------- #
    {
        "title": "Mengenal Terapi Kognitif-Perilaku (CBT)",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Penjelasan dasar CBT, prinsipnya, dan bagaimana terapi ini bekerja.",
        "tags": ["educational_content", "CBT", "psikoedukasi", "terapi"],
        "content": """# Mengenal Terapi Kognitif-Perilaku (CBT)

## Apa itu CBT
Terapi Kognitif-Perilaku (Cognitive Behavioral Therapy, CBT) adalah salah satu pendekatan psikoterapi yang paling banyak diteliti di dunia. CBT bekerja berdasarkan gagasan bahwa pikiran, perasaan, dan perilaku saling terhubung: cara kita menafsirkan suatu peristiwa memengaruhi bagaimana kita merasa dan bertindak, dan pada gilirannya tindakan kita memperkuat cara kita menafsirkan hal-hal berikutnya.

## Prinsip dasarnya
CBT tidak berfokus pada mencari siapa yang bersalah atas kondisi seseorang. Fokusnya adalah pada pola yang dapat diubah saat ini. Terapis dan klien bekerja seperti tim untuk mengenali pola pikir dan perilaku yang mempertahankan masalah, lalu mencoba cara baru yang lebih membantu.

## Contoh sederhana
Bayangkan dua mahasiswa yang sama-sama mendapat nilai di bawah harapan. Yang pertama berpikir "berarti saya memang bodoh, percuma berusaha" dan berhenti belajar. Yang kedua berpikir "nilai ini menunjukkan bagian mana yang belum saya kuasai" lalu meninjau ulang materi. Peristiwanya sama, tetapi pikiran dan tindakan yang mengikutinya menghasilkan arah yang berbeda.

## Teknik yang umum digunakan
CBT mencakup beberapa keterampilan, antara lain mencatat dan menguji pikiran otomatis, mengubah perilaku secara bertahap untuk meningkatkan aktivitas yang bermakna, melatih keterampilan komunikasi dan penetapan batas, serta latihan menghadapi situasi yang dihindari.

## Bagaimana CBT biasanya berlangsung
CBT umumnya berlangsung dalam sejumlah sesi terstruktur dengan tujuan yang disepakati bersama. Klien biasanya diberi latihan untuk dilakukan di antara sesi, karena perubahan keterampilan membutuhkan latihan, seperti halnya mempelajari kemampuan baru.

## Catatan
CBT bukan satu-satunya pendekatan, dan bukan pendekatan yang cocok untuk semua orang atau semua kondisi. Konselor atau tenaga kesehatan mental dapat membantu menentukan pendekatan yang sesuai dengan kebutuhan Anda.
""",
    },
    {
        "title": "Mengenali Tanda Depresi dan Kapan Mencari Bantuan",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Tanda-tanda umum depresi dan langkah mencari bantuan.",
        "tags": ["educational_content", "depresi", "psikoedukasi", "bantuan"],
        "content": """# Mengenali Tanda Depresi dan Kapan Mencari Bantuan

## Mengapa mengenali tanda itu penting
Depresi bukan sekadar "sedih" atau "tidak semangat". Depresi adalah kondisi kesehatan yang memengaruhi cara berpikir, merasa, tidur, dan menjalani kehidupan sehari-hari. Mengenali tandanya lebih awal membuat bantuan yang tersedia jauh lebih efektif.

## Tanda yang umum muncul
Depresi dapat terlihat melalui beberapa hal berikut, terutama bila berlangsung hampir setiap hari selama dua minggu atau lebih:
- Kehilangan minat atau kesenangan pada hal yang biasanya dinikmati.
- Suasana hati yang tertekan, kosong, atau mudah tersinggung.
- Perubahan tidur, baik sulit tidur maupun tidur berlebihan.
- Perubahan nafsu makan atau berat badan.
- Kelelahan dan kehilangan energi hampir setiap hari.
- Sulit berkonsentrasi atau mengambil keputusan.
- Perasaan tidak berharga atau menyalahkan diri secara berlebihan.
- Pikiran tentang kematian atau menyakiti diri.

## Yang bukan tanda depresi
Kesedihan setelah kehilangan atau kegagalan adalah respons yang wajar dan biasanya mereda seiring waktu. Depresi berbeda karena menetap, menyebar ke banyak aspek kehidupan, dan sering tidak sebanding dengan peristiwa yang memicunya. Hanya tenaga profesional yang dapat menegakkan diagnosis.

## Langkah yang dapat diambil
Berbicara dengan konselor atau tenaga kesehatan mental adalah langkah pertama yang paling berguna. Menjaga tidur, makan, dan aktivitas fisik tetap teratur juga membantu, meskipun biasanya tidak cukup bila dilakukan sendiri. Dukungan dari orang yang dipercaya memainkan peran penting dalam pemulihan.

## Jika muncul pikiran untuk menyakiti diri
Jika Anda memiliki pikiran tentang mengakhiri hidup atau menyakiti diri, itu adalah keadaan yang memerlukan bantuan segera. Hubungi **SEJIWA 119 tekan 8**, nomor darurat **112**, atau **Crisis Centre UGM 0851-0111-0800**. Anda tidak harus menghadapi ini sendirian, dan bantuan tersedia sekarang.

## Pesan penting
Depresi dapat ditangani, dan banyak orang pulih dengan bantuan yang tepat. Mencari bantuan bukan tanda kelemahan, melainkan langkah yang masuk akal ketika seseorang menghadapi kondisi kesehatan.
""",
    },
    {
        "title": "Self-Compassion: Bersikap Adil pada Diri Sendiri",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Prinsip belas kasih pada diri sendiri dan latihan praktisnya.",
        "tags": ["educational_content", "self-compassion", "harga diri", "psikoedukasi"],
        "content": """# Self-Compassion: Bersikap Adil pada Diri Sendiri

## Apa itu self-compassion
Self-compassion atau belas kasih pada diri sendiri berarti memperlakukan diri sendiri dengan cara yang sama seperti kita memperlakukan teman yang sedang kesulitan: dengan pengertian, bukan penghakiman. Ini berbeda dari memanjakan diri atau menolak tanggung jawab. Justru sebaliknya, self-compassion membuat kita lebih mampu menghadapi kesalahan dan mencoba lagi.

## Tiga unsur utamanya
Pertama, kebaikan pada diri sendiri: berbicara pada diri dengan nada yang mendukung, bukan menyerang. Kedua, kesadaran akan kemanusiaan bersama: menyadari bahwa mengalami kesulitan, gagal, dan merasa tidak cukup adalah pengalaman manusia yang umum. Ketiga, kesadaran yang seimbang: melihat situasi apa adanya tanpa melebih-lebihkan atau menekan perasaan.

## Mengapa ini penting bagi mahasiswa
Mahasiswa sering hidup dalam lingkungan yang mendorong perbandingan: nilai, prestasi, organisasi, dan kecepatan lulus. Perbandingan yang terus-menerus dapat memicu perasaan tidak pernah cukup. Self-compassion menawarkan cara lain untuk memotivasi diri, yaitu melalui dorongan alih-alih rasa takut.

## Latihan sederhana
Ketika Anda menyadari sedang menyalahkan diri sendiri, coba tanyakan: apa yang akan saya katakan kepada teman yang berada dalam situasi ini? Lalu ucapkan hal serupa pada diri sendiri. Menuliskan beberapa kalimat di jurnal juga membantu, terutama saat emosi sedang kuat.

## Kesalahpahaman yang perlu diluruskan
Self-compassion tidak berarti menurunkan standar atau berhenti berusaha. Penelitian menunjukkan orang yang lebih berbelas kasih pada dirinya umumnya lebih tahan menghadapi kegagalan, lebih bersedia mencoba lagi, dan lebih sedikit menghindari tantangan karena takut dihakimi.

## Bila menyalahkan diri sudah berat
Jika menyalahkan diri sendiri sudah berlangsung terus-menerus dan mengganggu aktivitas harian, itu sering berkaitan dengan suasana hati yang perlu ditangani. Bicarakan dengan konselor, karena pola ini dapat diubah dengan pendampingan yang tepat.
""",
    },
    {
        "title": "Menjaga Hubungan Sosial dan Mengatasi Rasa Kesepian",
        "type": "text",
        "source": "Tim UGM-AICare (draf, menunggu tinjauan klinis)",
        "description": "Peran hubungan sosial bagi kesehatan mental dan cara membangunnya.",
        "tags": ["educational_content", "kesepian", "hubungan sosial", "dukungan"],
        "content": """# Menjaga Hubungan Sosial dan Mengatasi Rasa Kesepian

## Kesepian bukan soal jumlah orang
Kesepian adalah perasaan bahwa hubungan yang kita miliki tidak cukup dekat atau tidak cukup mendukung, dan itu bisa muncul bahkan ketika kita dikelilingi banyak orang. Kesepian yang berlangsung lama berkaitan dengan suasana hati yang menurun, karena manusia secara alami membutuhkan koneksi untuk merasa aman.

## Mengapa hubungan membantu
Berbicara dengan orang yang kita percaya membantu menurunkan beban emosi, memberi sudut pandang lain, dan mengingatkan bahwa kita tidak sendirian. Dukungan sosial juga membuat kita lebih mungkin mencari bantuan saat masalah bertambah besar.

## Langkah kecil yang realistis
Membangun hubungan tidak harus dimulai dari percakapan mendalam. Menyapa orang yang biasa Anda temui, mengajak teman makan bersama, atau bergabung dalam kegiatan yang berulang di kampus adalah cara yang lebih mudah karena kebersamaan terjalin melalui pertemuan yang konsisten, bukan dari satu percakapan besar.

## Menjaga hubungan yang sudah ada
Hubungan perlu dirawat. Menghubungi kembali teman lama, menanyakan kabar secara tulus, dan bersedia mendengarkan saat mereka kesulitan membuat hubungan terasa aman bagi kedua pihak. Hubungan yang saling mendukung biasanya tumbuh dari timbal balik yang sederhana dalam jangka panjang.

## Ketika kesepian bertahan lama
Jika rasa kesepian menetap, membuat Anda menarik diri dari orang lain, atau disertai perasaan sedih yang mendalam, itu tanda untuk mencari bantuan. Konselor dapat membantu menelusuri apa yang membuat koneksi terasa sulit dan mencari cara yang sesuai dengan kondisi Anda.

## Catatan
Tidak semua orang membutuhkan lingkaran sosial yang besar. Yang penting adalah adanya beberapa hubungan yang membuat Anda merasa dilihat dan didukung. Kualitas jauh lebih berarti daripada jumlah.
""",
    },
]


# --------------------------------------------------------------------------
# SEEDING LOGIC
# --------------------------------------------------------------------------

def _build_resource(payload: dict) -> ContentResource:
    """Turn a seed dict into a ContentResource row (draft-marked)."""
    metadata = {
        "review_status": "draft",
        "review_note": (
            "Draf awal untuk pengujian RAG. WAJIB ditinjau dan disunting "
            "oleh konselor/klinisi UGM sebelum digunakan oleh mahasiswa."
        ),
        "seeded_by": "scripts/seed_rag_knowledge_base.py",
        "seeded_at": datetime.now(timezone.utc).isoformat(),
        "language": "id",
        "categories": payload.get("tags", []),
    }
    return ContentResource(
        title=payload["title"],
        content=payload["content"],
        source=payload.get("source"),
        type=payload.get("type", "text"),
        description=payload.get("description"),
        tags=payload.get("tags", []),
        resource_metadata=metadata,
        mime_type="text/markdown",
        storage_backend="database",
        embedding_status="pending",
        chunk_count=0,
    )


async def _seed(dry_run: bool, embed: bool, force: bool) -> int:
    from app.services.embedding_service import process_embedding

    inserted = 0
    skipped = 0
    embedded_ok = 0
    embedded_fail = 0
    to_embed: list[int] = []

    async with AsyncSessionLocal() as db:
        for payload in _SEED_RESOURCES:
            existing = (
                await db.execute(
                    select(ContentResource).where(
                        ContentResource.title == payload["title"]
                    )
                )
            ).scalars().first()

            if existing is not None and not force:
                print(f"  skip   [{existing.id}] {payload['title']}")
                skipped += 1
                continue

            if dry_run:
                print(f"  plan   [+] {payload['title']}")
                inserted += 1
                continue

            if existing is not None:  # --force on an existing row
                existing.content = payload["content"]
                existing.source = payload.get("source")
                existing.description = payload.get("description")
                existing.tags = payload.get("tags", [])
                existing.embedding_status = "pending"
                row = existing
                print(f"  update [{row.id}] {payload['title']}")
            else:
                row = _build_resource(payload)
                db.add(row)
                print(f"  insert [+] {payload['title']}")

            await db.flush()
            inserted += 1
            to_embed.append(row.id)

        if dry_run:
            print(f"\nDry run complete: {inserted} would be written, {skipped} skipped.")
            return 0

        await db.commit()

    if not embed:
        print(
            f"\nInserted/updated {inserted} resources ({skipped} skipped). "
            "Embedding skipped (--no-embed). Run the autopilot worker or "
            "re-run without --no-embed to embed."
        )
        return 0

    print(f"\nEmbedding {len(to_embed)} resource(s)...")
    for resource_id in to_embed:
        try:
            await process_embedding(resource_id)
            async with AsyncSessionLocal() as db:
                fresh = await db.get(ContentResource, resource_id)
                status = fresh.embedding_status if fresh else "?"
                chunks = fresh.chunk_count if fresh else 0
            if status == "succeeded":
                embedded_ok += 1
                print(f"  ok     [{resource_id}] {chunks} chunk(s)")
            else:
                embedded_fail += 1
                print(f"  FAILED [{resource_id}] status={status}")
        except Exception as exc:  # keep going; report at the end
            embedded_fail += 1
            print(f"  FAILED [{resource_id}] {exc}")

    print(
        f"\nInserted/updated: {inserted} ({skipped} skipped) | "
        f"embedded ok: {embedded_ok} | failed: {embedded_fail}"
    )
    return 1 if embedded_fail else 0


async def _self_check() -> None:
    """Prove grounding works (or explain exactly why it does not)."""
    from app.database import AsyncSessionLocal as Session
    from app.services.knowledge_retrieval_service import retrieve

    probes = [
        "saya merasa cemas dan sulit tidur akhir-akhir ini",
        "bagaimana cara menenangkan diri saat panik",
        "nomor darurat kalau ada pikiran menyakiti diri",
        "layanan konseling di UGM",
    ]

    print("\nRetrieval self-check")
    print("-" * 60)
    async with Session() as db:
        for probe in probes:
            try:
                chunks = await retrieve(db, probe)
            except Exception as exc:
                print(f"  ERROR  {probe!r}: {exc}")
                continue
            if chunks:
                top = chunks[0]
                print(
                    f"  OK     {probe!r}\n"
                    f"         -> {len(chunks)} chunk(s); top: "
                    f"{top.title[:60]!r} score={top.score:.3f}"
                )
            else:
                print(f"  EMPTY  {probe!r} (no grounding returned)")
    print("-" * 60)
    print(
        "If any probe shows EMPTY: check RAG_ENABLED, that the embedding "
        "step succeeded, and that the query language matches the corpus."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print the plan, write nothing")
    parser.add_argument("--no-embed", action="store_true", help="insert rows but skip embedding")
    parser.add_argument("--force", action="store_true", help="re-embed resources that already exist")
    parser.add_argument("--no-check", action="store_true", help="skip the retrieval self-check")
    args = parser.parse_args()

    print("=" * 60)
    print("UGM-AICare RAG knowledge base seeder")
    print("Content is DRAFT — clinical review required before use.")
    print("=" * 60)
    print(f"Resources in this file: {len(_SEED_RESOURCES)}\n")

    code = asyncio.run(_seed(args.dry_run, not args.no_embed, args.force))

    if not args.dry_run and not args.no_embed and not args.no_check:
        asyncio.run(_self_check())

    return code


if __name__ == "__main__":
    raise SystemExit(main())
