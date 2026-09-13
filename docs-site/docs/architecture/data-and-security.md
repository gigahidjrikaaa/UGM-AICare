---
sidebar_position: 4
---

# Data Architecture, Security & Deployment

This document consolidates UGM-AICare's component architecture, database schema, data flows, security controls, and deployment topology into a single reference.

---

## Component Architecture

### High-Level Component Diagram

```mermaid
graph TB
    subgraph "Presentation Layer"
        subgraph "Next.js Frontend"
            CHAT["Chat Interface<br/>SSE Streaming"]
            DASH_S["Student Dashboard<br/>Journal, Activities, Tokens"]
            DASH_C["Counselor Portal<br/>Cases, Patients, Schedule"]
            DASH_A["Admin Console<br/>Analytics, Config, Audit"]
            AUTH_FE["NextAuth.js<br/>Session Management"]
            WEB3["Web3 Provider<br/>Wallet Connection"]
        end
    end

    subgraph "Application Layer"
        subgraph "FastAPI Backend"
            API_GATEWAY["API Gateway<br/>CORS, Auth, Rate Limiting"]
            MW["Middleware Stack<br/>RequestContext, Activity, Performance"]
            METRICS["Prometheus Metrics<br/>/metrics endpoint"]
        end

        subgraph "Mental Health Domain"
            CHAT_SVC["Chat Service<br/>Message handling, SSE broadcast"]
            CASE_SVC["Case Service<br/>Case lifecycle, SLA tracking"]
            APT_SVC["Appointment Service<br/>Booking, scheduling"]
            JOURNAL_SVC["Journal Service<br/>Entries, prompts"]
            SCREENING_SVC["Screening Service<br/>Profile management, scoring"]
            QUEST_SVC["Quest Service<br/>Gamification, rewards"]
            SURVEY_SVC["Survey Service<br/>Explicit assessments"]
        end

        subgraph "Auth & User Domain"
            AUTH_SVC["Auth Service<br/>JWT, OAuth, DID"]
            PROFILE_SVC["Profile Service<br/>User data, preferences"]
        end
    end

    subgraph "Agent Layer"
        subgraph "Aika Orchestrator"
            DECISION["Decision Node<br/>Intent + Risk classification"]
            SYNTH["Synthesis Node<br/>Response merging"]
            TOOL_LOOP["Tool-Calling Loop<br/>ReAct pattern"]
            SCREENING_AW["Screening Awareness<br/>Gap analysis + probing"]
            AUTOPILOT["Autopilot Worker<br/>Policy evaluation + execution"]
        end

        subgraph "STA — Safety Triage"
            STA_INGEST["Ingest Node"]
            STA_REDACT["PII Redaction Node"]
            STA_ASSESS["Risk Assessment Node<br/>Keyword + LLM"]
            STA_ROUTE["Routing Decision"]
            STA_CONV["Conversation Analyzer<br/>Deep post-conversation analysis"]
        end

        subgraph "TCA — Therapeutic Coach"
            TCA_GRAPH["TCA Graph<br/>Plan generation"]
            TCA_PLAN["Gemini Plan Generator<br/>CBT prompt templates"]
            TCA_SAFETY["Safety Review Gate"]
            TCA_ACTIVITIES["Activity Catalog<br/>Wellness resources"]
        end

        subgraph "CMA — Case Management"
            CMA_GRAPH["CMA Graph<br/>Case workflow"]
            CMA_ASSIGN["Assignment Algorithm<br/>Counselor scoring"]
            CMA_SLA["SLA Enforcement<br/>Deadline tracking"]
        end

        subgraph "IA — Insights Agent"
            IA_GRAPH["IA Graph<br/>Privacy pipeline"]
            IA_CONSENT["Consent Validation"]
            IA_KANON["k-Anonymity Enforcement"]
            IA_INTERPRET["LLM Interpreter<br/>Natural language results"]
            IA_PDF["PDF Report Generator"]
        end

        subgraph "Shared Infrastructure"
            TOOL_REG["Tool Registry<br/>@register_tool decorator"]
            LLM_DISPATCH["LLM Dispatch<br/>Gemini + Fallback chains"]
            EXEC_TRACK["Execution Tracker<br/>LangGraph telemetry"]
            CHECKPOINTER["Postgres Checkpointer<br/>AsyncPostgresSaver"]
        end
    end

    subgraph "Blockchain Domain"
        CARE["CARE Token Client<br/>SOMNIA Chain"]
        NFT["NFT Client<br/>EDU Chain / BNB"]
        ATTEST["Attestation Client<br/>Multi-chain"]
        STAKING["Staking Client<br/>Token staking"]
    end

    subgraph "Infrastructure Layer"
        PG[("PostgreSQL<br/>Primary data store<br/>+ LangGraph checkpointing")]
        REDIS[("Redis<br/>Cache + Rate limiting<br/>+ Session tracking")]
        S3[("Object Storage<br/>Avatars, media")]
        SCHEDULER["APScheduler<br/>Background jobs"]
    end

    CHAT --> API_GATEWAY
    DASH_S --> API_GATEWAY
    DASH_C --> API_GATEWAY
    DASH_A --> API_GATEWAY
    AUTH_FE --> API_GATEWAY

    API_GATEWAY --> MW --> METRICS

    API_GATEWAY --> CHAT_SVC
    API_GATEWAY --> CASE_SVC
    API_GATEWAY --> APT_SVC
    API_GATEWAY --> JOURNAL_SVC
    API_GATEWAY --> SCREENING_SVC
    API_GATEWAY --> AUTH_SVC
    API_GATEWAY --> PROFILE_SVC
    API_GATEWAY --> QUEST_SVC
    API_GATEWAY --> SURVEY_SVC

    CHAT_SVC --> DECISION
    DECISION --> SYNTH
    DECISION --> TOOL_LOOP
    DECISION --> SCREENING_AW
    DECISION --> AUTOPILOT

    DECISION --> STA_INGEST
    STA_INGEST --> STA_REDACT --> STA_ASSESS --> STA_ROUTE
    STA_CONV --> SCREENING_SVC

    DECISION --> TCA_GRAPH
    TCA_GRAPH --> TCA_PLAN & TCA_SAFETY & TCA_ACTIVITIES

    DECISION --> CMA_GRAPH
    CMA_GRAPH --> CMA_ASSIGN & CMA_SLA
    CMA_ASSIGN --> CASE_SVC & APT_SVC

    DECISION --> IA_GRAPH
    IA_GRAPH --> IA_CONSENT --> IA_KANON --> IA_INTERPRET --> IA_PDF

    TOOL_LOOP --> TOOL_REG
    DECISION --> LLM_DISPATCH
    STA_ASSESS --> LLM_DISPATCH
    TCA_PLAN --> LLM_DISPATCH
    IA_INTERPRET --> LLM_DISPATCH

    CHAT_SVC --> CHECKPOINTER
    CHAT_SVC --> EXEC_TRACK

    CASE_SVC --> CARE & ATTEST
    QUEST_SVC --> NFT & CARE

    API_GATEWAY --> PG
    CHAT_SVC --> PG
    API_GATEWAY --> REDIS
    API_GATEWAY --> S3
    MW --> SCHEDULER

    style DECISION fill:#ffd93d,color:#333
    style PG fill:#336791,color:#fff
    style REDIS fill:#dc382d,color:#fff
```

### Backend Package Structure

