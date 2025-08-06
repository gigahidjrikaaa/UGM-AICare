# UGM-AICare: Project Single Source of Truth

## About This Document

This document serves as the primary reference point for the UGM-AICare project. For comprehensive technical documentation, implementation guides, and detailed specifications, please refer to the [docs folder](docs/README.md).

**Document Version:** 1.1  
**Last Updated:** August 6, 2025  
**Repository:** UGM-AICare  
**Main Developer:** Giga Hidjrika Aura Adkhy

---

## 1. Project Title and Core Problem Statement

### Title

"Transforming University Mental Health Support: An Agentic AI Framework for Proactive Intervention and Resource Management"

### Problem Statement

Mental health support in universities is often:

- **Reactive** rather than proactive
- **Inefficient** in resource allocation
- **Unable to scale** effectively with growing student populations

**Solution Goal:** Create a proactive, data-driven, and automated framework to support student well-being at an institutional level through intelligent AI agents.

---

## 2. Core Innovation: The 3-Agent Framework

The solution implements a collaborative system of three specialized AI agents:

### 🤖 Analytics Agent

- **Schedule:** Runs periodically (e.g., weekly)
- **Function:** Analyzes anonymized student interaction data from the database
- **Output:** Autonomously identifies emerging mental health trends and patterns
- **Example:** Detects rise in anxiety-related queries during exam periods

### 📢 Intervention Agent

- **Trigger:** Activated by insights from the Analytics Agent
- **Function:** Launches proactive outreach campaigns
- **Output:** Automated, targeted interventions
- **Example:** Sends helpful exam stress management resources to relevant student groups

### 🏥 Triage Agent

- **Operation:** Real-time analysis of ongoing conversations
- **Function:** Classifies conversation severity and recommends appropriate support level
- **Output:** Dynamic routing to resources (self-help articles, counseling booking, emergency contacts)

---

## 3. Technical Architecture

### 🧠 Backend - "The Brain" (FastAPI + Python)

- **Framework:** FastAPI with Python 3.9+
- **Core Logic:** AI agent implementations using LangChain
- **LLM Integration:**
  - Google Generative AI SDK (Gemini)
  - TogetherAI (Llama 3)
- **Functions:**
  - Prompt construction and LLM interaction
  - Response parsing and analysis
  - Agent orchestration logic
- **Database ORM:** SQLAlchemy 2+
- **Caching/State:** Redis for session management
- **Authentication:** JWT with NextAuth integration

### ⚡ Orchestration - "The Nervous System" (n8n)

- **Platform:** n8n workflow automation engine
- **Responsibilities:**
  - Analytics Agent scheduling
  - API calls to backend services
  - Intervention campaign logic management
  - Cross-agent communication coordination

### 🖥️ Frontend - Admin Dashboard (Next.js)

- **Framework:** Next.js 15+ with App Router and Turbopack
- **Language:** TypeScript with strict typing
- **Styling:** Tailwind CSS 4
- **Purpose:** Administrative interface for university staff
- **Features:**
  - Analytics Agent report viewing
  - System operation oversight
  - Campaign management
  - User management and monitoring

### 🗃️ Database (PostgreSQL)

- **Primary Database:** PostgreSQL with Alembic migrations
- **Data Storage:**
  - Anonymized interaction logs
  - Generated analytics reports
  - Campaign details and metrics
  - User profiles and session data
- **Additional Storage:** Redis for real-time state management

---

## 4. Research Methodology and Scope

### Research Framework

- **Methodology:** Design Science Research (DSR)
- **Primary Objective:** Design, build, and functionally validate the agentic AI framework
- **Final Deliverable:** Working prototype demonstration

### Evaluation Scope

- **Focus:** Technical functionality and feasibility assessment
- **Validation:** System performance, agent collaboration effectiveness
- **Limitations:**
  - No live clinical trials with students
  - No direct psychological outcome measurements
  - Prototype-level implementation for proof of concept

