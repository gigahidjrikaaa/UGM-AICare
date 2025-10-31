# Architecture Audit: LangGraph vs Service-Based Implementation

**Date:** October 31, 2025  
**Auditor:** GitHub Copilot  
**Status:** ⚠️ MIXED - Partial LangGraph Adoption

---

## Executive Summary

**Finding:** The codebase has a **dual architecture** - agents have proper LangGraph implementations, but **Aika Meta-Agent bypasses them** and uses simplified adapters instead. Campaign generation is service-based, not LangGraph orchestrated.

### Critical Issues

1. ❌ **Aika bypasses LangGraph** - Uses `agent_adapters.py` instead of `*_graph.py`
2. ❌ **Campaign generation** - Direct service calls, no orchestration
3. ⚠️ **Services expose both patterns** - REST endpoints AND LangGraph, causing confusion
4. ⚠️ **Intervention plans** - Generated in adapter, not through SCA graph

---

## Detailed Findings

### 1. Safety Triage Agent (STA)

#### ✅ Has Proper LangGraph Implementation

**File:** `backend/app/agents/sta/sta_graph.py`

```python
# PROPER LANGGRAPH WORKFLOW
async def ingest_message_node(state: STAState) -> STAState
async def apply_redaction_node(state: STAState, db) -> STAState
async def assess_risk_node(state: STAState, db) -> STAState
async def decide_routing_node(state: STAState) -> STAState

# Graph structure:
# ingest_message → apply_redaction → assess_risk → decide_routing
```

**Nodes:**

- ✅ `ingest_message` - Entry point with validation
- ✅ `apply_redaction` - PII removal
- ✅ `assess_risk` - ML classification (uses service.SafetyTriageService internally)
- ✅ `decide_routing` - Routing logic to SCA/SDA

**Execution Tracking:** ✅ Uses `execution_tracker` for monitoring

#### ❌ But Aika Uses Adapter Instead

**File:** `backend/app/agents/aika/agent_adapters.py`

```python
class SafetyTriageAgent:
    def __init__(self, db: AsyncSession):
        self.classifier = SafetyTriageClassifier()  # ❌ Direct classifier call
    
    async def assess_message(...):
        result = await self.classifier.classify(request)  # ❌ Bypasses graph
```

**Problem:** Aika orchestrator calls `SafetyTriageAgent.assess_message()` which:

- ❌ Bypasses the LangGraph workflow
- ❌ No execution tracking
- ❌ No PII redaction node
- ❌ No state management

**Where Used:**

- `backend/app/agents/aika/orchestrator.py` line 46-60
- Called from `_student_triage()` node

---

### 2. Support Coach Agent (SCA)

#### ✅ Has Proper LangGraph Implementation

**File:** `backend/app/agents/sca/sca_graph.py`

```python
# PROPER LANGGRAPH WORKFLOW
async def ingest_triage_signal_node(state: SCAState) -> SCAState
async def determine_intervention_type_node(state: SCAState) -> SCAState
async def generate_plan_node(state: SCAState, db) -> SCAState
async def safety_review_node(state: SCAState) -> SCAState
async def persist_plan_node(state: SCAState, db) -> SCAState

# Graph structure:
# ingest_triage_signal → determine_intervention_type → generate_plan → 
# safety_review → persist_plan
```

**Nodes:**

- ✅ `ingest_triage_signal` - Receives STA output
- ✅ `determine_intervention_type` - Maps intent to intervention (calm_down, break_down_problem, general_coping)
- ✅ `generate_plan` - Uses Gemini AI for personalized plans
- ✅ `safety_review` - Validates plan safety
- ✅ `persist_plan` - Saves to database

**Intervention Plan Generation:** ✅ Proper LangGraph node with Gemini integration

#### ❌ But Aika Uses Adapter Instead

**File:** `backend/app/agents/aika/agent_adapters.py` lines 96-300

