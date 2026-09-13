"""Hybrid knowledge retrieval over ``content_resource_chunks`` (pgvector).

Score fusion:
    dense  — 1 - cosine distance (pgvector ``<=>`` operator, HNSW index)
    sparse — ts_rank_cd over the ``indonesian`` tsvector generated column
    final  - dense_weight * dense + (1 - dense_weight) * sparse, with the
             sparse term normalized to [0, 1] via rank/(rank + 1) so the two
             are comparable.

Design notes:
- Queries embed with task_type=RETRIEVAL_QUERY (task-aware embeddings).
- ``min_score`` filters weak matches so prompts never receive noise.
- Everything degrades gracefully: if the chunk table or extension is
  missing (pre-migration DBs), retrieval returns [] and callers proceed
  ungrounded — grounding is an enhancement, never a hard dependency.
- SQL is parameterized; the query text itself never enters f-strings.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import embed_texts
from app.core.settings import settings

logger = logging.getLogger(__name__)

_DENSE_WEIGHT = 0.7  # dense leads, Indonesian FTS corroborates

_RETRIEVE_SQL = text(
    """
    WITH scored AS (
        SELECT
            c.id,
            c.resource_id,
            c.section,
            c.content,
            c.chunk_metadata,
            r.title AS resource_title,
            r.source AS resource_source,
            1 - (c.embedding <=> :query_vector::vector) AS dense_score,
            CASE
                WHEN c.tsv @@ websearch_to_tsquery('indonesian', :query_text)
                THEN ts_rank_cd(c.tsv, websearch_to_tsquery('indonesian', :query_text))
                ELSE 0.0
            END AS raw_sparse_score
        FROM content_resource_chunks c
        JOIN content_resources r ON r.id = c.resource_id
        WHERE r.embedding_status = 'succeeded'
    )
    SELECT
        id, resource_id, section, content, chunk_metadata,
        resource_title, resource_source,
        dense_score,
        raw_sparse_score / (raw_sparse_score + 1.0) AS sparse_score,
        (:DENSE_W * dense_score + (1 - :DENSE_W) * (raw_sparse_score / (raw_sparse_score + 1.0))) AS final_score
    FROM scored
    WHERE dense_score >= :min_dense
    ORDER BY final_score DESC
    LIMIT :k
    """
)


@dataclass(frozen=True)
class RetrievedChunk:
    """One grounded passage released to a prompt."""

    content: str
    title: str
    section: str | None
    source: str | None
    score: float
    resource_id: int


async def retrieve(
    db: AsyncSession,
    query: str,
    *,
    top_k: int | None = None,
    min_score: float | None = None,
) -> list[RetrievedChunk]:
    """Return the most relevant chunks for *query*, best first.

    Returns [] on any infrastructure problem (extension missing, table
    missing, embedding API down) — callers must treat grounding as
    optional and continue without it.
    """
    if not settings.rag_enabled or not (query or "").strip():
        return []

    k = top_k or settings.rag_top_k
    threshold = min_score if min_score is not None else settings.rag_min_score

    try:
        query_vector = (
            await embed_texts(
                [query.strip()],
                model=settings.rag_embedding_model,
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=settings.rag_embedding_dim,
            )
        )[0]
    except Exception as exc:
        logger.warning("RAG query embedding failed; proceeding ungrounded: %s", exc)
        return []

    vector_literal = "[" + ",".join(f"{v:.7f}" for v in query_vector) + "]"

    try:
        result = await db.execute(
            _RETRIEVE_SQL,
            {
                "query_vector": vector_literal,
                "query_text": query.strip(),
                "min_dense": max(0.0, threshold - 0.1),
                "k": k,
                "DENSE_W": _DENSE_WEIGHT,
            },
        )
        rows = result.fetchall()
    except Exception as exc:
        # Missing extension/table (pre-migration DB) lands here — degrade.
        logger.warning("RAG retrieval query failed; proceeding ungrounded: %s", exc)
        return []

    chunks: list[RetrievedChunk] = []
    for row in rows:
        if float(row.final_score) < threshold:
            continue
        metadata = row.chunk_metadata if isinstance(row.chunk_metadata, dict) else {}
        chunks.append(
            RetrievedChunk(
                content=row.content,
                title=metadata.get("title") or row.resource_title or "Sumber",
                section=row.section,
                source=row.resource_source,
                score=round(float(row.final_score), 4),
                resource_id=int(row.resource_id),
            )
        )
    return chunks


def render_guidance_block(chunks: list[RetrievedChunk], *, max_chars: int = 2400) -> str:
    """Render retrieved chunks as a cited guidance block for prompts.

    Returns an empty string when there is nothing to ground on — callers
    append the block only if non-empty, and the prompt instructs the model
    to say so when guidance is absent rather than inventing content.
    """
    if not chunks:
        return ""

    lines: list[str] = [
        "PANDUAN RESMI (dari basis pengetahuan kesehatan mental platform — "
        "GUNAKAN sebagai acuan utama dan sebutkan sumbernya bila relevan; "
        "jika panduan ini tidak mencakup pertanyaan, katakan dengan jujur):"
    ]
    budget = max_chars
    for i, chunk in enumerate(chunks, 1):
        source = f" — {chunk.source}" if chunk.source else ""
        section = f" ({chunk.section})" if chunk.section else ""
        header = f"[{i}] {chunk.title}{section}{source} (skor {chunk.score:.2f}):"
        body = chunk.content
        if len(header) + len(body) + 1 > budget:
            body = body[: max(0, budget - len(header) - 20)] + "…"
        if budget - len(header) - len(body) - 1 <= 0:
            break
        lines.append(f"{header}\n{body}")
        budget -= len(header) + len(body) + 2

    return "\n\n".join(lines)
