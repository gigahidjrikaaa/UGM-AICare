# UGM-AICare · Project Single Source of Truth (Safety Agent Alignment)

## About This Document

This document is the canonical reference for architecture, roadmap, and operational standards across the Safety Agent refactor. It supersedes the legacy three-agent summary and keeps pace with the documentation clean-up tracked in `docs/DEPRECATED.md`.

**Document Version:** 3.0  
**Last Updated:** September 30, 2025  
**Repository:** UGM-AICare  
**Maintainer:** Giga Hidjrika Aura Adkhy  
**Major Update:** Safety Agent Suite alignment and documentation rationalisation

---

## 1. Mission and Problem Statement

### Title

"Transforming University Mental Health Support: An Agentic AI Framework for Proactive Intervention and Resource Management"

### The Challenge

University mental health services remain reactive, under-resourced, and data-constrained. Scaling compassionate support requires:

- **Early detection** and proactive intervention rather than crisis-only response
- **Coordinated automation** across clinical care, therapeutic coaching, and operational workflows
- **Institution-grade privacy**, consent management, and clinical audit controls

### Solution Goal

Deliver a Safety Agent Suite that combines high-sensitivity crisis detection with evidence-based CBT-informed coaching, clinical case management, and privacy-preserving aggregate analytics—all under explicit professional oversight and verifiable privacy guarantees.

---

## 2. Safety Agent Suite Overview

Legacy analytics/intervention/triage agents are formally retired. The Safety Agent refactor introduces four coordinated agents orchestrated with LangGraph:

### 🛡️ Safety Triage Agent (STA)

- **Scope:** Real-time message classification, risk scoring, and escalation routing inside the user chat experience
- **Key Features:** Crisis banner orchestration, consent-aware disclosures, feature-flagged crisis protocols, automated professional referral, audit logging
- **Status:** API scaffolding in progress (`backend/app/agents/sta/*`)

### � Support Coach Agent (SCA)

- **Scope:** CBT-informed personalized coaching, brief micro-interventions, and evidence-based therapeutic guidance
- **Key Features:** Empathetic dialogue, structured self-help modules (anxiety management, stress reduction), therapeutic exercise guidance, progress tracking
- **Status:** Core coaching pipeline implemented; CBT module library expansion in progress

### 🗂️ Service Desk Agent (SDA)

- **Scope:** Operational command center for clinical staff (case management, SLA tracking, follow-up workflows)
- **Key Features:** Case timelines, escalation workflows, SLA monitoring, clinical staff assignment, interoperability hooks for campus systems
- **Status:** Data model defined in `refactor_plan.md`; frontend routes to be moved under `admin/(protected)/service-desk`

### 🔍 Insights Agent (IA)

- **Scope:** Privacy-preserving analytics over anonymized events/messages with differential privacy guarantees
- **Key Features:** Differential privacy budget tracking (ε-δ), k-anonymity enforcement, consent-aware dimensions, aggregate trend analysis, clinical approval checkpoints
- **Status:** Alembic revision `introduce_sda_ia_schema_and_events_overhaul` drafted; query layer pending implementation

**Transitional Guidance:** Reference `docs/DEPRECATED.md` for the authoritative list of legacy documents and surfaces that are now historical. New development work must target STA/SCA/SDA/IA modules and alignment stories.

---

## 3. Technical Architecture Snapshot

### Backend Platform (FastAPI + LangChain)

- **Target Structure:** `backend/app/agents/{sta,sca,sda,ia}/` packages with shared utilities in `backend/app/core/{db,rbac,policy,events,redaction}.py`
- **Async-First:** All I/O (DB, LLM, external services) uses async functions with structured exception handling
- **LLM Provider:** Google Gemini 2.5 API as primary model for all agent reasoning
- **Orchestration:** LangGraph with stateful graph-based controller for agent coordination
- **RBAC:** New permission matrix to be codified in `core/rbac.py` (supersedes ad-hoc admin checks)
- **Observability:** Structured logging, trace IDs across redaction pipeline, and privacy budget events forwarded to monitoring stack

### Event-Centric Data Model

- **Primary Tables:** `events`, `messages`, `cases`, `resources`, `consents`, plus `users` refresh
- **Design Principles:**
  - Separation between raw user content (`messages`) and operational state (`cases`)
  - Deterministic hashing for user identifiers with differential privacy wrappers
  - Consent history recorded as append-only ledger with withdrawal workflows
- **Migration Plan:**
  1. Introduce new schema (revision scaffolded)
  2. Backfill via redaction-aware scripts in `backend/scripts/`
  3. Toggle STA/SCA features once parity checks pass

### Frontend Surfaces (Next.js 15 + Tailwind CSS 4)

- **Admin:** Service Desk (`/admin/(protected)/service-desk`) and Insights (`/admin/(protected)/insights`) will replace legacy analytics/intervention dashboards
- **User Chat:** Intent chips, CBT-informed responses, Consent banners, and Crisis alerts to be delivered through new components in `frontend/src/components/features/chat/`
- **Accessibility:** All new UI components must meet WCAG 2.1 AA and support keyboard navigation, ARIA labeling, and localization keys

### Automation & Integrations

- **LangGraph Orchestration:** All agent coordination and routing handled through LangGraph's stateful graph-based controller
- **Redis:** Session state, feature flags, and queue primitives for real-time triage alerts
- **Email/SMS Providers:** Pluggable connectors to be wrapped with consent checks before dispatch

---

## 4. Research & Clinical Governance

