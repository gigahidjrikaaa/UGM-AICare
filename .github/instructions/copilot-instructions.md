# UGM-AICare AI Coding Agent Instructions

## Overview
UGM-AICare is a transformative mental health AI platform implementing the **Safety Agent suite**—a coordinated four-agent framework—for proactive university mental health support. The project aims to transform reactive mental health services into proactive, data-driven, and automated frameworks through collaborative AI agents.

### Core Innovation: Safety Agent Suite (4-Agent Framework)
The solution implements a coordinated system of four specialized Safety Agents:

1. **🛡️ Safety Triage Agent (STA)**: Real-time conversation analysis for risk classification, routing, and redaction safeguards.
2. **💬 Support Coach Agent (SCA)**: CBT-informed personalized coaching, brief micro-interventions, and evidence-based therapeutic guidance.
3. **📂 Service Desk Agent (SDA)**: Case management desk that tracks manual escalations, assignments, and SLA compliance.
4. **🔍 Insights Agent (IA)**: Privacy-preserving analytics queries with differential privacy (ε-δ budgets) and k-anonymity.

> The legacy LangGraph modules (`analytics_agent.py`, `intervention_agent.py`, `triage_agent.py`) have been retired. All automation and visualization now run through the Safety Agent suite packages (`agents/sta`, `agents/sca`, `agents/sda`, `agents/ia`) and the shared graph specs in `agents/safety_graph_specs.py`.

This enterprise-grade application builds upon existing therapeutic modules, multi-provider LLM integration, and comprehensive user management infrastructure.

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15+ with TypeScript, Tailwind CSS 4, Framer Motion, NextAuth.js
- **Backend**: FastAPI with Python 3.9+, SQLAlchemy 2+, Alembic migrations, LangChain with LangGraph for agent orchestration
- **Database**: PostgreSQL with Redis for caching, session state, and agent coordination
- **AI Integration**: Google Generative AI SDK (Gemini 2.5 API) with LangChain and LangGraph for multi-agent workflows
- **Agent Orchestration**: LangGraph stateful graph-based controller for all agent routing and coordination
- **Blockchain**: Hardhat with Solidity contracts for NFT achievement system
- **Deployment**: Docker Compose with multi-service architecture

### Service Architecture
```
┌─────────────────┐    ┌─────────────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Backend               │───▶│   Database      │
│   (Next.js)     │    │   (FastAPI)             │    │   (PostgreSQL)  │
│   Admin Dash    │    │   + LangGraph           │    │   + Analytics   │
└─────────────────┘    │   Agent Orchestration   │    └─────────────────┘
         │             └─────────────────────────┘              │
         │                       │                              │
         │              ┌─────────────────┐                     │
         └─────────────▶│     Redis       │◀────────────────────┘
                        │ Sessions+State  │
                        │ Agent Memory    │
                        └─────────────────┘
```

### Safety Agent Suite Integration
- **Safety Triage Agent (STA)**: Classifies live chat sessions, emits `TriageAssessment` records, and triggers escalations.
- **Support Coach Agent (SCA)**: Provides CBT-informed coaching, generates intervention plans, and delivers structured therapeutic exercises.
- **Service Desk Agent (SDA)**: Manages manual escalation queues, assignments, and SLA alerts for counsellors.
- **Insights Agent (IA)**: Serves privacy-preserving analytics dashboards with differential privacy guarantees.

These Safety Agents are exposed through `/api/v1/safety-triage`, `/api/v1/admin/safety-coaching`, `/api/v1/admin/safety-desk`, and `/api/v1/admin/insights`, ensuring the admin experience aligns with the four-agent vocabulary.