---

## 5. Current Implementation Status

### Existing Components (Legacy Features)

- **AI Chatbot (Aika):** Empathetic mental health conversation companion
- **User Authentication:** Google OAuth + NextAuth.js integration
- **Basic Analytics:** User activity tracking and streak monitoring
- **NFT Rewards:** Blockchain-based achievement system (Polygon Amoy testnet)
- **Journal System:** User journaling with date tracking
- **Profile Management:** User settings and wallet linking

### Target Transformation

The existing chatbot infrastructure serves as the foundation for implementing the 3-agent framework:

- Analytics Agent will analyze existing conversation data
- Intervention Agent will leverage existing user communication channels
- Triage Agent will enhance existing chat capabilities with intelligent routing

---

## 6. Technical Implementation Guidelines

### Agent Development Standards

1. **LangChain Integration:** All agents must use LangChain for consistent LLM interaction
2. **Async Operations:** Implement async/await patterns for all I/O operations
3. **Error Handling:** Comprehensive error handling with graceful degradation
4. **Logging:** Structured logging for agent actions and decisions
5. **Security:** Input validation, sanitization, and secure API practices

### Code Quality Requirements

- **TypeScript:** Strict typing for all frontend components
- **Python:** Type hints and Pydantic validation for backend
- **Testing:** Unit tests for agent logic and integration tests for workflows
- **Documentation:** Comprehensive code documentation and API specs

### Deployment Architecture

- **Frontend:** Vercel deployment with environment variable management
- **Backend:** Render deployment with PostgreSQL and Redis services
- **n8n:** Self-hosted or cloud deployment for workflow orchestration
- **Monitoring:** Application monitoring and logging for agent performance

---

## 7. Agent Integration Specifications

### Analytics Agent Interface

```python
class AnalyticsAgent:
    def analyze_trends(self, timeframe: str) -> AnalyticsReport
    def identify_patterns(self, data: List[Interaction]) -> List[Pattern]
    def generate_insights(self, patterns: List[Pattern]) -> List[Insight]
```

### Intervention Agent Interface

```python
class InterventionAgent:
    def create_campaign(self, insights: List[Insight]) -> Campaign
    def target_audience(self, campaign: Campaign) -> List[User]
    def execute_outreach(self, campaign: Campaign, users: List[User]) -> CampaignResult
```

### Triage Agent Interface

```python
class TriageAgent:
    def assess_conversation(self, messages: List[Message]) -> SeverityLevel
    def recommend_action(self, severity: SeverityLevel) -> ActionRecommendation
    def route_user(self, recommendation: ActionRecommendation) -> RoutingDecision
```

---

## 8. Data Flow and Agent Interaction

### Workflow Sequence

1. **Data Collection:** User interactions stored in PostgreSQL
2. **Analytics Processing:** Analytics Agent processes anonymized data
3. **Pattern Recognition:** Identifies trends and generates insights
4. **Intervention Planning:** Intervention Agent creates targeted campaigns
5. **Campaign Execution:** Automated outreach via email/notifications
6. **Real-time Triage:** Triage Agent monitors ongoing conversations
7. **Dynamic Routing:** Users directed to appropriate support levels

### Inter-Agent Communication

- **Message Queue:** Redis-based message passing between agents
- **API Integration:** RESTful API endpoints for agent coordination
- **Event-Driven:** Webhook triggers for agent activation
- **State Management:** Shared state storage for collaborative decision-making

---

## 9. Success Metrics and Validation

### Technical Validation Criteria

- **Agent Response Time:** Sub-second response for real-time triage
- **Pattern Detection Accuracy:** Successful identification of known mental health trends
- **Campaign Effectiveness:** Measurable engagement with intervention content
- **System Reliability:** 99%+ uptime for critical agent functions

### Functional Validation

