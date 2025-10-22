# UGM-AICare · Project Single Source of Truth (Safety Agent Alignment)

## About This Document

This document is the canonical reference for architecture, roadmap, and operational standards across the Safety Agent refactor. It supersedes the legacy three-agent summary and keeps pace with the documentation clean-up tracked in `docs/DEPRECATED.md`.

**Document Version:** 4.0  
**Last Updated:** October 22, 2025  
**Repository:** UGM-AICare  
**Maintainer:** Giga Hidjrika Aura Adkhy  
**Major Update:** LangGraph StateGraph implementation complete for all Safety Agents

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

**LangGraph StateGraph Orchestration** (Implemented: October 2025)

The Safety Agent Suite is now implemented as a **LangGraph-orchestrated multi-agent system** with deterministic state machines, typed state management, and conditional routing. All four agents operate through compiled StateGraph workflows with real-time execution tracking.

**Orchestration Architecture:**
```
User Message → STA (Triage) → [Low/Moderate] → SCA (Coach) → END
                             → [High/Critical] → SDA (Escalate) → END
Analytics Queries → IA (Privacy-Preserving Aggregation) → END
```

**Core LangGraph Components:**
- **StateGraph**: Workflow orchestration with typed state (`SafetyAgentState`, `IAState` TypedDict)
- **Nodes**: Agent operations (e.g., `triage_node`, `generate_plan_node`, `create_case_node`)
- **Edges**: Conditional routing based on risk level, intent classification, and consent validation
- **Execution Tracking**: Real-time monitoring via `ExecutionStateTracker` with database persistence
- **Error Recovery**: Graceful error handling at node level with state preservation

### 🛡️ Safety Triage Agent (STA)

- **Scope:** Real-time message classification, risk scoring (Level 0-3), and escalation routing inside the user chat experience
- **Key Features:** PII redaction before assessment, crisis banner orchestration, consent-aware disclosures, feature-flagged crisis protocols, automated professional referral, audit logging
- **LangGraph Implementation:** 4-node workflow (`apply_redaction` → `classify_intent` → `assess_risk` → `route_to_agent`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/sta/sta_graph.py`, smoke tests passing)

### 💬 Support Coach Agent (SCA)

- **Scope:** CBT-informed personalized coaching, brief micro-interventions, and evidence-based therapeutic guidance
- **Key Features:** Empathetic dialogue, structured self-help modules (anxiety management, stress reduction), therapeutic exercise guidance, intervention plan generation, progress tracking
- **LangGraph Implementation:** 4-node workflow (`validate_intervention_need` → `classify_intervention_type` → `generate_plan` → `persist_plan`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/sca/sca_graph.py`)

### 🗂️ Service Desk Agent (SDA)

- **Scope:** Operational command center for clinical staff (case management, SLA tracking, follow-up workflows)
- **Key Features:** Case creation, escalation workflows, SLA calculation with breach prediction, clinical staff auto-assignment, interoperability hooks for campus systems
- **LangGraph Implementation:** 4-node workflow (`validate_escalation` → `create_case` → `calculate_sla` → `auto_assign`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/sda/sda_graph.py`)

### 🔍 Insights Agent (IA)

- **Scope:** Privacy-preserving analytics over anonymized events/messages with differential privacy guarantees
- **Key Features:** k-anonymity enforcement (k≥5), allow-listed queries (6 pre-approved analytics questions), differential privacy budget tracking (ε-δ), consent-aware dimensions, aggregate trend analysis, clinical approval checkpoints
- **LangGraph Implementation:** 4-node workflow (`ingest_query` → `validate_consent` → `apply_k_anonymity` → `execute_analytics`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/ia/ia_graph.py`, smoke tests passing)

**Master Orchestrator:** `backend/app/agents/orchestrator_graph.py` coordinates STA→SCA/SDA routing with conditional edges and subgraph invocation.

**API Endpoints:**
- `POST /api/v1/agents/graph/sta/execute` - Execute STA workflow only
- `POST /api/v1/agents/graph/orchestrator/execute` - Full orchestration (STA→SCA/SDA)
- `POST /api/v1/agents/graph/ia/execute` - Execute IA analytics workflow
- `GET /api/v1/agents/graph/*/health` - Health checks with feature listings

**Documentation:** See `docs/langgraph-phase5-complete.md` for complete implementation details, code samples, and architecture diagrams.

**Transitional Guidance:** Legacy n8n agent references are deprecated. All new development must use LangGraph StateGraph patterns. Reference `docs/DEPRECATED.md` for migration guidance.