### Active Refactor Plan (Safety Agent Suite Migration)
- **Objective**: Finish the migration away from the legacy three-agent stack into the Safety Agent suite described in `docs/refactor_plan.md`.
- **Backend actions**:
    - Retire `backend/app/routes/triage.py` and `backend/app/routes/admin/interventions.py`; replace them with scoped agent routers under `backend/app/agents/sta`, `sca`, `sda`, and `ia`.
    - Confirm legacy agent modules (`triage_agent.py`, `intervention_agent.py`, `analytics_agent.py`) remain deleted and route new work through the Safety Agent package structure (`agents/sta/*`, `agents/sca/*`, `agents/sda/*`, `agents/ia/*`).
    - Introduce refreshed core utilities (`backend/app/core/{db.py,rbac.py,redaction.py,policy.py,events.py,settings.py}`) and the new SQLAlchemy models (`events`, `messages`, `consents`, `cases`, `resources`, `users`).
    - Implement the alembic revision `introduce_sda_ia_schema_and_events_overhaul`, run the accompanying backfill script, and document any legacy schema that remains for historical purposes only.
- **Frontend actions**:
    - Sunset admin dashboards under `frontend/src/components/admin/{triage,interventions,analytics}` and rebuild the experience as `safety-desk` and `insights` views.
    - Update chat surfaces to consume STA/SCA APIs instead of legacy `/triage`, `/analytics`, or `/interventions` endpoints.
- **Testing expectations**: Add agent-focused suites in `backend/tests/agents/` and ensure new admin UI flows are covered with regression tests.
- **Documentation**: Keep `DEPRECATED.md` current, add `docs/agent_contracts.md` and `docs/privacy_safeguards.md`, and annotate migration steps in `PROJECT_SINGLE_SOURCE_OF_TRUTH.md`.

## Critical Domain Knowledge

### Safety Agent Suite & Research Context
- **Primary Purpose**: Agentic AI framework for proactive university mental health intervention
- **Research Methodology**: Design Science Research (DSR) with prototype validation focus
- **Target Users**: Indonesian university students (UGM) requiring proactive mental health support
- **Innovation**: Transform reactive mental health services into proactive, data-driven interventions via the Safety Agent suite
- **Privacy Requirements**: Anonymized data analysis with GDPR compliance and ethical AI guidelines

### Agent System Architecture (Core Innovation)
The application's most sophisticated feature is the Safety Agent suite:

#### 🛡️ Safety Triage Agent (STA)
- **Location:** `backend/app/agents/sta/`
- **API:** `/api/agents/sta/classify`
- **Role:** Classifies live messages, redacts sensitive snippets, and determines whether to route to SCA, SDA, or automated resources.
- **Implementation Notes:** Uses `SafetyTriageService` and a rule-based classifier today; future ML models will drop in via dependency injection.

#### 💬 Support Coach Agent (SCA)
- **Location:** `backend/app/agents/sca/`
- **API:** `/api/agents/sca/coach` & `/api/agents/sca/generate-plan`
- **Role:** Provides CBT-informed personalized coaching through empathetic dialogue, generates evidence-based intervention plans, and guides users through structured therapeutic exercises.
- **Implementation Notes:** Core coaching pipeline with Gemini 2.5 API integration; expand CBT module library with anxiety management, stress reduction, and thought challenging exercises.

#### 📂 Service Desk Agent (SDA)
- **Location:** `backend/app/agents/sda/`
- **API:** `/api/agents/sda/cases`
- **Role:** Provides clinical staff with case management dashboard, tracks case assignments, enforces SLA timers, and manages escalation workflows.
- **Implementation Notes:** `ServiceDeskService` is placeholder-only; integrate with case storage and `sla.py` helpers to activate the desk.

#### � Insights Agent (IA)
- **Location:** `backend/app/agents/ia/`
- **API:** `/api/agents/ia/query`
- **Role:** Serves privacy-preserving analytics with differential privacy (ε-δ budgets), k-anonymity enforcement, and aggregate trend analysis for admin dashboards.
- **Implementation Notes:** Implement privacy-preserving SQL templates in `queries.py` and enforce `InsightsAgentService.query` guardrails with ε-δ budget tracking.