- **End-to-End Workflow:** Complete agent collaboration cycle
- **Data Processing:** Accurate analysis of anonymized interaction data
- **Automated Interventions:** Successful campaign creation and execution
- **Real-time Classification:** Accurate conversation severity assessment

---

## 10. Future Development Roadmap

### Phase 1: Core Agent Implementation

- Develop Analytics Agent with basic pattern recognition
- Implement Intervention Agent with email campaign capabilities
- Create Triage Agent with conversation classification

### Phase 2: Advanced Intelligence

- Enhanced machine learning models for pattern detection
- Sophisticated intervention personalization algorithms
- Multi-modal triage assessment (text, sentiment, behavioral patterns)

### Phase 3: Institutional Integration

- University system integrations (LMS, student records)
- Professional counselor dashboard and referral system
- Comprehensive analytics and reporting platform

---

## 11. Compliance and Ethical Considerations

### Data Privacy

- **Anonymization:** All personal identifiers removed from analysis data
- **GDPR Compliance:** User consent and data protection protocols
- **Secure Storage:** Encrypted data storage and transmission

### Ethical AI Guidelines

- **Transparency:** Clear indication of AI-driven interventions
- **Human Oversight:** Professional staff review of critical recommendations
- **Bias Mitigation:** Regular auditing of agent decision-making patterns
- **User Agency:** Always preserve user choice in accessing support

---

## 12. Dependencies and Prerequisites

### External Services

- **LLM Providers:** Google Gemini, TogetherAI (Llama 3)
- **Database:** PostgreSQL (production), Redis (caching)
- **Authentication:** Google OAuth APIs
- **Email Service:** SMTP or service provider for interventions
- **Blockchain:** Polygon Amoy testnet (for existing NFT features)

### Development Tools

- **Backend:** FastAPI, LangChain, SQLAlchemy, Alembic
- **Frontend:** Next.js, TypeScript, Tailwind CSS, NextAuth.js
- **Orchestration:** n8n workflow automation
- **Testing:** Jest (frontend), pytest (backend)
- **Deployment:** Vercel, Render, Docker containers

---

## 13. Comprehensive Documentation

This project includes extensive documentation in the `docs/` folder to support development, research, and deployment:

### 📚 Complete Documentation Suite

- **[📚 Documentation Index](docs/README.md)**: Navigation guide for all documentation
- **[📋 Single Source of Truth](docs/single-source-of-truth.md)**: Detailed project overview and specifications
- **[🏗️ Three-Agent Framework](docs/three-agent-framework.md)**: Technical architecture and agent implementation
- **[⚙️ Technical Specifications](docs/technical-specifications.md)**: System requirements and detailed design
- **[🚀 Implementation Guide](docs/implementation-guide.md)**: Step-by-step development instructions
- **[🔬 Research Methodology](docs/research-methodology.md)**: Academic framework and validation procedures

### 🎯 Quick Start by Role

| Role | Start With | Then Reference |
|------|------------|----------------|
| **Developer** | [Implementation Guide](docs/implementation-guide.md) | [Technical Specifications](docs/technical-specifications.md) |
| **Researcher** | [Research Methodology](docs/research-methodology.md) | [Single Source of Truth](docs/single-source-of-truth.md) |
| **Admin** | [Single Source of Truth](docs/single-source-of-truth.md) | [Technical Specifications](docs/technical-specifications.md) |
| **New Team Member** | [Documentation Index](docs/README.md) | [Implementation Guide](docs/implementation-guide.md) |

### 🔗 Integration with Existing Docs

The new documentation builds upon and references existing project documentation:
- **AI Integration Guide**: LLM provider setup and configuration
- **API Integration Reference**: Endpoint documentation and examples
- **Mental Health AI Guidelines**: Ethical considerations and response protocols
- **Development Workflow**: Team collaboration and development processes

---

*This document serves as the definitive reference for all UGM-AICare development activities and GitHub Copilot Agent interactions. All code generation, architectural decisions, and feature implementations should align with the specifications outlined above.*
