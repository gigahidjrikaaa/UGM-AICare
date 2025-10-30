# 🌟 Aika Meta-Agent Architecture

**Date:** October 29, 2025  
**Status:** ✅ Implemented (MVP)  
**Version:** 1.0

---

## Overview

**Aika (愛佳)** is the unified AI consciousness of UGM-AICare. Rather than having separate chatbots for different features, Aika serves as a meta-agent orchestrator that coordinates four specialized Safety Agent Suite agents based on user role and context.

### Name Meaning
- **愛 (Ai)** = Love, affection
- **佳 (Ka)** = Excellent, beautiful

### Core Philosophy
> "One AI personality, multiple specialized capabilities"

---

## Architecture

### Specialized Agents (Safety Agent Suite)

Aika coordinates these four agents:

1. **STA (Safety Triage Agent)** - `app/agents/sta/`
   - Crisis detection and risk assessment
   - Classification: low / moderate / high / critical
   - Automatic escalation triggers

2. **SCA (Support Coach Agent)** - `app/agents/sca/`
   - CBT-informed therapeutic support
   - Intervention planning and execution
   - Progress tracking

3. **SDA (Service Desk Agent)** - `app/agents/sda/`
   - Clinical case management
   - Counselor assignment and SLA tracking
   - Administrative command execution

4. **IA (Insights Agent)** - `app/agents/ia/`
   - Privacy-preserving analytics (differential privacy)
   - Platform health monitoring
   - Clinical insights for counselors

### Orchestration Logic

```
┌─────────────────────────────────────────┐
│              AIKA                       │
│     (Meta-Agent Orchestrator)           │
└─────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    STUDENT     ADMIN    COUNSELOR
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │  STA   │ │   IA   │ │  SDA   │
   │   ↓    │ │   ↓    │ │   ↓    │
   │  SCA   │ │  SDA   │ │   IA   │
   │   ↓    │ └────────┘ │   ↓    │
   │ [SDA]* │            │  SCA   │
   │   ↓    │            └────────┘
   │   IA   │
   └────────┘

   * Optional escalation
```

---

## Role-Based Routing

### Students (Role: `user`)
**Workflow:** STA → SCA → [SDA if crisis] → IA (background)

**Personality:**
- Warm, empathetic, informal Indonesian
- Active listening and validation
- "Aku di sini untuk mendengarkanmu..."

**Capabilities:**
- 💬 Empathetic chat support
- 🚨 Crisis detection with auto-escalation
- 📝 Journaling prompts
- 🎯 Goal setting and progress tracking

### Admins (Role: `admin`)
**Workflow:** Intent classification → IA (analytics) or SDA (actions)

**Personality:**
- Professional, data-driven, efficient
- Formal Indonesian or English
- "Here are the trending topics this week..."

**Capabilities:**
- 📊 Analytics queries ("trending topics this week")
- 📈 Platform health monitoring
- 🔔 Counselor workload insights
- 📧 Bulk communications (with confirmation)

### Counselors (Role: `counselor`)
**Workflow:** SDA (cases) → IA (insights) → SCA (recommendations)

**Personality:**
- Clinical, evidence-based, professional
- Therapeutic terminology
- "You have 3 high-risk cases requiring attention..."

**Capabilities:**
- 📋 Case management
- 👤 Patient history and patterns
- 💡 Treatment recommendations (CBT, mindfulness)
- ⚠️ High-risk alerts

---

## Implementation

### File Structure

```
backend/app/agents/aika/
├── __init__.py              # Package exports
├── orchestrator.py          # 🎯 Main orchestration logic (LangGraph)
├── identity.py              # Personality definitions and system prompts
├── state.py                 # State management (AikaState)
├── agent_adapters.py        # Simplified wrappers for existing agents
└── tools.py                 # Function calling tools (existing)
```

### API Endpoint

**New Endpoint:** `POST /api/v1/aika`

**Location:** `backend/app/domains/mental_health/routes/chat.py`