```
backend/
├── app/
│   ├── main.py                          # FastAPI app, lifespan, router registration
│   ├── config.py                        # Pydantic BaseSettings (env-backed)
│   ├── startup.py                       # Shared bootstrap logic
│   ├── auth_utils.py                    # JWT helpers, role verification
│   │
│   ├── agents/                          # LangGraph Agent Implementations
│   │   ├── graph_state.py              # AikaOrchestratorState + agent states
│   │   ├── aika_orchestrator_graph.py   # Graph assembly + singleton cache
│   │   ├── aika/                        # Aika Meta-Agent
│   │   │   ├── decision_node.py         # Intent classification + risk routing
│   │   │   ├── subgraph_nodes.py        # TCA/CMA/IA/STA execution wrappers
│   │   │   ├── background_tasks.py      # STA trigger + screening update
│   │   │   ├── prompt_builder.py        # Context assembly for LLM
│   │   │   ├── message_classifier.py    # Small-talk detection
│   │   │   ├── identity.py              # Persona system prompt builder
│   │   │   ├── activity_logger.py       # SSE event broadcasting
│   │   │   ├── screening_awareness.py   # Gap analysis + probing
│   │   │   ├── tools.py                 # Aika-specific tool definitions
│   │   │   ├── constants.py             # Shared constants
│   │   │   └── routing.py               # Route computation helpers
│   │   ├── sta/                         # Safety Triage Agent
│   │   │   ├── sta_graph.py             # STA state machine
│   │   │   ├── service.py               # STA service wrapper
│   │   │   ├── gemini_classifier.py     # Gemini-based risk classifier
│   │   │   ├── classifiers.py           # Rule-based classifiers
│   │   │   └── conversation_analyzer.py # Deep post-conversation analysis
│   │   ├── tca/                         # Therapeutic Coach Agent
│   │   │   ├── tca_graph.py             # TCA LangGraph
│   │   │   ├── tca_graph_service.py     # TCA service wrapper
│   │   │   ├── gemini_plan_generator.py # CBT prompt templates + plan gen
│   │   │   ├── service.py               # TCA fallback orchestration
│   │   │   ├── activities_catalog.py    # Wellness activity library
│   │   │   ├── resources.py             # Default resource cards
│   │   │   └── schemas.py               # Request/response DTOs
│   │   ├── cma/                         # Case Management Agent
│   │   │   ├── cma_graph.py             # CMA LangGraph
│   │   │   ├── cma_graph_service.py     # CMA service wrapper
│   │   │   ├── service.py               # Case CRUD + assignment
│   │   │   ├── sla.py                   # SLA deadline computation
│   │   │   └── schemas.py               # Request/response DTOs
│   │   ├── ia/                          # Insights Agent
│   │   │   ├── ia_graph.py              # IA privacy-preserving pipeline
│   │   │   ├── ia_graph_service.py      # IA service wrapper
│   │   │   ├── service.py               # Analytics orchestration
│   │   │   ├── llm_interpreter.py       # LLM-based result interpretation
│   │   │   ├── queries.py               # Allow-listed query definitions
│   │   │   ├── pdf_generator.py         # PDF report generation
│   │   │   └── schemas.py               # Request/response DTOs
│   │   └── shared/                      # Shared Agent Infrastructure
│   │       └── tools/
│   │           ├── registry.py          # @register_tool + schema generation
│   │           └── __init__.py          # Tool exports
│   │
│   ├── core/                            # Cross-cutting Infrastructure
│   │   ├── llm.py                       # LLM dispatch + fallback + circuit breaker
│   │   └── ...                          # Auth, cache, scheduler, redaction, memory
│   │
│   ├── domains/
│   │   ├── mental_health/               # Primary business domain
│   │   │   ├── routes/                  # API route modules
│   │   │   │   ├── chat.py             # Chat endpoint + SSE streaming
│   │   │   │   ├── agents_graph.py     # Agent graph execution endpoint
│   │   │   │   ├── aika_stream.py      # Aika SSE streaming endpoint
│   │   │   │   ├── safety_triage.py    # STA manual trigger endpoint
│   │   │   │   ├── appointments.py     # Appointment CRUD
│   │   │   │   ├── counselor.py        # Counselor-specific endpoints
│   │   │   │   ├── journal.py          # Journal entry endpoints
│   │   │   │   ├── quests.py           # Quest endpoints
│   │   │   │   ├── surveys.py          # Survey endpoints
│   │   │   │   └── ...                 # feedback, session_events, etc.
│   │   │   ├── screening/              # Screening engine
│   │   │   │   ├── instruments.py      # Instrument definitions + thresholds
│   │   │   │   └── engine.py           # Profile update logic
│   │   │   └── services/               # Domain services
│   │   ├── blockchain/                  # Blockchain integration
│   │   │   ├── clients/                # Web3 clients
│   │   │   └── routes/                 # Blockchain API routes
│   │   └── finance/                     # Revenue + token economics
│   │
│   ├── models/                          # SQLAlchemy ORM Models
│   │   ├── user.py                      # User entity
│   │   ├── user_profile.py             # UserProfile
│   │   ├── user_session.py             # UserSession
│   │   ├── user_consent_ledger.py      # Consent tracking
│   │   ├── user_audit_log.py           # Audit trail
│   │   ├── user_ai_memory_fact.py      # AI memory
│   │   ├── user_activity.py            # Activity tracking
│   │   ├── langgraph_tracking.py       # Agent execution tracking
│   │   ├── badges.py                   # Badge templates + issuances
│   │   ├── campaign.py                 # Campaigns + metrics
│   │   ├── alerts.py                   # System alerts
│   │   ├── insights.py                 # Analytics reports
│   │   └── ...                         # scheduling, system, social, agent_user
│   │
│   ├── routes/                          # Top-level API Routes
│   │   ├── auth.py                      # Authentication endpoints
│   │   ├── profile.py                  # Profile management
│   │   ├── proof.py                    # Blockchain proof
│   │   ├── link_did.py                 # DID wallet linking
│   │   ├── link_ocid.py               # Open Campus ID linking
│   │   ├── system.py                  # System health
│   │   ├── internal.py                # Internal APIs
│   │   └── admin/                     # Admin route modules
│   │       ├── dashboard.py
│   │       ├── users.py
│   │       ├── autopilot.py
│   │       ├── analytics.py
│   │       ├── screening.py
│   │       ├── insights.py
│   │       ├── agent_decisions.py
│   │       ├── attestations.py
│   │       └── ...                    # 20+ admin route modules
│   │
│   ├── shared/                          # Shared utilities
│   └── utils/                           # Helper functions
│       ├── security_utils.py
│       ├── email_utils.py
│       ├── password_reset.py
│       └── env_check.py
│
├── tests/                               # Test suite
├── scripts/                             # DB seeding, migrations, tools
└── research_evaluation/                 # Research evaluation framework
```

### Communication Protocols

| From → To | Protocol | Purpose |
|-----------|----------|---------|
| Frontend → Backend | REST (HTTPS) | All CRUD operations, auth |
| Frontend → Backend | SSE (HTTPS) | Chat response streaming |
| Backend → Gemini API | REST (HTTPS) | LLM inference calls |
| Backend → PostgreSQL | Async SQL (TCP) | Data persistence, LangGraph checkpointing |
| Backend → Redis | Async Redis (TCP) | Caching, rate limiting, session tracking |
| Backend → Ethereum | JSON-RPC (HTTPS) | Smart contract calls, attestation |
| Backend → Frontend | SSE push | Real-time activity events |
| Agents → Tool Registry | Python function call | Tool execution |
| Aika → TCA/CMA/IA | LangGraph state passing | Sub-agent invocation |
| Aika → STA | Background task (asyncio) | Post-conversation analysis |
| Scheduler → Backend | In-process (APScheduler) | Cron-like background jobs |

### Singleton Pattern

