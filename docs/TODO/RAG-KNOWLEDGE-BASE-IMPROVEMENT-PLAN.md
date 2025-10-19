# RAG Knowledge Base Improvement Plan

Last reviewed: 2025-10-18

## 1. Current Implementation Snapshot

- **Admin UI (Next.js)**
  - Presents a CRUD table (`ContentResourcesTable.tsx`) with filters, sorting, and status badges.
  - Supports manual entry via form (`ContentResourceForm.tsx`) for three types: `text`, `url`, `pdf`.
  - Displays extracted text or embeds raw PDF via `/api/v1/admin/content-resources/{id}/file`.
  - Provides basic statistics (counts by type/status) and manual delete action.
- **Backend API (FastAPI)**
  - Endpoints in `backend/app/routes/admin/content_resources.py` for list, get, create, update, delete, fetch file, and fetch supported types.
  - Ingestion pipeline (`content_resource_service.py`) handles:
    - Text: accepts provided body, stores directly in Postgres.
    - URL: fetches HTML with `httpx`, strips scripts/styles using BeautifulSoup, stores normalized text in Postgres and raw HTML in MinIO.
    - PDF: reads binary, extracts text via `PyPDF2`, uploads original binary to MinIO.
  - Database model (`ContentResource`) stores title, description, tags (JSON), minimal metadata JSON, storage backend pointers, embedding status fields, and chunk count (currently always `0`).
  - Background job hook `enqueue_embedding_job` is a stub (logs only).
- **AI Service (ai/src)**
  - Contains a Pinecone-backed `VectorDBService` and `DataLoader` that read `ContentResource` rows marked `embedding_status == 'succeeded'`.
  - No integration from the admin-facing ingestion to the AI service; embeddings never produced because background job is unimplemented.
- **Storage & Secrets**
  - MinIO credentials pulled from environment variables; no secret management per resource.
  - No connectors beyond direct HTTP fetch or manual upload.
- **Observability & Governance**
  - Logging limited to info-level statements; no dashboards, alerts, or evaluation harnesses.

## 2. Requirement Coverage & Gaps

Each subsection mirrors the requested capability list. “Implemented” captures shipped behavior; “Missing” highlights gaps or required enhancements.

### 1) Source Onboarding

- **Implemented:** Manual text entry; single URL fetch; PDF upload stored in MinIO.
- **Missing:** Bulk uploads; sitemap/domain crawling; Drive/Notion/Git/DB/API connectors; crawl configuration (depth, rate limiting, robots handling, include/exclude patterns); per-source secrets vault linkage (tokens stored outside DB).

### 2) Normalize & Preview

- **Implemented:** Basic text extraction for URL/PDF; single-pane content view in modal.
- **Missing:** Format converters for DOCX, PPTX, XLSX, images (OCR), audio/video (ASR); HTML/Markdown conversion; side-by-side “raw vs normalized” preview; toggles for reading order, table extraction, boilerplate removal.

### 3) Chunking & Anchors

- **Implemented:** `chunk_count` column reserved; `VectorDBService.TextChunker` utility (unused by pipeline).
- **Missing:** Strategy selection UI/logic; per-type chunking strategies (DOM, tables, code, transcripts, images); stable anchor generation; live chunk preview with breadcrumbs.

### 4) Metadata & Taxonomy

- **Implemented:** Fields for title, description, source, tags.
- **Missing:** Author, version, language, publication dates, sensitivity level, TTL, custom taxonomy enforcement, auto-entity extraction, manual curation workflows.

### 5) Safety & Compliance

- **Implemented:** None beyond general admin access control.
- **Missing:** PII detection/redaction preview; policy tagging; license/compliance validation; gating ingestion/indexing on consent checks.

### 6) Quality Controls

- **Implemented:** None.
- **Missing:** Near-duplicate detection / canonicalization; broken link checks; caption detection; linting rules for chunk length, table schema presence, etc.

### 7) Versioning & Rollback

