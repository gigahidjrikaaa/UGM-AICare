# UGM-AICare AI Coding Agent Instructions

## Overview
UGM-AICare is a transformative mental health AI platform implementing a sophisticated **three-agent framework** for proactive university mental health support. The project aims to transform reactive mental health services into proactive, data-driven, and automated frameworks through collaborative AI agents.

### Core Innovation: The 3-Agent Framework
The solution implements a collaborative system of three specialized AI agents:

1. **🤖 Analytics Agent**: Periodically analyzes anonymized student interaction data to identify emerging mental health trends and patterns
2. **📢 Intervention Agent**: Launches proactive outreach campaigns triggered by insights from the Analytics Agent  
3. **🏥 Triage Agent**: Real-time conversation analysis for severity classification and appropriate support level routing

This enterprise-grade application builds upon existing therapeutic modules, multi-provider LLM integration, and comprehensive user management infrastructure.

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15+ with TypeScript, Tailwind CSS 4, Framer Motion, NextAuth.js
- **Backend**: FastAPI with Python 3.9+, SQLAlchemy 2+, Alembic migrations, LangChain for agent orchestration
- **Database**: PostgreSQL with Redis for caching, session state, and agent coordination
- **AI Integration**: Google Generative AI SDK (Gemini), Together.ai (Llama 3), LangChain for agent workflows
- **Orchestration**: n8n workflow automation engine for agent scheduling and coordination
- **Blockchain**: Hardhat with Solidity contracts for NFT achievement system
- **Deployment**: Docker Compose with multi-service architecture

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Backend       │───▶│   Database      │
│   (Next.js)     │    │   (FastAPI)     │    │   (PostgreSQL)  │
│   Admin Dash    │    │   + LangChain   │    │   + Analytics   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────▶│     Redis       │◀─────────────┘
                        │ Sessions+Agents │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │      n8n        │
                        │  Orchestration  │
                        │   (Scheduling)  │
                        └─────────────────┘
```

### Three-Agent System Integration
- **Analytics Agent**: Scheduled execution via n8n, analyzes interaction patterns in PostgreSQL
- **Intervention Agent**: Triggered by Analytics insights, executes campaigns via email/notifications
- **Triage Agent**: Real-time integration with existing Aika chatbot for conversation classification

## Critical Domain Knowledge

### Three-Agent Framework & Research Context
- **Primary Purpose**: Agentic AI framework for proactive university mental health intervention
- **Research Methodology**: Design Science Research (DSR) with prototype validation focus
- **Target Users**: Indonesian university students (UGM) requiring proactive mental health support
- **Innovation**: Transform reactive mental health services into proactive, data-driven interventions
- **Privacy Requirements**: Anonymized data analysis with GDPR compliance and ethical AI guidelines

### Agent System Architecture (Core Innovation)
The application's most sophisticated feature is the three-agent collaborative system:

#### 🤖 Analytics Agent (`backend/app/agents/analytics_agent.py`)
```python
class AnalyticsAgent:
    """Periodically analyzes anonymized student interaction data"""
    
    async def analyze_trends(self, timeframe: str) -> AnalyticsReport:
        """Identifies emerging mental health patterns"""
    
    async def generate_insights(self, patterns: List[Pattern]) -> List[Insight]:
        """Converts patterns into actionable insights"""
        
    # Scheduled via n8n workflows
    # Analyzes conversation data from PostgreSQL
    # Identifies trends like exam-period anxiety spikes
```

#### 📢 Intervention Agent (`backend/app/agents/intervention_agent.py`)
```python
class InterventionAgent:
    """Launches proactive outreach campaigns based on Analytics insights"""
    
    async def create_campaign(self, insights: List[Insight]) -> Campaign:
        """Designs targeted intervention campaigns"""
    
    async def execute_outreach(self, campaign: Campaign) -> CampaignResult:
        """Executes email/notification campaigns"""
        
    # Triggered by Analytics Agent findings
    # Automated resource distribution (stress management guides)
    # Targeted student group outreach
```

#### 🏥 Triage Agent (`backend/app/agents/triage_agent.py`) 
```python
class TriageAgent:
    """Real-time conversation analysis and support level routing"""
    
    async def assess_conversation(self, messages: List[Message]) -> SeverityLevel:
        """Classifies conversation severity in real-time"""
    
    async def route_user(self, severity: SeverityLevel) -> RoutingDecision:
        """Routes to appropriate support level"""
        
    # Integrated with existing Aika chatbot
    # Real-time crisis detection and routing
    # Dynamic resource recommendation (self-help vs counseling)
