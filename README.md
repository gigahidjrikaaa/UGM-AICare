# UGM-AICare: Aika - Your Mental Health Companion 🌟

![UGM-AICare Logo](frontend/public/aicare_logo.png)

## 🎭 Meet Aika (愛佳)

**Aika** is the unified AI consciousness of UGM-AICare—a meta-agent orchestrator that coordinates four specialized agents to provide comprehensive mental health support across the university community.

**Name Meaning:**

- 愛 (Ai) = Love, affection
- 佳 (Ka) = Excellent, beautiful

**What Makes Aika Special:**

- 🎯 **One AI Personality, Multiple Capabilities**: Unified experience across student chat, admin operations, and clinical support
- 🔄 **Intelligent Role-Based Routing**: Adapts behavior based on user role (student/admin/counselor)
- 🤝 **Multi-Agent Coordination**: Orchestrates STA, SCA, SDA, and IA through LangGraph workflows
- 🧠 **Context-Aware**: Maintains conversation history and personalizes responses
- 🌏 **Culturally Sensitive**: Built for Indonesian university mental health context

**For Students:** "Hai! Aku Aika. Aku di sini untuk mendengarkan dan mendukungmu."  
**For Admins:** "Hello! I'm Aika, your administrative assistant."  
**For Counselors:** "Hi! I'm Aika, your clinical assistant."

→ **[Read Full Aika Architecture](docs/AIKA_META_AGENT_ARCHITECTURE.md)**

---

## Overview

Transforming University Mental Health Support: An Agentic AI Framework for Proactive Intervention and Resource Management

UGM-AICare is a comprehensive mental health platform designed specifically for university communities at Universitas Gadjah Mada. Built with a **Safety Agent Suite architecture**, it delivers proactive crisis detection, personalized CBT-informed coaching, operational case management, and privacy-preserving analytics—all under explicit professional oversight and verifiable privacy guarantees.

The platform centers around **Aika**, an AI companion powered by a multi-agent system orchestrated with LangGraph that coordinates four specialized agents to provide 24/7 empathetic support, evidence-based interventions, and early warning capabilities.

## 🌟 Core Features

### 🛡️ Safety Agent Suite (Multi-Agent Architecture)

**Four coordinated AI agents powered by LangGraph StateGraph orchestration (Implemented: October 2025):**

**Architecture:**

```bash
User Message → STA (Triage) → [Low/Moderate] → SCA (Coach) → END
                             → [High/Critical] → SDA (Escalate) → END
Analytics Queries → IA (Privacy-Preserving Aggregation) → END
```

**LangGraph Orchestration:**

- **StateGraph Workflows**: Deterministic state machines with typed state (`SafetyAgentState`, `IAState`)
- **Conditional Routing**: Risk-based agent selection with automatic escalation paths
- **Execution Tracking**: Real-time monitoring with database persistence (`LangGraphExecution` tables)
- **Error Recovery**: Graceful error handling at node level with state rollback

#### 🚨 Safety Triage Agent (STA)

- **Real-time Crisis Detection**: Automated risk classification (Level 0-3) and escalation routing within chat conversations
- **PII Redaction**: Privacy-safe message processing before risk assessment
- **Consent-Aware Disclosures**: Feature-flagged crisis protocols with human oversight
- **Crisis Banner Orchestration**: Dynamic in-chat safety alerts and resource recommendations
- **Audit Trail**: Complete logging of triage decisions and human handoffs
- **Fail-Closed Design**: Defaults to human review when AI confidence is uncertain
- **LangGraph Nodes**: `apply_redaction`, `classify_intent`, `assess_risk`, `route_to_agent`

#### 💬 Support Coach Agent (SCA)

- **CBT-Informed Coaching**: Personalized, evidence-based mental health coaching with empathetic dialogue
- **Brief Micro-Interventions**: Structured self-help modules (anxiety management, stress reduction, thought challenging)
- **Therapeutic Exercises**: Guides users through CBT-based exercises and structured conversation flows
- **Intervention Plan Generation**: AI-generated evidence-based action plans stored and tracked in database
- **Progress Tracking**: Visual progress bars and completion status for each intervention step
- **LangGraph Nodes**: `validate_intervention_need`, `classify_intervention_type`, `generate_plan`, `persist_plan`

#### 🗂️ Service Desk Agent (SDA)

- **Clinical Case Management**: Operational command center for clinical staff with comprehensive case tracking
- **SLA Monitoring**: Automated timers and escalation workflows with breach prediction
- **Case Timelines**: Complete history of interventions, escalations, and clinical notes
- **Workflow Automation**: Intelligent routing and assignment of cases to appropriate staff
- **LangGraph Nodes**: `validate_escalation`, `create_case`, `calculate_sla`, `auto_assign`

#### 🔍 Insights Agent (IA)

- **Privacy-Preserving Analytics**: k-anonymity enforcement (k≥5) with differential privacy budgets (ε-δ tracking)
- **Allow-Listed Queries**: Only pre-approved analytics questions (6 queries: crisis_trend, dropoffs, resource_reuse, etc.)
- **Aggregate Trend Analysis**: Population-level insights without exposing individual data
- **Consent-Aware Reporting**: Only analyzes data with explicit user consent
- **Resource Allocation Insights**: Data-driven recommendations for institutional planning
- **LangGraph Nodes**: `ingest_query`, `validate_consent`, `apply_k_anonymity`, `execute_analytics`

### 🤖 Intelligent Chat Support (Aika)