- **Implemented:** None (single-row overwrite on update).
- **Missing:** Version history, lineage tracking, diff viewer, targeted rollback, selective re-embedding.

### 8) Indexing Controls

- **Implemented:** Placeholder `embedding_status`, `chunk_count`, `storage_backend`; Pinecone service exists but disconnected.
- **Missing:** Multi-index routing (prose/tables/code/media); embedding model selection; reranker toggles; blue/green index builds with atomic swap/canary.

### 9) Schedules & Refresh

- **Implemented:** None.
- **Missing:** Source-level recrawl cadence, invalidation rules (ETag/Last-Modified), drift detection & re-embedding triggers, scheduler integration.

### 10) Synthetic Assets

- **Implemented:** None.
- **Missing:** Automated summaries, Q&A generation, approval queues, storage strategy for synthetic documents linked to evidence.

### 11) Access Control

- **Implemented:** Global admin-only management.
- **Missing:** Per-source/per-document ACLs (org/team/user/role); redaction-on-read policies; integration with role-based policy engine.

### 12) Observability

- **Implemented:** Basic count statistics in UI; backend logging.
- **Missing:** Index health metrics, latency & recall dashboards, zero-hit tracking, Slack/Email alerts for failures or drift.

### 13) Evaluation & A/B Testing

- **Implemented:** None.
- **Missing:** Gold QA upload; hit@k, faithfulness, coverage metrics; experiment harness for embeddings/rerankers/chunkers; promotion workflows.

### 14) Export & Portability

- **Implemented:** None.
- **Missing:** Snapshot/export of normalized corpus, embeddings, metadata, anchors; provenance packs for audit.

### Cross-Cutting Components Beyond “Input + Storage”

- **Implemented:** Minimal ingestion service; MinIO storage helper.
- **Missing:** Ingestion orchestrator (queues, workers, retries); normalization micro-services; policy engine; feature/metadata store; multi-index vector infrastructure; reranker service; intent router; index manager; evaluation runner; scheduler; observability stack; secrets manager; audit/lineage system; retrieval cache.

### Minimal Viable (Week-One) Checklist

- **Current Coverage:** Partial (text upload, single URL crawl, PDF upload).
- **Missing Elements:** Drive/Notion connectors; normalise→preview→chunk workflow; metadata/ACL management; functioning vector index with blue/green deployment; PII redaction toggle; evaluation upload & latency chart; job retry logging.

### Data Model Alignment vs Proposal

- **Existing:** Single `content_resources` table with coarse metadata.
- **Missing:** Separate tables for `sources`, `documents`, `artifacts`, `chunks`, `embeddings`, `metadata`, `acl`, `eval_*`, `audit_logs` per recommended schema.

## 3. Comprehensive Implementation Plan (LLM-Friendly)

The plan is structured in phases so it can be consumed by humans and orchestration agents alike. Each phase lists objectives, key deliverables, suggested tech stack, and integration notes.

### Phase 0 – Baseline Hardening (Weeks 1–2)

- **Objectives:** Stabilize current ingestion, unblock embeddings, and capture essential metadata.
- **Deliverables:**
  - Implement background worker (e.g., Celery/RQ/Arq) for `enqueue_embedding_job`; wire to `ai/src/service/vector_db_service.py` for actual chunking + Pinecone upsert.
  - Expand `ContentResource` with author, language, published_at, version fields; migrate existing rows.
  - Store ingestion logs & errors in dedicated table; surface per-resource status in UI.
  - Add minimal `sources` table to distinguish manual uploads vs URL vs future connectors.
  - Expose single-vector index status (doc count, last embed time) on admin dashboard.
- **Integration Notes:** Use FastAPI background tasks for enqueue only; actual processing in worker to avoid blocking requests. Ensure Pinecone API keys stored via environment variables / secret manager.

### Phase 1 – Minimal Viable RAG Feature Set (Weeks 3–6)

