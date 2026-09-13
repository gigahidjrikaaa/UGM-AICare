"""Knowledge-retrieval tools for Aika (RAG over content_resource_chunks).

Registers a real executor for ``get_mental_health_resources`` — previously
this tool was DECLARED in ``aika/tool_definitions.py`` but had NO registered
executor, so any call failed. Execution grounds Aika's answers in the
platform's curated clinical knowledge (admin-uploaded guidelines) via the
hybrid retrieval service.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.services.knowledge_retrieval_service import retrieve

from .registry import register_tool

logger = logging.getLogger(__name__)

_CATEGORY_QUERY_HINTS: Dict[str, str] = {
    "coping_strategies": "strategi coping menghadapi stres",
    "relaxation_techniques": "teknik relaksasi napas grounding",
    "emergency_contacts": "nomor darurat hotline krisis bunuh diri",
    "educational_content": "penjelasan edukasi kesehatan mental",
    "ugm_services": "layanan konseling kesehatan mental UGM",
}


@register_tool(
    name="get_mental_health_resources",
    description=(
        "Retrieve curated mental health resources from the platform knowledge "
        "base (guidelines, articles, techniques, services). Call when the user "
        "asks for coping strategies, psychoeducation (e.g. 'apa itu CBT'), "
        "relaksasi, layanan konseling UGM, atau bantuan darurat. Returns "
        "grounded passages with source titles."
    ),
    parameters={
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "enum": [
                    "coping_strategies",
                    "relaxation_techniques",
                    "emergency_contacts",
                    "educational_content",
                    "ugm_services",
                ],
                "description": "Category of resources to retrieve",
            },
            "topic": {
                "type": "string",
                "description": "Optional specific topic within category (e.g. 'breathing exercises', 'grounding techniques')",
            },
        },
        "required": ["category"],
    },
    category="knowledge",
    requires_db=True,
    requires_user_id=False,
)
async def get_mental_health_resources(
    db: AsyncSession,
    category: str = "educational_content",
    topic: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """Ground resource lookups in the retrieval service (RAG)."""
    query_parts = [topic] if topic else []
    query_parts.append(_CATEGORY_QUERY_HINTS.get(category, category.replace("_", " ")))
    query = " ".join(part for part in query_parts if part)

    try:
        chunks = await retrieve(db, query)
    except Exception as exc:
        logger.warning("Resource retrieval failed: %s", exc)
        chunks = []

    return {
        "success": True,
        "category": category,
        "query": query,
        "grounded": bool(chunks) and settings.rag_enabled,
        "total_resources": len(chunks),
        "resources": [
            {
                "title": chunk.title,
                "section": chunk.section,
                "content": chunk.content,
                "source": chunk.source,
                "relevance_score": chunk.score,
            }
            for chunk in chunks
        ],
    }