The Aika graph is compiled exactly once during FastAPI startup and reused for all requests:

```mermaid
sequenceDiagram
    participant LIFESPAN as FastAPI Lifespan
    participant GRAPH as Graph Builder
    participant CACHE as Singleton Cache
    participant REQ as HTTP Request

    LIFESPAN->>GRAPH: create_aika_unified_graph()
    GRAPH->>GRAPH: Wire nodes + conditional edges
    GRAPH->>GRAPH: compile() with AsyncPostgresSaver
    GRAPH->>CACHE: set_aika_agent(compiled_graph)

    loop Every Request
        REQ->>CACHE: get_aika_agent()
        CACHE-->>REQ: Cached compiled graph
        REQ->>REQ: Invoke with state + config[db]
    end
```

---

## Database Schema

UGM-AICare uses PostgreSQL as its primary data store with SQLAlchemy 2.0 async ORM.

### Entity-Relationship Diagram

```mermaid
erDiagram
    User {
        int id PK
        string email UK
        string name
        string role "student, counselor, admin"
        string password_hash
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    UserProfile {
        int id PK
        int user_id FK
        string avatar_url
        string bio
        string faculty
        int semester
        string language_preference
        string phone
    }

    UserSession {
        int id PK
        int user_id FK
        string token
        string ip_address
        string user_agent
        datetime expires_at
    }

    UserPreferences {
        int id PK
        int user_id FK
        json notification_settings
        string theme
        string language
    }

    UserConsentLedger {
        int id PK
        int user_id FK
        string consent_type
        boolean granted
        datetime timestamp
        string source
    }

    UserAuditLog {
        int id PK
        int user_id FK
        string action
        string resource
        datetime timestamp
        string ip_address
    }

    UserEmergencyContact {
        int id PK
        int user_id FK
        string name
        string relationship
        string phone
    }

    UserClinicalRecord {
        int id PK
        int user_id FK
        string record_type
        text content
        datetime created_at
    }

    UserAIMemoryFact {
        int id PK
        int user_id FK
        string fact_type
        text content
        float confidence
        datetime created_at
    }

    UserDailyActivity {
        int id PK
        int user_id FK
        date date
        int events_count
        boolean active
    }

    UserEvent {
        int id PK
        int user_id FK
        string event_type
        json metadata
        datetime timestamp
    }

    RetentionCohortDaily {
        int id PK
        date cohort_date
        int days_since_signup
        int active_users
        int total_users
    }

    AgentUser {
        int id PK
        string role "aika, sta, tca, cma, ia"
        string name
        text description
    }

    User ||--|| UserProfile : "has one"
    User ||--o{ UserSession : "has many"
    User ||--|| UserPreferences : "has one"
    User ||--o{ UserConsentLedger : "has many"
    User ||--o{ UserAuditLog : "has many"
    User ||--o{ UserEmergencyContact : "has many"
    User ||--o{ UserClinicalRecord : "has many"
    User ||--o{ UserAIMemoryFact : "has many"
    User ||--o{ UserDailyActivity : "has many"
    User ||--o{ UserEvent : "has many"

    Conversation {
        int id PK
        int user_id FK
        string title
        datetime started_at
        datetime ended_at
        string status "active, completed"
    }

    Message {
        int id PK
        int conversation_id FK
        string role "user, assistant, system"
        text content
        int tokens_used
        datetime created_at
    }

    ConversationRiskAssessment {
        int id PK
        int conversation_id FK
        int risk_level "0 to 3"
        float risk_score
        string severity "none, low, moderate, high, critical"
        text summary
        json instruments_extracted
        datetime created_at
    }

    ScreeningProfile {
        int id PK
        int user_id FK
        float phq9_score
        float gad7_score
        float dass21_stress
        float dass21_depression
        float dass21_anxiety
        float psqi_score
        float ucla_loneliness
        float rses_score
        float csrss_score
        float audit_score
        float ssi_score
        datetime last_updated
        float decay_factor
    }

    User ||--o{ Conversation : "has many"
    Conversation ||--o{ Message : "contains"
    Conversation ||--o| ConversationRiskAssessment : "assessed by"

    User ||--o| ScreeningProfile : "has one"

    Case {
        int id PK
        int user_id FK
        int counselor_id FK
        string status "open, assigned, appointment_scheduled, in_session, pending_attestation, closed"
        int risk_level
        int priority
        datetime sla_deadline
        datetime opened_at
        datetime closed_at
    }

    Appointment {
        int id PK
        int user_id FK
        int counselor_id FK
        int case_id FK
        datetime scheduled_at
        int duration_minutes
        string status "scheduled, confirmed, completed, cancelled, no_show"
        text notes
    }

    InterventionPlan {
        int id PK
        int user_id FK
        int conversation_id FK
        string plan_type
        json steps
        string status "active, completed, superseded"
        datetime created_at
    }

    JournalEntry {
        int id PK
        int user_id FK
        text content
        int mood_score
        string tags
        datetime created_at
    }

    JournalPrompt {
        int id PK
        string category
        text prompt_text
        string frequency
    }

    Feedback {
        int id PK
        int user_id FK
        int conversation_id FK
        int rating
        text comment
        datetime created_at
    }

    Resource {
        int id PK
        string title
        string type
        string category
        string url
        text content
        string language
        boolean is_active
    }

    User ||--o{ Case : "student cases"
    User ||--o{ Case : "counselor assigned"
    Case ||--o{ Appointment : "has many"
    User ||--o{ Appointment : "student booked"
    User ||--o{ Appointment : "counselor session"
    User ||--o{ InterventionPlan : "has many"
    Conversation ||--o{ InterventionPlan : "generated from"
    User ||--o{ JournalEntry : "writes"
    User ||--o{ Feedback : "gives"
    Conversation ||--o{ Feedback : "receives"

    TherapistSchedule {
        int id PK
        int counselor_id FK
        int day_of_week
        time start_time
        time end_time
        boolean is_available
    }

    CaseAssignment {
        int id PK
        int case_id FK
        int counselor_id FK
        float assignment_score
        datetime assigned_at
    }

    User ||--o{ TherapistSchedule : "counselor schedule"
    Case ||--o{ CaseAssignment : "assignment history"

    CaseAttestation {
        int id PK
        int case_id FK
        int counselor_id FK
        string content_hash
        string tx_hash
        int chain_id
        int block_number
        datetime submitted_at
    }

    BadgeTemplate {
        int id PK
        string name
        text description
        string image_url
        json criteria
        int chain_id
        string contract_address
        string status "draft, active, deprecated"
    }

    BadgeIssuance {
        int id PK
        int badge_template_id FK
        int user_id FK
        int token_id
        string tx_hash
        int chain_id
        datetime issued_at
        string status "pending, minted, failed"
    }

    Case ||--o| CaseAttestation : "attested"
    User ||--o{ CaseAttestation : "counselor submits"
    BadgeTemplate ||--o{ BadgeIssuance : "issued as"
    User ||--o{ BadgeIssuance : "earned by"

    InsightsReport {
        int id PK
        int generated_by FK
        string report_type
        json parameters
        json results
        boolean k_anonymity_enforced
        datetime created_at
    }

    Campaign {
        int id PK
        string name
        string type
        string target_audience
        string status "draft, active, paused, completed"
        string trigger_type
        text content
        datetime started_at
        datetime ended_at
    }

    CampaignMetrics {
        int id PK
        int campaign_id FK
        int sent_count
        int open_count
        int response_count
        int conversion_count
    }

    User ||--o{ InsightsReport : "generates"
    Campaign ||--o| CampaignMetrics : "measured by"

    Quest {
        int id PK
        string title
        text description
        string quest_type
        int xp_reward
        int token_reward
        boolean is_active
    }

    QuestCompletion {
        int id PK
        int quest_id FK
        int user_id FK
        datetime completed_at
        text evidence
    }

    Quest ||--o{ QuestCompletion : "completed as"
    User ||--o{ QuestCompletion : "completed by"

    LangGraphExecution {
        int id PK
        string thread_id
        string graph_name
        string status "running, completed, failed"
        datetime started_at
        datetime completed_at
        int total_tokens
    }

    LangGraphNodeExecution {
        int id PK
        int execution_id FK
        string node_name
        string agent_role
        int input_tokens
        int output_tokens
        int latency_ms
        string status
        text error_message
    }

    LangGraphEdgeExecution {
        int id PK
        int execution_id FK
        string from_node
        string to_node
        string condition
        datetime timestamp
    }

    LangGraphPerformanceMetric {
        int id PK
        string graph_name
        string node_name
        int avg_latency_ms
        int p95_latency_ms
        float success_rate
        int sample_size
        datetime measured_at
    }

    LangGraphAlert {
        int id PK
        int execution_id FK
        string alert_type
        string severity
        text message
        datetime created_at
    }

    LangGraphExecution ||--o{ LangGraphNodeExecution : "contains"
    LangGraphExecution ||--o{ LangGraphEdgeExecution : "traverses"
    LangGraphExecution ||--o{ LangGraphAlert : "raises"

    AutopilotAction {
        int id PK
        int user_id FK
        string action_type
        int risk_level
        string policy_decision "allow, require_approval, deny"
        string status "queued, approved, executed, failed, rejected"
        string tx_hash
        datetime created_at
        datetime executed_at
    }

    Alert {
        int id PK
        string type
        string severity
        text message
        string target_role
        boolean is_read
        datetime created_at
    }

    SystemSettings {
        int id PK
        string key UK
        string value
        datetime updated_at
    }

    AgentHealthLog {
        int id PK
        string agent_role
        string status
        int latency_ms
        text error_message
        datetime timestamp
    }

    FlaggedSession {
        int id PK
        int conversation_id FK
        string flag_reason
        int reviewed_by FK
        datetime reviewed_at
    }

    User ||--o{ AutopilotAction : "triggers"
    Conversation ||--o{ FlaggedSession : "flagged as"
```

