# 🎨 Aika Meta-Agent Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AIKA META-AGENT                             │
│                    (愛佳 - Love & Excellence)                         │
│                                                                     │
│  "One AI Personality, Multiple Specialized Capabilities"            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │
                   ┌────────────┴────────────┐
                   │  Intent Classification  │
                   │   (LangGraph Node)      │
                   └────────────┬────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │   STUDENT       │ │     ADMIN       │ │   COUNSELOR     │
    │   (Role: user)  │ │  (Role: admin)  │ │(Role: counselor)│
    └─────────────────┘ └─────────────────┘ └─────────────────┘
              │                 │                 │
              │                 │                 │
┌─────────────▼─────────────────┐                │
│                               │                │
│     STUDENT WORKFLOW          │                │
│     ================          │                │
│                               │                │
│  ┌─────────────────────────┐  │                │
│  │  1. Safety Triage (STA) │  │                │
│  │     "Am I safe?"        │  │                │
│  └──────────┬──────────────┘  │                │
│             │                 │                │
│        Risk Assessment        │                │
│             │                 │                │
│    ┌────────┴────────┐        │                │
│    │                 │        │                │
│ LOW/MOD         HIGH/CRIT     │                │
│    │                 │        │                │
│    ▼                 ▼        │                │
│  ┌─────┐       ┌──────────┐   │                │
│  │ SCA │       │   SDA    │   │                │
│  │Coach│       │Escalate  │   │                │
│  └──┬──┘       └────┬─────┘   │                │
│     │               │         │                │
│     └───────┬───────┘         │                │
│             │                 │                │
│             ▼                 │                │
│   ┌──────────────────┐        │                │
│   │  Synthesize      │        │                │
│   │  Response        │        │                │
│   └─────────┬────────┘        │                │
│             │                 │                │
│             ▼                 │                │
│   ┌──────────────────┐        │                │
│   │  Background      │        │                │
│   │  Analytics (IA)  │        │                │
│   └──────────────────┘        │                │
└───────────────────────────────┘                │
                                                 │
        ┌────────────────────────────────────────┤
        │                                        │
        ▼                                        ▼
┌──────────────────────┐            ┌──────────────────────┐
│                      │            │                      │
│   ADMIN WORKFLOW     │            │  COUNSELOR WORKFLOW  │
│   ===============    │            │  ==================  │
│                      │            │                      │
│  ┌────────────────┐  │            │  ┌────────────────┐  │
│  │ Query or       │  │            │  │ Service Desk   │  │
│  │ Action?        │  │            │  │ (SDA)          │  │
│  └───────┬────────┘  │            │  │ Get Cases      │  │
│          │           │            │  └───────┬────────┘  │
│    ┌─────┴─────┐     │            │          │           │
│    │           │     │            │          ▼           │
│  QUERY      ACTION   │            │  ┌────────────────┐  │
│    │           │     │            │  │ Insights (IA)  │  │
│    ▼           ▼     │            │  │ Clinical Data  │  │
│  ┌───┐      ┌───┐   │            │  └───────┬────────┘  │
│  │ IA│      │SDA│   │            │          │           │
│  └─┬─┘      └─┬─┘   │            │          ▼           │
│    │          │     │            │  ┌────────────────┐  │
│    └────┬─────┘     │            │  │ Support Coach  │  │
│         │           │            │  │ (SCA)          │  │
│         ▼           │            │  │ Recommendations│  │
│  ┌────────────┐     │            │  └───────┬────────┘  │
│  │ Response   │     │            │          │           │
│  │ + Metadata │     │            │          ▼           │
│  └────────────┘     │            │  ┌────────────────┐  │
│                     │            │  │ Combined       │  │
└─────────────────────┘            │  │ Response       │  │
                                   │  └────────────────┘  │
                                   │                      │
                                   └──────────────────────┘
```

---

## 🔧 Technical Components

### Backend Files

```
backend/app/agents/aika/
├── __init__.py                 # Package exports
├── orchestrator.py             # ⭐ Main orchestrator (650 lines)
│   ├── AikaOrchestrator        # Main class
│   ├── _build_graph()          # LangGraph workflow
│   ├── _classify_intent()      # Intent classification
│   ├── _route_by_role()        # Role-based routing
│   ├── _student_triage()       # STA coordination
│   ├── _student_coaching()     # SCA coordination
│   ├── _student_escalation()   # Crisis handling
│   ├── _admin_analytics()      # IA for admin
│   ├── _admin_actions()        # SDA for admin
│   ├── _counselor_cases()      # SDA for counselor
│   ├── _counselor_insights()   # IA for counselor
│   ├── _synthesize_response()  # Final synthesis
│   └── _background_analytics() # IA background
│
├── identity.py                 # Personality & prompts (180 lines)
│   ├── AIKA_IDENTITY          # Core identity text
│   ├── AIKA_SYSTEM_PROMPTS    # Role-specific prompts
│   ├── AIKA_GREETINGS         # Role greetings
│   └── AIKA_CAPABILITIES      # Feature lists
│
├── state.py                    # State management (85 lines)
│   ├── AikaState              # LangGraph state
│   └── AikaResponseMetadata   # Response metadata
│
├── agent_adapters.py           # Service wrappers (380 lines)
│   ├── SafetyTriageAgent      # STA wrapper
│   ├── SupportCoachAgent      # SCA wrapper
│   ├── ServiceDeskAgent       # SDA wrapper
│   └── InsightsAgent          # IA wrapper
│
└── tools.py                    # Function calling (existing)
    └── get_aika_tools()       # Tool registry
```

### API Routes

```
backend/app/domains/mental_health/routes/
└── chat.py
    ├── POST /api/v1/aika      # ⭐ New Aika endpoint
    └── POST /api/v1/chat      # Legacy endpoint (still works)
