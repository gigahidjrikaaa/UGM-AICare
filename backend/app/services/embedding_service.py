"""Embedding pipeline for the RAG knowledge base (content_resource_chunks).

Runs in-process (FastAPI BackgroundTasks) — previously a Celery task.

Pipeline per resource:
    1. Load resource content (DB row; MinIO-backed content is already
       extracted into ``content`` at ingestion time).
    2. Chunk via :mod:`app.services.knowledge_chunking` (section-aware,
       ~1200 chars, 15% overlap).
    3. Embed chunks with ``text-embedding-004`` @ 768 dims
       (task type RETRIEVAL_DOCUMENT) through ``llm.embed_texts``.
    4. DELETE-then-INSERT all chunks for the resource inside one
       transaction (keeps re-ingestion idempotent).
    5. Mark ``succeeded`` + ``chunk_count``.

Failures mark the resource ``failed`` with the error in resource_metadata
so admins can see WHY in the content console.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text

from app.core.llm import embed_texts
from app.core.settings import settings
from app.database import AsyncSessionLocal
from app.domains.mental_health.models import ContentResource
from app.services.knowledge_chunking import chunk_text

logger = logging.getLogger(__name__)


def _vector_literal(vector: list[float]) -> str:
    """Render an embedding as a pgvector string literal: '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{v:.7f}" for v in vector) + "]"


async def process_embedding(resource_id: int) -> None:
    """Chunk + embed a content resource. Opens its own DB session."""
    async with AsyncSessionLocal() as db:
        resource: Optional[ContentResource] = await db.get(ContentResource, resource_id)
        if resource is None:
            logger.warning("Embedding job skipped; resource %s not found", resource_id)
            return

        resource.embedding_status = "processing"
        resource.embedding_last_processed_at = datetime.now(timezone.utc)
        await db.commit()

        try:
            content = (resource.content or "").strip()
            if not content:
                raise ValueError("resource content is empty; nothing to embed")

            if not settings.rag_enabled:
                raise ValueError("RAG_ENABLED=false; embedding pipeline disabled")

            chunks = chunk_text(content)
            if not chunks:
                raise ValueError("chunking produced no chunks")

            embeddings = await embed_texts(
                [chunk.content for chunk in chunks],
                model=settings.rag_embedding_model,
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=settings.rag_embedding_dim,
            )

            # Delete-then-insert keeps re-ingestion idempotent.
            await db.execute(
                text("DELETE FROM content_resource_chunks WHERE resource_id = :rid"),
                {"rid": resource_id},
            )
            for chunk, vector in zip(chunks, embeddings):
                await db.execute(
                    text(
                        "INSERT INTO content_resource_chunks "
                        "(resource_id, chunk_index, section, content, chunk_metadata, embedding) "
                        "VALUES (:rid, :idx, :section, :content, :meta::jsonb, :embedding::vector)"
                    ),
                    {
                        "rid": resource_id,
                        "idx": chunk.index,
                        "section": chunk.section,
                        "content": chunk.content,
                        "meta": json.dumps({"title": resource.title}),
                        "embedding": _vector_literal(vector),
                    },
                )

            resource.embedding_status = "succeeded"
            resource.chunk_count = len(chunks)
            metadata = dict(resource.resource_metadata or {})
            metadata.pop("embedding_error", None)
            metadata["embedding_model"] = settings.rag_embedding_model
            resource.resource_metadata = metadata
            resource.embedding_last_processed_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(
                "Resource %s embedded: %d chunks (model=%s)",
                resource_id,
                len(chunks),
                settings.rag_embedding_model,
            )

        except Exception as exc:
            await db.rollback()
            logger.error(
                "Embedding failed for resource %s: %s", resource_id, exc, exc_info=True
            )
            fresh = await db.get(ContentResource, resource_id)
            if fresh is not None:
                fresh.embedding_status = "failed"
                metadata = dict(fresh.resource_metadata or {})
                metadata["embedding_error"] = str(exc)[:500]
                fresh.resource_metadata = metadata
                fresh.embedding_last_processed_at = datetime.now(timezone.utc)
                await db.commit()