- **AI-Powered Conversations:**
  - Empathetic, context-aware responses using Large Language Models (Google Gemini 2.5 API)
  - Multi-agent orchestration via LangGraph for intelligent agent routing
  - Real-time safety monitoring and automated crisis escalation

- **Guided Chat Modules:**
  - Structured conversational flows (e.g., Thought Record, Problem Breakdown)
  - State management via Redis for session persistence
  - Dynamic loading indicators and intelligent message chunking

- **Multi-Language Support:** Available in English and Bahasa Indonesia

- **24/7 Availability:** Always-on support with automated safety monitoring

### 🛡️ Safety & Privacy First

- **Secure Authentication:**
  - Enterprise-grade JWT authentication with NextAuth.js
  - HKDF key derivation for JWE token security
  - Google OAuth for UGM domains with admin credentials provider

- **Data Privacy & Compliance:**
  - GDPR-compliant data handling and storage
  - Differential privacy (ε-δ budgets) enforced at Insights layer
  - Consent Ledger: Append-only consent history with withdrawal workflows
  - Redaction policies for sensitive data in logs and analytics

- **Audit & Oversight:**
  - Immutable audit trails for triage escalations, interventions, and analytics queries
  - Human-in-the-loop approval for automated recommendations
  - Clinical approval checkpoints for insights dashboards

### 🧠 AI-Powered Crisis Detection & Safeguarding

**Real-time semantic crisis detection using production-optimized machine learning:**

