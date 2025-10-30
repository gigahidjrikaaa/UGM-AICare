from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, List, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import llm
from app.core.redaction import sanitize_text
from app.models import User  # Core model
from app.domains.mental_health.models import PlayerWellnessState, QuestInstance, QuestStatusEnum

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are Aika, a compassionate Indonesian mental wellness guide for UGM students. "
    "Offer short, empathetic encouragement in Bahasa Indonesia with warm tone, and avoid medical diagnoses."
)
_BANNED_PHRASES: tuple[str, ...] = (
    "bunuh diri",
    "kill yourself",
    "suicide",
    "harm yourself",
    "medicine",
    "diagnosis",
)
_MAX_MEMORY = 3


def _build_prompt(
    user: User,
    completed: Sequence[QuestInstance],
    active: Sequence[QuestInstance],
    wellness_state: PlayerWellnessState,
    memory: Sequence[str],
) -> str:
    preferred_name = user.preferred_name or user.first_name or user.name or "teman"
    completed_text = ", ".join(q.template.name for q in completed if q.template) or "Belum ada"
    active_text = ", ".join(q.template.name for q in active if q.template) or "Tidak ada"
    streak_line = f"{wellness_state.current_streak} hari" if wellness_state.current_streak else "belum ada"
    memory_text = " | ".join(memory) if memory else "None"

    return (
        f"Nama panggilan: {preferred_name}.\n"
        f"Streak: {streak_line}.\n"
        f"Harmony score: {wellness_state.harmony_score:.2f}.\n"
        f"Quest selesai terbaru: {completed_text}.\n"
        f"Quest aktif: {active_text}.\n"
        f"Echo memory: {memory_text}.\n"
        "Tulis pesan singkat (maks 3 kalimat) untuk memotivasi dan memberi dukungan lembut."
    )


def _passes_guardrails(text: str) -> bool:
    lowered = text.lower()
    return not any(phrase in lowered for phrase in _BANNED_PHRASES)


class DialogueOrchestratorService:
    """Dialogue orchestration with optional LLM and deterministic fallback."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def build_daily_check_in(
        self,
        user: User,
        recent_quests: Sequence[QuestInstance],
        wellness_state: PlayerWellnessState,
    ) -> Dict[str, str]:
        completed = [quest for quest in recent_quests if quest.status == QuestStatusEnum.COMPLETED]
        active = [quest for quest in recent_quests if quest.status == QuestStatusEnum.ACTIVE]

        echo_memory: List[str] = list((wellness_state.extra_data or {}).get("echo_memory", []))  # type: ignore[arg-type]
        prompt = _build_prompt(user, completed, active, wellness_state, echo_memory)

        message = await self._generate_ai_message(prompt) if llm.GOOGLE_API_KEY else None
        if not message:
            message = self._render_fallback_message(user, completed, active, wellness_state)

        sanitized = sanitize_text(message)
        new_memory = (echo_memory + [sanitized])[-_MAX_MEMORY:]
        extra = dict(wellness_state.extra_data or {})  # type: ignore[arg-type]
        extra["echo_memory"] = new_memory
        extra["last_ai_message_at"] = datetime.utcnow().isoformat()
        wellness_state.extra_data = extra  # reassign to trigger JSON change tracking
        await self.session.flush()

        return {
            "message": sanitized,
            "tone": "supportive",
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def fetch_recent_quests(self, user_id: int, limit: int = 5) -> List[QuestInstance]:
        stmt = (
            select(QuestInstance)
            .options(selectinload(QuestInstance.template))
            .where(QuestInstance.user_id == user_id)
            .order_by(QuestInstance.issued_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars())

    async def _generate_ai_message(self, prompt: str) -> str | None:
        history = [{"role": "user", "content": prompt}]
        try:
            response = await llm.generate_response(
                history=history,
                model="gemini_google",
                max_tokens=220,
                temperature=0.4,
                system_prompt=_SYSTEM_PROMPT,
            )
        except Exception as exc:  # pragma: no cover - safety
            logger.warning("LLM generation failed, using fallback. Error: %s", exc)
            return None

        if not response:
            return None

        trimmed = response.strip()
        if not _passes_guardrails(trimmed):
            logger.warning("LLM output failed guardrails; falling back.")
            return None

        return trimmed

    def _render_fallback_message(
        self,
        user: User,
        completed: Sequence[QuestInstance],
        active: Sequence[QuestInstance],
        wellness_state: PlayerWellnessState,
    ) -> str:
        preferred_name = user.preferred_name or user.first_name or user.name or "teman"
        if completed:
            latest = completed[0]
            template_name = latest.template.name if latest.template else "quest terakhir"
            streak = wellness_state.current_streak
            if streak > 1:
                return (
                    f"Halo, {preferred_name}! Kamu baru saja menyelesaikan **{template_name}**. "
                    f"Streak kamu sudah {streak} hari - jaga ritme hangat ini, ya."
                )
            return (
                f"Halo, {preferred_name}! Aku senang kamu menuntaskan **{template_name}**. "
                "Ambil napas dan perhatikan perasaan nyaman yang hadir."
            )

        if active:
            next_quest = active[0]
            name = next_quest.template.name if next_quest.template else "quest berikutnya"
            prompt_text = (
                "Ambil napas dulu, lalu kita coba pelan-pelan."
                if wellness_state.compassion_mode_active
                else "Saat kamu siap, mari kita lakukan bersama."
            )
            return f"Halo, {preferred_name}! Quest berikutnya adalah **{name}**. {prompt_text}"

        return (
            f"Halo, {preferred_name}! Kamu sudah mengambil langkah bagus hari ini. "
            "Jika butuh momen rehat, aku di sini kapan pun kamu siap."
        )
