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

"Transforming University Mental Health Support: A Safety Agent Suite for Proactive Care, Human Oversight, and Privacy-First Analytics"

### The Challenge

University mental health services remain reactive, under-staffed, and data-poor. Scaling compassionate support requires:

- **Early warning** rather than crisis response
- **Coordinated automation** across clinical, operational, and outreach teams
- **Institution-grade privacy**, consent, and audit controls

### Solution Goal

Deliver a Safety Agent Suite that combines high-sensitivity crisis detection with curated outreach and institutional dashboards, all under explicit professional oversight and verifiable privacy guarantees.

---

## 2. Safety Agent Suite Overview

Legacy analytics/intervention/triage agents are formally retired. The Safety Agent refactor introduces four coordinated services:

### 🛡️ Safety Triage Agent (STA)

- **Scope:** Real-time message classification, risk scoring, and escalation routing inside the user chat experience
- **Key Features:** Crisis banner orchestration, consent-aware disclosures, feature flagged crisis protocols, human hand-off logging
- **Status:** API scaffolding in progress (`backend/app/agents/sta/*`)

### 📣 Safety Campaign Agent (SCA)

- **Scope:** Curated Action Cards, event-triggered outreach, and campaign analytics
- **Key Features:** Evidence-backed content library, consent-aware distribution, throttled delivery, audit trails
- **Status:** Content pipeline design drafted; Action Card components queued for implementation

### 🗂️ Safety Desk Agent (SDA)

- **Scope:** Operational command centre for clinical staff (case management, SLA tracking, follow-up workflows)
- **Key Features:** Case timelines, escalation ladders, SLA timers, interoperability hooks for campus systems
- **Status:** Data model defined in `refactor_plan.md`; frontend routes to be moved under `admin/(protected)/safety-desk`

### 🔍 Insights Agent (IA)

- **Scope:** Privacy-respecting analytics over anonymised events/messages, replacing the legacy “Analytics Agent” surface
- **Key Features:** Differential privacy budget tracking, consent-aware dimensions, redaction policies, clinical approval checkpoints
- **Status:** Alembic revision `introduce_sda_ia_schema_and_events_overhaul` drafted; query layer pending implementation

**Transitional Guidance:** Reference `docs/DEPRECATED.md` for the authoritative list of legacy documents and surfaces that are now historical. New development work must target STA/SCA/SDA/IA modules and alignment stories.

---

## 3. Technical Architecture Snapshot

### Backend Platform (FastAPI + LangChain)

- **Target Structure:** `backend/app/agents/{sta,sca,sda,ia}/` packages with shared utilities in `backend/app/core/{db,rbac,policy,events,redaction}.py`
- **Async-First:** All I/O (DB, LLM, external services) uses async functions with structured exception handling
- **LLM Providers:** Google Gemini (hosted) and local Gemma 3 pipelines via LangChain abstractions; prompt flows revalidated during STA roll-out
- **RBAC:** New permission matrix to be codified in `core/rbac.py` (supercedes ad-hoc admin checks)
- **Observability:** Structured logging, trace IDs across redaction pipeline, and privacy budget events forwarded to monitoring stack

### Event-Centric Data Model

- **Primary Tables:** `events`, `messages`, `cases`, `resources`, `consents`, plus `users` refresh
- **Design Principles:**
  - Separation between raw user content (`messages`) and operational state (`cases`)
  - Deterministic hashing for user identifiers with differential privacy wrappers
  - Consent history recorded as append-only ledger
- **Migration Plan:**
  1. Introduce new schema (revision scaffolded)
  2. Backfill via redaction-aware scripts in `backend/scripts/`
  3. Toggle STA/SCA features once parity checks pass

### Frontend Surfaces (Next.js 15 + Tailwind CSS 4)

- **Admin:** Safety Desk (`/admin/(protected)/safety-desk`) and Insights (`/admin/(protected)/insights`) will replace legacy analytics/intervention dashboards
- **User Chat:** Intent chips, Action Cards, Consent banners, and Crisis cues to be delivered through new components in `frontend/src/components/features/chat/`
- **Accessibility:** All new UI components must meet WCAG 2.1 AA and support keyboard navigation, ARIA labelling, and localisation keys

### Automation & Integrations

- **n8n:** Continues as orchestration layer but now triggers STA/SCA flows via the new agent routers
- **Redis:** Session state, feature flags, and queue primitives for real-time triage alerts
- **Email/SMS Providers:** Pluggable connectors to be wrapped with consent checks before dispatch

---

## 4. Research & Clinical Governance