- **ML Model:** `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers)
  - **Architecture:** 12-layer transformer with cross-lingual semantic understanding
  - **Embedding Dimension:** 384D dense vectors
  - **Languages:** Multilingual support (English, Indonesian, 50+ languages)
  - **Training:** Fine-tuned on paraphrase detection for semantic similarity

- **Runtime Optimization:** ONNX Runtime (production deployment)
  - **Inference Speed:** 15-30ms per message (3-5x faster than PyTorch)
  - **Model Size:** 502 MB ONNX format (optimized graph)
  - **Dependencies:** 30 MB runtime (vs 800+ MB PyTorch)
  - **Build Time:** 1-2 minutes (vs 6-11 minutes with PyTorch)
  - **Memory Usage:** ~600 MB loaded model (50% reduction from PyTorch)

- **Detection Method:** Semantic similarity-based classification
  - **Approach:** Cosine similarity between user message and crisis example embeddings
  - **Crisis Examples:** Pre-computed embeddings for 4 severity levels (critical, high, moderate, low)
  - **Thresholds (calibrated):**
    - Critical (risk=3): similarity > 0.85 → Immediate escalation to human staff
    - High (risk=2): similarity > 0.75 → Acute distress detection
    - Moderate (risk=1): similarity > 0.65 → General support recommendation
    - Low (risk=0): similarity < 0.65 → Self-help resources

- **Performance Metrics:**
  - **Accuracy:** 85-95% crisis detection on real-world messages
  - **Semantic Understanding:** Catches paraphrased crisis expressions that keyword rules miss
  - **False Positive Rate:** ~40% (acceptable for mental health - safer than false negatives)
  - **Examples Caught:**
    - ✅ "thinking about ending things" (rule-based: missed)
    - ✅ "life has no meaning" (rule-based: missed)
    - ✅ "don't think i can keep living like this" (rule-based: missed)

- **Deployment Strategy:** ML-first with graceful fallback
  - **Primary:** ONNX semantic classifier (best accuracy + speed)
  - **Fallback:** Rule-based keyword patterns (if ML unavailable)
  - **Monitoring:** Real-time tracking of inference latency, accuracy, and model availability

- **Why ML over Rules?**
  - **Semantic Context:** Understands meaning beyond exact keyword matches
  - **Paraphrase Detection:** Catches crisis language in varied phrasing
  - **Multilingual:** Works across English and Indonesian without language-specific rules
  - **Continuous Improvement:** Model can be updated with new training data

- **Technical Implementation:**
  - **Location:** `backend/app/agents/sta/ml_classifier_onnx.py`
  - **Model Export:** `backend/scripts/export_model_to_onnx.py` (PyTorch → ONNX conversion)
  - **Model Files:** `backend/models/onnx/minilm-l12-v2/` (tokenizer + optimized graph)
  - **Integration:** Integrated into Safety Triage Agent (STA) LangGraph workflow

**Safety Guarantees:**

- **PII Redaction:** All messages redacted before ML processing
- **Fail-Closed:** Defaults to human review if ML confidence is uncertain
- **Audit Trail:** Every classification decision logged with similarity scores
- **Human Oversight:** Clinical staff review all high-risk escalations

For detailed migration documentation, see: [`docs/ONNX_MIGRATION_SUMMARY.md`](docs/ONNX_MIGRATION_SUMMARY.md) and [`docs/ML_FIRST_STRATEGY.md`](docs/ML_FIRST_STRATEGY.md)

### 📚 Evidence-Based Resources & Interventions

- **CBT-Informed Intervention System:**
  - Database-backed storage and tracking of intervention plans
  - Structured self-help modules with step-by-step guidance
  - Automated generation via Support Coach Agent (SCA) using evidence-based techniques
  - Manual creation and editing by clinical staff with therapeutic frameworks

- **Clinical Content Library:**
  - Mental health resources based on Indonesian clinical guidelines (JUKNIS P2 Gangguan Mental Emosional)
  - Crisis support with immediate access to emergency resources and helplines
  - CBT exercises and therapeutic interventions with ethical guardrails

### 🎮 Gamification & Engagement

- **NFT Achievement Badges:**
  - Unique NFT badges on EDU Chain testnet for achieving milestones
  - Custom ERC1155 smart contract (`UGMJournalBadges.sol`)
  - Blockchain-backed achievement tracking

- **Activity Tracking:**
  - Daily streak tracking for chat and journaling activities
  - DID wallet linking for badge rewards
  - User profile with achievement history

### 📝 User Features

- **Journaling:** Write and save dated journal entries
- **Feedback System:** Collect user feedback via dedicated forms
- **Email Check-ins:** Optional proactive email check-ins based on inactivity (APScheduler)
- **Profile Management:** User settings, streak tracking, and consent controls

### 👨‍⚕️ Admin Features

- **Service Desk Dashboard:** Monitor active cases, SLA compliance, and escalation queues
- **Insights Dashboard:** Privacy-preserving analytics with differential privacy (ε-δ budgets)
- **Intervention Plan Management:** Track and manage automated and manual CBT-based plans
- **Resource Management:** Comprehensive tools for managing mental health resources
- **Role-Based Access Control (RBAC):** Secure permissions for clinical staff and administrators

## 🛠️ Tech Stack

### Monorepo Structure

Organized with npm/yarn workspaces for streamlined dependency management across frontend, backend, and blockchain components.

### Frontend

- **Framework:** Next.js 15+ with App Router and Turbopack
- **Language:** TypeScript with strict type checking
- **Styling:** Tailwind CSS 4, `clsx`, `tailwind-merge`
- **UI Components:** React 19, Headless UI, Framer Motion, shadcn/ui, `react-icons`, `lucide-react`
- **State Management:** React Hooks (`useState`, `useEffect`, `useContext`), Custom Hooks (`useChat`, `useInterventionPlans`)
- **Authentication:** NextAuth.js (v4) with JWT/JWE and HKDF key derivation
- **Data Fetching:** Axios with type-safe API clients
- **Markdown Rendering:** `react-markdown`
- **Web3:** Ethers.js (v6) for NFT badge interactions

### Backend

- **Framework:** FastAPI with async/await patterns
- **Language:** Python 3.9+
- **Database ORM:** SQLAlchemy 2+ with AsyncSession for async database operations
- **Database Migrations:** Alembic for version-controlled schema changes
- **Database:** PostgreSQL with asyncpg driver
- **Caching/Session State:** Redis (via `redis-py` asyncio)
- **AI/ML Framework:** LangChain with LangGraph for multi-agent orchestration
- **Crisis Detection ML:** ONNX Runtime with sentence-transformers model (paraphrase-multilingual-MiniLM-L12-v2)
- **ML Inference:** 15-30ms latency with 96% smaller dependencies vs PyTorch
- **LLM Provider:** Google Gemini 2.5 API (primary model for all agents)
- **Agent Orchestration:** LangGraph with stateful graph-based controller for all agent coordination and routing
- **Background Jobs:** APScheduler for scheduled tasks (email check-ins, analytics)
- **Authentication:** JWT validation with NextAuth integration
- **API Documentation:** Auto-generated OpenAPI/Swagger documentation
- **Authentication:** JWT (`python-jose`), Passlib for password hashing
- **LLM Integration:** Google Generative AI SDK (Gemini 2.5 API)
- **Task Scheduling:** APScheduler for background jobs
- **Validation:** Pydantic for request/response schema validation
- **Email:** SMTP integration via `smtplib` and `email` modules

### Blockchain

- **Framework:** Hardhat for smart contract development
- **Language:** Solidity (0.8.28)
- **Libraries:** OpenZeppelin Contracts for secure NFT standards
- **Testing:** Hardhat Toolbox (Chai, Mocha)
- **Network:** EDUChain Testnet
- **Contract:** ERC1155 `UGMJournalBadges.sol` for achievement NFTs

### AI Engine (Experimental)

- **Framework:** FastAPI
- **Database:** Neo4j for knowledge graph context retrieval
- **Purpose:** Experimental service for enhanced context management

## 🏗️ Project Structure

```txt
├── backend/          # FastAPI Backend API
│   ├── alembic/      # Database migration scripts
│   ├── app/          # Main application source code
│   │   ├── agents/       # Safety Agent Suite (STA, SCA, SDA, IA)
│   │   │   ├── sta/        # Safety Triage Agent (crisis detection)
│   │   │   ├── sca/        # Support Coach Agent (CBT coaching)
│   │   │   ├── sda/        # Service Desk Agent (case management)
│   │   │   ├── ia/         # Insights Agent (analytics)
│   │   │   └── tools/      # Shared agent utilities
│   │   ├── core/         # Core utilities (auth, DB, RBAC, events)
│   │   ├── database/     # SQLAlchemy setup, base models
│   │   ├── routes/       # API endpoint definitions
│   │   ├── services/     # Business logic services
│   │   ├── utils/        # Utility functions (security, email)
│   │   ├── models/       # Database ORM models
│   │   │   └── interventions.py  # Intervention plan models
│   │   ├── schemas/      # Pydantic validation models
│   │   │   └── intervention_plans.py  # Intervention plan schemas
│   │   ├── main.py       # FastAPI app entrypoint
│   │   └── ...
│   ├── logs/         # Application logs
│   ├── scripts/      # Utility scripts (migrations, backfill)
│   ├── tests/        # API and service tests
│   ├── .env.example  # Example environment variables
│   └── requirements.txt
│
├── blockchain/       # Hardhat Smart Contracts & Scripts
│   ├── contracts/    # Solidity contracts (UGMJournalBadges.sol)
│   ├── ignition/     # Hardhat Ignition deployment modules
│   ├── metadata/     # NFT metadata JSON files
│   ├── scripts/      # Deployment and interaction scripts
│   ├── test/         # Contract tests
│   ├── hardhat.config.ts
│   └── package.json
│
├── frontend/         # Next.js Frontend Web Application
│   ├── public/       # Static assets (images, fonts)
│   ├── src/          # Main application source code
│   │   ├── app/        # Next.js App Router pages & layouts
│   │   │   ├── (main)/       # User-facing routes
│   │   │   │   ├── chat/       # Chat interface with Aika
│   │   │   │   ├── resources/  # Intervention plans & resources
│   │   │   │   └── dashboard/  # User dashboard
│   │   │   └── (admin)/      # Admin routes (protected)
│   │   │       └── service-desk/  # Service Desk dashboard (planned)
│   │   ├── components/ # Reusable React components
│   │   │   ├── features/   # Feature-specific components
│   │   │   │   ├── chat/     # Chat UI components
│   │   │   │   └── resources/ # PlanCard, intervention UI
│   │   │   └── ui/         # Generic UI components
│   │   ├── hooks/      # Custom React hooks
│   │   │   └── useInterventionPlans.tsx  # Intervention plan hooks
│   │   ├── services/   # API client services
│   │   │   └── interventionPlanApi.ts  # Intervention API client
│   │   └── ...
│   ├── messages/     # i18n translation files
│   ├── .env.example  # Example environment variables
│   └── package.json
│
├── docs/             # Project Documentation
│   ├── refactor_plan.md               # Safety Agent implementation plan
│   ├── DEPRECATED.md                  # Index of retired documentation
│   ├── mental-health-ai-guidelines.md # Ethics & clinical playbooks
│   ├── hybrid-architecture-guide.md   # LangGraph agent orchestration
│   └── ...
│
├── ai/               # AI/ML Experimentation & Training
│   ├── data/         # Training data & evaluation datasets
│   ├── notebooks/    # Jupyter notebooks for experiments
│   └── src/          # Experimental AI service code
│
├── PROJECT_SINGLE_SOURCE_OF_TRUTH.md  # Canonical project reference
├── README.md                           # This file
└── docker-compose.yml                  # Docker orchestration```
│   │   ├── components/ # React components (UI, features, layout)
│   │   ├── context/    # React context providers (e.g., SidebarContext)
│   │   ├── hooks/      # Custom React hooks (e.g., useChat)
│   │   ├── lib/        # Utility functions, constants, auth config
│   │   ├── services/   # API interaction layer
│   │   ├── types/      # TypeScript type definitions
│   │   └── ...
│   ├── .env.local.example # Example environment variables
│   └── package.json
│
├── ai/               # Optional/Experimental AI Engine (FastAPI + Neo4j)
│   └── src/
│
├── .gitignore
└── README.md         # This file
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn or pnpm
- Python (3.9+ recommended)
- pip and virtualenv (`python -m venv venv`)
- PostgreSQL Server
- Redis Server (v6+ recommended)
- Access keys for:
  - Google Cloud (for OAuth Credentials)
  - LLM Providers (Google Gemini API key; optional configuration for the local Gemma service)
  - Redis Cloud (or local connection details)
  - Blockchain Testnet (e.g., Alchemy/Infura API Key for EDU Chain) + Private Key for Deployer/Minter Wallet
  - Email Service (e.g., Gmail App Password or Resend API Key if used)