```

#### Agent Coordination & Data Flow
```python
# Workflow: Analytics → Intervention → Triage (continuous cycle)
1. Analytics Agent: Weekly analysis of anonymized chat logs
2. Pattern Detection: Identify trends (exam stress, seasonal depression)
3. Insight Generation: Convert patterns to actionable insights
4. Intervention Trigger: Insights trigger targeted campaigns
5. Proactive Outreach: Automated resource distribution
6. Real-time Triage: Ongoing conversation monitoring
7. Dynamic Routing: Crisis detection and support escalation
```

### Guided CBT Module System (Core User-Facing Feature)
The Guided CBT module system remains the primary therapeutic interface for users, providing structured therapeutic interventions through the Aika chat. This system works in parallel with the three-agent framework:

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
- **LLM Integration**: Multi-provider abstraction in `core/llm.py` supporting Google Gemini and Together.ai
- **Agent Orchestration**: LangChain workflows for agent coordination and prompt management
- **Memory Management**: Conversation history and agent state management via Redis
- **Background Tasks**: FastAPI BackgroundTasks for async agent operations and n8n integration

### Database Schema Essentials
```sql
-- Core user table
users: id, google_sub, email, wallet_address, allow_email_checkins, role

-- Chat history (Analytics Agent data source)
chat_messages: id, user_id, session_id, conversation_id, role, content, timestamp

-- Agent-specific tables
analytics_reports: id, generated_at, timeframe, patterns, insights, status
intervention_campaigns: id, insights_id, target_audience, content, executed_at, results
triage_assessments: id, conversation_id, severity_level, routing_decision, timestamp

-- Module state (stored in Redis, feeds into Analytics)
module_state:{user_id}:{session_id} → JSON state object

-- Agent coordination (Redis)
agent_state:{agent_name} → Current agent status and coordination data
campaign_queue → Pending intervention campaigns
triage_alerts → Real-time severity alerts
```

## Key Workflows

### Three-Agent Collaboration Workflow
1. **Analytics Agent Execution**: Scheduled via n8n (weekly), analyzes anonymized chat data
2. **Pattern Recognition**: Identifies mental health trends (exam stress, seasonal patterns)
3. **Insight Generation**: Converts patterns into actionable insights for interventions
4. **Intervention Trigger**: Insights automatically trigger Intervention Agent campaigns
5. **Campaign Creation**: Automated design of targeted outreach (emails, resources)
6. **Campaign Execution**: Proactive distribution to identified student segments
7. **Real-time Triage**: Ongoing conversation monitoring by Triage Agent
8. **Dynamic Routing**: Crisis detection and appropriate support level routing

### Enhanced Chat Flow with Guided Therapy & Agent Integration
1. **Message Receipt**: `frontend/hooks/useChat.tsx` → `backend/routes/chat.py`
2. **Triage Assessment**: Real-time conversation analysis by Triage Agent for severity classification
3. **Context Building**: Retrieve conversation history, module state, and agent context from Redis
4. **Therapeutic Routing**: Determine if user needs guided CBT module vs. general chat vs. emergency protocol
5. **Module Execution**: If CBT module selected, execute step-based therapeutic intervention
6. **Response Generation**: Generate therapeutic response through CBT module or general LLM
7. **State Persistence**: Update module state, conversation history, and agent coordination data
8. **Analytics Feed**: Anonymized interaction data queued for Analytics Agent future analysis

### Module Completion & Therapeutic Progression
```python
# CBT Module completion logic (PRIMARY USER EXPERIENCE)
if await module.should_complete(module_state):
    # Complete current therapeutic module
    await complete_module(module_state)
    # Suggest next therapeutic module or return to general chat
    response = await suggest_next_therapeutic_steps(user_context)
    # SECONDARY: Update Analytics Agent data for trend analysis
    await queue_completion_data_for_analytics(module_state, anonymized=True)
