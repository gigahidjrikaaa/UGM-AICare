"""Utilities to assemble personalized context for chat responses."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import asyncio

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Appointment, JournalEntry, User, UserSummary
from app.utils.security_utils import decrypt_data

_CACHE_TTL = timedelta(minutes=5)
_context_cache: Dict[int, Tuple[str, datetime]] = {}
_cache_lock = asyncio.Lock()


def _safe_decrypt(value: Optional[str]) -> Optional[str]:
    """Decrypt an encrypted field, returning None on failure."""
    if not value:
        return None
    try:
        return decrypt_data(value)
    except Exception:
        return None


async def _get_latest_summary(db: AsyncSession, user_id: int) -> Optional[str]:
    stmt = (
        select(UserSummary.summary_text)
        .where(UserSummary.user_id == user_id)
        .order_by(UserSummary.timestamp.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    summary_row = result.scalar_one_or_none()
    if summary_row:
        return summary_row.strip()
    return None


async def _get_recent_journal_highlights(db: AsyncSession, user_id: int, limit: int = 2) -> List[str]:
    stmt = (
        select(JournalEntry.content)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.entry_date.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    entries = [row.strip() for row in result.scalars().all() if row]

    highlights: List[str] = []
    for entry in entries:
        snippet = entry.replace("\n", " ").strip()
        if len(snippet) > 220:
            snippet = snippet[:217].rstrip() + "..."
        if snippet:
            highlights.append(snippet)
    return highlights


async def _get_upcoming_appointment(db: AsyncSession, user_id: int) -> Optional[str]:
    now = datetime.utcnow()
    stmt = (
        select(Appointment.appointment_datetime, Appointment.appointment_type_id)
        .where(Appointment.user_id == user_id)
        .where(Appointment.status != "cancelled")
        .where(Appointment.appointment_datetime >= now)
        .order_by(Appointment.appointment_datetime.asc())
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        return None

    appointment_dt, appointment_type_id = row
    time_until = appointment_dt - now
    days_until = time_until.days
    if days_until < 0:
        return None

    when_text = appointment_dt.strftime("%d %b %Y %H:%M")
    if days_until == 0:
        descriptor = "hari ini"
    elif days_until == 1:
        descriptor = "besok"
    else:
        descriptor = f"dalam {days_until} hari"

    if appointment_type_id:
        return f"Janji temu berikutnya {descriptor} pada {when_text}."
    return f"Janji temu berikutnya dijadwalkan {descriptor} pada {when_text}."


async def build_user_personal_context(db: AsyncSession, user: User) -> str:
    """Aggregate key information about the user to ground chatbot responses."""

    now = datetime.utcnow()
    async with _cache_lock:
        cached = _context_cache.get(user.id)
        if cached:
            cached_value, cached_at = cached
            if now - cached_at < _CACHE_TTL:
                return cached_value

    context = await _compute_personal_context(db, user)

    async with _cache_lock:
        _context_cache[user.id] = (context, now)

    return context


async def invalidate_user_personal_context(user_id: int) -> None:
    async with _cache_lock:
        _context_cache.pop(user_id, None)


async def _compute_personal_context(db: AsyncSession, user: User) -> str:
    profile_lines: List[str] = []

    name = _safe_decrypt(user.name) or _safe_decrypt(user.first_name)
    if name:
        profile_lines.append(f"Nama panggilan: {name}")

    if user.university:
        profile_lines.append(f"Universitas: {user.university}")
    if user.major:
        profile_lines.append(f"Program studi: {user.major}")
    if user.year_of_study:
        profile_lines.append(f"Tahun studi: {user.year_of_study}")

    if user.current_streak:
        profile_lines.append(f"Streak jurnal aktif: {user.current_streak} hari")
    if user.longest_streak:
        profile_lines.append(f"Streak terpanjang: {user.longest_streak} hari")

    if user.sentiment_score is not None:
        score_pct = round(user.sentiment_score * 100)
        profile_lines.append(f"Skor sentimen rata-rata: {score_pct}%")

    if user.allow_email_checkins is not None:
        profile_lines.append(
            "Pengguna mengizinkan check-in email" if user.allow_email_checkins else "Pengguna memilih tidak menerima check-in email"
        )

    latest_summary = await _get_latest_summary(db, user.id)
    journal_highlights = await _get_recent_journal_highlights(db, user.id)
    upcoming_appointment = await _get_upcoming_appointment(db, user.id)

    # Count total journal entries for quick reference
    total_journals_stmt = select(func.count(JournalEntry.id)).where(JournalEntry.user_id == user.id)
    total_journals = (await db.execute(total_journals_stmt)).scalar() or 0

    sections: List[str] = []
    if profile_lines:
        sections.append("Profil Pengguna:\n- " + "\n- ".join(profile_lines))

    sections.append(f"Total catatan jurnal tersimpan: {total_journals}")

    if latest_summary:
        sections.append("Ringkasan percakapan terakhir:\n" + latest_summary)

    if journal_highlights:
        formatted_highlights = "\n".join(f"- {snippet}" for snippet in journal_highlights)
        sections.append("Sorotan jurnal terbaru:\n" + formatted_highlights)

    if upcoming_appointment:
        sections.append("Agenda bantuan profesional:\n" + upcoming_appointment)

    context = "\n\n".join(section.strip() for section in sections if section.strip())
    if context:
        context += "\n\nGunakan konteks ini untuk menyesuaikan respons tanpa menyebutkan bahwa kamu menerima ringkasan ini."
    return context


async def fetch_relevant_journal_entries(
    db: AsyncSession,
    user_id: int,
    query_text: str,
    limit: int = 3,
) -> List[str]:
    """Return journal snippets that appear relevant to the current user query."""

    keywords = {
        word.lower()
        for word in query_text.split()
        if len(word) >= 4 and word.isalpha()
    }

    stmt = select(JournalEntry.entry_date, JournalEntry.content).where(JournalEntry.user_id == user_id)

    if keywords:
        like_clauses = [JournalEntry.content.ilike(f"%{kw}%") for kw in keywords]
        stmt = stmt.where(or_(*like_clauses))

    stmt = stmt.order_by(JournalEntry.entry_date.desc()).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()
    snippets: List[str] = []
    for entry_date, content in rows:
        if not content:
            continue
        cleaned = content.replace("\n", " ").strip()
        if len(cleaned) > 260:
            cleaned = cleaned[:257].rstrip() + "..."
        formatted_date = entry_date.strftime("%d %b %Y") if entry_date else "Tidak diketahui"
        snippets.append(f"[{formatted_date}] {cleaned}")

    return snippets
