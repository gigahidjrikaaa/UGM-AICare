# 🤖 Aika Meta-Agent: Complete Architecture Guide

## Table of Contents
1. [What is Aika?](#what-is-aika)
2. [Core Architecture](#core-architecture)
3. [Role-Based Flows](#role-based-flows)
4. [LangGraph Implementation](#langgraph-implementation)
5. [Tool Calling System](#tool-calling-system)
6. [Agent Orchestration](#agent-orchestration)

---

## What is Aika?

**Aika (愛佳)** is the Meta-Agent orchestrator for UGM-AICare - a unified AI personality that coordinates 4 specialized LangGraph agents based on user role and intent.

**Name Meaning:**
- 愛 (Ai) = Love, Care
- 佳 (Ka) = Excellence, Beauty

**Core Capabilities:**
- 🎭 **Role-aware personality** (Student/Admin/Counselor)
- 🧠 **Intent classification** with caching optimization
- 🔧 **Function calling** with 10+ tools (scheduling, profile, intervention plans)
- 🔀 **Conditional routing** to specialized agents
- 📊 **Real-time execution tracking**

---

## Core Architecture

### 🚨 **IMPORTANT: Two Orchestration Systems**

There are **TWO different orchestration approaches** in the codebase:

1. **`orchestrator_graph.py`** - Pure LangGraph orchestrator (older, not used in chat)
2. **`aika/orchestrator.py`** - Aika Meta-Agent with Gemini function calling (actively used)

**The chat endpoint uses Aika Meta-Agent**, not the pure LangGraph orchestrator.

### 🏗️ System Components (Aika Meta-Agent)

```
┌─────────────────────────────────────────────────────────────┐
│                    AIKA META-AGENT                          │
│              (Unified AI Personality)                       │
│               GEMINI FUNCTION CALLING                       │
│                                                             │
│  Entry Point: process_message_with_tools()                 │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Gemini AI  │  │   Tool      │  │  LangGraph  │       │
│  │ (Decides if │  │  Registry   │  │   Agents    │       │
│  │ agents are  │  │ (10 tools)  │  │ (Subgraphs) │       │
│  │  needed)    │  └─────────────┘  └─────────────┘       │
│  └─────────────┘                                           │
│         │                                                   │
│         ├─> Direct Response (no agents) ──────────> END    │
│         │                                                   │
│         └─> Calls Tools ──> Executes LangGraph Agents      │
│                                 │                           │
│                                 ▼                           │
│              ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│              │ STA  │  │ SCA  │  │ SDA  │  │ IA   │       │
│              │Safety│  │Coach │  │Service│  │Insights│    │
│              └──────┘  └──────┘  └──────┘  └──────┘       │
└─────────────────────────────────────────────────────────────┘

FLOW:
1. User message → Gemini analyzes intent
2. Gemini decides: Need agents? YES/NO
3. If NO → Direct conversational response (1.2s)
4. If YES → Calls appropriate tool (e.g., run_safety_triage_agent)
5. Tool executes LangGraph subgraph → Returns result
6. Gemini synthesizes final response with context
```

### 🆚 **Comparison: Two Orchestration Approaches**

| Feature | orchestrator_graph.py | aika/orchestrator.py |
|---------|----------------------|---------------------|
| **Type** | Pure LangGraph StateGraph | Gemini Function Calling |
| **Personality** | ❌ No Aika personality | ✅ Aika personality (warm, empathetic) |
| **Agent Invocation** | ⚠️ Always runs STA | ✅ Conditional (only when needed) |
| **Decision Logic** | Hardcoded conditional edges | Gemini AI decides dynamically |
| **Performance** | ~10.7s (always runs agents) | ~1.8s avg (83% faster) |
| **Currently Used** | ❌ Not used in chat endpoint | ✅ Used in `/api/v1/chat` |
| **Entry Point** | `create_orchestrator_graph()` | `process_message_with_tools()` |
| **Best For** | Guaranteed agent execution | Conversational AI with smart routing |

**Why Two Systems?**
- `orchestrator_graph.py` was created for **guaranteed safety checks** (always run STA)
- `aika/orchestrator.py` was created for **better UX** (fast responses, human-like conversation)
- **Future:** Could merge into one system where Aika is the first LangGraph node

---

### 💡 **Future Ideal Architecture (Not Yet Implemented)**

**What many expect:** Aika as the first LangGraph node that decides everything

```
┌─────────────────────────────────────────────────────────────┐
│                   LANGGRAPH WORKFLOW                        │
│                                                             │
│  START                                                      │
│    ↓                                                        │
│  ┌─────────────────────────────────────┐                   │
│  │  AIKA NODE (Gemini Decision)        │                   │
│  │  • Analyze user message              │                   │
│  │  • Classify intent & risk            │                   │
│  │  • Decide: Need agents? YES/NO       │                   │
│  └─────────────────────────────────────┘                   │
│         │                    │                              │
│         │                    │                              │
│    [Need Agents]       [Direct Answer]                     │
│         │                    │                              │
│         ↓                    ↓                              │
│   ┌──────────┐              END                            │
│   │   STA    │              (1.2s)                         │
│   └──────────┘                                             │
│         ↓                                                   │
│   [Conditional Routing]                                     │
│    ↓         ↓       ↓                                     │
│  [SCA]    [SDA]    [IA]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Benefits of this approach:**
- ✅ Single unified LangGraph workflow
- ✅ Aika personality at every step
- ✅ Deterministic routing + smart decisions
- ✅ Easier to debug (one execution path)
- ✅ Better execution tracking

**Why not implemented yet?**
- Current system works well for production
- Requires refactoring Aika's Gemini logic into LangGraph nodes
- Need to preserve conversation caching optimizations

### 📁 File Structure

```
backend/app/agents/aika/
├── orchestrator.py          # Main orchestration logic (1591 lines)
├── state.py                 # AikaState TypedDict
├── identity.py              # Role-specific system prompts (287 lines)
├── tools.py                 # Backward-compatible tool interface
├── activity_logger.py       # Real-time execution logging
└── __init__.py

backend/app/agents/shared/tools/
├── registry.py              # @register_tool decorator system
├── agent_tools.py           # 5 agent orchestration tools
├── scheduling_tools.py      # 5 appointment scheduling tools
└── __init__.py
```

---

## Role-Based Flows

### 🎓 **STUDENT Flow** (user role = "user")

```
┌──────────────────────────────────────────────────────────────┐
│  USER: "Aku lagi stres banget dengan tugas kuliah"          │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  AIKA: Entry Point (process_message_with_tools)             │
│  • Role: student                                             │
│  • System Prompt: Warm, empathetic Indonesian                │
│  • Tools: 10 tools available                                 │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  GEMINI: Function Calling                                    │
│  • Analyzes message intent                                   │
│  • Decides: Need safety triage? Coaching plan? Scheduling?   │
│  • Calls: run_safety_triage_agent                           │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  TOOL EXECUTION: run_safety_triage_agent                     │
│  → Calls STA LangGraph (4-node workflow)                     │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  STA GRAPH: Safety Triage Agent                              │
│  Node 1: ingest_message       → Validate input               │
│  Node 2: apply_redaction      → Strip PII                    │
│  Node 3: assess_risk          → Gemini risk analysis         │
│  Node 4: decide_routing       → Route to SCA or SDA          │
│                                                              │
│  OUTPUT: risk_level = "low", intent = "academic_stress"     │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  GEMINI: Receives STA result                                 │
│  • Risk is low → No crisis escalation needed                 │
│  • Decides: Call run_support_coach_agent                     │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  TOOL EXECUTION: run_support_coach_agent                     │
│  → Calls SCA LangGraph (5-node workflow)                     │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  SCA GRAPH: Support Coach Agent                              │
│  Node 1: ingest_triage_signal       → Get STA results        │
│  Node 2: determine_intervention_type → Map to "break_down"   │
│  Node 3: generate_plan              → Gemini creates plan    │
│  Node 4: safety_review              → Validate content       │
│  Node 5: persist_plan               → Save to DB             │
│                                                              │
│  OUTPUT: intervention_plan_id = 42                           │
│         plan_title = "Strategi Mengelola Stres Akademik"    │
│         plan_steps = [5 actionable steps]                    │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  GEMINI: Synthesizes Final Response                          │
│  "Aku paham kamu lagi overwhelmed dengan tugas. Aku bikinin  │
│   rencana untuk bantu kamu kelola stres akademik:            │
│                                                              │
│   📋 **Strategi Mengelola Stres Akademik**                   │
│   1. Identifikasi prioritas tugas (30 menit)                 │
│   2. Break down ke sub-tasks kecil                           │
│   3. Jadwalkan 25-min work sessions (Pomodoro)               │
│   4. Reward diri setelah setiap milestone                    │
│   5. Minta bantuan teman/dosen jika stuck                    │
│                                                              │
│   Yuk kita coba langkah pertama! 💪"                         │
└──────────────────────────────────────────────────────────────┘
```

**Key Features for Students:**
- ✅ Always starts with **STA** (Safety Triage Agent) for risk assessment
- ✅ **Low/Moderate Risk** → Routes to **SCA** (Support Coach Agent) for therapeutic support
- ✅ **High/Critical Risk** → Routes to **SDA** (Service Desk Agent) for crisis escalation
- ✅ **Background Analytics** → **IA** (Insights Agent) tracks trends (privacy-preserved)
- ✅ **Appointment Scheduling** → Can book counselor sessions via `book_appointment` tool

---

### 👨‍💼 **ADMIN Flow** (user role = "admin")

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN: "Kasih saya trending topics minggu ini"              │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  AIKA: Entry Point                                           │
│  • Role: admin                                               │
│  • System Prompt: Professional, data-driven                  │
│  • Intent Classification: "analytics_query"                  │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  ROUTING: _route_by_role()                                   │
│  • role == "admin"                                           │
│  • intent contains "analytics" or "query"                    │
│  • Route to: "admin_analytics" node                          │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  NODE: _admin_analytics()                                    │
│  → Calls Insights Agent (IA)                                 │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  IA GRAPH: Insights Agent                                    │
│  Node 1: ingest_query          → Parse analytics question    │
│  Node 2: validate_consent      → Check privacy compliance    │
│  Node 3: apply_k_anonymity     → k≥5 enforcement             │
│  Node 4: execute_analytics     → Run aggregated query        │
│                                                              │
│  OUTPUT: trending_topics = [                                 │
│    {topic: "exam anxiety", count: 47, trend: "↑15%"},       │
│    {topic: "relationship stress", count: 32, trend: "↓8%"}  │
│  ]                                                           │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  AIKA: Synthesized Response                                  │
│  "📊 **Trending Topics (Last 7 Days):**                      │
│                                                              │
│  1. 🎓 Exam Anxiety (47 cases, ↑15%)                         │
│  2. 💔 Relationship Stress (32 cases, ↓8%)                   │
│  3. 😰 Academic Pressure (28 cases, →stable)                 │
│                                                              │
│  **Actionable Insights:**                                    │
│  • Consider running exam prep workshops                      │
│  • Monitor anxiety spike patterns                            │
│  • All data k-anonymized (k=5, ε=0.1)"                       │
└──────────────────────────────────────────────────────────────┘
```

**Key Features for Admins:**
- ✅ **Analytics Queries** → Routes to **IA** (Insights Agent)
- ✅ **Admin Actions** → Routes to **SDA** (Service Desk Agent) for case management
- ✅ **Privacy-First** → All analytics use k-anonymity (k≥5) and differential privacy
- ✅ **Real-Time Monitoring** → Dashboard-ready metrics
- ✅ **Bulk Operations** → Email broadcasts, report generation (requires confirmation)

---

### 👨‍⚕️ **COUNSELOR Flow** (user role = "counselor")

```
┌──────────────────────────────────────────────────────────────┐
│  COUNSELOR: "Show me my assigned cases with high SLA risk"   │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  AIKA: Entry Point                                           │
│  • Role: counselor                                           │
│  • System Prompt: Clinical, evidence-based                   │
│  • Intent Classification: "case_management"                  │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  ROUTING: _route_by_role()                                   │
│  • role == "counselor"                                       │
│  • Always route to: "counselor_cases" node                   │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  NODE: _counselor_cases()                                    │
│  → Calls Service Desk Agent (SDA) for case listing           │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  SDA QUERY: Get Assigned Cases                               │
│  • Filter: assigned_counsellor_id = current_user             │
│  • Filter: sla_breach_probability > 0.7                      │
│  • Sort by: sla_breach_at ASC                                │
│                                                              │
│  RESULTS: [                                                  │
│    {case_id: 15, severity: "high", sla_hours_left: 2.5},    │
│    {case_id: 23, severity: "critical", sla_hours_left: 4}   │
│  ]                                                           │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  NODE: _counselor_insights()                                 │
│  → Calls Insights Agent (IA) for clinical context            │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  IA GRAPH: Clinical Insights                                 │
│  • Patient history summary (anonymized)                      │
│  • Risk factor patterns                                      │
│  • Treatment recommendations (CBT-based)                     │
│                                                              │
│  OUTPUT: insights = {                                        │
│    case_15: "Recurrent anxiety, responds well to grounding", │
│    case_23: "First crisis episode, family stressor"          │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  AIKA: Synthesized Response                                  │
│  "🗂️ **Your High-Priority Cases:**                           │
│                                                              │
│  🔴 **Case #15** (High)                                      │
│  • SLA: 2.5 hours remaining                                  │
│  • Context: Recurrent anxiety, grounding techniques work     │
│  • Action: Schedule follow-up session                        │
│                                                              │
│  🔴 **Case #23** (Critical)                                  │
│  • SLA: 4 hours remaining                                    │
│  • Context: First crisis, family stressor identified         │
│  • Action: Immediate intervention + family consult           │
│                                                              │
│  📞 **Quick Actions:**                                       │
│  • [Call Patient] • [Update Notes] • [Extend SLA]"          │
└──────────────────────────────────────────────────────────────┘
```

**Key Features for Counselors:**
- ✅ **Case Management** → Routes to **SDA** (Service Desk Agent)
- ✅ **Clinical Insights** → Routes to **IA** (Insights Agent) for patient context
- ✅ **Treatment Recommendations** → **SCA** (Support Coach Agent) suggests CBT strategies
- ✅ **SLA Monitoring** → Automatic breach prediction and prioritization
- ✅ **Confidentiality** → All data access logged and audited

---

## LangGraph Implementation

### 🔀 Orchestration Graph Structure

```python
# From backend/app/agents/aika/orchestrator.py

workflow = StateGraph(AikaState)

# Define nodes (each is an async function)
workflow.add_node("classify_intent", self._classify_intent)
workflow.add_node("student_triage", self._student_triage)
workflow.add_node("student_coaching", self._student_coaching)
workflow.add_node("student_escalation", self._student_escalation)
workflow.add_node("admin_analytics", self._admin_analytics)
workflow.add_node("admin_actions", self._admin_actions)
workflow.add_node("counselor_cases", self._counselor_cases)
workflow.add_node("counselor_insights", self._counselor_insights)
workflow.add_node("synthesize_response", self._synthesize_response)
workflow.add_node("background_analytics", self._background_analytics)

# Entry point
workflow.set_entry_point("classify_intent")

# Conditional routing by role
workflow.add_conditional_edges(
    "classify_intent",
    self._route_by_role,  # Returns: "student_triage" | "admin_analytics" | ...
    {
        "student_triage": "student_triage",
        "admin_analytics": "admin_analytics",
        "admin_actions": "admin_actions",
        "counselor_cases": "counselor_cases",
    }
)

# Student path
workflow.add_conditional_edges(
    "student_triage",
    self._check_crisis,  # Returns: "crisis" | "no_crisis"
    {
        "crisis": "student_escalation",      # High/critical risk → SDA
        "no_crisis": "student_coaching",     # Low/moderate → SCA
    }
)

# All paths converge to synthesis
workflow.add_edge("student_coaching", "synthesize_response")
workflow.add_edge("student_escalation", "synthesize_response")
workflow.add_edge("admin_analytics", "synthesize_response")
workflow.add_edge("counselor_insights", "synthesize_response")

# Background analytics (runs after response)
workflow.add_edge("synthesize_response", "background_analytics")
workflow.add_edge("background_analytics", END)
```

### 📊 State Management (AikaState)

```python
# From backend/app/agents/aika/state.py

class AikaState(BaseModel):
    # User context
    user_id: int
    user_role: Literal["user", "counselor", "admin"]
    session_id: str
    conversation_id: str
    message: str
    conversation_history: List[Dict[str, str]]
    
    # Intent classification
    intent: Optional[str]                    # e.g., "crisis", "analytics_query"
    intent_confidence: Optional[float]
    
    # Risk assessment (from STA)
    risk_level: Optional[Literal["low", "moderate", "high", "critical"]]
    risk_factors: List[str]
    triage_result: Optional[Dict]
    
    # Agent outputs
    coaching_result: Optional[Dict]          # From SCA
    service_result: Optional[Dict]           # From SDA
    insights_result: Optional[Dict]          # From IA
    
    # Final response
    response: Optional[str]
    actions_taken: List[str]
    escalation_needed: bool
    
    # Metadata
    agents_invoked: List[str]                # ["STA", "SCA"]
    processing_time_ms: float
    errors: List[str]
```

**State Flow Example:**

```
Initial State:
{
  user_id: 123,
  user_role: "user",
  message: "Aku mau ketemu psikolog",
  agents_invoked: []
}
        ↓
After classify_intent:
{
  ...previous,
  intent: "counselor_request",
  intent_confidence: 0.92,
  agents_invoked: ["intent_classifier"]
}
        ↓
After student_triage (STA):
{
  ...previous,
  risk_level: "low",
  triage_result: {risk_score: 0.2, ...},
  agents_invoked: ["intent_classifier", "STA"]
}
        ↓
After Tool Call (get_available_counselors):
{
  ...previous,
  available_counselors: [{id: 5, name: "Dr. Budi", ...}],
  agents_invoked: ["intent_classifier", "STA"]
}
        ↓
Final State:
{
  ...previous,
  response: "Aku udah cariin psikolog yang available...",
  actions_taken: ["Listed counselors"],
  processing_time_ms: 1850
}
```

---

## Tool Calling System

### 🔧 10 Registered Tools

#### **Agent Orchestration Tools** (5 tools)

1. **`run_safety_triage_agent`**
   - **Purpose:** Assess safety risk and detect crisis
   - **When:** Every student message (first step)
   - **Output:** risk_level, risk_score, intent
   
2. **`run_support_coach_agent`**
   - **Purpose:** Generate therapeutic intervention plans
   - **When:** Student needs coping strategies
   - **Output:** intervention_plan_id, plan_steps
   
3. **`run_service_desk_agent`**
   - **Purpose:** Escalate to human counselor
   - **When:** High/critical risk detected
   - **Output:** case_id, assigned_counsellor_id
   
4. **`run_insights_agent`**
   - **Purpose:** Privacy-preserved analytics
   - **When:** Admin queries trends
   - **Output:** Aggregated statistics (k-anonymized)
   
5. **`general_query`**
   - **Purpose:** Answer general mental health questions
   - **When:** User asks "What is CBT?", "How to cope with stress?"
   - **Output:** Evidence-based information

#### **Appointment Scheduling Tools** (5 tools)

6. **`get_available_counselors`**
   - **Purpose:** List counselors with availability
   - **When:** User says "mau ketemu psikolog"
   - **Parameters:** specialty (optional), date_range (optional)
   - **Output:** List of counselors with schedules
   
7. **`suggest_appointment_times`**
   - **Purpose:** Show available time slots
   - **When:** User selects counselor
   - **Parameters:** counselor_id, preferred_date
   - **Output:** Available time slots
   
8. **`book_appointment`**
   - **Purpose:** Create appointment booking
   - **When:** User confirms date/time
   - **Parameters:** counselor_id, datetime, notes
   - **Output:** appointment_id, confirmation
   
9. **`cancel_appointment`**
   - **Purpose:** Cancel existing appointment
   - **When:** User needs to cancel
   - **Parameters:** appointment_id, cancellation_reason
   - **Output:** Success status
   
10. **`reschedule_appointment`**
    - **Purpose:** Change appointment time
    - **When:** User needs different time
    - **Parameters:** appointment_id, new_datetime
    - **Output:** Updated appointment

### 🎯 Tool Calling Flow (Gemini Function Calling)

```
┌─────────────────────────────────────────────────────────────┐
│  STUDENT: "Aku mau booking konseling besok jam 2"          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  GEMINI: Analyzes Intent                                    │
│  • User wants to book appointment                           │
│  • Needs: counselor_id (not provided)                       │
│  • Decision: First call get_available_counselors            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  TOOL CALL #1: get_available_counselors                     │
│  {                                                           │
│    "specialty": null,                                        │
│    "date_range": {                                           │
│      "start": "2025-11-14",                                  │
│      "end": "2025-11-14"                                     │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  TOOL RESULT #1:                                             │
│  [                                                           │
│    {                                                         │
│      "id": 5,                                                │
│      "name": "Dr. Budi Santoso",                             │
│      "specialty": "Anxiety & Stress",                        │
│      "available_slots": ["14:00", "15:00", "16:00"]         │
│    },                                                        │
│    {                                                         │
│      "id": 8,                                                │
│      "name": "Ibu Siti Nurhaliza",                           │
│      "specialty": "Depression & CBT",                        │
│      "available_slots": ["14:00", "15:30"]                  │
│    }                                                         │
│  ]                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  GEMINI: Receives tool result                                │
│  • Multiple counselors available at 14:00                    │
│  • Decision: Ask user to choose                              │
│  • Response: Present options in friendly format              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  AIKA: "Oke, aku udah cariin psikolog yang available        │
│  besok jam 2! Ada 2 pilihan nih:                             │
│                                                              │
│  1. 👨‍⚕️ **Dr. Budi Santoso** (Anxiety & Stress)              │
│     • Jam 14:00, 15:00, atau 16:00                          │
│                                                              │
│  2. 👩‍⚕️ **Ibu Siti Nurhaliza** (Depression & CBT)            │
│     • Jam 14:00 atau 15:30                                  │
│                                                              │
│  Kamu mau yang mana?"                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STUDENT: "Yang Pak Budi aja, jam 2"                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  GEMINI: Analyzes Response                                   │
│  • User chose: Dr. Budi Santoso (id: 5)                     │
│  • Time: 14:00 (besok = 2025-11-14)                         │
│  • Decision: Call book_appointment                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  TOOL CALL #2: book_appointment                              │
│  {                                                           │
│    "counselor_id": 5,                                        │
│    "appointment_datetime": "2025-11-14T14:00:00",           │
│    "notes": "Student requested 14:00 slot"                  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  TOOL RESULT #2:                                             │
│  {                                                           │
│    "success": true,                                          │
│    "appointment_id": 142,                                    │
│    "counselor_name": "Dr. Budi Santoso",                     │
│    "datetime": "2025-11-14T14:00:00",                        │
│    "location": "Ruang Konseling UC 1.05",                    │
│    "reminder_sent": true                                     │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  AIKA: "✅ Siap! Appointment kamu udah terbooking:           │
│                                                              │
│  📅 **Kamis, 14 November 2025**                              │
│  🕐 **14:00 WIB**                                            │
│  👨‍⚕️ **Dr. Budi Santoso**                                    │
│  📍 **Ruang Konseling UC 1.05**                              │
│                                                              │
│  Aku udah kirim reminder ke WhatsApp kamu ya!                │
│  Kalo ada perlu reschedule, bilang aja ke aku 😊"           │
└─────────────────────────────────────────────────────────────┘
```

### 🛠️ Tool Registry Architecture

**Decorator Pattern Implementation:**

```python
# From backend/app/agents/shared/tools/registry.py

@register_tool(
    name="book_appointment",
    description="Book counseling appointment for student",
    parameters={
        "counselor_id": {"type": "integer", "required": True},
        "appointment_datetime": {"type": "string", "required": True},
        "notes": {"type": "string", "required": False}
    },
    category="scheduling"
)
async def book_appointment(
    counselor_id: int,
    appointment_datetime: str,
    **context  # db, user_id, session_id
) -> Dict[str, Any]:
    """Book appointment with counselor"""
    # Implementation
    pass
```

**How it works:**

1. **Registration:** `@register_tool` decorator adds function to `_TOOL_REGISTRY`
2. **Discovery:** `get_all_tools()` returns all registered tools
3. **Gemini Conversion:** `generate_gemini_tools()` converts to `types.Tool` format
4. **Execution:** `execute_tool(tool_name, args, **context)` runs the function

**Benefits:**
- ✅ **Single source of truth** - No duplicate schema definitions
- ✅ **Type safety** - Pydantic validation on registration
- ✅ **Auto-discovery** - New tools automatically available
- ✅ **Modular** - Tools grouped by domain (agent_tools.py, scheduling_tools.py)

---

## Agent Orchestration

### 🧩 4 Specialized LangGraph Agents

#### 1️⃣ **STA (Safety Triage Agent)**

**Purpose:** Real-time crisis detection and risk assessment

**Graph Structure:**
```
ingest_message → apply_redaction → assess_risk → decide_routing
```

**Key Features:**
- 🔒 **PII Redaction** (remove names, emails, phone numbers)
- 🧠 **Gemini Risk Assessment** (chain-of-thought reasoning)
- ⚡ **Conversation Caching** (35% API cost reduction)
- 📊 **3-Tier Classification:**
  - Level 0 (Safe): No risk factors
  - Level 1 (Low): Minor stress
  - Level 2 (Moderate): Needs support
  - Level 3 (High/Critical): Crisis intervention

**Example Output:**
```python
{
  "risk_level": "high",
  "risk_score": 0.87,
  "risk_factors": ["suicidal ideation", "self-harm mention"],
  "intent": "crisis",
  "next_step": "escalate_to_sda",
  "triage_assessment_id": 567
}
```

---

#### 2️⃣ **SCA (Support Coach Agent)**

**Purpose:** CBT-informed therapeutic coaching and intervention plans

**Graph Structure:**
```
ingest_triage_signal → determine_intervention_type → 
generate_plan → safety_review → persist_plan
```

**Intervention Types:**
1. **calm_down** - Crisis de-escalation (breathing, grounding)
2. **break_down_problem** - Problem decomposition (overwhelm → manageable steps)
3. **general_coping** - Stress management strategies

**Plan Structure:**
```python
{
  "plan_title": "Strategi Mengatasi Kecemasan Ujian",
  "plan_steps": [
    {
      "title": "Teknik Pernapasan 4-7-8",
      "description": "Tarik napas 4 detik, tahan 7 detik, buang 8 detik",
      "duration": "5 menit"
    },
    {
      "title": "Progressive Muscle Relaxation",
      "description": "Tegangkan dan lepaskan otot secara bertahap",
      "duration": "10 menit"
    }
  ],
  "resource_cards": [
    {"title": "Video: Cara Atasi Cemas", "url": "..."}
  ],
  "next_check_in": "3 hari"
}
```

---

#### 3️⃣ **SDA (Service Desk Agent)**

**Purpose:** Clinical case management and counselor assignment

**Graph Structure:**
```
ingest_escalation → create_case → calculate_sla → 
auto_assign → notify_counsellor
```

**SLA Calculation:**
- **Critical:** 2 hours
- **High:** 8 hours
- **Moderate:** 24 hours
- **Low:** 72 hours

**Auto-Assignment Logic:**
1. Find counselors with matching specialty
2. Filter by current workload (< max_cases)
3. Prioritize by SLA breach risk
4. Send real-time notification

**Output:**
```python
{
  "case_id": 89,
  "case_created": True,
  "severity": "high",
  "sla_hours": 8,
  "sla_breach_at": "2025-11-13T22:00:00",
  "assigned_counsellor_id": 12,
  "notification_sent": True
}
```

---

#### 4️⃣ **IA (Insights Agent)**

**Purpose:** Privacy-preserving analytics and trend detection

**Graph Structure:**
```
ingest_query → validate_consent → apply_k_anonymity → 
execute_analytics
```

**Privacy Guarantees:**
- **k-Anonymity:** Minimum 5 records per group
- **Differential Privacy:** ε-δ budget tracking
- **Consent-Aware:** Only analyzes consented data
- **Allow-Listed Queries:** 6 pre-approved analytics questions

**Example Query:**
```
"What are the trending mental health topics this week?"
```

**Output:**
```python
{
  "query_id": "trending_topics_weekly",
  "results": [
    {
      "topic": "exam_anxiety",
      "count": 47,
      "trend": "↑15%",
      "avg_severity": 2.3,
      "k_anonymity": 47  # > 5 ✓
    },
    {
      "topic": "relationship_stress",
      "count": 32,
      "trend": "↓8%",
      "avg_severity": 1.8,
      "k_anonymity": 32  # > 5 ✓
    }
  ],
  "privacy": {
    "k_min": 5,
    "epsilon": 0.1,
    "delta": 1e-5
  }
}
```

---

## Performance Optimizations

### ⚡ Conversation Caching

**Problem:** Gemini API calls expensive (10-20s latency for each classification)

**Solution:** Smart caching system in `ConversationState`

```python
class ConversationState:
    def should_skip_intent_classification(self) -> bool:
        """Skip if: stable intent, low risk, recent assessment"""
        return (
            self.messages_since_last_assessment < 5 and
            self.last_risk_level in ["low", "moderate"] and
            self.last_intent is not None
        )
```

**Results:**
- **Cache Hit Rate:** 35% of messages skip classification
- **Cost Savings:** 35% reduction in Gemini API calls
- **Latency:** 1.2s (cached) vs 3.5s (fresh classification)

### 🎯 Tool-Calling Mode vs Graph Mode

**Two Entry Points:**

1. **`process_message_with_tools()`** (Recommended)
   - Uses Gemini function calling
   - Only invokes agents when needed
   - **Fast:** 1.8s average, 1.2s for casual chat
   
2. **`process_message()`** (Legacy)
   - Always runs STA → SCA/SDA → IA
   - **Slow:** 10.7s average

**Performance Comparison:**

| Message Type | Tool-Calling | Graph Mode | Improvement |
|-------------|-------------|-----------|------------|
| Casual chat | 1.2s | 10.7s | **89% faster** |
| Crisis | 5.5s | 11.2s | **51% faster** |
| Plan request | 6.5s | 10.9s | **40% faster** |
| **Average** | **1.8s** | **10.7s** | **83% faster** |

---

## API Integration

### 📡 Main Endpoints

**POST /api/v1/agents/aika/chat**

Request:
```json
{
  "message": "Aku lagi stres banget",
  "session_id": "session_123_1731456789"
}
```

Response:
```json
{
  "success": true,
  "response": "Aku paham kamu lagi overwhelmed...",
  "metadata": {
    "session_id": "session_123_1731456789",
    "user_role": "user",
    "intent": "emotional_support",
    "agents_invoked": ["STA", "SCA"],
    "processing_time_ms": 1850,
    "risk_level": "low",
    "escalation_needed": false
  },
  "intervention_plan": {
    "id": 42,
    "title": "Strategi Mengelola Stres",
    "steps": [...]
  },
  "activity_logs": [
    {"agent": "Aika", "message": "Processing message from user"},
    {"agent": "STA", "message": "Risk assessment complete: low"}
  ]
}
```

---

## Monitoring & Logging

### 📊 Activity Logger

**Real-time execution tracking:**

```python
self.activity_logger.log_agent_start("STA", "Analyzing message...")
self.activity_logger.log_risk_assessment(
    risk_level="high",
    risk_score=0.87,
    risk_factors=["suicidal ideation"]
)
self.activity_logger.log_agent_complete("STA", "Assessment complete")
```

**Output in response:**
```json
{
  "activity_logs": [
    {
      "timestamp": "2025-11-13T14:23:45.123Z",
      "agent": "Aika",
      "level": "INFO",
      "message": "🧠 Tool-calling mode: Processing message from user",
      "details": {"user_id": 123}
    },
    {
      "timestamp": "2025-11-13T14:23:46.234Z",
      "agent": "STA",
      "level": "INFO",
      "message": "📊 Risk Assessment Complete",
      "details": {
        "risk_level": "high",
        "risk_score": 0.87,
        "risk_factors": ["suicidal ideation"]
      }
    }
  ]
}
```

---

## Summary

### 🎯 Key Takeaways

1. **Aika is a Meta-Agent** that coordinates 4 specialized LangGraph agents (STA, SCA, SDA, IA)

2. **Role-Aware Routing:**
   - Students → STA → SCA/SDA
   - Admins → IA (analytics) or SDA (actions)
   - Counselors → SDA (cases) + IA (insights)

3. **LangGraph StateGraph:**
   - Deterministic state machines
   - Conditional routing based on risk level
   - Real-time execution tracking

4. **Tool Calling System:**
   - 10 tools (5 agent + 5 scheduling)
   - Gemini function calling for smart invocation
   - Decorator pattern with registry

5. **Performance:**
   - **Tool-calling mode:** 1.8s average (83% faster)
   - **Conversation caching:** 35% API cost reduction
   - **Type-safe state management**

6. **Privacy-First:**
   - PII redaction before processing
   - k-anonymity (k≥5) for analytics
   - Differential privacy (ε-δ budgets)
   - Audit logging for all access

---

## File References

| File | Lines | Purpose |
|------|-------|---------|
| `orchestrator.py` | 1591 | Main orchestration logic |
| `identity.py` | 287 | Role-specific system prompts |
| `state.py` | 140 | AikaState TypedDict |
| `registry.py` | 334 | Tool registry infrastructure |
| `agent_tools.py` | 522 | 5 agent orchestration tools |
| `scheduling_tools.py` | 496 | 5 appointment scheduling tools |
| `sta_graph.py` | 263 | Safety Triage Agent workflow |
| `sca_graph.py` | 385 | Support Coach Agent workflow |
| `sda_graph.py` | 794 | Service Desk Agent workflow |
| `ia_graph.py` | - | Insights Agent workflow |

---

**Last Updated:** November 13, 2025  
**Document Version:** 1.0  
**Maintainer:** Giga Hidjrika Aura Adkhy