#### Foundational Safety Graph Specifications
- **`safety_graph_specs.py`**: Describes the canonical node/edge layouts for STA, SCA, SDA, and IA used by the admin LangGraph viewer.
- **`orchestrator_graph_spec.py`**: Documents how the orchestrator classifies requests and fans them out to the Safety Agent suite.
- **`orchestrator.py`**: Transitional question router that still fronts STA/IA insights—update intent patterns as new admin queries surface.

Use these specs when updating the LangGraph viewer or when introducing new orchestration steps. Do not recreate the removed `*_agent.py` pipelines; extend the Safety Agent services instead.

#### Agent Coordination & Data Flow
```python
# Workflow: STA → (SCA | SDA) → IA feedback loop
1. STA records real-time triage assessments and risk scores from chat conversations.
2. SCA provides CBT-informed coaching, generates intervention plans, and delivers therapeutic exercises.
3. SDA tracks clinical case escalations, staff assignments, and SLA follow-up for critical cases.
4. IA aggregates anonymized signals (triage, coaching sessions, journals) into privacy-preserving dashboards.
5. Insights from IA and intervention metrics feed back into STA/SCA optimization.
```

### Guided CBT Module System (Core User-Facing Feature)
The Guided CBT module system remains the primary therapeutic interface for users, providing structured therapeutic interventions through the Aika chat. This system works in parallel with the Safety Agent suite:

#### Module Architecture
```python
# Core CBT modules with step-based progression (ACTIVE DEVELOPMENT):
- cognitive_restructuring_module.py  # Challenge negative thoughts
- problem_solving_module.py         # Structured problem resolution
- express_feelings_module.py        # Emotional expression guidance  
- deal_with_guilt_module.py        # Guilt processing therapy

# DUAL PURPOSE:
# 1. PRIMARY: Direct therapeutic intervention for users via Aika chat
# 2. SECONDARY: Data source for Analytics Agent trend analysis
```

#### CBT Module Integration Pattern
```python
class CBTModule:
    async def get_step_prompt(self, step: int, state: Dict) -> str:
        """Generate dynamic prompts for user therapeutic progression"""
    
    async def process_response(self, user_input: str, step: int, state: Dict) -> ProcessingResult:
        """Process user responses and guide therapeutic journey"""
    
    async def should_complete(self, state: Dict) -> bool:
        """Determine therapeutic module completion"""
        
    # PRIMARY FUNCTION: Provide guided therapy through Aika chat
    # SECONDARY FUNCTION: Generate data for Analytics Agent pattern recognition
    # INTEGRATION: Module outcomes inform Intervention Agent resource selection
    # TRIAGE SUPPORT: Module context assists Triage Agent routing decisions
```

#### State Management & Dual System Integration
- **Redis Integration**: Module state persisted in Redis with keys like `module_state:{user_id}:{session_id}`
- **Step Progression**: Each module tracks current step, collected responses, and completion status
- **Dynamic Routing**: Chat system routes to appropriate module based on user needs and therapeutic goals
- **Agent Data Feed**: Module interactions anonymously contribute to Analytics Agent trend analysis
- **Intervention Integration**: Module completion patterns inform Intervention Agent campaign targeting
- **Triage Context**: Real-time module state provides context for Triage Agent severity assessment

## Authentication & Security

### NextAuth.js Implementation
- **Primary Auth**: Google OAuth with UGM email domain restriction (`@ugm.ac.id`)
- **Admin Auth**: Separate credentials provider for admin dashboard access
- **Token Management**: JWT tokens with backend synchronization via `/internal/sync-user`
- **Session Persistence**: 24-hour sessions with automatic refresh

### Security Patterns
```typescript
// Frontend auth flow
useSession() → NextAuth → Backend sync → Database user creation/update

// Backend protection
@router.get("/protected", dependencies=[Depends(get_current_active_user)])

// Role-based access
if (session?.user?.role === "admin") { /* admin logic */ }
```

## Development Patterns

