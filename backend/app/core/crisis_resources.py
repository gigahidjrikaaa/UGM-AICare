"""Canonical crisis-resources registry (single source of truth).

The hotline block (SEJIWA 119 ext 8 / 112 / Crisis Centre UGM / 119) was
copy-pasted across at least six sites — tool fallback data, prompts, fallback
messages, templates — where a single number change needed six edits. All
code-built strings and data MUST consume these constants; prompt prose
(``identity.py``, TCA backstop) may keep natural-language phrasing but should
be reviewed against this module when numbers change.

Verify numbers periodically: SEJIWA is Kemenkes' national mental-health
hotline (119 ext 8), 112 the national emergency dispatch, 119 the medical
emergency line, and Crisis Centre UGM the campus service.
"""
from __future__ import annotations

from typing import Any, Final

SEJIWA_PHONE: Final = "119 ext. 8"
EMERGENCY_DISPATCH_PHONE: Final = "112"
UGM_CRISIS_CENTER_PHONE: Final = "0851-0111-0800"
MEDICAL_EMERGENCY_PHONE: Final = "119"

#: One-line hotline reference for chat messages and templates.
HOTLINE_LINE: Final = (
    "SEJIWA 119 tekan 8 (gratis, 24 jam), 112 untuk keadaan darurat, "
    "atau Crisis Centre UGM 0851-0111-0800 bagi mahasiswa UGM"
)

CRISIS_RESOURCES: Final[list[dict[str, Any]]] = [
    {
        "title": "SEJIWA 119ext.8",
        "description": "Hotline kesehatan jiwa Kementerian Kesehatan RI. Gratis, layanan 24 jam.",
        "phone": SEJIWA_PHONE,
        "content": "Hubungi 119, lalu tekan 8. Layanan konseling kesehatan jiwa nasional (Kemenkes RI).",
    },
    {
        "title": "112 Pusat Panggilan Darurat",
        "description": "Nomor darurat nasional Indonesia (kepolisian, ambulans, pemadam). Gratis, 24 jam.",
        "phone": EMERGENCY_DISPATCH_PHONE,
        "content": "Nomor darurat nasional untuk situasi kegawatdaruratan seketika.",
    },
    {
        "title": "Crisis Centre UGM",
        "description": "Layanan krisis Universitas Gadjah Mada untuk mahasiswa dan warga UGM.",
        "phone": UGM_CRISIS_CENTER_PHONE,
        "content": "Crisis Centre UGM: dukungan darurat bagi mahasiswa UGM yang mengalami krisis.",
    },
    {
        "title": "119 Gawat Darurat Medis",
        "description": "Layanan gawat darurat medis nasional (ambulans). Gratis, 24 jam.",
        "phone": MEDICAL_EMERGENCY_PHONE,
        "content": "Hubungi 119 untuk bantuan medis gawat darurat.",
    },
]
