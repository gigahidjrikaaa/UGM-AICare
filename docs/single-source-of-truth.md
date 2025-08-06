# UGM-AICare: Single Source of Truth Documentation

## Project Overview

**Title**: "Transforming University Mental Health Support: An Agentic AI Framework for Proactive Intervention and Resource Management"

**Problem Statement**: Mental health support in universities is often reactive, inefficient, and struggles to scale. UGM-AICare solves this by creating a proactive, data-driven, and automated framework to support student well-being at an institutional level.

## Core Concept: The 3-Agent Framework

UGM-AICare is built around three collaborative AI agents that work together to provide comprehensive mental health support:

### 🤖 The Analytics Agent

- **Purpose**: Autonomously identify emerging mental health trends and patterns
- **Schedule**: Runs on a weekly schedule
- **Function**: Analyzes anonymized student interaction data from the database
- **Output**: Generates insights about mental health trends (e.g., rise in anxiety-related queries during exam periods)
- **Technology**: Powered by LangChain agents and LLM integration

### 📢 The Intervention Agent

- **Purpose**: Launch proactive outreach campaigns based on analytics insights
- **Trigger**: Activated by insights from the Analytics Agent
- **Function**: Automatically sends targeted resources and support to relevant student groups
- **Examples**: Email campaigns about exam stress management, mindfulness resources during peak anxiety periods
- **Technology**: n8n workflow automation with email integration

### 🩺 The Triage Agent

- **Purpose**: Real-time conversation analysis and support level classification
- **Operation**: Real-time analysis during student conversations
- **Function**: Classifies conversation severity and recommends appropriate support level
- **Recommendations**: Self-help articles, counseling session booking links, emergency contacts
- **Technology**: Integrated into the chat system with immediate response capabilities

## Technical Architecture

### Backend - "The Brain" 🧠

- **Framework**: FastAPI (Python)
- **Purpose**: Houses core agent logic and business intelligence
- **Key Components**:
  - LangChain library for LLM interaction and prompt construction
  - Agent orchestration and decision-making logic
  - Database management and analytics processing
  - API endpoints for all system interactions

### Orchestration - "The Nervous System" ⚡

- **Technology**: n8n workflow automation engine
- **Responsibilities**:
  - Scheduling the Analytics Agent execution
  - Managing intervention campaign logic
  - Making API calls to the backend
  - Coordinating between different system components
  - Handling email notifications and alerts

### Frontend - "The Interface" 🖥️

- **Technology**: Next.js web application
- **Purpose**: Admin Dashboard for university staff
- **Features**:
  - View Analytics Agent reports
  - Oversee system operations
  - Monitor student engagement patterns
  - Manage intervention campaigns
  - Access real-time system metrics

### Database - "The Memory" 🗃️

- **Technology**: PostgreSQL
- **Storage**:
  - Anonymized interaction logs
  - Generated analytics reports
  - Campaign execution details
  - User engagement metrics
  - System performance data

## Research Methodology

### Approach

- **Framework**: Design Science Research (DSR) methodology
- **Primary Goal**: Design, build, and functionally validate the 3-agent framework
- **Final Output**: Working prototype demonstration

### Scope and Limitations

- **Focus**: Technical functionality and feasibility validation
- **Limitations**:
  - No live clinical trials with students
  - No psychological outcome measurements
  - Prototype-level implementation for proof of concept

### Success Criteria

- Functional Analytics Agent generating meaningful insights
- Successful Intervention Agent campaign automation
- Real-time Triage Agent classification accuracy
- Seamless integration between all three agents
- Admin dashboard providing actionable intelligence

## Key Innovation Points

1. **Proactive vs Reactive**: Shifts from waiting for students to seek help to identifying and addressing issues before they escalate
2. **Data-Driven Insights**: Uses actual interaction patterns to inform intervention strategies
3. **Automated Scaling**: Enables university-wide support without proportional increase in human resources
4. **Multi-Agent Collaboration**: Three specialized agents working together for comprehensive coverage
5. **Real-Time Triage**: Immediate classification and appropriate response routing

## Implementation Timeline

### Phase 1: Foundation

- Backend API development
- Database schema implementation
- Basic LLM integration

### Phase 2: Agent Development

- Analytics Agent implementation
- Data analysis and pattern recognition
- Report generation capabilities

### Phase 3: Automation

- n8n workflow setup
- Intervention Agent development
- Campaign automation testing

### Phase 4: Integration

- Triage Agent implementation
- Frontend dashboard development
- End-to-end system testing

### Phase 5: Validation

- Prototype testing and refinement
- Performance optimization
- Documentation and presentation

## Impact Potential

### For Students

- Proactive mental health support
- Reduced barriers to accessing help
- Personalized intervention timing
- 24/7 availability of initial support

### For University Administration

- Data-driven mental health insights
- Scalable support infrastructure
- Early intervention capabilities
- Resource allocation optimization

### For Mental Health Services

- Enhanced triage and referral system
- Better understanding of student needs
- Improved service delivery efficiency
- Evidence-based intervention strategies

---

*This document serves as the definitive reference for understanding the UGM-AICare project's core concept, technical implementation, and research objectives.*