### Frontend Development
- **File Structure**: App Router with grouped routes `(main)`, `(admin)`, `(protected)`, `(agents)`
- **Admin Dashboard**: Enhanced with agent monitoring, analytics reports, and campaign management
- **Agent Interface**: New agent control panel for monitoring Analytics reports and Intervention campaigns
- **State Management**: React hooks with custom `useChat` plus `useAgentState` for agent monitoring
- **Error Handling**: Toast notifications via `react-hot-toast` with user-friendly messages
- **Loading States**: Comprehensive loading indicators and skeleton components for agent operations
- **Responsive Design**: Mobile-first with Tailwind CSS breakpoints

### Backend Development
- **Route Organization**: Feature-based routing in `app/routes/` (chat.py, auth.py, internal.py, agents.py)
- **Agent Architecture**: New agent endpoints in `app/agents/` with LangChain integration
- **Database Patterns**: SQLAlchemy models with Alembic migrations, enhanced for agent data storage
- **LLM Integration**: Multi-provider abstraction in `core/llm.py` supporting Google Gemini and the optional Gemma 3 runtime
- **Agent Orchestration**: LangChain workflows for agent coordination and prompt management
- **Memory Management**: Conversation history and agent state management via Redis
- **Background Tasks**: FastAPI BackgroundTasks for async agent operations and n8n integration

## Key Workflows

### Safety Agent Suite Collaboration Workflow
1. **Safety Triage Agent (STA)** analyzes live sessions and writes `TriageAssessment` records for crisis detection.
2. **Support Coach Agent (SCA)** provides CBT-informed coaching, generates personalized intervention plans, and guides therapeutic exercises.
3. **Service Desk Agent (SDA)** manages escalated cases, assigns clinical staff, and tracks SLA thresholds.
4. **Insights Agent (IA)** aggregates anonymized telemetry (triage, coaching sessions, journals) into privacy-preserving dashboards with differential privacy (ε-δ) and k-anonymity.
5. **Therapeutic Delivery**: SCA delivers CBT-based interventions through structured modules tracked in database.
6. **Feedback Loop**: IA insights and intervention outcomes recalibrate STA thresholds and SCA therapeutic strategies.

### Enhanced Chat Flow with Guided Therapy & Agent Integration
1. **Message Receipt**: `frontend/hooks/useChat.tsx` → `backend/routes/chat.py`
2. **Triage Assessment**: Real-time conversation analysis by Triage Agent for severity classification
3. **Context Building**: Retrieve conversation history, module state, and agent context from Redis
4. **Therapeutic Routing**: Determine if user needs guided CBT module vs. general chat vs. emergency protocol
5. **Module Execution**: If CBT module selected, execute step-based therapeutic intervention
6. **Response Generation**: Generate therapeutic response through CBT module or general LLM
7. **State Persistence**: Update module state, conversation history, and agent coordination data
8. **Insights Feed**: Anonymized interaction data queued for the Insights Agent’s allow-listed analytics

### Module Completion & Therapeutic Progression
```python
# CBT Module completion logic (PRIMARY USER EXPERIENCE)
if await module.should_complete(module_state):
    # Complete current therapeutic module
    await complete_module(module_state)
    # Suggest next therapeutic module or return to general chat
    response = await suggest_next_therapeutic_steps(user_context)
    # SECONDARY: Update Insights Agent data for trend analysis
    await queue_completion_data_for_analytics(module_state, anonymized=True)
```

### User Journey Integration
- **Onboarding**: Profile setup with mental health preferences and therapeutic goals
- **Primary Interface**: Guided CBT modules through Aika chat for direct therapeutic intervention
- **Background Analytics**: User interactions contribute to anonymized trend analysis (secondary)
- **Proactive Support**: Users receive targeted resources based on Analytics insights between sessions
- **Progress Tracking**: CBT module completion streaks and therapeutic milestones via blockchain NFTs
- **Admin Dashboard**: Enhanced with therapeutic progress monitoring, agent oversight, and campaign management

