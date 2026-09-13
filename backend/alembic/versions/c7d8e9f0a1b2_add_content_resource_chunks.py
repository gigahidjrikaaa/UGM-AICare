"""Add content_resource_chunks (pgvector) for RAG; merge existing heads.

Revision ID: add_content_resource_chunks
Revises: (merge of add_ai_memory, add_events_trace_id,
          add_llm_req_tracking, b2c3d4e5f6a7)
Create Date: 2026-09-09

This migration does two things:

1. MERGES the four previously-divergent Alembic heads into a single linear
   history, so plain ``alembic upgrade head`` works again (the repo shipped
   four parallel heads, which makes ``upgrade head`` fail with
   "Multiple head revisions").

2. Creates the ``content_resource_chunks`` table backed by the pgvector
   extension for retrieval-augmented grounding of TCA/Aika responses:
   - ``embedding vector(768)`` for ``text-embedding-004`` embeddings
   - HNSW index with cosine ops for approximate nearest-neighbour search
   - a ``tsv`` generated column (indonesian config) for BM25-style
     full-text scoring fused with the dense score at query time

The migration is idempotent-safe: the extension and table use IF NOT EXISTS.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_content_resource_chunks"
down_revision = (
    "add_ai_memory",
    "add_events_trace_id",
    "add_llm_req_tracking",
    "b2c3d4e5f6a7",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    # pgvector: required for the embedding column. NeonDB/Supabase support it.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "content_resource_chunks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "resource_id",
            sa.Integer(),
            sa.ForeignKey("content_resources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("section", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "chunk_metadata",
            sa.JSON(),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("resource_id", "chunk_index", name="uq_crc_resource_chunk"),
    )
    op.create_index(
        "ix_content_resource_chunks_resource",
        "content_resource_chunks",
        ["resource_id"],
    )

    # Vector column + HNSW index (raw SQL: Alembic has no native vector type).
    op.execute(
        "ALTER TABLE content_resource_chunks "
        "ADD COLUMN IF NOT EXISTS embedding vector(768)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_crc_embedding_hnsw "
        "ON content_resource_chunks USING hnsw (embedding vector_cosine_ops)"
    )
    # Indonesian full-text column fused with dense score at retrieval time.
    op.execute(
        "ALTER TABLE content_resource_chunks "
        "ADD COLUMN IF NOT EXISTS tsv tsvector "
        "GENERATED ALWAYS AS (to_tsvector('indonesian', coalesce(content, ''))) STORED"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_crc_tsv "
        "ON content_resource_chunks USING gin (tsv)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_crc_tsv")
    op.execute("DROP INDEX IF EXISTS ix_crc_embedding_hnsw")
    op.drop_index("ix_content_resource_chunks_resource", table_name="content_resource_chunks")
    op.drop_table("content_resource_chunks")