**Request:**
```json
{
  "message": "Aku sedang merasa stress dengan kuliah",
  "session_id": "session_123",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Aku mengerti kamu sedang merasa tertekan dengan kuliah...",
  "metadata": {
    "session_id": "session_123",
    "user_role": "user",
    "intent": "emotional_support",
    "agents_invoked": ["STA", "SCA"],
    "risk_level": "low",
    "processing_time_ms": 1234.56,
    "escalation_needed": false,
    "actions_taken": ["provided_emotional_support"]
  }
}
```

### LangGraph Workflow

Powered by **LangGraph** for flexible agent coordination:

```python
workflow = StateGraph(AikaState)

# Define nodes (agent functions)
workflow.add_node("classify_intent", self._classify_intent)
workflow.add_node("student_triage", self._student_triage)
workflow.add_node("student_coaching", self._student_coaching)
# ... more nodes

# Role-based routing
workflow.add_conditional_edges(
    "classify_intent",
    self._route_by_role,
    {
        "student_triage": "student_triage",
        "admin_analytics": "admin_analytics",
        "counselor_cases": "counselor_cases",
    }
)

# Crisis detection routing
workflow.add_conditional_edges(
    "student_triage",
    self._check_crisis,
    {
        "crisis": "student_escalation",
        "no_crisis": "student_coaching",
    }
)
```

---

## Usage Examples

### Student Chat
```python
from app.agents.aika import AikaOrchestrator

aika = AikaOrchestrator(db=db_session)

result = await aika.process_message(
    user_id=123,
    user_role="user",
    message="Aku sedang merasa stress dengan kuliah",
    session_id="session_123",
)

print(result["response"])
# → "Aku mengerti kamu sedang merasa tertekan dengan kuliah..."
```

### Admin Query
```python
result = await aika.process_message(
    user_id=456,
    user_role="admin",
    message="Kasih saya info tentang topik trending minggu ini",
    session_id="admin_session",
)

print(result["response"])
# → "Minggu ini topik trending: anxiety (45%), stress kuliah (30%), kesepian (25%)"
```

### Counselor Case Review
```python
result = await aika.process_message(
    user_id=789,
    user_role="counselor",
    message="Show me high-risk cases assigned to me",
    session_id="counselor_session",
)

print(result["response"])
# → "You have 3 high-risk cases: Case #123 (suicide ideation), ..."
```

---

## System Prompts

### Student Prompt
```
You are Aika (愛佳), the empathetic AI companion for UGM students.

PERSONALITY:
- Warm, caring, and non-judgmental
- Use informal Indonesian ("kamu", not "Anda")
- Active listener who validates feelings

YOUR ROLE:
1. Listen actively and empathetically
2. Detect crisis signals
3. Provide CBT-informed support
4. Escalate to counselors when needed
5. Encourage journaling and reflection
```

### Admin Prompt
```
You are Aika (愛佳), the intelligent administrative assistant.

PERSONALITY:
- Professional, data-driven, efficient
- Use formal Indonesian or English
- Clear and actionable responses

CAPABILITIES:
- Analytics queries
- Administrative commands
- Monitoring and reporting
- Bulk communications (with confirmation)
```

### Counselor Prompt
```
You are Aika (愛佳), the clinical assistant for counselors.

PERSONALITY:
- Professional, evidence-based, supportive
- Use clinical terminology appropriately
- Maintain patient confidentiality

CAPABILITIES:
- Case management
- Clinical insights
- Treatment recommendations
- Progress tracking
```

---

## Crisis Handling

### Risk Levels
- **Low**: Normal conversation
- **Moderate**: Some distress, monitor closely
- **High**: Significant risk factors, counselor notification
- **Critical**: Immediate crisis, urgent case creation + emergency resources

### Escalation Flow
```
1. STA detects high/critical risk
2. Aika routes to student_escalation node
3. SDA creates urgent case
4. Counselor gets notified (TODO: implement notification)
5. Student receives crisis resources:
   - Hotline Crisis Center: 119
   - Kemenkes RI: 500-454
   - Sejiwa: 119 ext. 8
```

---

## Privacy & Security

### Differential Privacy (IA)
- **ε-δ budgets** for analytics
- **k-anonymity** (k≥5) for aggregated data
- **Consent ledger** with withdrawal support