### Setup Steps

1. **Clone Repository:**

    ```bash
    git clone https://github.com/gigahidjrikaaa/UGM-AICare.git
    cd UGM-AICare
    ```

2. **Backend Setup:**

    ```bash
    cd backend
    python -m venv venv
    # Activate venv (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
    pip install -r requirements.txt
    # Create .env file from .env.example and fill in variables (See Environment Variables section)
    cp .env.example .env
    nano .env # Or use your editor
    
    # IMPORTANT: Validate your environment variables
    cd ..
    ./scripts/validate-env.sh backend/.env
    
    # Setup PostgreSQL database (create user/db if needed)
    cd backend
    # Run database migrations
    alembic upgrade head
    # Start Redis server if running locally
    cd ..
    ```

3. **Frontend Setup:**

    ```bash
    cd frontend
    npm install # or yarn install / pnpm install
    # Create .env.local file from .env.local.example and fill in variables
    cp .env.local.example .env.local
    nano .env.local # Or use your editor
    cd ..
    ```

4. **Blockchain Setup:**

    ```bash
    cd blockchain
    npm install # or yarn install / pnpm install
    # Create .env file from .env.example and fill in variables
    cp .env.example .env
    nano .env # Or use your editor
    # Compile contracts (optional, deploy script usually does this)
    # npx hardhat compile
    cd ..
    ```

### Running Locally

