"""Tests for the RAG pipeline: chunker, guidance rendering, retrieval service,
and the knowledge tool. Fully offline — embeddings and DB are mocked."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.knowledge_chunking import Chunk, chunk_text, split_into_sections


# ============================================================================
# Chunker
# ============================================================================
class TestChunker:
    SAMPLE = (
        "BAB IV PENANGANAN DEPRESI\n\n"
        "Depresi pada mahasiswa ditandai dengan suasana hati rendah lebih dari "
        "dua minggu. Penanganan pertama adalah skrining menggunakan PHQ-9.\n\n"
        "4.1 Terapi Psikologis\n\n"
        "Terapi psikologis lini pertama adalah CBT. Teknik behavioral activation "
        "dilakukan dengan menjadwalkan aktivitas kecil yang bermakna.\n\n"
        "4.2 Rujukan\n\n"
        "Rujukan ke psikiater diperlukan bila terdapat risiko bunuh diri atau "
        "psikotik. Gunakan instrumen C-SSRS untuk menilai risiko."
    )

    def test_sections_are_detected(self) -> None:
        sections = split_into_sections(self.SAMPLE)
        titles = [t for t, _ in sections]
        assert any("BAB IV" in (t or "") for t in titles)
        assert any("4.1" in (t or "") for t in titles)

    def test_chunks_carry_sections(self) -> None:
        chunks = chunk_text(self.SAMPLE)
        assert chunks
        assert any(c.section and "BAB IV" in c.section for c in chunks)
        # No content lost: every source word appears in some chunk.
        joined = "\n".join(c.content for c in chunks)
        for word in ("PHQ-9", "behavioral activation", "C-SSRS"):
            assert word in joined

    def test_long_text_is_windowed_with_overlap(self) -> None:
        body = " ".join(
            f"Kalimat penjelasan nomor {n} tentang penanganan kecemasan." for n in range(20)
        )
        text = f"PANDUAN A\n\n{body}"
        chunks = chunk_text(text, target_chars=400, overlap_ratio=0.15)
        assert len(chunks) >= 2
        # Overlap: the tail of chunk 0 reappears at the head of chunk 1.
        assert chunks[0].content[-40:] in chunks[1].content or chunks[1].content[:40] in chunks[0].content

    def test_empty_input_returns_empty(self) -> None:
        assert chunk_text("") == []
        assert chunk_text("   \n  ") == []

    def test_rejects_tiny_target(self) -> None:
        with pytest.raises(ValueError):
            chunk_text("abc", target_chars=10)

    def test_no_oversized_chunks(self) -> None:
        chunks = chunk_text(self.SAMPLE, target_chars=300)
        assert all(c.char_len <= 300 * 1.3 + 10 for c in chunks)


# ============================================================================
# Guidance rendering
# ============================================================================
class TestGuidanceBlock:
    def _chunk(self, content="Isi panduan resmi.", title="JUKNIS P2", section="4.1"):
        from app.services.knowledge_retrieval_service import RetrievedChunk

        return RetrievedChunk(
            content=content, title=title, section=section, source="Kemenkes",
            score=0.82, resource_id=1,
        )

    def test_empty_returns_empty_string(self) -> None:
        from app.services.knowledge_retrieval_service import render_guidance_block

        assert render_guidance_block([]) == ""

    def test_block_contains_title_and_source(self) -> None:
        from app.services.knowledge_retrieval_service import render_guidance_block

        block = render_guidance_block([self._chunk()])
        assert "PANDUAN RESMI" in block
        assert "JUKNIS P2" in block
        assert "Kemenkes" in block
        assert "Isi panduan resmi." in block

    def test_budget_truncates_long_content(self) -> None:
        from app.services.knowledge_retrieval_service import render_guidance_block

        big = self._chunk(content="x" * 5000)
        block = render_guidance_block([big], max_chars=500)
        assert len(block) < 1200


# ============================================================================
# Retrieval service (offline)
# ============================================================================
@pytest.mark.asyncio
async def test_retrieve_degrades_gracefully_on_db_error(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import knowledge_retrieval_service as module

    async def fake_embed(*_args, **_kwargs):
        return [[0.1] * 768]

    monkeypatch.setattr(module, "embed_texts", fake_embed)

    db = MagicMock()
    db.execute = AsyncMock(side_effect=RuntimeError("relation does not exist"))

    result = await module.retrieve(db, "penanganan kecemasan")
    assert result == []


@pytest.mark.asyncio
async def test_retrieve_respects_disabled_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import knowledge_retrieval_service as module

    monkeypatch.setattr(module.settings, "rag_enabled", False)

    called = {"embed": False}

    async def fake_embed(*_a, **_k):
        called["embed"] = True
        return [[0.1] * 768]

    monkeypatch.setattr(module, "embed_texts", fake_embed)
    result = await module.retrieve(MagicMock(), "query")
    assert result == []
    assert called["embed"] is False


@pytest.mark.asyncio
async def test_retrieve_returns_scored_chunks(monkeypatch: pytest.MonkeyPatch) -> None:
    from collections import namedtuple

    from app.services import knowledge_retrieval_service as module

    async def fake_embed(*_args, **_kwargs):
        return [[0.2] * 768]

    monkeypatch.setattr(module, "embed_texts", fake_embed)

    Row = namedtuple(
        "Row",
        "id resource_id section content chunk_metadata resource_title "
        "resource_source dense_score sparse_score final_score",
    )
    row = Row(
        1, 7, "4.1", "Teks panduan.", {"title": "JUKNIS"},
        "Buku JUKNIS P2", "Kemenkes", 0.9, 0.3, 0.72,
    )
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(fetchall=lambda: [row]))

    result = await module.retrieve(db, "penanganan depresi")
    assert len(result) == 1
    assert result[0].title == "JUKNIS"
    assert result[0].score == 0.72


# ============================================================================
# Knowledge tool
# ============================================================================
@pytest.mark.agents
async def test_get_mental_health_resources_returns_grounded_results(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.agents.shared.tools.knowledge_tools import get_mental_health_resources
    from app.services.knowledge_retrieval_service import RetrievedChunk

    async def fake_retrieve(_db, query, **_kwargs):
        assert "coping" in query
        return [
            RetrievedChunk(
                content="Teknik 5-4-3-2-1 …", title="Panduan Coping",
                section="2", source="JUKNIS", score=0.8, resource_id=3,
            )
        ]

    monkeypatch.setattr(
        "app.agents.shared.tools.knowledge_tools.retrieve", fake_retrieve
    )

    result = await get_mental_health_resources(
        db=AsyncMock(), category="coping_strategies", topic=None
    )
    assert result["success"] is True
    assert result["grounded"] is True
    assert result["resources"][0]["title"] == "Panduan Coping"


@pytest.mark.agents
async def test_get_mental_health_resources_survives_retrieval_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.agents.shared.tools import knowledge_tools

    async def boom(_db, _query, **_kwargs):
        raise RuntimeError("pgvector missing")

    monkeypatch.setattr(knowledge_tools.retrieve, "__wrapped__", boom, raising=False)
    # Patch the symbol used inside the tool module directly.
    monkeypatch.setattr(knowledge_tools, "retrieve", boom)

    result = await knowledge_tools.get_mental_health_resources(
        db=AsyncMock(), category="educational_content"
    )
    assert result["success"] is True
    assert result["grounded"] is False
    assert result["resources"] == []


# ============================================================================
# Embedding-task helpers (pure parts)
# ============================================================================
def test_vector_literal_format() -> None:
    from app.tasks.embedding_tasks import _vector_literal

    assert _vector_literal([0.5, -0.25]) == "[0.5000000,-0.2500000]"