### Data Protection
- **PII redaction** before logging
- **No diagnosis** - always defer to professionals
- **Audit trail** for all admin actions
- **JWT validation** on all endpoints

---

## Future Enhancements

### Phase 2: Advanced Coordination
- [ ] Multi-agent debates for complex cases
- [ ] Automatic therapy module recommendations
- [ ] Proactive check-ins based on risk patterns

### Phase 3: Admin Command Tools
- [ ] Natural language analytics queries
- [ ] Bulk communication dashboard
- [ ] A/B testing for interventions

### Phase 4: Counselor Tools
- [ ] Clinical note generation
- [ ] Treatment plan templates
- [ ] Patient progress visualizations

---

## Testing

### Unit Tests (TODO)
```python
# Test role-based routing
async def test_aika_student_routing():
    aika = AikaOrchestrator(db)
    result = await aika.process_message(
        user_id=1,
        user_role="user",
        message="Aku sedang sedih",
    )
    assert "STA" in result["metadata"]["agents_invoked"]
    assert "SCA" in result["metadata"]["agents_invoked"]

# Test crisis escalation
async def test_aika_crisis_escalation():
    result = await aika.process_message(
        user_id=1,
        user_role="user",
        message="Aku ingin menyakiti diri sendiri",
    )
    assert result["metadata"]["risk_level"] == "critical"
    assert result["metadata"]["escalation_needed"] is True
```

---

## Migration Notes

### Before (Legacy System)
- Separate agents: `analytics_agent.py`, `intervention_agent.py`, `triage_agent.py`
- Direct agent-to-agent calls (tight coupling)
- No unified personality

### After (Aika Meta-Agent)
- ✅ Unified AI personality across platform
- ✅ LangGraph orchestration (loose coupling)
- ✅ Role-based routing
- ✅ Cleaner codebase (agents focus on specialization, not coordination)

### Backward Compatibility
- **Old `/chat` endpoint**: Still works (legacy support)
- **New `/aika` endpoint**: Recommended for all new integrations
- **Agent services**: Wrapped with adapters, no breaking changes

---

## Research Contribution

### Novel Aspects
1. **Meta-Agent Orchestration for Mental Health**
   - First application of LangGraph meta-agents in mental health domain
   - Role-based routing with unified personality

2. **Privacy-Preserving Multi-Agent System**
   - Differential privacy integrated into agent coordination
   - Consent-aware analytics with k-anonymity

3. **Cultural Sensitivity in AI Architecture**
   - Indonesian mental health stigma considerations
   - Collectivist values in therapeutic approach

---

## Documentation

### Related Docs
- **Architecture**: `PROJECT_SINGLE_SOURCE_OF_TRUTH.md`
- **Agent Specs**: `docs/refactor_plan.md`
- **Mental Health Guidelines**: `docs/mental-health-ai-guidelines.md`

### API Documentation
- Auto-generated: `http://localhost:8000/docs`
- Endpoint: `/api/v1/aika`

---

## Changelog

### v1.0 (October 29, 2025) - MVP Release
- ✅ Created Aika orchestrator with LangGraph
- ✅ Implemented role-based routing (student/admin/counselor)
- ✅ Added system prompts for each role
- ✅ Created `/api/v1/aika` endpoint
- ✅ Agent adapters for existing services
- ✅ Crisis escalation workflow
- ✅ Background analytics logging

### Upcoming (v1.1)
- [ ] Implement actual case creation in database
- [ ] Add counselor notifications
- [ ] Admin command execution with confirmation
- [ ] Frontend integration (chat UI updates)
- [ ] Unit tests and integration tests

---

## Contact

**Maintainers:**
- Backend Architecture: Aika Orchestration Team
- Mental Health: CBT Module Team
- Analytics: Insights Agent Team

**Questions?**
- See: `PROJECT_SINGLE_SOURCE_OF_TRUTH.md`
- Issues: GitHub Issues
- Discussions: GitHub Discussions

---

**"Aku Aika, dan aku di sini untuk membantu seluruh ekosistem kesehatan mental UGM!"** 🌟