1. **Start Blockchain Node (Optional but Recommended):**

    ```bash
    cd blockchain
    npx hardhat node
    cd ..
    ```

    *(Note: For interacting with deployed contracts on testnet, this isn't needed)*

2. **Start Backend Server:**

    ```bash
    cd backend
    # Ensure virtualenv is active
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    cd ..
    ```

3. **Start Frontend Server:**

    ```bash
    cd frontend
    npm run dev # Uses Turbopack
    cd ..
    ```

- Frontend usually runs on `http://localhost:4000`
- Backend usually runs on `http://localhost:8000` (API docs at `http://localhost:8000/docs`)
- Hardhat node usually runs on `http://127.0.0.1:8545/`

## Environment Variables

Create the necessary `.env` (for backend/blockchain) and `.env.local` (for frontend) files. Fill them based on the `.env.example` files inside each directory.

## 🔑 Key Components & Architecture

### Multi-Agent Orchestration

- **LangGraph Orchestrator (legacy):** superseded by `backend/app/agents/orchestrator_graph_spec.py` and the dedicated STA/SCA/SDA/IA routers
- **Agent Graph Specification:** `backend/app/agents/orchestrator_graph_spec.py` defines the orchestration flow with conditional edges for agent selection
- **Execution Tracking:** `backend/app/agents/execution_tracker.py` monitors agent execution with graph IDs, node tracking, and performance metrics

### Authentication & Authorization

- **Frontend Auth:** `frontend/src/lib/auth.ts` handles NextAuth config, Google Sign-in, JWT/JWE session callbacks with HKDF key derivation
- **Backend Validation:** `backend/app/core/auth.py` validates JWT tokens from NextAuth
- **User Sync:** `backend/app/routes/internal.py` (`/sync-user`) synchronizes user data between frontend and database
- **Route Protection:** `backend/app/dependencies.py` provides dependency injection for protected routes with RBAC

### Chat & Conversation Management

- **Frontend State:** `frontend/src/hooks/useChat.ts` manages message state, chunking, delays, and loading indicators
- **Chat API:** `backend/app/routes/chat.py` handles chat requests with safety monitoring
- **LLM Integration:** `backend/app/core/llm.py` manages Google Gemini and Gemma 3 pipeline interactions
- **Session State:** `backend/app/core/memory.py` uses Redis for guided module state persistence and conversation context
- **Safety Monitoring:** Real-time triage via STA during active conversations

### Intervention Plan System

- **Database Models:** `backend/app/models/interventions.py` defines `InterventionPlanRecord` and `InterventionPlanStepCompletion` with AsyncSession support
- **Pydantic Schemas:** `backend/app/schemas/intervention_plans.py` provides type-safe request/response schemas with covariant `Sequence` types
- **Service Layer:** `backend/app/services/intervention_plan_service.py` implements async CRUD operations for plan management
- **API Routes:** `backend/app/routes/intervention_plans.py` exposes REST endpoints at `/api/v1/intervention-plans`
- **Agent Integration:** `backend/app/services/agent_integration.py` enables SCA to automatically store generated plans
- **Frontend Components:**
  - `frontend/src/services/interventionPlanApi.ts` - Type-safe API client
  - `frontend/src/hooks/useInterventionPlans.tsx` - React hooks for data fetching and mutations
  - `frontend/src/components/resources/PlanCard.tsx` - Interactive plan cards with progress tracking

### Database Architecture

- **ORM:** SQLAlchemy 2+ with AsyncSession for all I/O operations using `select() + execute()` pattern
- **Models:** Organized in `backend/app/models/` with event-centric design (events, messages, cases, consents)
- **Migrations:** Alembic manages version-controlled schema changes in `backend/alembic/`
- **Async Pattern:** All database queries use `await db.execute(select(...))` for non-blocking operations

### NFT Achievement System

- **Smart Contract:** `blockchain/contracts/UGMJournalBadges.sol` - ERC1155 contract for achievement NFTs
- **Minting Logic:** `backend/app/core/blockchain_utils.py` handles minting via Ethers.js scripts
- **Badge API:** `backend/app/routes/profile.py` triggers minting; `backend/app/routes/summary.py` (`/my-badges`) retrieves user badges
- **Deployment:** Hardhat configuration in `blockchain/hardhat.config.ts` with deployment scripts in `blockchain/scripts/`

### UI Layout & Components

- **Root Layout:** `frontend/src/app/layout.tsx` - NextAuth SessionProvider, i18n, and global providers
- **App Layout:** `frontend/src/components/layout/AppLayout.tsx` - Header, Sidebar, Footer with conditional blurring and feedback modal
- **Admin Routes:** Protected admin dashboards under `frontend/src/app/(admin)/` (Service Desk, Insights Dashboard)
- **User Routes:** Main application under `frontend/src/app/(main)/` (chat, resources, dashboard)

## 🚀 Deployment

### Production Deployment

- **Frontend:** Deployed on Vercel (`ugm-ai-care.vercel.app`)
  - Configure environment variables in Vercel project settings
  - Automatic deployments from main branch
  - Edge runtime for optimal performance

- **Backend:** Deployed on Render
  - Configure environment variables in Render dashboard
  - PostgreSQL database with connection pooling
  - Redis service for session state and caching
  - Ensure `start.sh` runs migrations (`alembic upgrade head`) before starting Uvicorn
  - Background jobs scheduled via APScheduler

### Docker Deployment

The project includes Docker Compose configuration for local development and production:

```bash
# Development mode
docker-compose up

# Production mode
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Production Monitoring Stack 📊

UGM-AICare includes a comprehensive monitoring stack for production observability:

- **ELK Stack** (Logging): Elasticsearch + Logstash + Kibana + Filebeat
- **Prometheus + Grafana** (Metrics): Time-series metrics, alerts, and dashboards
- **Custom Instrumentation**: 50+ mental health platform-specific metrics

#### Quick Start - Three Deployment Options

**Option 1: Start Everything (Recommended for Full Stack Development)**

```bash
./dev.sh up-all
# Starts: Application + ELK Stack + Prometheus + Grafana + All Exporters
```

**Option 2: Start Monitoring Separately**

```bash
# Start application first
./dev.sh up

# Start monitoring stack when needed
./dev.sh monitoring start
```

**Option 3: Standalone Monitoring Only**

```bash
# Use dedicated monitoring script
./monitoring.sh start
```

#### Access Points

- **Kibana** (Log Visualization): <http://localhost:8254>
- **Grafana** (Metrics Dashboards): <http://localhost:8256> (admin/admin123)
- **Prometheus** (Metrics Query): <http://localhost:8255>
- **AlertManager** (Alert Management): <http://localhost:8261>
- **Elasticsearch** (Direct API): <http://localhost:8250>
- **Backend Metrics Endpoint**: <http://localhost:8000/metrics>

#### Available Monitoring Commands

```bash
# Integrated commands (via dev.sh)
./dev.sh up-all                      # Start app + monitoring
./dev.sh down-all                    # Stop everything
./dev.sh monitoring start            # Start monitoring only
./dev.sh monitoring stop             # Stop monitoring
./dev.sh monitoring restart          # Restart monitoring
./dev.sh monitoring logs kibana      # View Kibana logs
./dev.sh monitoring logs prometheus  # View Prometheus logs
./dev.sh monitoring status           # Check health of all services
./dev.sh setup-langfuse              # Setup Langfuse for agent tracing (one-time)

# Standalone commands (via monitoring.sh)
./monitoring.sh start                # Start monitoring stack
./monitoring.sh stop                 # Stop monitoring stack
./monitoring.sh restart              # Restart monitoring
./monitoring.sh logs [service]       # View logs for specific service
./monitoring.sh status               # Show health of all services

# Production deployment
./deploy-prod.sh setup-langfuse      # Setup Langfuse on production server
```

./monitoring.sh clean                # Remove containers and volumes
./monitoring.sh urls                 # Display all access URLs

```

#### Key Features

**Structured Logging:**
- JSON-formatted logs with context fields (user_id, agent, session_id, processing_time_ms)
- Privacy-preserving user_id hashing
- Crisis and intervention event tagging
- Automatic log shipping from Docker containers via Filebeat
- Centralized log aggregation in Elasticsearch
- Indexed as `ugm-aicare-YYYY.MM.DD`

**Custom Metrics (50+ metrics):**
- HTTP: Request rate, response time, error rate
- Agents: Processing time, invocation count, errors (STA, SCA, SDA, IA)
- LLM: API calls, latency, token usage, model performance
- Mental Health: Crisis escalations, intervention plans, completion rates
- Users: Active users, session duration, retention rates
- Counselors: Response time, case load, availability
- Database: Query duration, connection pool, cache hit/miss

**Automated Alerts (15 rules):**
- **Critical (6)**: High error rate, service down, low DB connections, crisis backlog, high memory, low disk
- **Warning (9)**: Slow responses, slow agents, high CPU, slow LLM, high token usage, low completion rates
- **Info (2)**: High user activity, unusual crisis patterns

**Exporters:**
- **Node Exporter**: System metrics (CPU, memory, disk, network)
- **cAdvisor**: Container metrics (resource usage per container)
- **Postgres Exporter**: Database metrics (connections, queries, replication)
- **Redis Exporter**: Cache metrics (keys, memory, hit rate)

#### Health Checks

All monitoring services include health checks:

```bash
# Check Elasticsearch cluster health
curl http://localhost:8250/_cluster/health

# Check Prometheus targets
curl http://localhost:8255/api/v1/targets

# Check Grafana health
curl http://localhost:8256/api/health

# Check backend metrics endpoint
curl http://localhost:8000/metrics
```

#### Documentation

For complete monitoring setup, configuration, and troubleshooting:

- **[PRODUCTION_MONITORING.md](docs/PRODUCTION_MONITORING.md)** - Complete monitoring guide
- **[MONITORING_QUICK_REFERENCE.md](docs/MONITORING_QUICK_REFERENCE.md)** - Quick reference and commands
- **[MONITORING_IMPLEMENTATION.md](docs/MONITORING_IMPLEMENTATION.md)** - Implementation details and architecture

#### Production Deployment Checklist

Before deploying monitoring to production:

- [ ] Update alertmanager.yml with production Slack webhook URL
- [ ] Set Elasticsearch retention policy (recommended: 30 days)
- [ ] Configure log rotation for disk space management
- [ ] Set Prometheus retention: `--storage.tsdb.retention.time=30d`
- [ ] Change Grafana admin password from default (admin/admin123)
- [ ] Configure firewall rules (only expose necessary ports)
- [ ] Set up SSL/TLS for Grafana and Kibana
- [ ] Create Kibana index patterns: `ugm-aicare-*`
- [ ] Import Grafana dashboards
- [ ] Test alert delivery to Slack/PagerDuty
- [ ] Set up automated backups for Elasticsearch data

### Container-First CI/CD Deployment

This project implements a robust, container-first Continuous Integration/Continuous Deployment (CI/CD) pipeline designed to automate the build, test, security scan, and deployment processes for the UGM-AICare application. Leveraging **GitHub Actions** for orchestration, **Docker** for containerization, **GitHub Container Registry (GHCR)** for image storage, and **Trivy** for vulnerability scanning, this system ensures consistent, secure, and efficient deployments to a single Virtual Machine (VM). This setup assumes an external reverse proxy (e.g., Nginx) is already configured on the VM to handle domain routing and HTTPS.

**Purpose and Benefits:**

- **Automation:** Automates repetitive tasks, reducing manual errors and freeing up development time.
- **Consistency:** Ensures that every deployment follows the same standardized process, leading to reliable and predictable outcomes.
- **Speed:** Accelerates the delivery of new features and bug fixes to production.
- **Quality & Security:** Integrates automated testing and vulnerability scanning early in the pipeline to catch issues before deployment.
- **Reproducibility:** Docker images tagged with Git SHAs ensure that any version of the application can be precisely reproduced.
- **Rollback Capability:** Provides a straightforward mechanism to revert to previous stable versions in case of issues.

**How the CI/CD Works (High-Level Flow):**

The CI/CD pipeline is divided into two main stages: Continuous Integration (CI) and Continuous Deployment (CD).

1. **Continuous Integration (CI) - Build, Test, Scan, Push:**
    - **Trigger:** Every `push` or `pull_request` to the `main` branch.
    - **Process:**
        - The code is checked out.
        - Backend (Python/FastAPI) and Frontend (Node.js/Next.js) dependencies are installed.
        - Automated unit and integration tests are executed for both services.
        - Docker images for the backend and frontend are built using dedicated Dockerfiles (`infra/docker/`).
        - These images are then scanned for known vulnerabilities using **Trivy**.
        - Finally, the scanned images are pushed to **GitHub Container Registry (GHCR)**, tagged with the unique Git commit SHA and `:latest`.

2. **Continuous Deployment (CD) - Deploy to VM:**
    - **Trigger:** A successful `push` to the `main` branch, or a manual `workflow_dispatch` trigger.
    - **Process:**
        - The GitHub Action securely connects to the target VM via SSH using `appleboy/ssh-action`.
        - On the VM, the `infra/scripts/deploy.sh` script is executed.
        - This script logs into GHCR, pulls the Docker images corresponding to the deployed Git SHA.
        - It then runs database migrations using `infra/scripts/migrate.sh`.
        - Finally, it orchestrates the application services (backend, frontend, database, Redis, MinIO) using **Docker Compose V2** (`infra/compose/docker-compose.prod.yml`), bringing them up in detached mode.
        - Automated health checks verify the successful startup of the deployed services by checking the locally exposed ports (8000 for backend, 4000 for frontend).

**Technologies Used:**

- **GitHub Actions:** Orchestrates the entire CI/CD pipeline.
- **Docker:** Containerization of backend and frontend services.
- **Docker Compose V2:** Defines and runs multi-container Docker applications on the VM.
- **GitHub Container Registry (GHCR):** Securely stores and serves Docker images.
- **Trivy:** Comprehensive vulnerability scanner for Docker images.
- **SSH (via `appleboy/ssh-action`):** Secure remote execution on the deployment VM.
- **Bash Scripting:** For custom deployment and migration logic (`infra/scripts/`).

**VM Prerequisites:**

To successfully deploy to your VM, ensure the following are installed and configured:

- **Docker:** Latest version.
- **Docker Compose V2:** Ensure `docker compose` command is available (not `docker-compose`).
- **Firewall:** Configure firewall rules to allow incoming traffic on ports 8000 (backend) and 4000 (frontend), or any other ports you configure.
- **Deploy User:** A dedicated SSH user with appropriate permissions to manage Docker and the project directory (`VM_PROJECT_PATH`).
- **Project Path:** The `VM_PROJECT_PATH` on the VM should be the root directory where the repository is cloned.
- **Reverse Proxy Configuration (Nginx/Apache):** You will need to configure your existing Nginx (or other reverse proxy) to forward traffic from your domain (e.g., `aicare.sumbu.xyz`) to the Docker containers running on `localhost:4000` (frontend) and `localhost:8000` (backend). This includes handling HTTPS/SSL termination at the Nginx level.

**Required GitHub Secrets:**

The following secrets must be configured in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

- `VM_SSH_HOST`: The IP address or hostname of your deployment VM.
- `VM_SSH_USER`: The SSH username for connecting to the VM.
- `VM_SSH_PRIVATE_KEY`: The SSH private key (PEM format) for authentication.
- `VM_PROJECT_PATH`: The absolute path to the project directory on the VM (e.g., `/opt/ugm-aicare`).
- `ENV_FILE_PRODUCTION`: (Optional, but highly recommended) A multi-line secret containing the entire `.env` file content for production. This will be written to a `.env` file in the `VM_PROJECT_PATH` on the VM during deployment.

**Health Endpoints and Expected Ports:**

- **Backend:** `http://<VM_IP_OR_HOSTNAME>:8000/health` (assuming a `/health` endpoint is implemented).
- **Frontend:** `http://<VM_IP_OR_HOSTNAME>:4000`

**Rollback Procedure:**

To rollback to a previous deployment:

1. Go to the `Actions` tab in your GitHub repository.
2. Select the `CD Pipeline - Deploy to VM` workflow.
3. Click on `Run workflow` from the `workflow_dispatch` dropdown.
4. Enter the `Git SHA` of the commit you wish to rollback to in the `rollback_sha` input field.
5. Click `Run workflow`. The workflow will then pull and deploy the specified older version of the application.

**Local Development with Docker Compose:**

For local development, you can use `docker-compose.dev.yml` which includes `build` contexts and volume mounts for live reloading:

```bash
docker compose -f docker-compose.dev.yml up --build
```

This will build the images locally and mount your source code, allowing for immediate changes to be reflected without rebuilding containers.

### Cleanup Notes

With the introduction of `docker-compose.dev.yml` and the new CI/CD pipeline, some existing files in the project root become redundant.

- **`docker-compose.yml`**: This file has been removed as its functionality is now split between `infra/compose/docker-compose.prod.yml` (for production deployments) and `docker-compose.dev.yml` (for local development).
- **`backend/run_migrations.sh`**: This empty script has been removed. The actual migration logic is located at `scripts/run_migrations.sh` and is now orchestrated via `infra/scripts/migrate.sh`.
- **Other root-level scripts (`deploy-prod.sh`, `dev.bat`, `dev.sh`, `start-dev.sh`):** These scripts are likely superseded by the new CI/CD workflows and `docker-compose.dev.yml`. While not removed in this PR to avoid breaking existing local workflows, it is recommended to review and remove them if they are no longer needed.

### Safety Agent Configuration

- **Feature Flags:** Enable/disable individual agents (STA, SCA, SDA, IA) via environment variables
- **LangGraph Configuration:** Configure agent routing and orchestration parameters
- **Privacy Settings:** Set differential privacy budgets (ε-δ) and k-anonymity thresholds for Insights Agent
- **Consent Policies:** Configure consent workflows and withdrawal handling
- **Crisis Protocols:** Customize escalation thresholds and human oversight triggers

## 📖 Documentation

For detailed documentation on specific aspects of the project:

- **[Safety Agent Refactor Plan](docs/refactor_plan.md)** - Implementation roadmap and technical specifications
- **[Project Single Source of Truth](PROJECT_SINGLE_SOURCE_OF_TRUTH.md)** - Canonical architecture reference
- **[Mental Health AI Guidelines](docs/mental-health-ai-guidelines.md)** - Ethics, crisis playbooks, and cultural context
- **[Hybrid Architecture Guide](docs/hybrid-architecture-guide.md)** - LangGraph agent orchestration architecture
- **[Deprecated Documentation](docs/DEPRECATED.md)** - Index of retired documentation (do not reference)

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Smart Contract Tests

```bash
cd blockchain
npx hardhat test
```

## 🔄 How It Works

### User Interaction Flow

1. **User starts chat** with Aika through the web interface
2. **Real-time monitoring:** Safety Triage Agent (STA) analyzes messages for crisis signals
3. **Intelligent routing:** LangGraph orchestrator routes to appropriate agent:
   - Crisis detected → **STA** escalates with crisis resources and professional referral
   - Coaching needed → **SCA** provides CBT-informed coaching and generates intervention plan
   - Case management → **SDA** creates case timeline and assigns to clinical staff (admin view)
   - Analytics query → **IA** provides privacy-preserving aggregate insights (admin view)
4. **Intervention delivery:** CBT-based plans stored in database, displayed with progress tracking
5. **Continuous monitoring:** Ongoing support with consent-aware data collection and human oversight

### Safety Agent Workflow

```bash
User Message → LangGraph Orchestrator
              ↓
    ┌─────────┴─────────┬──────────┬──────────┐
    ↓                   ↓          ↓          ↓
   STA                 SCA        SDA        IA
(Crisis Triage)   (CBT Coaching) (Case Mgmt) (Analytics)
    ↓                   ↓          ↓          ↓
Crisis Banner    CBT-Informed   Clinical   Privacy-
& Resources      Interventions  Workflows  Preserving
                                           Insights
```

### Privacy & Consent Flow

1. **Consent collection:** Users opt-in to specific data processing activities
2. **Consent ledger:** All consent decisions logged in append-only database
3. **Redaction policies:** Sensitive data masked in logs and analytics
4. **Withdrawal workflow:** Users can revoke consent, triggering data purge
5. **Differential privacy:** Analytics queries consume privacy budget (ε-δ tracking)

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Contact the maintainer:** Reach out to [Giga Hidjrika Aura Adkhy](https://linkedin.com/in/gigahidjrikaaa) for approval
2. **Fork the repository** and create a new branch for your feature or bug fix
3. **Follow code standards:**
   - TypeScript strict mode for frontend
   - Async/await patterns for backend
   - Type-safe API clients and schemas
   - Comprehensive error handling
4. **Write tests** for new features and bug fixes
5. **Update documentation** in relevant `docs/` files
6. **Submit a pull request** with clear commit messages

### Development Guidelines

- **Never hardcode secrets** - Use environment variables
- **Follow SOLID principles** - Write modular, testable code
- **Validate inputs** - Prevent injection attacks
- **Handle errors gracefully** - No exposed stack traces
- **Write accessible UI** - WCAG 2.1 AA compliance
- **Document complex logic** - Explain architectural decisions

### CI/CD Test Behavior

The CI/CD pipeline continues deployment **even when tests fail** to enable rapid iteration:

- ✅ **Test results are summarized** in GitHub Actions UI
- 📦 **Test artifacts are uploaded** for detailed analysis (30-day retention)
- ⚠️ **Deployment warnings** alert you to test failures
- 🔄 **Quick rollback available** if issues arise

**Best Practices:**

- Always review test summaries before/after deployment
- Download artifacts for failed tests to debug locally
- Fix failing tests promptly in subsequent commits
- Monitor production logs closely after deploying with test failures

→ **[Full CI/CD Test Behavior Documentation](docs/CI_CD_TEST_BEHAVIOR.md)**

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Special thanks to the UGM AICare team and contributors for their hard work and dedication
- Thanks to the open-source community for the libraries and tools that made this project possible
- Indonesian Ministry of Health for JUKNIS P2 Gangguan Mental Emosional clinical guidelines

## 📞 Contacts

- **Main Developer:** [Giga Hidjrika Aura Adkhy](https://linkedin.com/in/gigahidjrikaaa)
- **Developers:** [Ega Rizky Setiawan](https://linkedin.com/in/egarizkysetiawan)
- **Advisor:** [Bimo Sunarfri Hartono](https://ugm.ac.id/en/lecturers/bimo-sunarfri-hartono)

---

Built with ❤️ for university mental health by the UGM AICare Team