```python
class SupportCoachAgent:
    async def provide_support(...):
        # ❌ Direct LLM call with tool calling
        # ❌ Bypasses intervention plan generation graph
        # ❌ No safety review node
        response = await generate_gemini_response(...)
```

**Problems:**

- ❌ No intervention plan generation through graph
- ❌ No safety review
- ❌ No persistence through `persist_plan_node`
- ❌ Just generic LLM chat, not structured coaching

**Follow-up Implementation:**

- **Service:** `backend/app/agents/sca/service.py` has `followup()` method ✅
- **Graph:** No dedicated follow-up node (uses same `provide_support` flow) ⚠️
- **Aika:** Not called by orchestrator ❌

---

### 3. Service Desk Agent (SDA)

#### ✅ Has Proper LangGraph Implementation

**File:** `backend/app/agents/sda/sda_graph.py`

```python
# PROPER LANGGRAPH WORKFLOW
async def ingest_escalation_node(state: SDAState) -> SDAState
async def create_case_node(state: SDAState, db) -> SDAState
async def calculate_sla_node(state: SDAState, db) -> SDAState
async def auto_assign_node(state: SDAState, db) -> SDAState
async def notify_counsellor_node(state: SDAState, db) -> SDAState

# Graph structure:
# ingest_escalation → create_case → calculate_sla → 
# auto_assign → notify_counsellor
```

**Nodes:**

- ✅ `ingest_escalation` - Validates high/critical severity
- ✅ `create_case` - Creates Case record in database
- ✅ `calculate_sla` - Computes response deadline
- ✅ `auto_assign` - Assigns to available counselor
- ✅ `notify_counsellor` - Sends notification

**Case Management:** ✅ Fully implemented with database persistence

#### ❌ But Aika Uses Adapter Instead

**File:** `backend/app/agents/aika/agent_adapters.py` lines 302-400

```python
class ServiceDeskAgent:
    async def escalate_case(...):
        # ❌ Direct LLM call for case creation reasoning
        # ❌ Bypasses proper case creation workflow
        response = await generate_gemini_response(...)
```

**Problems:**

- ❌ No actual case creation through `create_case_node`
- ❌ No SLA calculation
- ❌ No auto-assignment
- ❌ No counselor notification
- ❌ Just generic LLM response about "escalating"

**Service Methods:**

- `list_cases()` ✅ - Works via REST API
- `assign_case()` ✅ - Works via REST API
- `close_case()` ✅ - Works via REST API
- **But:** None called by Aika orchestrator ❌

---

### 4. Campaign Generation

#### ❌ Completely Service-Based, No LangGraph

**File:** `backend/app/domains/mental_health/services/ai_campaign_generator.py`

```python
class AICampaignGenerator:
    @staticmethod
    async def generate_campaign_config(...):
        model = genai.GenerativeModel('gemini-2.0-flash-exp')  # ❌ Direct SDK call
        prompt = f"""You are a mental health campaign specialist..."""
        response = await model.generate_content_async(prompt)  # ❌ No orchestration
```

**Used By:**

- `backend/app/routes/admin/campaigns.py` lines 444-450
- Called directly from REST endpoint
- No LangGraph involvement

**Problems:**

- ❌ No orchestration
- ❌ No execution tracking
- ❌ Direct AI calls bypassing Aika
- ❌ Should be a tool or LangGraph node
- ❌ Uses OLD SDK (`google.generativeai`) - needs migration

---

## Architecture Comparison

### Current Reality

```
┌─────────────────────────────────────────────────────────┐
│                   AIKA META-AGENT                       │
│              (orchestrator.py + adapters)               │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐    ┌──────────┐
   │ Adapter  │     │ Adapter  │    │ Adapter  │
   │  (STA)   │     │  (SCA)   │    │  (SDA)   │
   │          │     │          │    │          │
   │ ❌ Direct│     │ ❌ Direct│    │ ❌ Direct│
   │classifier│     │LLM calls │    │LLM calls │
   └──────────┘     └──────────┘    └──────────┘
        │                │                │
        │         [IGNORES]         [IGNORES]
        │                │                │
        ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐    ┌──────────┐
   │STA Graph │     │SCA Graph │    │SDA Graph │
   │ (UNUSED) │     │ (UNUSED) │    │ (UNUSED) │
   └──────────┘     └──────────┘    └──────────┘

Campaign Generation: Direct service call, no orchestration
```