- **Methodology:** Design Science Research (DSR) framework with six iterative stages for prototype development and evaluation
- **Clinical Oversight:** Any automated recommendation requires explicit approval logging; Insights Agent dashboards must present uncertainty and evidence grading
- **Ethics & Privacy:**
  - Differential privacy (ε-δ budgets) and k-anonymity enforced at the Insights layer
  - Consent withdrawal honored by redaction policies and agent routing
  - No raw conversational content leaves secured storage; STA operates on redacted payloads
- **Success Criteria:** Crisis detection sensitivity/specificity (RQ1), orchestration reliability (RQ2), coaching quality per CBT rubric (RQ3), insights stability under privacy thresholds (RQ4)

---

## 5. Implementation Status (September 2025)

| Track | Status | Highlights |
|-------|--------|------------|
| **Documentation** | ✅ Active | Legacy guides stubbed; `DEPRECATED.md` published; root Single Source updated (this document) |
| **Data Model** | 🟡 In Progress | Alembic revision scaffolded; deterministic hashing + redaction utilities queued |
| **Backend Agents** | 🟡 In Progress | Package skeletons defined; STA router prototyping resumed; SCA CBT coaching pipeline active; RBAC rewrite pending |
| **Frontend Refactor** | 🔴 Not Started | Legacy admin analytics still live; Service Desk & Insights dashboards not yet scaffolded |
| **Operational Playbooks** | 🟡 In Progress | Crisis escalation SOP drafted; monitoring wiring TBD |

**Retired Components:** Clinical analytics dashboards under `frontend/src/components/admin/analytics/` remain in repo for reference but are formally deprecated. Remove usage after Service Desk MVP lands.

---

## 6. Roadmap & Milestones

1. **Schema & Backfill (High Priority)**
   - Finalise `events/messages/cases/consents` models and migrations
   - Build redaction + consent enforcement utilities
   - Backfill legacy data with audit reports

2. **Agent API Delivery**
   - STA risk classification endpoints with feature flags
   - SCA CBT-informed coaching service with therapeutic module library
   - SDA case management routes and SLA timers
   - IA analytical queries with privacy budget ledger

3. **Frontend Alignment**
   - Replace legacy admin routes with Service Desk + Insights
   - Integrate CBT-informed responses and Consent flows into chat
   - Update navigation, RBAC gating, and localization bundles

4. **Assurance & Monitoring**
   - Unit/integration test coverage for STA/SCA/SDA/IA
   - Observability benchmarks (alert latencies, SLA metrics)
   - Privacy compliance dashboards and runbooks

Target rollout sequence: **Database → Backend Agents → Frontend Surfaces → Operational Playbooks**.

---

## 7. Active Documentation Set

| Document | Purpose | Notes |
|----------|---------|-------|
| `docs/refactor_plan.md` | Implementation to-do list for Safety Agent suite | Source of truth for code migration steps |
| `docs/DEPRECATED.md` | Index of retired documentation | Update when new specs go live |
| `docs/single-source-of-truth.md` | Lightweight overview for onboarding | Should mirror high-level narrative here |
| `docs/mental-health-ai-guidelines.md` | Ethics, crisis playbooks, cultural context | Remains valid and must be referenced in STA flows |
| `docs/development-workflow.md` | Collaboration & workflow guidance | Update once Service Desk surfaces land |

**Removed/Stubs:** `ai-integration-guide.md`, `api-integration-reference.md`, `authentication-system-update.md`, `cbt-conversational-flows.md`, and other legacy guides now contain deprecation notices only. Do not resurrect them—extend the Safety Agent docs instead.

---

## 8. Engineering Guardrails

- **Security:** Never hardcode secrets; rely on env vars and vault integrations. Enforce parameterised queries through SQLAlchemy.
- **Error Handling:** Fail closed for crisis workflows (STA must default to human review when uncertain).
- **Testing:** Add pytest + Playwright coverage around new STA/SCA flows before activation flags are set to true.
- **Accessibility:** All Service Desk and chat enhancements must meet a11y standards; include localization keys for user-facing strings.
- **Logging & Privacy:** Mask PII in logs; leverage the redaction utilities before writing payloads.

---

## 9. Compliance Snapshot

- **Consent Ledger:** Every therapeutic intervention, notification, or analytics query must reference consent scope; withdrawal triggers purge workflows.
- **Audit Trails:** Maintain immutable logs for triage escalations, coaching interventions, and analytics queries (required for clinical governance and research ethics).
- **Human Oversight:** Automated decisions require professional acknowledgment; SDA UI will enforce clinical sign-off before closing cases.
- **Data Residency:** PostgreSQL + Redis deployments must honor institutional policies (documented in deployment runbooks).

---

## 10. Key Contacts & Next Steps

- **Product Direction:** Align roadmap changes through `refactor_plan.md`; raise issues for scope adjustments.
- **Documentation Updates:** Mirror significant changes in both this file and `docs/single-source-of-truth.md`.
- **Open Questions:**
  1. Finalize naming/terminology for SDA SLAs and reporting lines
  2. Expand CBT module library with additional evidence-based interventions
  3. Confirm monitoring stack (Datadog vs OpenTelemetry native)

When completing any new feature, update this document and `docs/DEPRECATED.md` to reflect the canonical state. This file is the single reference all contributors and automation agents must consult before shipping changes.

---

*This Safety Agent-aligned Single Source of Truth replaces previous analytics-centric summaries. All engineering, documentation, and operational work must comply with the structure and guardrails described above.*
