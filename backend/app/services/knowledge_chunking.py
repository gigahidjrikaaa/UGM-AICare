"""Pure, dependency-free chunking for the RAG ingestion pipeline.

Ported conceptually from the ``ai/`` prototype's section-aware splitter
(``ai/src/service/data__ingestion.py``) and its naive char chunker, with the
prototype's two production defects fixed:

1. Section-aware: heading/paragraph boundaries are respected BEFORE
   fixed-size splitting, so chunks carry a ``section`` label.
2. No truncation at storage time: chunks are sized to be stored whole (the
   prototype stored only the first 1000 chars of each chunk in Pinecone
   metadata, crippling retrieval).

Strategy:
    split_into_sections()  → heading-aware pass (markdown #, numbered
                             headings, ALL-CAPS lines, plain blank-line
                             paragraphs as a floor)
    chunk_text()           → pack sections into ~``target_chars`` windows
                             with paragraph-boundary splits and
                             ``overlap_ratio`` character overlap so that
                             facts near window edges remain retrievable.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

__all__ = ["Chunk", "split_into_sections", "chunk_text"]


@dataclass(frozen=True)
class Chunk:
    """One retrievable passage."""

    content: str
    section: str | None = None
    index: int = 0

    @property
    def char_len(self) -> int:
        return len(self.content)


_HEADING_RE = re.compile(
    r"^(?:(#{1,6})\s+(?P<md>.+)|(?P<num>(?:BAB\s+[IVXLC]+|\d+(?:\.\d+)*)(?:[.\)])?\s+\S.*)|(?P<caps>[A-Z][A-Z\s\-]{8,}))\s*$"
)


def split_into_sections(text: str) -> list[tuple[str | None, str]]:
    """Split *text* into ``(section_title, body)`` pairs.

    Recognises markdown headings, Indonesian document conventions
    ("BAB IV", "2.3 Foo") and ALL-CAPS heading lines. Falls back to
    blank-line paragraphs with ``section=None``.
    """
    if not text or not text.strip():
        return []

    sections: list[tuple[str | None, list[str]]] = []
    current_title: str | None = None
    current_lines: list[str] = []

    def _flush() -> None:
        body = "\n".join(current_lines).strip()
        if body:
            sections.append((current_title, body))

    for line in text.splitlines():
        stripped = line.strip()
        match = _HEADING_RE.match(stripped)
        if match and len(stripped) <= 120:
            _flush()
            current_lines = []
            current_title = (
                match.group("md")
                or match.group("num")
                or match.group("caps")
            ).strip()
            continue
        current_lines.append(line)
    _flush()

    return [(title, body) for title, body in sections]


def _split_long_body(body: str, target_chars: int) -> list[str]:
    """Split an over-long section body on paragraph, then sentence bounds."""
    if len(body) <= target_chars:
        return [body]

    paragraphs = [p for p in re.split(r"\n\s*\n", body) if p.strip()]
    pieces: list[str] = []
    buffer = ""
    for para in paragraphs:
        candidate = f"{buffer}\n\n{para}".strip() if buffer else para
        if len(candidate) <= target_chars:
            buffer = candidate
            continue
        if buffer:
            pieces.append(buffer)
            buffer = ""
        if len(para) <= target_chars:
            buffer = para
            continue
        # Paragraph itself too long: split on sentence terminators.
        sentences = re.split(r"(?<=[.!?])\s+", para)
        for sentence in sentences:
            candidate = f"{buffer} {sentence}".strip() if buffer else sentence
            if len(candidate) <= target_chars:
                buffer = candidate
                continue
            if buffer:
                pieces.append(buffer)
            buffer = sentence[:target_chars]
    if buffer:
        pieces.append(buffer)
    return pieces


def chunk_text(
    text: str,
    *,
    target_chars: int = 1200,
    overlap_ratio: float = 0.15,
) -> list[Chunk]:
    """Chunk *text* into overlapping windows aligned to section/paragraph bounds.

    ``target_chars`` ~1200 chars ≈ 300-400 tokens: comfortably below
    embedding-model context and large enough to keep a guideline step
    together. ``overlap_ratio`` keeps ~15% character overlap between
    consecutive windows of the same section.
    """
    if not text or not text.strip():
        return []
    if target_chars < 200:
        raise ValueError("target_chars must be at least 200")

    chunks: list[Chunk] = []
    overlap = int(target_chars * overlap_ratio)

    for section_title, body in split_into_sections(text):
        pieces = _split_long_body(body, target_chars)
        carry = ""
        for piece in pieces:
            content = f"{carry}\n{piece}".strip() if carry else piece
            if len(content) > target_chars * 1.3 and carry:
                # Carried overlap made the window oversized: drop the carry.
                content = piece
            chunks.append(Chunk(content=content, section=section_title))
            carry = content[-overlap:] if overlap < len(content) else ""

    for i, chunk in enumerate(chunks):
        # frozen dataclass: rebuild with final index
        chunks[i] = Chunk(content=chunk.content, section=chunk.section, index=i)

    return chunks
