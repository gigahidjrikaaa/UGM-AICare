# UGM-AICare Backend

FastAPI service that powers the Safety Agent Suite behind UGM-AICare. The backend orchestrates crisis detection, CBT-informed coaching, clinical case management, and privacy-preserving analytics for university mental health support. Google Gemini 2.5 API provides empathetic conversations and evidence-based interventions through LangGraph-orchestrated agents.

---

## Safety Agent Suite

**NEW: Unified Aika Orchestrator with Direct LangGraph Invocation** (November 2025)

The backend implements an **agentic architecture** following LangGraph best practices with Aika as the first decision node.

### 🤖 Agentic Architecture Principles

**CRITICAL**: We use **direct graph invocation**, NOT service layer patterns.

✅ **Direct Invocation**: Graphs invoked via `.ainvoke()` or `.astream()`  
✅ **LangGraph Checkpointing**: Built-in conversation memory  
✅ **Aika as First Node**: Intelligence and personality at entry  
✅ **Conditional Routing**: Agents invoked only when needed

### 🎯 Orchestration Flow

```
User Message → Aika Decision Node → [needs_agents?]
                                     ↓               ↓
                                [YES: STA]      [NO: Direct Response (~1.2s)]
                                     ↓
                                [severity check]
                                 ↓    ↓    ↓
                               SDA  SCA  Synthesize → END
```

**Key Innovation**: Aika decides if specialized agents are needed:
- **Casual chat** ("hi", "how are you?") → Direct response (~1.2s)
- **Emotional distress** → STA → SCA (intervention plan)
- **Crisis signals** → STA → SDA (case creation)

| Agent | Scope | Highlights | Status |
|-------|-------|------------|--------|
| 🤖 **Aika Meta-Agent** | Intelligent decision node | Intent classification, conditional routing, direct responses, conversation memory | ✅ **Complete** |
| 🛡️ **Safety Triage Agent (STA)** | Real-time risk scoring | Crisis detection (Level 0-3), PII redaction, risk assessment | ✅ **Complete** |
| 💬 **Support Coach Agent (SCA)** | CBT-informed coaching | Intervention plans, therapeutic exercises, progress tracking | ✅ **Complete** |
| 🗂️ **Service Desk Agent (SDA)** | Clinical case management | Case creation, SLA tracking, auto-assignment | ✅ **Complete** |
| 🔍 **Insights Agent (IA)** | Privacy-preserving analytics | k-anonymity (k≥5), differential privacy | ✅ **Complete** |

**Usage Example (Agentic Pattern):**

```python
from langgraph.checkpoint.memory import MemorySaver
from app.agents.aika_orchestrator_graph import create_aika_agent_with_checkpointing

# Create agent with conversation memory
memory = MemorySaver()
aika_agent = create_aika_agent_with_checkpointing(db, checkpointer=memory)

# Invoke directly (no wrapper)
result = await aika_agent.ainvoke(
    {
        "user_id": user.id,
        "user_role": "user",
        "message": "I'm feeling stressed",
        "conversation_history": history,
    },
    config={"configurable": {"thread_id": f"user_{user.id}"}}
)

print(result["final_response"])  # Synthesized response
print(result["response_source"])  # "aika_direct" or "agents"
```

**LangGraph Components:**
- **StateGraph**: Typed state (`AikaOrchestratorState`, `SafetyAgentState`, `IAState`)
- **Nodes**: `aika_decision_node`, `triage_node`, `generate_plan_node`, etc.
- **Edges**: Conditional routing on `needs_agents`, risk level, intent
- **Checkpointing**: Native conversation memory (MemorySaver, AsyncSqliteSaver)
- **Execution Tracking**: Real-time monitoring via `ExecutionStateTracker`

Refer to `AIKA_META_AGENT_ARCHITECTURE.md`, `PROJECT_SINGLE_SOURCE_OF_TRUTH.md`, and `docs/langgraph-phase5-complete.md`.

---

## Core Capabilities

- **Safety-first chat** with Gemini 2.5 API responses, real-time risk monitoring, and STA crisis detection
- **CBT-informed coaching** via SCA with evidence-based therapeutic interventions and progress tracking
- **User & consent management** via JWT-secured APIs and append-only consent ledgers
- **Clinical case management** with SDA scaffolding for case oversight and SLA enforcement
- **Privacy-preserving insights** with IA differential privacy queries and audit-ready reporting
- **Observability hooks** for structured logging, monitoring, and privacy budget events