### Target Architecture (What It Should Be)

```
┌─────────────────────────────────────────────────────────┐
│                   AIKA META-AGENT                       │
│               (LangGraph StateGraph)                    │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐    ┌──────────┐
   │STA Graph │     │SCA Graph │    │SDA Graph │
   │ (INVOKE) │     │ (INVOKE) │    │ (INVOKE) │
   │          │     │          │    │          │
   │✅ Proper │     │✅ Proper │    │✅ Proper │
   │workflow  │     │workflow  │    │workflow  │
   └──────────┘     └──────────┘    └──────────┘
        │                │                │
        ▼                ▼                ▼
   [Execution      [Execution      [Execution
    Tracking]       Tracking]       Tracking]

Campaign Generation: Tool or LangGraph node, orchestrated by Aika
```

---

## Recommendations

### Priority 1: Refactor Aika to Use Real Graphs 🔴 CRITICAL

**What to do:**

1. **Replace adapter calls with graph invocations**

```python
# ❌ CURRENT (in orchestrator.py)
result = await self.sta.assess_message(user_id, message, history)

# ✅ TARGET
from app.agents.sta.sta_graph_service import STAGraphService
sta_service = STAGraphService(self.db)
result = await sta_service.run(
    message=message,
    user_id=user_id,
    session_id=session_id,
    execution_id=execution_id
)
```

2. **Remove adapter classes entirely**
   - Delete `backend/app/agents/aika/agent_adapters.py`
   - Use proper graph services

3. **Update orchestrator nodes**
   - `_student_triage()` → Call STA graph
   - `_student_coaching()` → Call SCA graph
   - `_student_escalation()` → Call SDA graph

**Benefits:**

- ✅ Proper execution tracking
- ✅ State management through LangGraph
- ✅ PII redaction enforced
- ✅ Safety review for intervention plans
- ✅ Full case management workflow

### Priority 2: Convert Campaign Generation to Tool 🟡 HIGH

**What to do:**

1. **Create campaign tool** in `backend/app/agents/shared/tools/campaign_tools.py`

```python
@tool_registry.register(
    name="generate_campaign_config",
    category="campaign_management",
    description="Generate AI-powered campaign configuration using structured prompts"
)
async def generate_campaign_config(
    db: AsyncSession,
    campaign_name: str,
    campaign_description: str,
    user_id: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """Generate campaign config - callable by Aika via function calling."""
    # Keep existing logic from ai_campaign_generator.py
    # But migrate to new SDK (google-genai)
    ...
```

2. **Update admin routes** to call through Aika

```python
# ❌ CURRENT
config = await AICampaignGenerator.generate_campaign_config(name, desc)

# ✅ TARGET
aika = AikaOrchestrator(db)
result = await aika.process_message(
    user_id=admin_user_id,
    user_role="admin",
    message=f"Generate campaign config for: {name} - {desc}",
)
# Aika decides to use generate_campaign_config tool
```

**Benefits:**

- ✅ Aika orchestration
- ✅ Execution tracking
- ✅ Consistent with tool calling pattern
- ✅ Can be tested independently

### Priority 3: Add Follow-Up to SCA Graph 🟢 MEDIUM

**What to do:**

1. **Add follow-up node** to `backend/app/agents/sca/sca_graph.py`

```python
async def followup_node(state: SCAState, db) -> SCAState:
    """Node: Execute follow-up check on intervention plan."""
    # Implementation from service.followup()
    ...

workflow.add_node("followup", lambda state: followup_node(state, db))
```

