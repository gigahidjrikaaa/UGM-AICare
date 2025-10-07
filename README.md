# UGM-AICare: Aika - Your Mental Health Companion

![UGM-AICare Logo](frontend/public/aicare_logo.png)

## Overview

**Transforming University Mental Health Support with AI Safety Agents**

UGM-AICare is a comprehensive mental health platform designed specifically for university communities at Universitas Gadjah Mada. Built with a **Safety Agent Suite architecture**, it delivers proactive crisis detection, personalized coaching, operational case management, and privacy-first analytics—all under explicit professional oversight and verifiable privacy guarantees.

The platform centers around **Aika**, an AI companion powered by a multi-agent system that coordinates four specialized Safety Agents using LangGraph orchestration to provide 24/7 empathetic support, evidence-based interventions, and early warning capabilities.

## 🌟 Core Features

### 🛡️ Safety Agent Suite (Multi-Agent Architecture)

**Four coordinated AI agents powered by LangGraph orchestration:**

#### 🚨 Safety Triage Agent (STA)
- **Real-time Crisis Detection**: Automated risk classification and escalation routing within chat conversations
- **Consent-Aware Disclosures**: Feature-flagged crisis protocols with human oversight
- **Crisis Banner Orchestration**: Dynamic in-chat safety alerts and resource recommendations
- **Audit Trail**: Complete logging of triage decisions and human handoffs
- **Fail-Closed Design**: Defaults to human review when AI confidence is uncertain

#### 💬 Support Coach Agent (SCA)
- **Personalized Intervention Plans**: Evidence-based action plans with step-by-step guidance
- **Automated Plan Generation**: AI-generated interventions stored and tracked in database
- **Progress Tracking**: Visual progress bars and completion status for each intervention step
- **Curated Action Cards**: Event-triggered outreach with consent-aware distribution
- **Throttled Delivery**: Prevents notification fatigue with intelligent pacing

#### 🗂️ Service Desk Agent (SDA)
- **Case Management Dashboard**: Operational command center for clinical staff
- **SLA Tracking**: Automated timers and escalation ladders for follow-ups
- **Case Timelines**: Complete history of interventions and escalations
- **Interoperability Hooks**: Integration points for campus systems

#### 🔍 Intelligence Analytics (IA)
- **Privacy-Respecting Analytics**: Differential privacy with ε-δ budget tracking
- **Consent-Aware Dimensions**: Only analyzes data with explicit consent
- **Redaction Policies**: Clinical approval checkpoints for sensitive insights
- **Anonymized Event Analysis**: Aggregate trends without exposing individual data

### 🤖 Intelligent Chat Support (Aika)

* **AI-Powered Conversations:**
  * Empathetic, context-aware responses using Large Language Models (Google Gemini or locally hosted Gemma 3)
  * Multi-agent orchestration via LangGraph for intent-based routing
  * Real-time safety monitoring and crisis escalation

* **Guided Chat Modules:**
  * Structured conversational flows (e.g., Thought Record, Problem Breakdown)
  * State management via Redis for session persistence
  * Dynamic loading indicators and intelligent message chunking

* **Multi-Language Support:** Available in English and Bahasa Indonesia

* **24/7 Availability:** Always-on support with automated safety monitoring
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

### 📚 Evidence-Based Resources & Interventions

- **Intervention Plan System:**
  - Database-backed storage and tracking of intervention plans
  - Step-by-step guidance with visual progress indicators
  - Automated generation via Support Coach Agent (SCA)
  - Manual creation and editing by clinical staff

- **Curated Content:**
  - Mental health resources based on Indonesian clinical guidelines (JUKNIS P2 Gangguan Mental Emosional)
  - Crisis support with immediate access to emergency resources and helplines
  - Personalized recommendations with ethical guardrails

### 🎮 Gamification & Engagement

- **NFT Achievement Badges:**
  - Unique NFT badges on Polygon Amoy testnet for achieving milestones
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

- **Safety Desk Dashboard:** Monitor active cases, SLA compliance, and escalation queues
- **Insights Dashboard:** Privacy-preserving analytics with differential privacy
- **Intervention Plan Management:** Track and manage automated and manual plans
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
- **LLM Providers:** Google Gemini (hosted) and local Gemma 3 pipelines
- **Agent Orchestration:** LangGraph as "Central Nervous System" for Safety Agent routing
- **Task Automation:** N8N for peripheral automation workflows
- **Background Jobs:** APScheduler for scheduled tasks (email check-ins, analytics)
- **Authentication:** JWT validation with NextAuth integration
- **API Documentation:** Auto-generated OpenAPI/Swagger documentation
- **Authentication:** JWT (`python-jose`), Passlib for password hashing
- **LLM Integration:** Google Generative AI SDK (Gemini) and `httpx` for optional Gemma 3 service
- **Task Scheduling:** APScheduler for background jobs
- **Validation:** Pydantic for request/response schema validation
- **Email:** SMTP integration via `smtplib` and `email` modules