### Relationship Cardinality Summary

| Relationship | Cardinality | Description |
|-------------|-------------|-------------|
| User → UserProfile | 1:1 | Every user has exactly one profile |
| User → UserSession | 1:N | A user can have multiple active sessions |
| User → ScreeningProfile | 1:1 | One longitudinal screening profile per student |
| User → Conversation | 1:N | A student has many conversations |
| Conversation → Message | 1:N | Each conversation contains multiple messages |
| Conversation → ConversationRiskAssessment | 1:0..1 | Background STA creates one assessment per conversation |
| User → Case | 1:N (student) | A student can have multiple cases over time |
| User → Case | 1:N (counselor) | A counselor handles many cases |
| Case → Appointment | 1:N | A case may have multiple appointments |
| Case → CaseAttestation | 1:0..1 | One attestation per case upon closure |
| LangGraphExecution → NodeExecution | 1:N | Each graph run produces multiple node records |

### Key Design Decisions

#### Privacy by Design

- **Pseudonymization:** Analytics queries use `user_hash` (SHA-256 of user ID) instead of direct user identifiers
- **PII Redaction:** The `ConversationRiskAssessment` and analytics pipelines operate on redacted text only; original message content is accessible only through authenticated API calls with role-based access
- **Consent Ledger:** Every data access event is recorded in `UserConsentLedger`; no analytics query executes without checking consent coverage
- **k-Anonymity Enforcement:** IA queries include `GROUP BY` with `HAVING COUNT >= 5` to prevent re-identification

#### JSON Fields

Several columns use PostgreSQL `JSON`/`JSONB` types for flexible schema evolution:

| Table | Field | Purpose |
|-------|-------|---------|
| ConversationRiskAssessment | `instruments_extracted` | Extracted screening scores per instrument |
| InterventionPlan | `steps` | Ordered list of plan steps with descriptions |
| UserPreferences | `notification_settings` | Notification channel preferences |
| UserEvent | `metadata` | Flexible event-specific data |
| InsightsReport | `parameters` | Query parameters used |
| InsightsReport | `results` | Query result payload |
| BadgeTemplate | `criteria` | Badge earning criteria definition |
| Campaign | `target_audience` | Audience targeting rules |

#### Soft Deletes & Archival

- User accounts use `is_active` flag rather than hard deletion to preserve referential integrity and audit trails
- Conversation `status` field tracks lifecycle (active → completed) rather than deletion
- Cases transition through defined states (open → closed) and are never deleted

#### Longitudinal Tracking

The `ScreeningProfile` entity uses exponential decay scoring:

```
new_score = old_score × decay_factor + extracted_weight × update_factor
```

Where `decay_factor = 0.95` by default, ensuring recent indicators are weighted more heavily while maintaining longitudinal history across conversations.

#### Index Strategy

| Index Target | Type | Rationale |
|-------------|------|-----------|
| `User.email` | Unique B-tree | Login lookup, OAuth matching |
| `UserSession.token` | Unique B-tree | O(1) session validation |
| `Conversation.user_id` | B-tree | Fast user conversation list |
| `Message.conversation_id` | B-tree | Message thread retrieval |
| `Case.counselor_id` + `status` | Composite B-tree | Counselor case queue |
| `Case.sla_deadline` | B-tree | SLA breach detection |
| `Appointment.scheduled_at` | B-tree | Upcoming appointment queries |
| `ScreeningProfile.user_id` | Unique B-tree | Profile lookup |
| `AutopilotAction.status` | B-tree | Queue filtering |
| `LangGraphExecution.thread_id` | B-tree | Thread state retrieval |
| `UserEvent.user_id` + `timestamp` | Composite B-tree | Activity timeline queries |

---

## Data Flow

### Level 0 — Context Diagram

```mermaid
graph LR
    STU["👤 Students"]
    CNS["👩‍⚕️ Counselors"]
    ADM["🏛️ Administrators"]
    GEM["🌐 Gemini API"]
    ETH["⛓️ Blockchain<br/>SOMNIA / EDU Chain"]

    SYS["🔄 UGM-AICare<br/>System"]

    STU -->|"Chat messages,<br/>Journal entries,<br/>Survey responses"| SYS
    SYS -->|"SSE responses,<br/>Appointments,<br/>Tokens & Badges"| STU

    CNS -->|"Session notes,<br/>Attestations"| SYS
    SYS -->|"Risk assessments,<br/>Case assignments,<br/>Screening profiles"| CNS

    ADM -->|"Analytics queries,<br/>Policy configs"| SYS
    SYS -->|"Dashboards,<br/>Reports,<br/>Alerts"| ADM

    SYS <-->|"LLM prompts<br/>+ responses"| GEM
    SYS -->|"Hash attestations,<br/>Token transactions"| ETH

    style SYS fill:#4dabf7,color:#fff
```

### Level 1 — Process Decomposition