- **Objectives:** Meet the “week-one” checklist provided.
- **Deliverables:**
  1. **Connectors:** Build Drive and Notion connectors leveraging existing OAuth flows; store connector configs (tokens, scopes) in secret store (e.g., Vault, Azure Key Vault).
  2. **Normalization:** Introduce pluggable converters (e.g., `unstructured`, `textract`, `pytesseract`, `whisper`) behind async tasks; persist raw vs normalized artifacts.
  3. **Preview UI:** Provide dual-pane (raw/normalized) viewer with toggles for boilerplate removal and table detection using heuristics.
  4. **Chunking:** Surface strategy selector per resource; apply heading-based chunking for text/HTML and table-row strategy for tabular data. Render chunk preview and breadcrumb trail.
  5. **Metadata & ACLs:** Implement taxonomy configuration with required fields; integrate RBAC to define per-resource ACLs; support sensitivity tags.
  6. **Index Lifecycle:** Adopt blue/green pattern with Pinecone namespaces; enable re-embed diffs by comparing hash of normalized text; track index version per deployment.
  7. **PII Toggle & Eval:** Add PII redaction module (e.g., Presidio) with preview; allow upload of evaluation CSVs (question, answer, expected chunk IDs) and display hit@k + latency chart.
- **Integration Notes:** Introduce `sources`, `documents`, `artifacts`, `chunks`, `embeddings` tables; maintain ORM relationships. Utilize `langchain.text_splitter` or custom chunkers for flexible strategies.

### Phase 2 – Advanced Ingestion & Compliance (Weeks 7–12)

- **Objectives:** Address safety, quality, and scheduling pillars.
- **Deliverables:**
  - **Policy Engine:** Build pipeline that evaluates license, consent, and PII status before indexing; integrate with gating logic.
  - **Quality Gates:** Apply simhash for duplicate detection; broken link crawler; lint checks (min/max chunk length, table schema presence).
  - **Versioning:** Create `document_versions` table; capture diff metadata; allow rollback + selective re-embedding.
  - **Scheduling:** Implement scheduler (e.g., APScheduler, Celery beat, or n8n) for recrawl cadence, invalidation via ETag/Last-Modified, drift detection thresholds.
  - **Secrets Vault:** Integrate with HashiCorp Vault or cloud equivalent; store connector tokens, API keys per source; rotate secrets automatically.
- **Integration Notes:** Extend UI to display policy failures and allow overrides via approval workflow. Track lineage and event logs for audit compliance.

### Phase 3 – Multi-Index Retrieval & Observability (Weeks 13–18)

- **Objectives:** Mature retrieval stack and monitoring.
- **Deliverables:**
  - **Index Manager:** Manage multiple indices (prose, tables, code, transcripts, images, metadata). Support per-index embedding model selection and dimension configuration.
  - **Reranker Service:** Deploy cross-encoder reranker (e.g., Cohere Rerank, bge-reranker) with toggle; integrate with router to choose retrieval path.
  - **Observability:** Instrument ingestion and query pipelines with OpenTelemetry; build dashboards (Grafana/PowerBI) for index health, latency, recall, zero-hit analysis; configure Slack/Email alerts.
  - **Router:** Implement query intent classification to route between indices and tools.
  - **Retrieval Cache:** Store evidence packs per query for low-latency replays.
- **Integration Notes:** Adopt feature store (e.g., Postgres view or dedicated service) to hold chunk metadata to drive dashboards. Ensure atomic blue/green swaps with monitoring gates.

### Phase 4 – Evaluation, Synthetic Assets, and Portability (Weeks 19–24)