---

## Architecture & Key Packages

```bash
backend/
├── app/
│   ├── agents/
│   │   ├── sta/            # Safety Triage Agent (crisis detection)
│   │   │   ├── sta_graph.py           # LangGraph StateGraph definition
│   │   │   ├── sta_graph_service.py   # Service wrapper with execution tracking
│   │   │   └── service.py             # Core triage logic
│   │   ├── sca/            # Support Coach Agent (CBT coaching)
│   │   │   ├── sca_graph.py           # LangGraph StateGraph definition
│   │   │   └── service.py             # Intervention plan generation
│   │   ├── sda/            # Service Desk Agent (case management)
│   │   │   ├── sda_graph.py           # LangGraph StateGraph definition
│   │   │   └── service.py             # Case creation and SLA tracking
│   │   ├── ia/             # Insights Agent (privacy-preserving analytics)
│   │   │   ├── ia_graph.py            # LangGraph StateGraph definition
│   │   │   ├── ia_graph_service.py    # Service wrapper
│   │   │   └── service.py             # Analytics query execution
│   │   ├── graph_state.py             # Shared TypedDict state schemas
│   │   ├── orchestrator_graph.py      # Master orchestrator (STA→SCA/SDA routing)
│   │   ├── orchestrator_graph_service.py  # Orchestrator service wrapper
│   │   └── execution_tracker.py       # Real-time execution monitoring
│   ├── core/
│   │   ├── llm.py          # Gemini 2.5 API provider wired directly via LangGraph
│   │   ├── memory.py       # Conversation memory and LangGraph orchestration
│   │   └── policy.py       # Redaction + consent policy helpers (in progress)
│   ├── database/           # Async SQLAlchemy session and migrations helpers
│   ├── routes/             # FastAPI routers (chat, users, safety endpoints)
│   ├── schemas/            # Pydantic models for requests/responses
│   ├── services/           # Domain services (email, campaign, analytics)
│   ├── middleware/         # CORS, logging, auth guards
│   ├── utils/              # Env checks, feature flags, helper utilities
│   └── main.py             # FastAPI application entry point
├── alembic/                # Migration scripts and env configuration
├── logs/                   # Application logs (excluded from VCS)
├── scripts/                # Operational scripts (redaction, backfill, etc.)
├── tests/                  # Pytest suites (async + unit tests)
├── requirements.txt        # Python dependencies
└── .env                    # Local-only environment file (not committed)
```

---

## Tech Stack & Integrations

- **Runtime:** Python 3.11+ with FastAPI, asynchronous SQLAlchemy, and LangGraph
- **Data Layer:** PostgreSQL, Redis (session state + feature flags), deterministic hashing for privacy
- **LLM Providers:** Google Gemini (hosted) and optional Gemma 3 runtime wired through `core/llm.py`
- **Authentication & Sessions:** JWT validation, NextAuth sync endpoints, Redis for sessions
- **Messaging & Tasks:** Redis queues, APScheduler for background tasks, email/SMS connectors
- **Feature Flags & Config:** Runtime toggles for STA/SCA/SDA/IA activation and environment-driven configs
- **Observability:** Structured logging (JSON), Prometheus instrumentation, optional Sentry integration
- **Security:** JWT auth, parameterised queries, configurable CORS, consent & redaction guardrails

---

## Prerequisites

- Python 3.11 or later
- PostgreSQL 13+
- Redis 6+ (recommended for production; local dev can fall back to in-memory cache)
- (Optional) Local Gemma 3 text-generation service reachable over HTTP

---