- **Methodology:** Design Science Research (DSR) remains the evaluation framework; focus shifts to Safety Agent prototypes and human-in-the-loop validation
- **Clinical Oversight:** Any automated recommendation requires explicit approval logging; Insights Agent dashboards must present uncertainty and evidence grading
- **Ethics & Privacy:**
  - Differential privacy (ε-δ budgets) enforced at the Insights layer
  - Consent withdrawal honoured by redaction policies and agent routing
  - No raw conversational content leaves secured storage; STA operates on redacted payloads
- **Success Criteria:** Crisis detection precision/recall, campaign engagement with consent, SLA adherence for follow-ups, and zero privacy violations

---

## 5. Implementation Status (September 2025)

| Track | Status | Highlights |
|-------|--------|------------|
| **Documentation** | ✅ Active | Legacy guides stubbed; `DEPRECATED.md` published; root Single Source updated (this document) |
| **Data Model** | 🟡 In Progress | Alembic revision scaffolded; deterministic hashing + redaction utilities queued |
| **Backend Agents** | 🟡 In Progress | Package skeletons defined; STA router prototyping resumed; RBAC rewrite pending |
| **Frontend Refactor** | 🔴 Not Started | Legacy admin analytics still live; Safety Desk & Insights dashboards not yet scaffolded |
| **Operational Playbooks** | 🟡 In Progress | Crisis escalation SOP drafted; monitoring wiring TBD |

**Retired Components:** Clinical analytics dashboards under `frontend/src/components/admin/analytics/` remain in repo for reference but are formally deprecated. Remove usage after Safety Desk MVP lands.

---

## 6. Roadmap & Milestones

1. **Schema & Backfill (High Priority)**
   - Finalise `events/messages/cases/consents` models and migrations
   - Build redaction + consent enforcement utilities
   - Backfill legacy data with audit reports

2. **Agent API Delivery**
   - STA risk classification endpoints with feature flags
   - SCA campaign orchestration service with Action Card registry
   - SDA case management routes and SLA timers
   - IA analytical queries with privacy budget ledger

3. **Frontend Alignment**
   - Replace legacy admin routes with Safety Desk + Insights
   - Integrate Action Cards and Consent flows into chat
   - Update navigation, RBAC gating, and localisation bundles

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
| `docs/development-workflow.md` | Collaboration & workflow guidance | Update once Safety Desk surfaces land |

**Removed/Stubs:** `ai-integration-guide.md`, `api-integration-reference.md`, `authentication-system-update.md`, `cbt-conversational-flows.md`, and other legacy guides now contain deprecation notices only. Do not resurrect them—extend the Safety Agent docs instead.

---

## 8. Engineering Guardrails

- **Security:** Never hardcode secrets; rely on env vars and vault integrations. Enforce parameterised queries through SQLAlchemy.
- **Error Handling:** Fail closed for crisis workflows (STA must default to human review when uncertain).
- **Testing:** Add pytest + Playwright coverage around new STA/SCA flows before activation flags are set to true.
- **Accessibility:** All Safety Desk and chat enhancements must meet a11y standards; include localisation keys for user-facing strings.
- **Logging & Privacy:** Mask PII in logs; leverage the redaction utilities before writing payloads.

---

## 9. Compliance Snapshot

- **Consent Ledger:** Every Action Card, notification, or analytics query must reference consent scope; withdrawal triggers purge workflows.
- **Audit Trails:** Maintain immutable logs for triage escalations, campaign dispatches, and analytics queries (required for clinical governance).
- **Human Oversight:** Automated decisions require professional acknowledgement; SDA UI will enforce sign-off before closing cases.
- **Data Residency:** PostgreSQL + Redis deployments must honour institutional policies (documented in deployment runbooks).

---

## 10. Key Contacts & Next Steps

- **Product Direction:** Align roadmap changes through `refactor_plan.md`; raise issues for scope adjustments.
- **Documentation Updates:** Mirror significant changes in both this file and `docs/single-source-of-truth.md`.
- **Open Questions:**
  1. Finalise naming/terminology for SDA SLAs and reporting lines
  2. Choose primary delivery channel for SCA (email vs in-app vs SMS)
  3. Confirm monitoring stack (Datadog vs OpenTelemetry native)

When completing any new feature, update this document and `docs/DEPRECATED.md` to reflect the canonical state. This file is the single reference all contributors and automation agents must consult before shipping changes.

---

*This Safety Agent-aligned Single Source of Truth replaces previous analytics-centric summaries. All engineering, documentation, and operational work must comply with the structure and guardrails described above.*
