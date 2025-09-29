# UGM-AICare Backend

FastAPI service that powers the Safety Agent Suite behind UGM-AICare. The backend orchestrates crisis-aware chat, consent-driven outreach, safety desk workflows, and privacy-first insights for university mental health support. Hosted Google Gemini models provide empathetic conversations, while an optional self-managed Gemma 3 runtime can be plugged into the same abstraction.

---

## Safety Agent Suite

| Agent | Scope | Highlights | Status (Sep 2025) |
|-------|-------|------------|--------------------|
| 🛡️ **Safety Triage Agent (STA)** | Real-time risk scoring inside the chat flow | Crisis banner orchestration, feature flags, human hand-off logging | API scaffolding in progress |
| 📣 **Safety Campaign Agent (SCA)** | Consent-aware outreach and Action Cards | Evidence-backed content library, throttled dispatch, audit trails | Content pipeline design drafted |
| 🗂️ **Safety Desk Agent (SDA)** | Operational cockpit for clinical staff | Case timelines, SLA tracking, interoperability hooks | Data model defined, routes pending |
| 🔍 **Insights Agent (IA)** | Privacy-preserving analytics over anonymised events | Differential privacy budgets, consent dimensions, redaction policies | Migration drafted, query layer pending |

Refer to `PROJECT_SINGLE_SOURCE_OF_TRUTH.md` for the canonical roadmap and alignment guidance.

---

## Core Capabilities

- **Safety-first chat** with Gemini/Gemma responses, sentiment signals, and STA risk scoring
- **User & consent management** via JWT-secured APIs and append-only consent ledgers
- **Campaign orchestration** for Action Cards and n8n-triggered outreach (SCA)
- **Case operations** with SDA scaffolding for clinical oversight and SLA enforcement
- **Insights pipeline** prepared for differential privacy queries and audit-ready reporting
- **Observability hooks** for structured logging, monitoring, and privacy budget events

---

## Architecture & Key Packages

```
backend/
├── app/
│   ├── agents/
│   │   ├── sta/            # Safety Triage Agent flows
│   │   ├── sca/            # Safety Campaign Agent utilities
│   │   ├── sda/            # Safety Desk Agent prototypes
│   │   └── ia/             # Insights Agent scaffolding
│   ├── core/
│   │   ├── llm.py          # Gemini & Gemma provider abstraction via LangChain
│   │   ├── memory.py       # Conversation memory orchestration
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

- **Runtime:** Python 3.11+ with FastAPI, asynchronous SQLAlchemy, and LangChain
- **Data Layer:** PostgreSQL, Redis (session state + feature flags), deterministic hashing for privacy
- **LLM Providers:** Google Gemini (hosted) and optional Gemma 3 runtime wired through `core/llm.py`
- **Messaging & Tasks:** Celery / Redis queues, n8n webhooks, email/SMS connectors
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
     | Database | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Use async URL (`postgresql+asyncpg://...`) for runtime |
     | Redis | `REDIS_HOST`, `REDIS_PORT` | Include `REDIS_USERNAME`/`REDIS_PASSWORD` if your instance requires auth |
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
- **Gemma Runtime:** Update the `gemma_api_url` inside `app/core/llm.py` to point at your deployment (Docker service name by default). The LangChain loader automatically falls back to Gemini if Gemma is unavailable.
- **Monitoring:** `prometheus-fastapi-instrumentator` exposes metrics under `/metrics`; integrate with your Prometheus/Grafana stack. Configure `SENTRY_DSN` to enable error tracing.
- **n8n & Webhooks:** Secure `INTERNAL_API_KEY` and whitelist IPs when exposing webhook endpoints.

---

## Troubleshooting

| Symptom | Checks |
|---------|--------|
| Missing environment variables | Run `check_env()` from `app/utils/env_check.py`; ensure `.env` is loaded (use `python-dotenv` or export manually). |
| Database connection errors | Verify PostgreSQL is running, confirm async URL uses `postgresql+asyncpg://`, rerun migrations. |
| Redis unreachable | Ensure Redis server is accessible; for local dev you can set `REDIS_HOST=localhost` and start a local instance. The app falls back to in-memory cache but disables queue-backed features. |
| Gemini API failures | Confirm `GOOGLE_GENAI_API_KEY`, project access, and region; inspect logged safety block reasons. |
| Gemma service timeouts | Validate container/service health, endpoint URL, and that requests adhere to your rate limits. |

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
