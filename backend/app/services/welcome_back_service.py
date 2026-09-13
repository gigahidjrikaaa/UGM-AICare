"""Welcome-back greeting: Aika continues where the user left off.

When the user opens the chat, instead of a canned greeting Aika's first
message references their most critical recent problem and/or the last
conversation:

    build_welcome_greeting(db, user)
        1. Gather context: latest UserSummary, latest
           ConversationRiskAssessment (overall_risk_level, concerns), the
           screening profile's primary concerns, and the user's name.
        2. SAFETY ROUTING: a high/critical latest assessment short-circuits
           the LLM entirely — crisis wording must never be generated.
        3. Otherwise one short LLM generation (casual Indonesian, <=2
           sentences, no diagnosis language) with deterministic template
           fallbacks on any failure or guardrail violation.
        4. Cache the result keyed by the latest conversation marker so new
           activity naturally yields a fresh greeting; TTL 6h caps cost at
           one LLM call per conversation per 6h.

Privacy stance: this surfaces the user's OWN data inside a chat THEY opened
(reactive, not an outbound push) — it does not require
``consent_proactive_chat``; that gate protects Aika-initiated pushes.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_cache_service
from app.core.llm import generate_response
from app.core.redaction import sanitize_text
from app.domains.mental_health.models import (
    ConversationRiskAssessment,
    UserSummary,
)
from app.models.user import User

logger = logging.getLogger(__name__)

GREETING_CACHE_TTL_SECONDS = 6 * 3600
_GREETING_MAX_CHARS = 480

_CRISIS_RISK_LEVELS = {"high", "critical"}

DEFAULT_GREETING = (
    "Halo! Aku Aika, asisten AI untuk kesehatan mentalmu. "
    "Bagaimana kabarmu hari ini? 💙"
)

# Banned framings: the greeting must never sound like surveillance or a
# clinical judgment — it's a friend who remembers.
_BANNED_GREETING_PHRASES = (
    "diagnosis",
    "diagnosa",
    "sistem mendeteksi",
    "terdeteksi",
    "analisis sistem",
    "skor risiko",
    "tingkat risiko",
    "buruh diri",
    "bunuh diri",
    "gantung diri",
    "melukai diri",
)


def _user_display_name(user: User) -> str:
    for attr in ("preferred_name", "first_name"):
        value = getattr(user, attr, None)
        if value and str(value).strip():
            return str(value).strip()
    return ""


def _time_ago_id(then: datetime, now: datetime | None = None) -> str:
    """Humanized Indonesian time-ago: 'tadi' / 'kemarin' / 'N hari lalu'.

    >>> _time_ago_id(datetime(2026, 9, 10, 8, 0, tzinfo=timezone.utc),
    ...              datetime(2026, 9, 10, 11, 0, tzinfo=timezone.utc))
    'tadi'
    >>> _time_ago_id(datetime(2026, 9, 9, 8, 0, tzinfo=timezone.utc),
    ...              datetime(2026, 9, 10, 11, 0, tzinfo=timezone.utc))
    'kemarin'
    >>> _time_ago_id(datetime(2026, 9, 6, 8, 0, tzinfo=timezone.utc),
    ...              datetime(2026, 9, 10, 11, 0, tzinfo=timezone.utc))
    '4 hari lalu'
    """
    now = now or datetime.now(timezone.utc)
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    days = (now.date() - then.date()).days
    if days <= 0:
        return "tadi"
    if days == 1:
        return "kemarin"
    return f"{days} hari lalu"


# ---------------------------------------------------------------------------
# Context gathering
# ---------------------------------------------------------------------------
async def _gather_context(db: AsyncSession, user: User) -> dict[str, Any]:
    """Collect the user's latest conversational context (their own data)."""
    summary_text = (
        await db.execute(
            select(UserSummary.summary_text)
            .where(UserSummary.user_id == user.id)
            .order_by(UserSummary.timestamp.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    latest_assessment = (
        await db.execute(
            select(ConversationRiskAssessment)
            .where(ConversationRiskAssessment.user_id == user.id)
            .order_by(ConversationRiskAssessment.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    concerns: list[str] = []
    risk_level: str | None = None
    last_chat_time: datetime | None = None
    if latest_assessment is not None:
        raw_concerns = latest_assessment.concerns or []
        concerns = [str(c) for c in raw_concerns if str(c).strip()][:5]
        risk_level = (latest_assessment.overall_risk_level or "").lower() or None
        last_chat_time = latest_assessment.created_at

    return {
        "name": _user_display_name(user),
        "summary_text": (summary_text or "").strip() or None,
        "concerns": concerns,
        "risk_level": risk_level,
        "last_chat_time": last_chat_time,
    }


def _top_concern(ctx: dict[str, Any]) -> str | None:
    if ctx.get("concerns"):
        return str(ctx["concerns"][0]).strip()
    return None


# ---------------------------------------------------------------------------
# Deterministic templates (offline-safe fallbacks)
# ---------------------------------------------------------------------------
def _default_greeting(ctx: dict[str, Any]) -> str:
    name = ctx.get("name")
    if name:
        return f"Halo {name}! Aku Aika. Gimana kabarmu hari ini? 💙"
    return DEFAULT_GREETING


def _concern_template(ctx: dict[str, Any], concern: str) -> str:
    name = ctx.get("name")
    when = _time_ago_id(ctx["last_chat_time"]) if ctx.get("last_chat_time") else "beberapa waktu lalu"
    prefix = f"Halo {name}!" if name else "Hai!"
    return (
        f"{prefix} {when.capitalize()} kita ngobrol soal {concern.lower()}. "
        "Gimana sekarang — masih berat atau mulai lega sedikit?"
    )


def _summary_template(ctx: dict[str, Any]) -> str:
    name = ctx.get("name")
    when = _time_ago_id(ctx["last_chat_time"]) if ctx.get("last_chat_time") else "Terakhir kali"
    snippet = (ctx.get("summary_text") or "").strip()
    if len(snippet) > 90:
        snippet = snippet[:87].rstrip() + "…"
    prefix = f"Hai {name}!" if name else "Hai!"
    return (
        f"{prefix} {when} kita sempat ngobrol tentang {snippet}. "
        "Mau lanjut dari sana, atau ada yang lain yang pengen kamu ceritakan?"
    )


def _crisis_gentle_template(ctx: dict[str, Any]) -> str:
    name = ctx.get("name")
    prefix = f"Halo {name}." if name else "Halo."
    from app.core.crisis_resources import HOTLINE_LINE

    return (
        f"{prefix} Aku inget kemarin kamu cerita hal yang berat banget. "
        "Aku di sini dan nggak buru-buru — mau cerita lagi, atau cuma pengen ditemenin? "
        f"Kalau butuh dukungan segera: {HOTLINE_LINE}. 💙"
    )


# ---------------------------------------------------------------------------
# LLM generation (non-crisis path only)
# ---------------------------------------------------------------------------
def _passes_greeting_guardrails(text: str) -> bool:
    if not text or len(text.strip()) < 10:
        return False
    if len(text) > _GREETING_MAX_CHARS:
        return False
    lowered = text.lower()
    return not any(phrase in lowered for phrase in _BANNED_GREETING_PHRASES)


_GREETING_SYSTEM_PROMPT = """Kamu adalah Aika, pendamping kesehatan mental bersuara hangat untuk mahasiswa Indonesia. Tugas: tulis SATU pesan pembuka percakapan (welcome-back) berdasarkan fakta konteks yang diberikan.

ATURAN KERAS:
- Bahasa Indonesia santai seperti teman dekat, maksimal 2 kalimat.
- Sebut topik/perhatian pengguna secara halus. DILARANG memakai label klinis ("depresi", "kecemasan generalized", "diagnosis") atau frasa surveillance ("sistem mendeteksi", "terdeteksi", "analisis").
- DILARANG memberi saran atau nasihat di pesan pembuka.
- Akhiri dengan SATU pertanyaan terbuka yang ringan.
- Jangan menyebut nomor darurat atau topik bunuh diri — itu ditangani jalur lain.
- Output HANYA teks pesan, tanpa tanda kutip, tanpa penjelasan.
"""


def _build_llm_user_prompt(ctx: dict[str, Any]) -> str:
    lines = ["FAKTA KONTEKS (milik pengguna sendiri):"]
    if ctx.get("name"):
        lines.append(f"- Nama panggilan: {ctx['name']}")
    if ctx.get("last_chat_time"):
        lines.append(f"- Percakapan terakhir: {_time_ago_id(ctx['last_chat_time'])}")
    concern = _top_concern(ctx)
    if concern:
        lines.append(f"- Perhatian utama yang pengguna ceritakan sendiri: {concern}")
    if ctx.get("summary_text"):
        summary_snippet = ctx["summary_text"]
        if len(summary_snippet) > 300:
            summary_snippet = summary_snippet[:297].rstrip() + "…"
        lines.append(f"- Ringkasan percakapan terakhir: {summary_snippet}")
    lines.append(
        "Tulis pesan pembuka hangat yang menyambut kembali dan membuka ruang cerita."
    )
    return "\n".join(lines)


async def _llm_greeting(ctx: dict[str, Any]) -> Optional[str]:
    """One short LLM generation; None on any failure (caller falls back)."""
    try:
        raw = await generate_response(
            history=[{"role": "user", "content": _build_llm_user_prompt(ctx)}],
            model="gemini_google",
            max_tokens=160,
            temperature=0.5,
            system_prompt=_GREETING_SYSTEM_PROMPT,
        )
    except Exception as exc:
        logger.warning("Welcome-back LLM generation failed: %s", exc)
        return None

    if not raw or raw.startswith("Error:"):
        logger.info("Welcome-back LLM returned an error payload; using template.")
        return None
    cleaned = raw.strip().strip('"')
    cleaned = " ".join(cleaned.split())
    if not _passes_greeting_guardrails(cleaned):
        logger.info("Welcome-back LLM output failed guardrails; using template.")
        return None
    sanitized, _ = sanitize_text(cleaned)
    return sanitized.strip() or None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def _count_greeting(source: str) -> None:
    try:
        from app.core.metrics import welcome_back_greetings_total

        welcome_back_greetings_total.labels(source=source).inc()
    except Exception:
        pass


async def build_welcome_greeting(db: AsyncSession, user: User) -> dict[str, Any]:
    """Build the personalized first chat message (see module docstring)."""
    ctx = await _gather_context(db, user)
    based_on = {
        "risk_level": ctx.get("risk_level"),
        "top_concern": _top_concern(ctx),
    }

    # Safety routing first: crisis never goes through generation.
    if (ctx.get("risk_level") or "") in _CRISIS_RISK_LEVELS:
        _count_greeting("crisis_gentle")
        return {
            "text": _crisis_gentle_template(ctx),
            "source": "crisis_gentle",
            "based_on": based_on,
        }

    # Cache: one LLM call per conversation-marker per TTL window.
    cache = get_cache_service()
    marker = "none"
    if ctx.get("last_chat_time"):
        marker = ctx["last_chat_time"].isoformat()
    elif ctx.get("summary_text"):
        marker = f"summary:{hash(ctx['summary_text']) % 10**10}"
    cache_key = f"cache:welcome_back:{user.id}:{marker}"
    try:
        cached = await cache.get(cache_key)
    except Exception:
        cached = None
    if isinstance(cached, str) and cached:
        _count_greeting("personalized")
        return {"text": cached, "source": "personalized", "based_on": based_on}

    # No meaningful history → default greeting (no LLM spend).
    if not ctx.get("summary_text") and not ctx.get("concerns"):
        _count_greeting("default")
        return {
            "text": _default_greeting(ctx),
            "source": "default",
            "based_on": based_on,
        }

    generated = await _llm_greeting(ctx)
    if generated:
        try:
            await cache.set(cache_key, generated, ttl=GREETING_CACHE_TTL_SECONDS)
        except Exception:  # cache write is best-effort
            pass
        _count_greeting("personalized")
        return {"text": generated, "source": "personalized", "based_on": based_on}

    # Deterministic fallbacks, most specific first.
    concern = _top_concern(ctx)
    if concern:
        _count_greeting("template")
        return {"text": _concern_template(ctx, concern), "source": "template", "based_on": based_on}
    if ctx.get("summary_text"):
        _count_greeting("template")
        return {"text": _summary_template(ctx), "source": "template", "based_on": based_on}
    _count_greeting("default")
    return {"text": _default_greeting(ctx), "source": "default", "based_on": based_on}