### Blockchain

- **Framework:** Hardhat for smart contract development
- **Language:** Solidity (0.8.28)
- **Libraries:** OpenZeppelin Contracts for secure NFT standards
- **Testing:** Hardhat Toolbox (Chai, Mocha)
- **Network:** Polygon Amoy Testnet (primary), EDUChain Testnet (experimental)
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
│   │   │   ├── sta/        # Safety Triage Agent
│   │   │   ├── sca/        # Support Coach Agent
│   │   │   ├── sda/        # Service Desk Agent
│   │   │   ├── ia/         # Intelligence Analytics
│   │   │   ├── orchestrator.py  # LangGraph orchestration
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
│   │   │       └── safety-desk/  # Safety Desk dashboard (planned)
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
│   ├── hybrid-architecture-guide.md   # LangGraph + N8N architecture
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

* Node.js (v18+ recommended)
* npm or yarn or pnpm
* Python (3.9+ recommended)
* pip and virtualenv (`python -m venv venv`)
* PostgreSQL Server
* Redis Server (v6+ recommended)
* Access keys for:
  * Google Cloud (for OAuth Credentials)
  * LLM Providers (Google Gemini API key; optional configuration for the local Gemma service)
  * Redis Cloud (or local connection details)
  * Blockchain Testnet (e.g., Alchemy/Infura API Key for Polygon Amoy) + Private Key for Deployer/Minter Wallet
  * Email Service (e.g., Gmail App Password or Resend API Key if used)

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
    # Setup PostgreSQL database (create user/db if needed)
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

* Frontend usually runs on `http://localhost:4000`
* Backend usually runs on `http://localhost:8000` (API docs at `http://localhost:8000/docs`)
* Hardhat node usually runs on `http://127.0.0.1:8545/`

## Environment Variables

Create the necessary `.env` (for backend/blockchain) and `.env.local` (for frontend) files. Fill them based on the `.env.example` files inside each directory.

## 🔑 Key Components & Architecture

### Multi-Agent Orchestration

- **LangGraph Orchestrator:** `backend/app/agents/orchestrator.py` manages intent classification and routes questions to the appropriate Safety Agent (STA, SCA, SDA, or IA)
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
- **Admin Routes:** Protected admin dashboards under `frontend/src/app/(admin)/` (Safety Desk planned)
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

### Safety Agent Configuration

- **Feature Flags:** Enable/disable individual agents (STA, SCA, SDA, IA) via environment variables
- **LangGraph Configuration:** Configure agent routing and orchestration parameters
- **Privacy Settings:** Set differential privacy budgets (ε-δ) for Analytics Agent
- **Consent Policies:** Configure consent workflows and withdrawal handling
- **Crisis Protocols:** Customize escalation thresholds and human oversight triggers

## 📖 Documentation

For detailed documentation on specific aspects of the project:

- **[Safety Agent Refactor Plan](docs/refactor_plan.md)** - Implementation roadmap and technical specifications
- **[Project Single Source of Truth](PROJECT_SINGLE_SOURCE_OF_TRUTH.md)** - Canonical architecture reference
- **[Mental Health AI Guidelines](docs/mental-health-ai-guidelines.md)** - Ethics, crisis playbooks, and cultural context
- **[Hybrid Architecture Guide](docs/hybrid-architecture-guide.md)** - LangGraph + N8N architecture details
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
3. **Intent classification:** LangGraph orchestrator routes to appropriate agent:
   - Crisis detected → **STA** escalates with crisis resources
   - Coaching needed → **SCA** generates personalized intervention plan
   - Case management → **SDA** creates case timeline (admin view)
   - Analytics query → **IA** provides privacy-preserving insights (admin view)
4. **Intervention delivery:** Plans stored in database, displayed with progress tracking
5. **Continuous monitoring:** Ongoing support with consent-aware data collection

### Safety Agent Workflow

```
User Message → LangGraph Orchestrator
              ↓
    ┌─────────┴─────────┬──────────┬──────────┐
    ↓                   ↓          ↓          ↓
   STA                 SCA        SDA        IA
(Crisis Triage)   (Coaching)  (Cases)  (Analytics)
    ↓                   ↓          ↓          ↓
Crisis Banner    Intervention   Case      Insights
& Resources         Plans      Timeline   Dashboard
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

**Built with ❤️ for university mental health by the UGM AICare Team**