```

### User Journey Integration
- **Onboarding**: Profile setup with mental health preferences and therapeutic goals
- **Primary Interface**: Guided CBT modules through Aika chat for direct therapeutic intervention
- **Background Analytics**: User interactions contribute to anonymized trend analysis (secondary)
- **Proactive Support**: Users receive targeted resources based on Analytics insights between sessions
- **Progress Tracking**: CBT module completion streaks and therapeutic milestones via blockchain NFTs
- **Admin Dashboard**: Enhanced with therapeutic progress monitoring, agent oversight, and campaign management

## Comprehensive Documentation Structure

### 📚 Primary Documentation (docs/ folder)
This project includes extensive documentation to support development, research, and deployment:

#### Core Documents
- **[📚 Documentation Index](../../docs/README.md)**: Navigation guide for all documentation
- **[📋 Single Source of Truth](../../docs/single-source-of-truth.md)**: Detailed project overview and specifications
- **[🏗️ Three-Agent Framework](../../docs/three-agent-framework.md)**: Technical architecture and agent implementation
- **[⚙️ Technical Specifications](../../docs/technical-specifications.md)**: System requirements and detailed design
- **[🚀 Implementation Guide](../../docs/implementation-guide.md)**: Step-by-step development instructions
- **[🔬 Research Methodology](../../docs/research-methodology.md)**: Academic framework and validation procedures

#### Specialized Documentation
- **[AI Integration Guide](../../docs/ai-integration-guide.md)**: LLM provider setup and configuration
- **[API Integration Reference](../../docs/api-integration-reference.md)**: Endpoint documentation and examples
- **[Mental Health AI Guidelines](../../docs/mental-health-ai-guidelines.md)**: Ethical considerations and response protocols
- **[Development Workflow](../../docs/development-workflow.md)**: Team collaboration and development processes

#### Quick Reference by Role
| Role | Start With | Then Reference |
|------|------------|----------------|
| **Developer** | [Implementation Guide](../../docs/implementation-guide.md) | [Technical Specifications](../../docs/technical-specifications.md) |
| **Researcher** | [Research Methodology](../../docs/research-methodology.md) | [Single Source of Truth](../../docs/single-source-of-truth.md) |
| **Admin** | [Single Source of Truth](../../docs/single-source-of-truth.md) | [Technical Specifications](../../docs/technical-specifications.md) |
| **New Team Member** | [Documentation Index](../../docs/README.md) | [Implementation Guide](../../docs/implementation-guide.md) |

### 🎯 Single Source of Truth
The root [PROJECT_SINGLE_SOURCE_OF_TRUTH.md](../../PROJECT_SINGLE_SOURCE_OF_TRUTH.md) serves as the definitive reference for all UGM-AICare development activities and GitHub Copilot Agent interactions.

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
4. Register agent in orchestration system (n8n workflows)
5. Update Redis state management for inter-agent communication
6. Add agent monitoring to frontend admin dashboard
7. Update agent coordination protocols and scheduling

### Enhancing Agent Coordination
1. Update inter-agent communication protocols in `backend/app/core/agent_coordinator.py`
2. Modify Redis state management for shared agent data
3. Enhance n8n workflows for agent scheduling and triggers
4. Update agent state monitoring in frontend dashboard
5. Test agent collaboration scenarios end-to-end

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
2. **Secondary System**: Three-agent collaborative framework transforming institutional mental health support

The combination creates a comprehensive solution offering both individual therapeutic support and institutional-level mental health insights, all built on complex state management, multi-provider integrations, and comprehensive user journeys.

**Always prioritize:**
- **User Safety**: Mental health data privacy and ethical AI practices
- **Agent Coordination**: Seamless collaboration between Analytics, Intervention, and Triage agents  
- **Data Privacy**: Anonymization and GDPR compliance in all agent operations
- **Therapeutic Effectiveness**: Evidence-based interventions and professional oversight
- **Research Integrity**: Design Science Research methodology and prototype validation

**Key Development Focus Areas:**
1. **Guided CBT Modules**: Primary user-facing therapeutic interventions through Aika chat
2. **Three-Agent Framework**: Background analytics, proactive interventions, and real-time triage
3. **Therapeutic User Experience**: Step-based CBT progression with evidence-based interventions
4. **LangChain Integration**: Consistent agent workflow and module orchestration patterns
5. **Dual System Coordination**: CBT modules serving users while feeding anonymized data to agents
6. **Admin Dashboard**: Therapeutic progress monitoring alongside agent oversight tools

**Development Priorities:**
- **PRIMARY**: Guided CBT module implementation for direct user therapeutic benefit
- **SECONDARY**: Three-agent framework for institutional-level mental health insights
- **INTEGRATION**: Seamless coordination between therapeutic modules and background agents
- **PRIVACY**: Strict anonymization protocols for agent analytics while preserving therapeutic data

All code generation, architectural decisions, and feature implementations should align with the specifications outlined in the [Single Source of Truth](../../PROJECT_SINGLE_SOURCE_OF_TRUTH.md) and comprehensive [documentation suite](../../docs/README.md).