## Code Quality Standards

### TypeScript/React Standards
- **Strict Types**: Use TypeScript strict mode with proper type definitions
- **Component Architecture**: Functional components with hooks, avoid class components
- **Error Boundaries**: Wrap components with error handling for graceful failures
- **Accessibility**: ARIA labels, keyboard navigation, screen reader compatibility
- **Performance**: Use React.memo, useMemo, and useCallback for optimization

### Python/FastAPI Standards
- **Type Hints**: Full type annotations for all functions and classes
- **Error Handling**: Structured HTTP exceptions with user-friendly messages
- **Async/Await**: Use async patterns for all I/O operations
- **Input Validation**: Pydantic models for request validation
- **Logging**: Structured logging for debugging and monitoring

### Environment & Configuration
- **Environment Variables**: Never hardcode secrets, use `.env` files
- **Docker Integration**: All services containerized with health checks
- **Database Migrations**: Use Alembic for schema changes
- **API Keys**: Secure handling of LLM provider keys and internal API keys

## Testing Considerations

### Frontend Testing
- **CBT Module Testing**: Test guided therapy interactions, step progressions, and therapeutic outcomes
- **Component Testing**: Test chat interactions and module state management
- **Auth Testing**: Verify Google OAuth flow and admin access
- **Error States**: Test network failures and invalid responses
- **Accessibility**: Screen reader and keyboard navigation testing for therapeutic interfaces

### Backend Testing
- **CBT Module Testing**: Verify therapeutic module step progressions, state transitions, and completion logic
- **API Testing**: Test all endpoints with proper authentication
- **Agent Integration Testing**: Test Analytics data feeding and Intervention triggers (secondary)
- **LLM Integration Testing**: Test provider failover and response handling for both modules and agents
- **Database Testing**: Test user creation, conversation storage, module state persistence, and agent coordination

## Deployment & Operations

### Development Environment
```bash
# Start all services
docker-compose up -d

# Services available:
# Frontend: http://localhost:4000
# Backend: http://localhost:8000
# Database: postgresql://localhost:5432
# Redis: redis://localhost:6379
```

### Production Considerations
- **Health Checks**: All containers have health check endpoints
- **Scaling**: Redis for session state allows horizontal scaling
- **Monitoring**: Structured logging for application monitoring
- **Backups**: Database backup strategy for user data protection

## Mental Health AI Best Practices

### Therapeutic Interaction Guidelines
- **Empathetic Responses**: Always maintain supportive, non-judgmental tone
- **Crisis Detection**: Monitor for crisis indicators and provide appropriate resources
- **Boundary Setting**: Clearly communicate AI limitations and encourage professional help
- **Cultural Sensitivity**: Consider Indonesian cultural context in responses

### Privacy & Ethics
- **Data Minimization**: Collect only necessary therapeutic data
- **Consent Management**: Clear consent for data usage and storage
- **Confidentiality**: Never log or expose sensitive therapeutic content
- **Professional Standards**: Align with mental health professional guidelines

## Common Integration Points

### Adding New AI Agents
1. Create agent class in `backend/app/agents/new_agent.py` extending base agent patterns
2. Implement LangChain integration with required methods: `execute`, `process_data`, `coordinate`
3. Add agent endpoints in `backend/app/routes/agents.py`
4. Register agent in LangGraph orchestration graph with appropriate edges and conditional routing
5. Update Redis state management for inter-agent communication
6. Add agent monitoring to frontend admin dashboard
7. Update agent coordination protocols in `app/agents/safety_graph_specs.py`

### Enhancing Agent Coordination
1. Update inter-agent communication protocols in `backend/app/core/agent_coordinator.py`
2. Modify Redis state management for shared agent data
3. Enhance LangGraph orchestration specifications in `app/agents/safety_graph_specs.py` and `orchestrator_graph_spec.py`
4. Update agent state monitoring in frontend dashboard
5. Test agent collaboration scenarios end-to-end with LangGraph debugger

