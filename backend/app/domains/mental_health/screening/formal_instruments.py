"""Formal screening instruments: PHQ-9 and GAD-7.

Unlike the covert engine (keyword extraction from conversations, this package's
``instruments.py``), these are *administered* questionnaires: fixed item banks,
official 0–3 response scales, published scoring cut-offs, and severity-band
interpretations in Indonesian.

Scoring follows the published instruments:

- PHQ-9 (Kroenke & Spitzer, 2001): 9 items, total 0–27.
  Cut-offs: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately severe,
  20–27 severe. Item 9 (self-harm ideation) is a *gateway item*: any non-zero
  response raises an independent crisis flag regardless of the total score.
- GAD-7 (Spitzer et al., 2006): 7 items, total 0–21.
  Cut-offs: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe.

Indonesian item wording follows the commonly used Bahasa Indonesia
translations of both instruments. Screening results are *indicators*, not
diagnoses — every interpretation string must stay inside that boundary, and
the UI/service layers must attach the disclaimer + campus/national resources.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Sequence, Tuple


@dataclass(frozen=True)
class FormalItem:
    """One questionnaire item."""

    text: str
    is_crisis_item: bool = False


@dataclass(frozen=True)
class SeverityBand:
    """One published score band with its Indonesian interpretation."""

    min_score: int
    max_score: int
    band: str  # machine key aligned with the covert engine severity ladder
    label: str
    interpretation: str
    recommendation: str


@dataclass(frozen=True)
class FormalInstrument:
    code: str  # "PHQ-9" / "GAD-7"
    name: str
    dimension: str  # screening dimension key (engine dimension_scores key)
    timeframe: str  # preamble shown before the items
    options: Tuple[Tuple[int, str], ...]
    items: Tuple[FormalItem, ...]
    bands: Tuple[SeverityBand, ...]
    disclaimer: str
    reference: str
    crisis_resources_note: str = ""

    @property
    def max_per_item(self) -> int:
        return max(value for value, _ in self.options)

    @property
    def max_score(self) -> int:
        return self.max_per_item * len(self.items)

    def band_for(self, total: int) -> SeverityBand:
        for band in self.bands:
            if band.min_score <= total <= band.max_score:
                return band
        raise ValueError(f"Score {total} outside instrument range 0-{self.max_score}")


_FREQUENCY_OPTIONS_PHQ: Tuple[Tuple[int, str], ...] = (
    (0, "Tidak pernah"),
    (1, "Selama beberapa hari"),
    (2, "Lebih dari separuh hari"),
    (3, "Hampir setiap hari"),
)

_FREQUENCY_OPTIONS_GAD: Tuple[Tuple[int, str], ...] = (
    (0, "Tidak sama sekali"),
    (1, "Beberapa hari"),
    (2, "Lebih dari separuh hari"),
    (3, "Hampir setiap hari"),
)

_GAD_TIMEFRAME = "Selama 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?"

_DISCLAIMER = (
    "Hasil ini adalah skrining, bukan diagnosis. Hanya profesional kesehatan "
    "jiwa yang dapat menegakkan diagnosis. Jika hasilmu mengganggu atau "
    "gejala memburuk, hubungi konselor kampus atau layanan profesional."
)

_CRISIS_NOTE = (
    "Jawabanmu pada pertanyaan tentang pikiran menyakiti diri menunjukkan kamu "
    "mungkin sedang berjuang. Kamu tidak sendiri: hubungi SEJIWA 119 tekan 8 "
    "(gratis, 24 jam) atau Crisis Centre UGM 0851-0111-0800. Dalam keadaan "
    "darurat, hubungi 112."
)

PHQ9 = FormalInstrument(
    code="PHQ-9",
    name="Kuesioner Kesehatan Pasien (PHQ-9)",
    dimension="depression",
    timeframe="Selama 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?",
    options=_FREQUENCY_OPTIONS_PHQ,
    items=(
        FormalItem("Sedikit minat atau kesenangan dalam melakukan sesuatu"),
        FormalItem("Merasa murung, sedih, atau putus asa"),
        FormalItem("Sulit tidur, sulit mempertahankan tidur, atau tidur berlebihan"),
        FormalItem("Merasa lelah atau kurang tenaga"),
        FormalItem("Tidak nafsu makan atau makan berlebihan"),
        FormalItem(
            "Merasa buruk tentang diri sendiri — atau merasa bahwa Anda adalah "
            "orang yang gagal atau telah mengecewakan diri sendiri atau keluarga"
        ),
        FormalItem(
            "Sulit berkonsentrasi pada sesuatu, misalnya membaca koran atau "
            "menonton televisi"
        ),
        FormalItem(
            "Bergerak atau berbicara sangat lambat sehingga orang lain "
            "memperhatikannya — atau sebaliknya menjadi gelisah sehingga Anda "
            "lebih banyak bergerak daripada biasanya"
        ),
        FormalItem(
            "Muncul pemikiran bahwa Anda lebih baik mati, atau ingin menyakiti "
            "diri sendiri dengan cara apa pun",
            is_crisis_item=True,
        ),
    ),
    bands=(
        SeverityBand(
            0, 4, "minimal", "Minimal",
            "Gejala depresi praktis tidak terdeteksi pada 2 minggu terakhir.",
            "Pertahankan kebiasaan baik; skrining ulang berkala (mis. bulanan).",
        ),
        SeverityBand(
            5, 9, "mild", "Ringan",
            "Terdeteksi gejala depresi ringan pada 2 minggu terakhir.",
            "Coba aktivitas swadiri (jurnal, latihan pernapasan) dan amati "
            "perkembangannya; skrining ulang dalam 2–4 minggu.",
        ),
        SeverityBand(
            10, 14, "moderate", "Sedang",
            "Terdeteksi gejala depresi sedang pada 2 minggu terakhir.",
            "Disarankan berkonsultasi dengan konselor kampus (GMC/HPU) atau "
            "memulai sesi dengan konselor melalui menu Appointment.",
        ),
        SeverityBand(
            15, 19, "moderately_severe", "Sedang–Berat",
            "Terdeteksi gejala depresi sedang hingga berat pada 2 minggu terakhir.",
            "Sangat disarankan segera menghubungi konselor; minta dukungan orang "
            "terdekat, dan gunakan fitur appointment untuk menjadwalkan sesi.",
        ),
        SeverityBand(
            20, 27, "severe", "Berat",
            "Terdeteksi gejala depresi berat pada 2 minggu terakhir.",
            "Segera hubungi konselor atau layanan profesional. Jika muncul pikiran "
            "menyakiti diri, gunakan tombol Bantuan Darurat di aplikasi.",
        ),
    ),
    disclaimer=_DISCLAIMER,
    reference="Kroenke, K. & Spitzer, R. L. (2001). The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med.",
    crisis_resources_note=_CRISIS_NOTE,
)

GAD7 = FormalInstrument(
    code="GAD-7",
    name="Skala Kecemasan Umum (GAD-7)",
    dimension="anxiety",
    timeframe=_GAD_TIMEFRAME,
    options=_FREQUENCY_OPTIONS_GAD,
    items=(
        FormalItem("Merasa gugup, cemas, atau sedang tegang"),
        FormalItem("Tidak mampu menghentikan atau mengendalikan rasa khawatir"),
        FormalItem("Terlalu khawatir tentang berbagai hal"),
        FormalItem("Sulit untuk rileks"),
        FormalItem("Sangat gelisah sehingga sulit untuk duduk dengan tenang"),
        FormalItem("Mudah marah atau tersinggung"),
        FormalItem(
            "Merasa takut, seolah-olah sesuatu yang mengerikan bisa terjadi"
        ),
    ),
    bands=(
        SeverityBand(
            0, 4, "minimal", "Minimal",
            "Gejala kecemasan praktis tidak terdeteksi pada 2 minggu terakhir.",
            "Pertahankan kebiasaan baik; skrining ulang berkala (mis. bulanan).",
        ),
        SeverityBand(
            5, 9, "mild", "Ringan",
            "Terdeteksi gejala kecemasan ringan pada 2 minggu terakhir.",
            "Coba latihan pernapasan/grounding di menu Aktivitas dan amati "
            "perkembangannya; skrining ulang dalam 2–4 minggu.",
        ),
        SeverityBand(
            10, 14, "moderate", "Sedang",
            "Terdeteksi gejala kecemasan sedang pada 2 minggu terakhir.",
            "Disarankan berkonsultasi dengan konselor kampus (GMC/HPU) atau "
            "memulai sesi dengan konselor melalui menu Appointment.",
        ),
        SeverityBand(
            15, 21, "severe", "Berat",
            "Terdeteksi gejala kecemasan berat pada 2 minggu terakhir.",
            "Segera hubungi konselor atau layanan profesional jangan tunggu "
            "gejala mereda sendiri.",
        ),
    ),
    disclaimer=_DISCLAIMER,
    reference="Spitzer, R. L. et al. (2006). A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med.",
    crisis_resources_note=_CRISIS_NOTE,
)

INSTRUMENTS: Dict[str, FormalInstrument] = {
    instrument.code: instrument for instrument in (PHQ9, GAD7)
}


def get_instrument(code: str) -> FormalInstrument:
    """Look up an instrument by code; raises ``KeyError`` for unknown codes."""
    try:
        return INSTRUMENTS[code.strip().upper()]
    except KeyError as exc:
        raise KeyError(f"Unknown formal instrument: {code!r}") from exc


def list_instruments() -> List[FormalInstrument]:
    return list(INSTRUMENTS.values())


def score_responses(
    instrument: FormalInstrument, responses: Sequence[int]
) -> Dict[str, object]:
    """Score a response vector; pure and total.

    Returns a dict with ``total``, ``max``, ``normalized`` (0-1, matching the
    covert engine scale), ``band`` (SeverityBand), ``crisis_flag`` (True when
    any crisis item — PHQ-9 item 9 — is non-zero), and ``crisis_item_indices``.

    Raises ``ValueError`` on wrong item count, non-integers, or out-of-range
    values.
    """
    expected = len(instrument.items)
    if len(responses) != expected:
        raise ValueError(
            f"{instrument.code} requires exactly {expected} responses, got {len(responses)}"
        )

    validated: List[int] = []
    for index, value in enumerate(responses):
        try:
            v = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Response {index + 1} must be an integer") from exc
        if v < 0 or v > instrument.max_per_item:
            raise ValueError(
                f"Response {index + 1} must be between 0 and {instrument.max_per_item}"
            )
        validated.append(v)

    total = sum(validated)
    band = instrument.band_for(total)
    crisis_indices = [
        index
        for index, item in enumerate(instrument.items)
        if item.is_crisis_item and validated[index] > 0
    ]

    return {
        "total": total,
        "max": instrument.max_score,
        "normalized": round(total / instrument.max_score, 4),
        "band": band,
        "responses": validated,
        "crisis_flag": bool(crisis_indices),
        "crisis_item_indices": crisis_indices,
    }