- **Objectives:** Close loop on evaluation, synthetic generation, and export.
- **Deliverables:**
  - **Evaluation Harness:** Build offline evaluator to run gold QA sets, track metrics (hit@k, MRR, faithfulness, answer coverage). Support A/B experiments for embeddings/chunkers/rerankers with statistical significance reporting.
  - **Synthetic Assets:** Generate section summaries and Q&A pairs from embeddings pipeline; build manual approval queue; link synthetic docs to source anchors.
  - **Access Control Enhancements:** Add redaction-on-read policies; integrate with SSO groups for per-team access.
  - **Export/Provenance:** Snapshot normalized corpus, embeddings, metadata, anchors; provide CLI/API to export zipped packages with provenance metadata (who/when/how indexed).
  - **Audit Trail:** Capture actions in `audit_logs` with before/after payloads for compliance.
- **Integration Notes:** Consider integrating with external evaluation tools (LangSmith, DeepEval) if available. Ensure synthetic assets tagged to avoid leakage into compliance-critical corpora.

### Ongoing Operational Playbooks

- **Monitoring:** Daily check of ingestion queue, error rate thresholds, drift alerts.
- **Secret Rotation:** Quarterly rotation for connector tokens managed via vault.
- **Index Hygiene:** Regular prune of stale versions, enforce TTL policies.
- **Documentation:** Maintain architectural decisions logs (`docs/architecture-decisions/`), SOPs for rollback, and RAG best-practices runbooks.

## 4. Recommended Technology & Tooling

| Capability | Suggested Tooling | Notes |
|------------|-------------------|-------|
| Connectors | Airbyte, LangChain connectors, custom OAuth apps | Store credentials in Vault/Key Vault; use webhooks for refresh. |
| Normalization | `unstructured`, Apache Tika, `pytesseract`, OpenAI Whisper | Abstract behind async tasks so formats can be added incrementally. |
| Chunking | Custom strategy registry + `langchain` splitters | Persist anchor metadata (page, row, timestamp) in `chunks` table. |
| PII/Compliance | Microsoft Presidio, AWS Comprehend, custom regex taxonomy | Surface redaction preview UI with diff highlighting. |
| Scheduling | n8n (already in stack), Celery beat, or Temporal | Align with existing orchestration preference. |
| Vector Index | Pinecone (existing), optional pgvector for metadata | Namespaces per index type; add metadata filters for ACLs and sensitivity. |
| Reranking | Cohere Rerank, OpenAI `text-embedding-3-large` + cross-encoder, bge-reranker | Provide toggle & experimentation harness. |
| Observability | OpenTelemetry, Prometheus, Grafana, Sentry | Instrument ingestion workers and query paths. |
| Evaluation | LangSmith, DeepEval, custom FastAPI endpoints | Persist runs in `eval_runs`/`eval_results`. |
| Secrets | HashiCorp Vault, Azure Key Vault | Provide UI to select secret reference instead of raw tokens. |

## 5. Data Model Roadmap

Implement the proposed schema in stages to avoid downtime:

1. **Stage A (Phase 0):** Add `sources` table (id, type, config, owner_id, schedule, status). Migrate existing resources to default source entries.
2. **Stage B (Phase 1):** Introduce `documents`, `artifacts`, `chunks`, `embeddings` with references to `sources` and `content_resources`. Backfill normalized/text artifacts.
3. **Stage C (Phase 2+):** Layer `metadata` key-value table, `acl` table, `audit_logs`, `eval_sets`, `eval_runs`, `eval_results`.
4. **Stage D (Phase 3+):** Create `index_versions` for blue/green tracking; maintain relationships to embeddings and artifacts.

Ensure Alembic migrations are idempotent and include data backfill scripts (place under `backend/scripts/`).

## 6. Next Steps Checklist

1. Stand up asynchronous worker infrastructure; wire `enqueue_embedding_job` to Pinecone pipeline.
2. Draft ERD covering full data model; socialize with stakeholders for sign-off.
3. Define connector priority (e.g., Google Drive, Notion) and credential management approach.
4. Prototype normalization + preview (Markdown conversion, dual-pane UI) for existing resource types.
5. Plan phased rollout with monitoring (feature flags, incremental migrations).

---
_Prepared by GitHub Copilot (GPT-5-Codex) to guide the UGM-AICare knowledge base RAG modernization._