```

### Specialized Agents (Existing)

```
backend/app/agents/
├── sta/                        # Safety Triage Agent
│   ├── service.py             # Main service
│   ├── classifiers.py         # Risk classification
│   └── schemas.py             # Request/response schemas
│
├── sca/                        # Support Coach Agent
│   ├── service.py             # Coaching service
│   └── schemas.py             # Intervention schemas
│
├── sda/                        # Service Desk Agent
│   ├── service.py             # Case management
│   └── schemas.py             # Case schemas
│
└── ia/                         # Insights Agent
    ├── service.py             # Analytics service
    └── schemas.py             # Query schemas
```

---

## 📊 Data Flow

### Request Flow

```
1. Client Request
   POST /api/v1/aika
   {
     "message": "Aku sedang merasa stress",
     "session_id": "session_123",
     "history": [...]
   }
   ↓
2. Authentication
   JWT validation → get_current_active_user
   ↓
3. Role Detection
   Check user.role → "user" / "admin" / "counselor"
   ↓
4. Aika Orchestration
   AikaOrchestrator.process_message()
   ↓
5. LangGraph Execution
   StateGraph workflow with conditional routing
   ↓
6. Agent Coordination
   STA → SCA → [SDA] → IA (background)
   ↓
7. Response Synthesis
   Unified Aika personality response
   ↓
8. Client Response
   {
     "success": true,
     "response": "Aku mengerti...",
     "metadata": {
       "agents_invoked": ["STA", "SCA"],
       "risk_level": "low",
       "processing_time_ms": 1234.56
     }
   }
```

### State Transitions

```
AikaState:
  user_id: 123
  user_role: "user"
  message: "Aku sedang merasa stress"
  conversation_history: [...]
  ↓
classify_intent:
  + intent: "emotional_support"
  + intent_confidence: 0.85
  ↓
student_triage (STA):
  + triage_result: {risk_level: "low", ...}
  + risk_level: "low"
  + risk_factors: []
  ↓
student_coaching (SCA):
  + coaching_result: {response: "...", ...}
  + response: "Aku mengerti kamu sedang..."
  + actions_taken: ["provided_emotional_support"]
  ↓
synthesize_response:
  + (validate tone and add actions summary)
  ↓
background_analytics (IA):
  + (log metrics, non-blocking)
  ↓
END
```

---

## 🎭 Personality Matrix

```
┌────────────────┬──────────────────┬──────────────────┬──────────────────┐
│     ROLE       │    STUDENT       │      ADMIN       │    COUNSELOR     │
├────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Language       │ Informal ID      │ Formal ID/EN     │ Professional EN  │
├────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Tone           │ Warm, empathetic │ Data-driven      │ Clinical, precise│
├────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Greeting       │ "Hai! Aku Aika" │ "Hello! I'm..."  │ "Hi! I'm Aika"  │
├────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Primary Agent  │ STA → SCA        │ IA → SDA         │ SDA → IA → SCA   │
├────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Key Feature    │ Crisis detection │ Analytics        │ Case management  │
├────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Example Query  │ "Aku sedih..."   │ "Trending topics"│ "Show cases"     │
├────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Response Style │ 3-5 sentences    │ Bullet points    │ Clinical summary │
│                │ with emojis      │ with data        │ with insights    │
└────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

## 🚀 Quick Start

### Backend Testing

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Test imports
python -c "from app.agents.aika import AikaOrchestrator; print('✅ Aika imported!')"

# Start server
uvicorn app.main:app --reload --port 8000
```

### API Testing

```bash
# Test student chat
curl -X POST http://localhost:8000/api/v1/aika \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Aku sedang merasa stress dengan kuliah",
    "session_id": "test_session_123"
  }'

# Expected response:
{
  "success": true,
  "response": "Aku mengerti kamu sedang merasa tertekan...",
  "metadata": {
    "agents_invoked": ["STA", "SCA"],
    "risk_level": "low",
    ...
  }
}
```

---

## 📈 Metrics & Monitoring

### Tracked Metrics

```python
AikaResponseMetadata:
  - session_id: str
  - user_role: str
  - intent: Optional[str]
  - agents_invoked: List[str]     # e.g., ["STA", "SCA"]
  - processing_time_ms: float      # Total orchestration time
  - risk_level: Optional[str]      # For students
  - escalation_needed: bool        # Crisis flag
  - actions_taken: List[str]       # Actions performed
  - timestamp: datetime
```

### Logging

```python
# Example logs
INFO: ✨ Aika processing request from user user 123: Aku sedang merasa stress...
INFO: 📋 Intent classified: emotional_support (confidence: 0.85)
INFO: 🚨 Invoking Safety Triage Agent...
INFO: 🚨 STA assessment: Risk level = low
INFO: 💙 Invoking Support Coach Agent...
INFO: 💙 SCA provided coaching response
INFO: ✨ Synthesizing final Aika response...
INFO: 📈 Running background analytics...
INFO: ✅ Aika completed: agents=['STA', 'SCA'], time=1234.56ms
```

---

## 🎓 Research Impact

### Publications Potential

**Title:** "Aika: A Meta-Agent Orchestration Framework for Culturally-Sensitive University Mental Health Support"

**Contributions:**
1. ✨ **Meta-agent architecture** for mental health AI
2. 🔒 **Privacy-preserving multi-agent coordination**
3. 🌏 **Cultural adaptation** for Indonesian context
4. 🛡️ **Safety-first design** with human oversight

**Venues:**
- CHI 2026 (HCI + Mental Health)
- AAAI-25 AI for Social Impact Workshop
- IJCAI 2025 Special Track on AI Ethics

---

**"From four specialized agents to one unified AI heart: Meet Aika!"** 💙✨