---

## 3. Technical Architecture Snapshot

### Backend Platform (FastAPI + LangChain + LangGraph)

- **Target Structure:** `backend/app/agents/{sta,sca,sda,ia}/` packages with LangGraph StateGraph implementations
  - Each agent has: `*_graph.py` (StateGraph definition), `*_graph_service.py` (service wrapper), `service.py` (core logic)
  - Shared state schemas: `backend/app/agents/graph_state.py` (`SafetyAgentState`, `IAState` TypedDict)
  - Master orchestrator: `backend/app/agents/orchestrator_graph.py` (STA→SCA/SDA routing)
  - Execution tracking: `backend/app/agents/execution_tracker.py` (real-time monitoring with DB persistence)
- **Async-First:** All I/O (DB, LLM, external services) uses async functions with structured exception handling
- **LLM Provider:** Google Gemini 2.5 API as primary model for all agent reasoning
- **Orchestration:** LangGraph StateGraph with deterministic state machines, conditional edges, and node-level error recovery
- **RBAC:** New permission matrix to be codified in `core/rbac.py` (supersedes ad-hoc admin checks)
- **Observability:** Structured logging, execution tracking in `LangGraphExecution`/`NodeExecution`/`EdgeExecution` tables, real-time dashboard at `/admin/langgraph` (planned)

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

## 5. Implementation Status (October 2025)

| Track | Status | Highlights |
|-------|--------|------------|
| **Documentation** | ✅ Complete | Legacy guides stubbed; `DEPRECATED.md` published; LangGraph implementation documented in `docs/langgraph-phase5-complete.md` |
| **LangGraph Orchestration** | ✅ Complete | All 4 agents (STA/SCA/SDA/IA) implemented as StateGraph workflows with execution tracking; Master orchestrator operational |
| **Data Model** | ✅ Complete | `LangGraphExecution`, `NodeExecution`, `EdgeExecution` tables; deterministic hashing + redaction utilities operational |
| **Backend Agents** | ✅ Complete | STA/SCA/SDA/IA graph implementations with service wrappers; REST API endpoints live; Smoke tests passing (4/4) |
| **Frontend Refactor** | � In Progress | Legacy admin analytics still live; Service Desk & Insights dashboards not yet scaffolded |
| **Operational Playbooks** | 🟡 In Progress | Crisis escalation SOP drafted; LangGraph monitoring dashboard planned |

**Retired Components:** Legacy n8n agent orchestration fully deprecated. All agent coordination now via LangGraph StateGraph. Clinical analytics dashboards under `frontend/src/components/admin/analytics/` remain in repo for reference but are formally deprecated.

**Test Coverage:**
- ✅ STA smoke tests passing (`test_langgraph_smoke.py`)
- ✅ IA smoke tests passing (`test_langgraph_ia_smoke.py`)
- 🟡 Comprehensive unit tests with mocking deferred (smoke tests provide sufficient validation)

---

## 6. Roadmap & Milestones

**✅ Completed (October 2025):**

1. **LangGraph StateGraph Implementation**
   - All 4 agents (STA/SCA/SDA/IA) operational as compiled StateGraph workflows
   - Typed state management (`SafetyAgentState`, `IAState` TypedDict)
   - Conditional routing with risk-based agent selection
   - Real-time execution tracking with database persistence
   - REST API endpoints for all agents and master orchestrator
   - Smoke test validation (4/4 tests passing)

**🟡 In Progress:**

2. **Schema & Data Enhancement**
   - Privacy budget ledger for IA differential privacy tracking
   - Consent withdrawal workflows with redaction enforcement
   - Backfill legacy data with audit reports

3. **Frontend Alignment**
   - Replace legacy admin routes with Service Desk + Insights
   - Integrate LangGraph execution monitoring dashboard (`/admin/langgraph`)
   - Update navigation, RBAC gating, and localization bundles
   - Add CBT-informed response rendering in chat UI

**🔴 Planned:**

4. **Operational Maturity**
   - Comprehensive unit tests with mocking for all agent nodes
   - Performance benchmarks (execution time, node success rate, edge routing accuracy)
   - Production monitoring integration (Prometheus metrics, Sentry error tracking)
   - Crisis escalation SOP automation with real-time alerts

5. **Research Validation**
   - RQ2 evaluation: LangGraph orchestration reliability metrics
   - IA privacy safeguard validation (k-anonymity, differential privacy budgets)
   - Clinical efficacy study for SCA intervention plans
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