```mermaid
graph TB
    subgraph External
        STU["👤 Students"]
        CNS["👩‍⚕️ Counselors"]
        ADM["🏛️ Admins"]
        GEM["🌐 Gemini API"]
        ETH["⛓️ Blockchain"]
    end

    subgraph Data Stores
        D1[("D1: Users & Profiles")]
        D2[("D2: Conversations")]
        D3[("D3: Risk Assessments")]
        D4[("D4: Cases")]
        D5[("D5: Appointments")]
        D6[("D6: Screening Profiles")]
        D7[("D7: Analytics Cache")]
    end

    P1["P1: Message Ingestion<br/>& Routing"]
    P2["P2: Agent Orchestration<br/>(Aika Decision)"]
    P3["P3: Safety Triage<br/>& Screening (STA)"]
    P4["P4: Therapeutic<br/>Intervention (TCA)"]
    P5["P5: Case & Appointment<br/>Management (CMA)"]
    P6["P6: Analytics &<br/>Insights (IA)"]
    P7["P7: Data Persistence<br/>& State Mgmt"]
    P8["P8: Blockchain<br/>Operations"]

    STU -->|"messages"| P1
    P1 -->|"classified intent + risk"| P2
    P2 -->|"risk context"| P3
    P2 -->|"moderate risk"| P4
    P2 -->|"high risk"| P5
    ADM -->|"analytics queries"| P6

    P1 --> P7
    P2 --> P7
    P3 --> P7
    P4 --> P7
    P5 --> P7
    P6 --> P7
    P5 --> P8

    P7 --> D1
    P7 --> D2
    P7 --> D3
    P7 --> D4
    P7 --> D5
    P7 --> D6
    P7 --> D7

    P2 <-->|"LLM calls"| GEM
    P3 <-->|"LLM calls"| GEM
    P4 <-->|"LLM calls"| GEM
    P6 <-->|"LLM calls"| GEM

    P8 -->|"attestations, tokens"| ETH

    P7 -->|"SSE responses"| STU
    P7 -->|"cases, assessments"| CNS
    P7 -->|"dashboards, reports"| ADM

    D3 --> P5
    D6 --> P5
    D4 --> CNS
    D3 --> CNS
    D7 --> ADM
```

### Chat Message Data Flow

Detailed trace of a single message from the student pressing "send" to receiving Aika's response.

```mermaid
flowchart TD
    START([Student presses Send]) --> FE["Frontend: POST /api/v1/aika<br/>message + session token"]
    FE --> AUTH["Backend: Validate JWT<br/>+ Load user role"]
    AUTH --> CTX["Load Context<br/>User profile + conversation history<br/>+ screening profile"]
    CTX --> GRAPH["Invoke Aika Graph<br/>(compiled singleton)"]

    GRAPH --> DECISION["aika_decision_node<br/>1. Keyword scan &lt; 5ms<br/>2. Small-talk check<br/>3. LLM intent + risk classification"]

    DECISION --> ROUTE{Routing}

    ROUTE --> |"risk HIGH/CRITICAL"| CRISIS["parallel_crisis_node<br/>TCA + CMA async"]
    ROUTE --> |"risk MODERATE"| TCA["execute_sca_subgraph<br/>TCA only"]
    ROUTE --> |"analytics query"| IA["execute_ia_subgraph<br/>IA with k-anonymity"]
    ROUTE --> |"direct response"| DIRECT["generate_direct_response<br/>ReAct tool loop"]

    CRISIS --> SYNTH["synthesize_final_response"]
    TCA --> SYNTH
    IA --> SYNTH
    DIRECT --> SYNTH

    SYNTH --> SSE["Stream response via SSE<br/>token-by-token"]
    SSE --> RENDER([Frontend renders<br/>response in chat])

    RENDER -.-> |"async, non-blocking"| BG["Background Tasks"]
    BG --> PERSIST["Persist message + response<br/>to DB"]
    BG --> STA["Trigger STA<br/>deep analysis"]

    subgraph "Background (2-10s)"
        STA --> REDACT["PII Redaction"]
        REDACT --> CLASSIFY["Gemini deep analysis<br/>+ screening extraction"]
        CLASSIFY --> ASSESS["Create ConversationRiskAssessment"]
        ASSESS --> PROFILE["Update ScreeningProfile<br/>with decay scoring"]
    end

    style DECISION fill:#ffd93d,color:#333
    style CRISIS fill:#ff6b6b,color:#fff
    style BG fill:#868e96,color:#fff
```

### Screening Data Flow

How covert psychological screening data flows from raw conversation through to counselor-visible reports.

```mermaid
flowchart LR
    subgraph "Input"
        MSG["Raw Message<br/>'I can't sleep and<br/>feel worthless'"]
    end

    subgraph "STA Message-Level Analysis"
        KW["Keyword Scan<br/>Crisis term check"]
        SEM["Semantic Analysis<br/>Gemini classification"]
        IND["Indicator Extraction<br/>Map to instruments"]
    end

    subgraph "Score Normalization"
        NORM["Normalize to 0-1 scale<br/>per instrument"]
        BAND["Apply severity bands<br/>None/Mild/Moderate/<br/>Severe/Critical"]
    end

    subgraph "Profile Update"
        DECAY["Apply exponential decay<br/>old × 0.95 + new × factor"]
        MERGE["Merge into<br/>ScreeningProfile"]
        COMPARE["Compare with<br/>previous scores"]
    end

    subgraph "Output"
        DASH["Counselor Dashboard<br/>Visual charts"]
        ALERT["Risk Alert<br/>If threshold exceeded"]
        TRIGGER["Case Trigger<br/>If risk HIGH+"]
        REPORT["Assessment Report<br/>Counselor-ready"]
    end

    MSG --> KW --> SEM --> IND --> NORM --> BAND --> DECAY --> MERGE
    MERGE --> COMPARE
    COMPARE --> DASH
    COMPARE --> ALERT
    COMPARE --> TRIGGER
    MERGE --> REPORT

    style KW fill:#ff6b6b,color:#fff
    style TRIGGER fill:#ff6b6b,color:#fff
```

#### Instrument Mapping

| Extracted Indicator | Mapped Instrument | Field in ScreeningProfile |
|--------------------|--------------------|--------------------------|
| Depressed mood, anhedonia, fatigue | PHQ-9 | `phq9_score` |
| Nervousness, uncontrollable worry | GAD-7 | `gad7_score` |
| Difficulty relaxing, agitation | DASS-21 Stress | `dass21_stress` |
| Sleep disturbance, daytime dysfunction | PSQI | `psqi_score` |
| Social withdrawal, loneliness | UCLA Loneliness | `ucla_loneliness` |
| Self-worth, self-acceptance | RSES | `rsss_score` |
| Suicidal ideation, self-harm | C-SSRS | `csrss_score` |
| Academic pressure, fear of failure | SSI | `ssi_score` |

### Analytics Query Data Flow

How an analytics query travels through the IA with privacy enforcement at every stage.

```mermaid
flowchart TD
    START([Admin/Counselor<br/>submits query]) --> API["API Layer: Parse query<br/>+ Authenticate user"]
    API --> IA_GRAPH["IA Graph: ingest_query_node"]
    IA_GRAPH --> CONSENT{Consent check<br/>All affected users<br/>consented?}
    CONSENT --> |No| DENIED["Query Denied<br/>Insufficient consent<br/>coverage"]
    CONSENT --> |Yes| VALIDATE["validate_consent_node<br/>Log consent verification"]

    VALIDATE --> BUILD["Build SQL Query<br/>from template"]
    BUILD --> K_ANON["apply_k_anonymity_node<br/>GROUP BY + HAVING COUNT ≥ 5"]
    K_ANON --> EXECUTE["Execute against DB<br/>Pseudonymized data"]

    EXECUTE --> CHECK_K{Results pass<br/>k-anonymity?}
    CHECK_K --> |No| SUPPRESS["Suppress small<br/>cell counts"]
    CHECK_K --> |Yes| DP["Apply Differential Privacy<br/>Laplace noise injection"]

    SUPPRESS --> DP
    DP --> INTERPRET["LLM Interpretation<br/>Natural language summary"]
    INTERPRET --> FORMAT["Format for Dashboard<br/>Charts + tables"]
    FORMAT --> DELIVER([Deliver to<br/>Admin Dashboard])

    DP --> PDF["Optional: Generate<br/>PDF Report"]
    PDF --> DOWNLOAD([Download Report])

    style DENIED fill:#ff6b6b,color:#fff
    style K_ANON fill:#51cf66,color:#fff
    style DP fill:#51cf66,color:#fff
```