## Environment Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/gigahidjrikaaa/UGM-AICare.git
   cd UGM-AICare/backend
   ```

2. **Create an isolated environment** (recommended path: `.venv` in repo root)

   ```bash
   python -m venv .venv
   # Windows (PowerShell)
   .venv\Scripts\Activate.ps1
   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Provision environment variables**
   - Copy `env.example` (root) or craft a dedicated `backend/.env`.
   - Populate the following minimum set (see `app/utils/env_check.py` for the full list):

     | Category | Key | Notes |
     |----------|-----|-------|
       | Database | `DATABASE_URL` | Use async URL (`postgresql+asyncpg://...`). For managed Postgres (e.g., NeonDB), include `?sslmode=require` or set `DB_SSL=true`. |
       | Redis | `REDIS_URL` (preferred) or `REDIS_HOST`, `REDIS_PORT` | Use `rediss://` if your provider requires TLS. Include `REDIS_USERNAME`/`REDIS_PASSWORD` only if needed. |
     | Auth | `JWT_SECRET_KEY`, `INTERNAL_API_KEY` | Keep secrets out of version control |
     | App URLs | `ALLOWED_ORIGINS`, `FRONTEND_URL`, `BACKEND_URL` | Comma-separated origins for CORS |
     | Email | `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_SMTP_SERVER`, `EMAIL_SMTP_PORT` | Needed for outreach + crisis alerts |

   | LLM | `GOOGLE_GENAI_API_KEY` | Required for Gemini access; update the Gemma service URL in `app/core/llm.py` if you host a local runtime |
     | Blockchain (optional) | `EDU_TESTNET_RPC_URL`, `NFT_CONTRACT_ADDRESS`, `BACKEND_MINTER_PRIVATE_KEY` | Required only if on-chain rewards are enabled |
     | Social (optional) | `TWITTER_*` keys | Needed for campaign connectors |
     | Runtime | `APP_ENV`, `PORT` | `APP_ENV=development` for local work |

   - Never commit populated `.env` files; use `scripts/reset_db.py` and `app/utils/env_check.py` to validate configuration locally.

5. **Prepare the database schema**

   ```bash
   alembic upgrade head
   ```

6. **(Optional) Seed sample data**

   ```bash
   python reset_db.py --with-sample-data
   ```

---

## Running the Service

```bash
uvicorn app.main:app --reload
```

- API root: <http://127.0.0.1:8000/>
- Interactive docs (Swagger): <http://127.0.0.1:8000/docs>
- Redoc reference: <http://127.0.0.1:8000/redoc>

During development, run `python -m app.utils.env_check` (or import `check_env()`) to confirm required variables before launching.

---

## Quality Gates

- **Unit & async tests**

  ```bash
  pytest
  ```

- **Static analysis (optional but recommended)**

  ```bash
  black app tests
  isort app tests
  flake8 app tests
  ```

Ensure tests cover new Safety Agent flows (STA/SCA/SDA/IA) before enabling related feature flags.

---

## Operational Notes

- **Migrations:** Alembic revisions live inside `alembic/versions/`. Follow the schema rollout sequence defined in `PROJECT_SINGLE_SOURCE_OF_TRUTH.md` (Database → Agents → Frontend → Playbooks).
- **Feature Flags:** STA feature rollout is guarded via configuration; keep defaults off until clinical review signs off.
- **LangGraph Orchestration:** All agent coordination handled through LangGraph's stateful graph-based controller. Agent routing specifications defined in `app/agents/safety_graph_specs.py`.
- **Monitoring:** `prometheus-fastapi-instrumentator` exposes metrics under `/metrics`; integrate with your Prometheus/Grafana stack. Configure `SENTRY_DSN` to enable error tracing.
- **LangGraph Execution Tracking:** All agent executions tracked in `LangGraphExecution`, `NodeExecution`, and `EdgeExecution` tables. View real-time execution paths at `/admin/langgraph` dashboard (when implemented).

---

## Troubleshooting

| Symptom | Checks |
|---------|--------|
| Missing environment variables | Run `check_env()` from `app/utils/env_check.py`; ensure `.env` is loaded (use `python-dotenv` or export manually). |
| Database connection errors | Verify PostgreSQL is running, confirm async URL uses `postgresql+asyncpg://`, rerun migrations. |
| Redis unreachable | Ensure Redis server is accessible; for local dev you can set `REDIS_HOST=localhost` and start a local instance. The app falls back to in-memory cache but disables queue-backed features. |
| Gemini API failures | Confirm `GOOGLE_GENAI_API_KEY`, project access, and region; inspect logged safety block reasons. |
| LangGraph orchestration errors | Check agent graph specifications in `app/agents/safety_graph_specs.py` and validate node/edge configurations in logs. |

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/safety-desk-mvp`).
2. Ensure tests plus static analysis pass locally before committing.
3. Update relevant docs (`PROJECT_SINGLE_SOURCE_OF_TRUTH.md`, `docs/single-source-of-truth.md`) with notable changes.
4. Submit a pull request with a summary of Safety Agent impacts and validation steps.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/) and the async Python ecosystem
- [Google Gemini](https://ai.google.dev/) for hosted LLM access
- [Gemma 3](https://ai.google.dev/gemma) for the self-managed model option
- Clinical and research partners guiding Safety Agent guardrails