### Adding New CBT Modules (Primary Development Focus)
1. Create module class in `backend/app/cbt_modules/new_module.py`
2. Implement required methods: `get_step_prompt`, `process_response`, `should_complete`
3. Design step-based therapeutic progression with evidence-based interventions
4. Register module in chat routing logic for user access
5. Add module completion tracking and therapeutic milestone rewards
6. Update frontend to handle new module states and therapeutic interfaces
7. SECONDARY: Ensure module data contributes to agent analysis workflows (anonymized)

### LLM Provider Integration (Agent-Enhanced)
1. Add provider configuration in `backend/app/core/llm.py`
2. Implement provider-specific response handling for agent workflows
3. Update environment variables for API keys
4. Integrate with LangChain agent orchestration
5. Test provider failover scenarios in agent contexts
6. Update agent prompt templates for new provider capabilities

### Authentication Extensions (Agent Access Control)
1. Update NextAuth configuration in `frontend/src/lib/auth.ts`
2. Modify JWT callback for agent-related user properties
3. Update backend user sync in `backend/app/routes/internal.py`
4. Add agent access control and permissions
5. Implement agent audit logging and user consent management
6. Test authentication flow end-to-end including agent interactions

### Agent Development Standards
1. **LangChain Integration**: All agents must use LangChain for consistent LLM interaction and workflow management
2. **Async Operations**: Implement async/await patterns for all I/O operations and inter-agent communication
3. **Error Handling**: Comprehensive error handling with graceful degradation and agent failover
4. **Logging**: Structured logging for agent actions, decisions, and coordination events
5. **Security**: Input validation, sanitization, and secure API practices for sensitive mental health data
6. **State Management**: Redis-based state persistence for agent coordination and data sharing
7. **Monitoring**: Real-time agent performance monitoring and health checks

This platform represents sophisticated therapeutic AI with **dual innovative systems**: 

1. **Primary System**: Guided CBT modules providing direct therapeutic interventions through Aika chat
2. **Secondary System**: Safety Agent suite (STA, SCA, SDA, IA) transforming institutional mental health support

The combination creates a comprehensive solution offering both individual therapeutic support and institutional-level mental health insights, all built on complex state management, multi-provider integrations, and comprehensive user journeys.

**Always prioritize:**
- **User Safety**: Mental health data privacy and ethical AI practices
- **Agent Coordination**: Seamless collaboration between STA, SCA, SDA, and IA  
- **Data Privacy**: Anonymization and GDPR compliance in all agent operations
- **Therapeutic Effectiveness**: Evidence-based interventions and professional oversight
- **Research Integrity**: Design Science Research methodology and prototype validation

**Key Development Focus Areas:**
1. **Guided CBT Modules**: Primary user-facing therapeutic interventions through Aika chat
2. **Safety Agent Suite**: STA, SCA, SDA, and IA delivering analytics, coaching, case management, and insights
3. **Therapeutic User Experience**: Step-based CBT progression with evidence-based interventions
4. **LangChain Integration**: Consistent agent workflow and module orchestration patterns
5. **Dual System Coordination**: CBT modules serving users while feeding anonymized data to Safety Agents
6. **Admin Dashboard**: Therapeutic progress monitoring alongside agent oversight tools

**Development Priorities:**
- **PRIMARY**: Guided CBT module implementation for direct user therapeutic benefit
- **SECONDARY**: Safety Agent suite for institutional-level mental health insights
- **INTEGRATION**: Seamless coordination between therapeutic modules and background agents
- **PRIVACY**: Strict anonymization protocols for agent analytics while preserving therapeutic data

All code generation, architectural decisions, and feature implementations should align with the specifications outlined in the [Single Source of Truth](../../PROJECT_SINGLE_SOURCE_OF_TRUTH.md) and comprehensive [documentation suite](../../docs/README.md).