### Tool Calling Data Flow

How Aika's tool-calling loop interacts with real data sources.

```mermaid
sequenceDiagram
    participant AIKA as Aika
    participant GEM as Gemini API
    participant REG as Tool Registry
    participant DB as PostgreSQL
    participant FE as Frontend

    AIKA->>GEM: Send message + tool schemas
    GEM-->>AIKA: Function call: get_available_counselors()

    AIKA->>REG: Execute get_available_counselors()
    REG->>DB: SELECT counselors WHERE specialty match<br/>ORDER BY caseload ASC
    DB-->>REG: Ranked counselor list
    REG-->>AIKA: Tool result: counselors data

    AIKA->>GEM: Re-prompt with tool result
    GEM-->>AIKA: Function call: suggest_appointment_times(counselor_id)

    AIKA->>REG: Execute suggest_appointment_times()
    REG->>DB: SELECT slots FROM TherapistSchedule<br/>WHERE available AND next 72h
    DB-->>REG: Available time slots
    REG-->>AIKA: Tool result: slots data

    AIKA->>GEM: Re-prompt with slot data
    GEM-->>AIKA: Natural language response<br/>"Bu Ratna has slots at..."

    AIKA->>FE: Stream response via SSE

    Note over AIKA,GEM: Max iterations per intent type:<br/>casual_chat=1, info=2, scheduling=4, other=3
```

---

## Security Architecture

UGM-AICare handles sensitive mental health data and must meet high security and privacy standards.

### Authentication Flow

The system supports multiple authentication methods, unified under a JWT-based session model.

```mermaid
sequenceDiagram
    actor STU as Student
    participant FE as Next.js Frontend
    participant NA as NextAuth.js
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant DID as DID Wallet

    alt Credentials Login
        STU->>FE: Enter email + password
        FE->>NA: signIn("credentials")
        NA->>API: POST /api/v1/auth/oauth/token
        API->>DB: Verify password hash
        DB-->>API: User verified
        API-->>NA: JWT access + refresh tokens
        NA-->>FE: Session created (cookie)
    else OAuth (Google/GitHub)
        STU->>FE: Click OAuth provider
        FE->>NA: signIn("google")
        NA->>NA: OAuth redirect + callback
        NA->>API: POST /api/v1/auth/oauth/token
        API->>DB: Upsert user from OAuth profile
        API-->>NA: JWT tokens
        NA-->>FE: Session created
    else DID Wallet Login
        STU->>FE: Connect wallet (MetaMask)
        FE->>DID: Sign challenge message
        DID-->>FE: Signed challenge
        FE->>API: POST /api/v1/auth/did-login
        API->>API: Verify signature
        API->>DB: Link DID to account
        API-->>FE: JWT tokens
        FE->>FE: Set session
    end

    Note over FE,API: All subsequent requests use<br/>Bearer token in Authorization header<br/>or httpOnly cookie

    FE->>API: GET /api/v1/profile (with JWT)
    API->>API: Verify JWT signature + expiry
    API->>API: Extract role from payload
    API->>API: Enforce RBAC for requested resource
    API-->>FE: Authorized response
```

### Role-Based Access Control

```mermaid
graph TB
    subgraph "Roles"
        STU["👤 Student"]
        CNS["👩‍⚕️ Counselor"]
        ADM["🏛️ Admin"]
    end

    subgraph "Student Resources"
        R1["Own profile"]
        R2["Own conversations"]
        R3["Own journal"]
        R4["Own appointments"]
        R5["Own tokens/badges"]
        R6["Public resources"]
    end

    subgraph "Counselor Resources"
        R7["Assigned cases"]
        R8["Assigned patient data"]
        R9["Risk assessments<br/>(assigned patients)"]
        R10["Own schedule"]
        R11["Attestation submission"]
    end

    subgraph "Admin Resources"
        R12["All users (CRUD)"]
        R13["All conversations (read)"]
        R14["System configuration"]
        R15["Analytics & insights"]
        R16["Autopilot management"]
        R17["Audit logs"]
        R18["Blockchain admin"]
        R19["Campaign management"]
    end

    STU --> R1 & R2 & R3 & R4 & R5 & R6
    CNS --> R1 & R7 & R8 & R9 & R10 & R11 & R6
    ADM --> R1 & R12 & R13 & R14 & R15 & R16 & R17 & R18 & R19 & R6
```

#### Agent Tool Access by Role

| Tool | Student | Counselor | Admin |
|------|---------|-----------|-------|
| `get_user_profile` | Own only | Assigned patients | All |
| `get_journal_entries` | Own only | Assigned patients | All |
| `get_activity_streak` | Own only | Assigned patients | All |
| `create_intervention_plan` | Yes | Yes | Yes |
| `get_available_counselors` | Yes | No | No |
| `suggest_appointment_times` | Yes | No | No |
| `book_appointment` | Own | No | No |
| `cancel_appointment` | Own | Own sessions | All |
| `get_crisis_resources` | Yes | Yes | Yes |
| `get_case_details` | No | Assigned cases | All |
| `get_conversation_summary` | No | Assigned | All |
| `get_risk_assessment_history` | No | Assigned patients | All |
| `trigger_conversation_analysis` | No | Yes | Yes |
| `get_active_safety_cases` | No | Own cases | All |
| `get_escalation_protocol` | No | Yes | Yes |
| `get_conversation_stats` | No | No | Yes |
| `search_conversations` | No | No | Yes |

### PII Redaction Pipeline

```mermaid
flowchart LR
    subgraph "Input"
        RAW["Raw message<br/>'I'm Dewi from<br/>Psychology 2022,<br/>my NIM is 21/1234567'"]
    end

    subgraph "Redaction Engine"
        RE1["Regex: Names<br/>Indonesian + English<br/>name patterns"]
        RE2["Regex: Email<br/>[a-z]+@[a-z].[a-z]"]
        RE3["Regex: Phone<br/>+62xxx, 08xxx"]
        RE4["Regex: NIM<br/>Student ID patterns"]
        RE5["Regex: URLs<br/>Social media links"]
    end

    subgraph "Output"
        REDACTED["Redacted text<br/>'I'm [NAME] from<br/>[NAME] [YEAR],<br/>my NIM is [ID]'"]
        ORIGINAL["Original text<br/>(encrypted, DB only)"]
    end

    RAW --> RE1 & RE2 & RE3 & RE4 & RE5 --> REDACTED
    RAW --> ORIGINAL

    REDACTED --> ANALYTICS["Analytics Pipeline<br/>STA + IA processing"]
    ORIGINAL --> STORAGE["Encrypted Storage<br/>Conversation records<br/>Role-gated access only"]

    style REDACTED fill:#51cf66,color:#fff
    style ANALYTICS fill:#51cf66,color:#fff
    style STORAGE fill:#ffd93d,color:#333
```

#### Redaction Rules

