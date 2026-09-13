from __future__ import annotations

from typing import Iterable, List

from app.agents.tca.schemas import ResourceCard


def get_default_resources(intent: str) -> Iterable[ResourceCard]:
    """Return static fallback resource cards.

    Cards are in-app (no external URL): the frontend resolves ``resource_id``
    against its activity/resource registry. A fabricated
    ``https://aicare.example/...`` URL would ship dead links to distressed
    users, so ``url`` stays ``None`` here by design.
    """

    intent_key = intent.strip().lower()

    catalog: dict[str, List[ResourceCard]] = {
        "academic_stress": [
            ResourceCard(
                resource_id="academic_focus_journal",
                title="Jurnal Fokus Akademik",
                description="Panduan terstruktur untuk memecah tugas kuliah menjadi bagian yang bisa dikelola.",
                url=None,
            ),
            ResourceCard(
                resource_id="study_break_micro",
                title="Rutinitas Istirahat Mikro",
                description="Reset tiga menit: peregangan ringan dan grounding singkat.",
                url=None,
            ),
        ],
        "acute_distress": [
            ResourceCard(
                resource_id="grounding_audio",
                title="Audio Grounding 5-4-3-2-1",
                description="Panduan audio untuk kembali fokus saat panik atau kewalahan.",
                url=None,
            ),
            ResourceCard(
                resource_id="safety_plan_template",
                title="Templat Rencana Keamanan Pribadi",
                description="Catat kontak terpercaya, langkah menenangkan diri, dan nomor darurat (SEJIWA 119 tekan 8 / 112).",
                url=None,
            ),
        ],
        "relationship_strain": [
            ResourceCard(
                resource_id="communication_script",
                title="Kerangka Percakapan Berani",
                description="Templat menyampaikan kebutuhan tanpa menaikkan konflik.",
                url=None,
            ),
            ResourceCard(
                resource_id="support_warmline",
                title="Layanan Konseling Kampus",
                description="Informasi jadwal dan cara menghubungi konselor universitas.",
                url=None,
            ),
        ],
        "financial_pressure": [
            ResourceCard(
                resource_id="budget_calc",
                title="Lembar Anggaran Mahasiswa",
                description="Sheet pengeluaran: kebutuhan pokok vs. opsional.",
                url=None,
            ),
            ResourceCard(
                resource_id="aid_office",
                title="Persiapan Konsultasi Bantuan Finansial",
                description="Checklist dokumen untuk mengurus beasiswa atau bantuan biaya.",
                url=None,
            ),
        ],
        "general_support": [
            ResourceCard(
                resource_id="self_compassion",
                title="Latihan Self-Compassion",
                description="Latihan tiga langkah untuk meredakan bicara pada diri yang terlalu keras.",
                url=None,
            ),
            ResourceCard(
                resource_id="contact_counseling",
                title="Hubungi Layanan Konseling",
                description="Cara menjadwalkan konseling di kampus; untuk kondisi darurat hubungi 119 tekan 8 atau 112.",
                url=None,
            ),
        ],
    }

    return catalog.get(intent_key, catalog["general_support"])