2. **Add conditional edge** for follow-up timing

```python
def should_followup(state: SCAState) -> str:
    if state.get("days_since_plan", 0) >= 3:
        return "followup"
    return END
```

---

## Migration Checklist

### Immediate (This Week)

- [ ] **Audit complete** ✅ (This document)
- [ ] **Backup agent_adapters.py** before deletion
- [ ] **Create graph service wrappers** if needed
- [ ] **Update Aika orchestrator** to use real graphs
- [ ] **Test STA → SCA → SDA flow** end-to-end
- [ ] **Migrate ai_campaign_generator** to new SDK (part of SDK migration)

### Short-term (Next Week)

- [ ] **Convert campaign generation** to tool
- [ ] **Add campaign tool** to Aika's tool registry
- [ ] **Update admin routes** to use Aika orchestration
- [ ] **Add follow-up node** to SCA graph
- [ ] **Integration tests** for full workflows

### Long-term (Next Sprint)

- [ ] **Remove service.py REST endpoints** (optional - keep for backward compatibility)
- [ ] **Add graph execution monitoring** dashboard
- [ ] **Performance benchmarking** (graph vs adapter)
- [ ] **Documentation update** with proper architecture diagrams

---

## Code Locations Reference

### Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `backend/app/agents/aika/orchestrator.py` | Replace adapter calls with graph invocations | 🔴 CRITICAL |
| `backend/app/agents/aika/agent_adapters.py` | DELETE after migration | 🔴 CRITICAL |
| `backend/app/domains/mental_health/services/ai_campaign_generator.py` | Migrate to tool + new SDK | 🟡 HIGH |
| `backend/app/routes/admin/campaigns.py` | Update to use Aika orchestration | 🟡 HIGH |
| `backend/app/agents/sca/sca_graph.py` | Add follow-up node | 🟢 MEDIUM |

### Files That Are Correct (Keep As-Is)

- ✅ `backend/app/agents/sta/sta_graph.py` - Proper LangGraph
- ✅ `backend/app/agents/sca/sca_graph.py` - Proper LangGraph
- ✅ `backend/app/agents/sda/sda_graph.py` - Proper LangGraph
- ✅ `backend/app/agents/execution_tracker.py` - Monitoring system
- ✅ `backend/app/agents/graph_state.py` - State definitions

---

## Testing Strategy

### Unit Tests

```python
# Test STA graph directly
async def test_sta_graph_workflow():
    service = STAGraphService(db)
    result = await service.run(message="I'm feeling anxious")
    assert result["risk_level"] in ("low", "moderate", "high", "critical")
    assert "execution_path" in result
```

### Integration Tests

```python
# Test Aika → STA → SCA flow
async def test_aika_coaching_flow():
    aika = AikaOrchestrator(db)
    result = await aika.process_message(
        user_id=1,
        user_role="user",
        message="I'm overwhelmed with exams"
    )
    assert "STA" in result["metadata"]["agents_invoked"]
    assert "SCA" in result["metadata"]["agents_invoked"]
    # Should have intervention plan
    assert result["metadata"].get("intervention_plan_id") is not None
```

---

## Conclusion

**Current Status:** ⚠️ **HYBRID ARCHITECTURE** - Agents have proper LangGraph implementations, but Aika bypasses them

**Required Action:** **URGENT REFACTORING** - Remove adapters, use real graphs

**Estimated Effort:**

- Aika refactoring: 8-12 hours
- Campaign tool migration: 4-6 hours
- Testing: 4-6 hours
- **Total: 2-3 days**

**Impact if not fixed:**

- ❌ No execution tracking for most operations
- ❌ Missing safety features (PII redaction, safety review)
- ❌ Can't monitor agent performance
- ❌ Technical debt accumulation
- ❌ Inconsistent architecture

---

**Prepared by:** GitHub Copilot  
**Review Status:** Ready for implementation planning  
**Next Steps:** Create refactoring tasks and timeline