| Pattern | Regex Example | Replacement | Applied By |
|---------|--------------|-------------|------------|
| Names | Capitalized word sequences | `[NAME]` | STA `redact_pii_regex` |
| Email | `[\w.]+@[\w.]+` | `[EMAIL]` | STA `redact_pii_regex` |
| Phone | `(\+62|08)\d{8,13}` | `[PHONE]` | STA `redact_pii_regex` |
| NIM/Student ID | `\d{2}/\d{7}` | `[ID]` | STA `redact_pii_regex` |
| URLs | `https?://\S+` | `[URL]` | STA `redact_pii_regex` |

### Privacy Enforcement Architecture

```mermaid
flowchart TD
    subgraph "Query Entry"
        Q["Analytics Query<br/>from Admin/Counselor"]
    end

    subgraph "Consent Layer"
        C1["Check UserConsentLedger"]
        C2{All affected users<br/>consented?}
        C3["Log consent check<br/>in audit trail"]
    end

    subgraph "Anonymization Layer"
        A1["Replace user_id with<br/>user_hash (SHA-256)"]
        A2["PII already redacted<br/>from text fields"]
    end

    subgraph "k-Anonymity Layer"
        K1["Add GROUP BY on<br/>quasi-identifiers"]
        K2["Add HAVING COUNT ≥ 5"]
        K3{Any cell<br/>count &lt; 5?}
        K4["Suppress small cells<br/>or merge categories"]
    end

    subgraph "Differential Privacy Layer"
        D1["Calculate sensitivity<br/>of query"]
        D2["Generate Laplace noise<br/>scale = sensitivity / epsilon"]
        D3["Add noise to<br/>aggregate values"]
    end

    subgraph "Output"
        OUT["Privacy-preserving<br/>analytics result"]
    end

    Q --> C1 --> C2
    C2 --> |No| DENIED["Query Denied"]
    C2 --> |Yes| C3 --> A1 --> A2
    A2 --> K1 --> K2 --> K3
    K3 --> |Yes| K4 --> D1
    K3 --> |No| D1
    D1 --> D2 --> D3 --> OUT

    style DENIED fill:#ff6b6b,color:#fff
    style OUT fill:#51cf66,color:#fff
```

### Blockchain Attestation Security

```mermaid
sequenceDiagram
    participant CNS as Counselor
    participant API as Backend
    participant DB as PostgreSQL
    participant HASH as SHA-256
    participant SC as Smart Contract<br/>SOMNIA Chain
    participant EXPL as Block Explorer

    CNS->>API: Submit session attestation<br/>(case_id, notes, summary)
    API->>DB: Save raw attestation<br/>to CaseAttestation table
    API->>HASH: Hash(session_notes + timestamp + case_id)
    HASH-->>API: SHA-256 digest
    API->>API: Build transaction payload<br/>(caseId, hash, timestamp)
    API->>SC: attest(caseId, hash, timestamp)
    SC-->>API: Transaction hash + block number
    API->>DB: Update CaseAttestation<br/>(tx_hash, chain_id, block_number)
    API-->>CNS: Attestation confirmed

    Note over CNS,EXPL: Verification Path (any time)
    CNS->>API: Request proof
    API->>DB: Fetch attestation record
    API->>HASH: Re-hash session notes
    API-->>CNS: Match confirmed + explorer link
    CNS->>EXPL: View on-chain proof
```

#### Attestation Properties

| Property | Implementation |
|----------|---------------|
| **Immutability** | On-chain hash cannot be altered after submission |
| **Verifiability** | Any party can re-hash the notes and compare with on-chain hash |
| **Privacy** | Only the hash is stored on-chain; clinical notes remain in encrypted PostgreSQL |
| **Non-repudiation** | Transaction includes counselor's wallet signature |
| **Auditability** | `CaseAttestation` table links case → attestation → tx_hash → chain |

### API Security Controls

| Control | Implementation | Scope |
|---------|---------------|-------|
| **Authentication** | JWT Bearer tokens + httpOnly cookies | All endpoints except `/health` |
| **Rate Limiting** | Redis-based per-IP and per-user limits | Chat: 20/min, Auth: 5/min, Admin: 60/min |
| **Input Validation** | Pydantic request models with strict types | All POST/PUT endpoints |
| **CORS** | Whitelisted origins only | All endpoints |
| **SQL Injection** | SQLAlchemy parameterized queries | All database operations |
| **XSS Prevention** | Input sanitization + CSP headers | All endpoints |
| **CSRF Protection** | SameSite cookies + token validation | State-changing endpoints |
| **Secrets Management** | Environment variables, never committed | All configuration |
| **Dependency Scanning** | Trivy + GitHub Dependabot | CI/CD pipeline |
| **TLS** | HTTPS enforced in production | All traffic |

### Threat Model

```mermaid
graph TB
    subgraph "Threats"
        T1["🔓 Data Breach"]
        T2["🤖 LLM Prompt Injection"]
        T3["👤 Unauthorized Access"]
        T4["🔍 Privacy Re-identification"]
        T5["📦 Supply Chain Attack"]
        T6["📡 DDoS Attack"]
        T7["🐛 Application Vulnerability"]
    end

    subgraph "Mitigations"
        M1["Encryption at rest<br/>+ RBAC + Audit logs"]
        M2["Input sanitization<br/>+ Guardrails + Output validation"]
        M3["JWT + RBAC + Rate limiting<br/>+ Session management"]
        M4["k-Anonymity + Differential Privacy<br/>+ PII Redaction + Consent"]
        M5["Dependabot + Trivy scanning<br/>+ Pinned versions"]
        M6["Rate limiting + Redis cache<br/>+ Nginx reverse proxy"]
        M7["Pydantic validation + Parameterized SQL<br/>+ Security headers"]
    end

    T1 -.-> M1
    T2 -.-> M2
    T3 -.-> M3
    T4 -.-> M4
    T5 -.-> M5
    T6 -.-> M6
    T7 -.-> M7

    style T1 fill:#ff6b6b,color:#fff
    style T2 fill:#ff6b6b,color:#fff
    style T3 fill:#ff6b6b,color:#fff
    style T4 fill:#ff6b6b,color:#fff
    style M1 fill:#51cf66,color:#fff
    style M2 fill:#51cf66,color:#fff
    style M3 fill:#51cf66,color:#fff
    style M4 fill:#51cf66,color:#fff
```

#### Risk Assessment

| Threat | Likelihood | Impact | Risk Level | Primary Mitigation |
|--------|-----------|--------|------------|-------------------|
| Data breach (student conversations) | Low | Critical | High | Encryption + RBAC + Audit logs |
| LLM prompt injection | Medium | High | High | Input sanitization + Guardrails |
| Unauthorized access to admin panel | Low | High | Medium | JWT + RBAC + Rate limiting |
| Re-identification via analytics | Low | High | Medium | k-Anonymity + Differential Privacy |
| Supply chain vulnerability | Medium | Medium | Medium | Dependabot + Trivy |
| DDoS during peak usage | Medium | Medium | Medium | Rate limiting + Redis + Nginx |
| SQL injection via API | Low | Critical | Low | SQLAlchemy parameterized queries |

---

## Deployment Topology

### Infrastructure Layout

UGM-AICare is deployed as a split-subdomain architecture with the frontend and backend running as separate services behind a reverse proxy.

```mermaid
graph TB
    subgraph "DNS Layer"
        DNS_FE["aicare.sumbu.xyz<br/>→ Frontend Server"]
        DNS_API["api.aicare.sumbu.xyz<br/>→ Backend Server"]
    end

    subgraph "Reverse Proxy — Nginx"
        NGINX["Nginx<br/>SSL Termination<br/>Rate Limiting<br/>Static File Serving"]
    end

    subgraph "Application Servers"
        subgraph "Frontend Container"
            NEXT["Next.js 16<br/>Node.js 18+<br/>Port: 22000"]
            AUTH_FE_D["NextAuth.js<br/>Session Cookies"]
        end

        subgraph "Backend Container"
            FAST["FastAPI + Uvicorn<br/>Python 3.9+<br/>Port: 22001"]
            METRICS_D["Prometheus Metrics<br/>/metrics + /metrics/fastapi"]
            SCALAR["Scalar API Docs<br/>/docs"]
        end
    end

    subgraph "Agent Runtime"
        AIKA_RT["Aika Compiled Graph<br/>Singleton - compiled at startup"]
        CHECK["AsyncPostgresSaver<br/>LangGraph Checkpointing"]
        SCHED["APScheduler<br/>Background Jobs<br/>Check-ins, Retention, Cleanup"]
        AUTO_W["Autopilot Worker<br/>Action Queue Processor"]
    end

    subgraph "Managed Data Services"
        PG[("PostgreSQL<br/>Primary Database<br/>+ Alembic Migrations")]
        REDIS[("Redis<br/>Cache + Rate Limiting<br/>+ Session Store")]
        S3["Object Storage<br/>Avatars + Media"]
    end

    subgraph "External AI Services"
        GEM["Google Gemini 2.5<br/>Primary LLM"]
        GEM_F["Gemini Flash<br/>Fast responses"]
        GEM_P["Gemini Pro<br/>Complex reasoning"]
        LF["Langfuse<br/>LLM Tracing + Observability"]
    end

    subgraph "Blockchain Networks"
        SOMNIA["SOMNIA Chain<br/>CARE Token + Staking"]
        EDU["EDU Chain<br/>NFT Badges"]
        BNB["BNB Smart Chain<br/>NFT Badges (alt)"]
    end

    DNS_FE --> NGINX
    DNS_API --> NGINX
    NGINX --> NEXT
    NGINX --> FAST

    FAST --> AIKA_RT
    FAST --> CHECK
    FAST --> SCHED
    FAST --> AUTO_W
    FAST --> METRICS_D
    FAST --> SCALAR

    FAST --> PG
    FAST --> REDIS
    FAST --> S3

    AIKA_RT --> GEM
    AIKA_RT --> GEM_F
    AIKA_RT --> GEM_P
    FAST --> LF

    FAST --> SOMNIA
    FAST --> EDU
    FAST --> BNB

    NEXT --> AUTH_FE_D
    NEXT --> |"API calls"| FAST

    style PG fill:#336791,color:#fff
    style REDIS fill:#dc382d,color:#fff
    style GEM fill:#4285f4,color:#fff
```

### Network Architecture

```mermaid
graph LR
    subgraph "Public Internet"
        USERS["👤 Users<br/>Students, Counselors, Admins"]
    end

    subgraph "DMZ — Ports 443/80"
        NGINX["Nginx Reverse Proxy<br/>SSL Termination"]
    end

    subgraph "Application Network — Internal"
        FE["Frontend<br/>:22000"]
        BE["Backend<br/>:22001"]
    end

    subgraph "Data Network — Internal"
        PG[("PostgreSQL<br/>:5432")]
        RD[("Redis<br/>:6379")]
    end

    subgraph "External APIs"
        GEM["Gemini API<br/>HTTPS"]
        ETH["Blockchain RPC<br/>HTTPS"]
        LFD["Langfuse<br/>HTTPS"]
    end

    USERS --> |"HTTPS"| NGINX
    NGINX --> |"Proxy Pass"| FE
    NGINX --> |"Proxy Pass"| BE
    FE --> |"HTTP"| BE
    BE --> |"TCP"| PG
    BE --> |"TCP"| RD
    BE --> |"HTTPS"| GEM
    BE --> |"HTTPS"| ETH
    BE --> |"HTTPS"| LFD
```

### Docker Compose Configuration

```mermaid
flowchart TD
    subgraph "docker-compose.base.yml"
        FE_SVC["frontend service<br/>build: ./frontend<br/>port: 22000"]
        BE_SVC["backend service<br/>build: ./backend<br/>port: 22001<br/>depends_on: none"]
    end

    subgraph "docker-compose.dev.yml (overlay)"
        DEV_FE["volumes: ./frontend/src → /app/src<br/>hot-reload enabled"]
        DEV_BE["volumes: ./backend/app → /app/app<br/>uvicorn --reload"]
    end

    subgraph "docker-compose.preprod.yml (overlay)"
        PRE_FE["production build<br/>no hot-reload"]
        PRE_BE["production build<br/>no volume mounts"]
    end

    subgraph "docker-compose.prod.yml (overlay)"
        PROD_FE["optimized production build<br/>static export where possible"]
        PROD_BE["optimized production build<br/>gunicorn + uvicorn workers"]
    end

    base --> dev_overlay
    base --> preprod_overlay
    base --> prod_overlay
```

#### Environment Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/aicare` |
| `REDIS_URL` | Redis connection string | `redis://host:6379/0` |
| `JWT_SECRET_KEY` | Token signing key | (generated secret) |
| `NEXTAUTH_SECRET` | NextAuth encryption key | (generated secret) |
| `GEMINI_API_KEY` | Primary Gemini API key | `AIza...` |
| `GEMINI_API_KEYS` | Additional keys (rotation) | `key1,key2,key3` |
| `NEXTAUTH_URL` | Frontend base URL | `https://aicare.sumbu.xyz` |
| `NEXT_PUBLIC_API_URL` | Backend base URL | `https://api.aicare.sumbu.xyz` |
| `LANGFUSE_PUBLIC_KEY` | LLM tracing key | `pk-...` |
| `AUTOPILOT_ONCHAIN_PLACEHOLDER` | Demo mode toggle | `true` / `false` |

### Startup Sequence

```mermaid
sequenceDiagram
    participant DOCKER as Docker Compose
    participant APP as FastAPI Lifespan
    participant DB as PostgreSQL
    participant LG as LangGraph
    participant AIKA as Aika Agent
    participant BC as Blockchain
    participant SCHED as Scheduler
    participant SSE as SSE Bridge

    DOCKER->>APP: Start application
    APP->>APP: Validate auth config (JWT_SECRET, NEXTAUTH_SECRET)
    APP->>DB: Initialize connection pool (with retries)
    DB-->>APP: Connection ready
    APP->>DB: Run Alembic migrations (if configured)
    APP->>LG: Initialize AsyncPostgresSaver
    LG-->>APP: Checkpointer ready
    APP->>AIKA: create_aika_unified_graph() → compile()
    AIKA-->>APP: Compiled singleton cached
    APP->>BC: Initialize blockchain clients (fail-soft)
    BC-->>APP: Clients ready or stubs installed
    APP->>SCHED: Start APScheduler + Autopilot worker
    SCHED-->>APP: Jobs registered
    APP->>SSE: Subscribe event bus bridges
    SSE-->>APP: SSE channels active
    APP-->>DOCKER: Application ready (health check passes)

    Note over APP,SSE: On shutdown: close DB pool,<br/>stop scheduler, clean up resources
```

### Health Check Endpoints

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `GET /health` | Application health | `{"status": "healthy"}` |
| `GET /health/db` | Database connectivity | `{"status": "healthy", "latency_ms": N}` |
| `GET /health/redis` | Redis connectivity | `{"status": "healthy", "latency_ms": N}` |
| `GET /health/frontend` | Frontend reachability | `{"status": "healthy"}` |
| `GET /metrics` | Prometheus metrics | Standard prometheus format |
| `GET /metrics/fastapi` | FastAPI-specific metrics | Request counts, latencies, errors |
