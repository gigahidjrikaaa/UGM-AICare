# Implementation Checklist - November 16, 2025

**Project:** UGM-AICare Bachelor's Thesis  
**Tasks:** Two-Tier Risk Monitoring + Agent Rename (SCA→TCA, SDA→CMA)  
**Status:** Planning Complete, Implementation Pending

---

## 📚 Documentation Status

### ✅ Completed Documentation

1. **TWO_TIER_RISK_MONITORING_IMPLEMENTATION_PLAN.md** (1098 lines)
   - ✅ Architecture diagrams with Tier 1 and Tier 2 flows
   - ✅ 6 implementation phases with complete code examples
   - ✅ State schema additions (8 new fields)
   - ✅ ConversationAssessment Pydantic model
   - ✅ Conversation analyzer function (150 lines)
   - ✅ Orchestrator integration steps
   - ✅ Test cases with expected outputs
   - ✅ Thesis integration guidance
   - ✅ Cost comparison tables
   - ✅ Database schema (optional)

2. **AGENT_RENAME_CHANGE_GUIDE.md** (comprehensive)
   - ✅ Naming rationale (SCA→TCA, SDA→CMA)
   - ✅ Job segregation clarity
   - ✅ Directory and file renaming instructions
   - ✅ Code changes across all affected files
   - ✅ Thesis LaTeX changes with examples
   - ✅ Documentation updates
   - ✅ Verification checklist
   - ✅ Bash script for automation
   - ✅ Implementation order recommendations

3. **This Checklist** (IMPLEMENTATION_CHECKLIST.md)
   - ✅ Master tracking document
   - ✅ Gap analysis
   - ✅ Risk assessment
   - ✅ Dependencies mapped

---

## 🔍 Gap Analysis - Missing Coverage

### Backend Code

#### ✅ Fully Documented (Ready to Implement)
- ✅ State schema updates (`graph_state.py`)
- ✅ Aika decision node enhancement (`aika_orchestrator_graph.py`)
- ✅ ConversationAssessment schema (new file)
- ✅ Conversation analyzer (new file)
- ✅ STA conversation analysis node
- ✅ Conditional routing logic
- ✅ Agent renaming (all files listed)

#### ⚠️ Partially Documented (Needs Attention)

1. **Aika Tool Definitions** (`backend/app/agents/aika/tool_definitions.py`)
   - ✅ Rename documented in AGENT_RENAME_CHANGE_GUIDE.md
   - ⚠️ **MISSING:** How to handle CMA auto-invocation from Aika's JSON
   - ⚠️ **MISSING:** New tool definition for `analyze_conversation_risk`
   - **ACTION NEEDED:** Add tool definition section to TWO_TIER plan

2. **Aika Orchestrator Router** (`backend/app/agents/aika/router.py` or `orchestrator.py`)
   - ✅ Agent rename documented
   - ⚠️ **MISSING:** How `needs_cma_escalation` flag triggers CMA
   - ⚠️ **MISSING:** How conversation_ended triggers STA analysis
   - **ACTION NEEDED:** Add routing logic section to TWO_TIER plan

3. **Database Models** (`backend/app/domains/mental_health/models/`)
   - ✅ Optional database persistence schema in TWO_TIER plan
   - ⚠️ **MISSING:** Migration script for conversation_assessments table
   - ⚠️ **MISSING:** Update to ConversationHistory model (if exists)
   - **ACTION NEEDED:** Add Alembic migration example

4. **API Endpoints** (`backend/app/api/v1/agents_routes.py`)
   - ✅ Agent rename endpoint changes documented
   - ⚠️ **MISSING:** New endpoint for manual STA conversation analysis (testing)
   - ⚠️ **MISSING:** Endpoint to view conversation assessments (admin dashboard)
   - **ACTION NEEDED:** Consider adding API endpoint documentation

5. **Execution Tracker Updates**
   - ⚠️ **MISSING:** How to track Tier 1 vs Tier 2 STA execution
   - ⚠️ **MISSING:** New metrics for conversation-level analysis latency
   - **ACTION NEEDED:** Update execution tracking schema

#### ❌ Not Documented (Major Gaps)

1. **Conversation End Detection Logic**
   - ❌ Currently uses simple keyword matching in plan
   - ❌ **MISSING:** What if user says "bye" mid-conversation?
   - ❌ **MISSING:** Timeout-based conversation end (no activity for 30 min)
   - ❌ **MISSING:** Explicit "end session" button in frontend
   - **RECOMMENDATION:** Add multi-signal conversation end detection
   - **ACTION NEEDED:** Document conversation lifecycle management

2. **CMA Auto-Invocation Flow**
   - ❌ **MISSING:** Complete code path from Aika's immediate_risk to CMA execution
   - ❌ **MISSING:** How to prevent duplicate CMA invocations (if both Tier 1 and Tier 2 trigger)
   - ❌ **MISSING:** Notification system for counselors
   - **ACTION NEEDED:** Document crisis escalation workflow end-to-end

3. **Conversation Context Management**
   - ❌ **MISSING:** How to retrieve full conversation history for Tier 2 analysis
   - ❌ **MISSING:** Conversation history size limits (max messages to analyze)
   - ❌ **MISSING:** Memory management for long conversations
   - **ACTION NEEDED:** Document conversation state persistence

4. **Error Handling**
   - ❌ **MISSING:** What if Tier 2 STA analysis fails?
   - ❌ **MISSING:** Fallback if conversation assessment parsing fails
   - ❌ **MISSING:** Retry logic for conversation-level analysis
   - **ACTION NEEDED:** Add error handling section to TWO_TIER plan

5. **Testing Strategy**
   - ✅ Basic test cases in TWO_TIER plan
   - ❌ **MISSING:** Integration test scenarios
   - ❌ **MISSING:** Load testing (100+ conversations)
   - ❌ **MISSING:** Regression tests for old STA behavior
   - **ACTION NEEDED:** Expand testing section

---

### Thesis Changes

#### ✅ Fully Documented
- ✅ Chapter 1: Two-tier architecture intro
- ✅ Chapter 3: Full STA design rewrite
- ✅ Chapter 3: Role segregation section (TCA vs CMA)
- ✅ Chapter 4: Evaluation methodology updates
- ✅ Chapter 4: New metrics (trend accuracy, context quality, API cost)
- ✅ All agent name changes (SCA→TCA, SDA→CMA)

#### ⚠️ Partially Documented

1. **Chapter 2 (Literature Review)**
   - ✅ Agent rename documented
   - ⚠️ **MISSING:** Need to add literature on conversation-level vs per-message risk analysis
   - ⚠️ **MISSING:** Cost optimization strategies in AI mental health systems
   - **ACTION NEEDED:** Research 2-3 papers on conversation context in crisis detection

2. **Chapter 3 (System Design) - Workflow Diagrams**
   - ✅ Text description updates documented
   - ⚠️ **MISSING:** Updated LaTeX TikZ diagrams showing Tier 1 and Tier 2
   - ⚠️ **MISSING:** Sequence diagram for conversation end → STA analysis → CMA
   - **ACTION NEEDED:** Create new TikZ figures

3. **Chapter 5 (Results) - Placeholder Values**
   - ✅ Structure documented in TWO_TIER plan
   - ⚠️ **MISSING:** Need actual evaluation results (can't know until implementation)
   - ⚠️ **MISSING:** Statistical analysis plan (t-tests, effect sizes)
   - **ACTION NEEDED:** Mark as "to be filled after evaluation"

#### ❌ Not Documented

1. **Appendix Updates**
   - ❌ **MISSING:** Code listing updates for new Tier 2 STA code
   - ❌ **MISSING:** Updated API endpoint documentation
   - ❌ **MISSING:** Updated database schema diagrams
   - **ACTION NEEDED:** Review appendices after code implementation

2. **Abstract and Summary Updates**
   - ❌ **MISSING:** Update abstract to mention two-tier architecture
   - ❌ **MISSING:** Update summary/conclusion to mention agent rename rationale
   - **ACTION NEEDED:** Final pass after all changes complete

---

## 🎯 Implementation Priorities

### Priority 1: Critical Path (Must Do Before Defense)

1. **Agent Rename (SCA→TCA, SDA→CMA)** - 4 hours
   - High impact on thesis consistency
   - Required for role clarity
   - Straightforward find/replace operations
   - **BLOCKER:** Must be done before two-tier implementation

2. **Two-Tier Risk Monitoring - Core Implementation** - 8 hours
   - State schema updates
   - Aika decision node enhancement
   - ConversationAssessment schema
   - Basic conversation analyzer (without database persistence)
   - **BLOCKER:** Required for cost savings narrative in thesis

3. **Thesis Updates - Chapters 1, 3, 4** - 6 hours
   - Agent name changes throughout
   - Two-tier architecture description (Chapter 3)
   - Role segregation section (Chapter 3)
   - Evaluation methodology updates (Chapter 4)
   - **BLOCKER:** Core contribution chapters

### Priority 2: High Value (Should Do)

4. **Two-Tier Risk Monitoring - Advanced Features** - 4 hours
   - Database persistence (conversation_assessments table)
   - CMA auto-invocation from Tier 1 immediate risk
   - Conversation end detection (multi-signal)
   - Error handling and fallbacks
   - **VALUE:** Demonstrates completeness, professional implementation

5. **Testing - Basic Coverage** - 3 hours
   - 3 test cases from TWO_TIER plan
   - Cost verification (API call counting)
   - Immediate crisis detection test
   - Conversation-end analysis test
   - **VALUE:** Evidence-based evaluation for thesis

6. **Thesis Updates - Chapter 2 and Chapter 5** - 3 hours
   - Literature review additions
   - Results section with placeholders
   - Updated diagrams (TikZ)
   - **VALUE:** Comprehensive thesis quality

### Priority 3: Nice to Have (Optional)

7. **API Endpoints for Admin Dashboard** - 2 hours
   - View conversation assessments
   - Manual trigger STA analysis
   - **VALUE:** Demo-ready for thesis defense

8. **Advanced Testing** - 3 hours
   - Integration tests
   - Load testing (50 conversations)
   - Regression tests
   - **VALUE:** Demonstrates rigor

9. **Documentation Polish** - 2 hours
   - README updates
   - API documentation
   - Deployment guide updates
   - **VALUE:** Professional presentation

---

## ⚠️ Risk Assessment

### Technical Risks

1. **Agent Rename Breaking Changes** - MEDIUM RISK
   - **Issue:** Git merge conflicts if others are working on same files
   - **Mitigation:** Use `git mv` for directory renames, commit frequently
   - **Fallback:** Can rollback with git revert if needed

2. **Two-Tier State Management** - HIGH RISK
   - **Issue:** Adding 8 new state fields could break existing orchestrator logic
   - **Mitigation:** Test incrementally, add fields one-by-one
   - **Fallback:** Use feature flags to toggle two-tier system on/off

3. **Conversation End Detection** - MEDIUM RISK
   - **Issue:** False positives ("bye" in middle of conversation)
   - **Mitigation:** Implement multi-signal detection (keywords + timeout + explicit button)
   - **Fallback:** Default to timeout-only (30 min inactivity)

4. **CMA Duplicate Invocation** - MEDIUM RISK
   - **Issue:** Both Tier 1 and Tier 2 might trigger CMA for same crisis
   - **Mitigation:** Use `cma_already_invoked` flag in state
   - **Fallback:** Idempotent CMA operations (check existing cases)

### Thesis Risks

1. **Timeline Pressure** - HIGH RISK
   - **Issue:** November deadline is very tight (2 weeks left?)
   - **Mitigation:** Focus on Priority 1 items only
   - **Fallback:** Submit partial implementation with "future work" section

2. **Evaluation Results** - LOW RISK
   - **Issue:** Don't know results until implementation is done
   - **Mitigation:** Use placeholders in Chapter 5, mark as "to be filled"
   - **Fallback:** Describe methodology even if results incomplete

3. **Consistency** - MEDIUM RISK
   - **Issue:** 30+ files need SCA→TCA, SDA→CMA changes
   - **Mitigation:** Use automated bash script, then verify with grep
   - **Fallback:** Focus on thesis consistency first, code can have mixed names

---

## 📋 Missing Items to Add to Plans

### For TWO_TIER_RISK_MONITORING_IMPLEMENTATION_PLAN.md

**Section to Add: "Phase 6.5 - Crisis Escalation Integration"**
```markdown
### Phase 6.5: CMA Auto-Invocation from Tier 1

**File:** `backend/app/agents/aika_orchestrator_graph.py`

#### Add CMA Auto-Invocation Logic

In the `aika_decision_node`, after parsing immediate_risk:

```python
# If immediate crisis detected, auto-invoke CMA
if state["needs_cma_escalation"]:
    logger.critical(
        f"🚨 IMMEDIATE CRISIS - Auto-invoking CMA "
        f"(risk: {state['immediate_risk_level']}, "
        f"keywords: {state['crisis_keywords_detected']})"
    )
    
    # Mark CMA as needed
    state["needs_agents"] = True
    state["cma_auto_invoked"] = True
    
    # Skip STA/TCA, go directly to CMA
    state["agents_to_invoke"] = ["CMA"]
```

Add new conditional edge:

```python
def should_invoke_cma_immediately(state: AikaOrchestratorState) -> str:
    """Check if CMA should be invoked immediately due to crisis."""
    if state.get("needs_cma_escalation", False):
        return "invoke_cma"
    return "continue_normal_flow"

# In workflow
workflow.add_conditional_edges(
    "aika_decision",
    should_invoke_cma_immediately,
    {
        "invoke_cma": "execute_cma_subgraph",
        "continue_normal_flow": "should_invoke_agents"
    }
)
```
```

**Section to Add: "Phase 7 - Conversation Lifecycle Management"**
```markdown
### Phase 7: Conversation End Detection (Multi-Signal)

**File:** `backend/app/agents/aika_orchestrator_graph.py`

#### Implement Robust Conversation End Detection

Instead of simple keyword matching, use multiple signals:

```python
def detect_conversation_end(state: AikaOrchestratorState) -> bool:
    """Detect conversation end using multiple signals.
    
    Returns True if any of these conditions met:
    1. User says farewell keywords
    2. Conversation inactive for 30+ minutes
    3. User explicitly clicked "End Session" button
    """
    message = state.get("message", "").lower()
    
    # Signal 1: Farewell keywords (MUST be at end of message)
    farewell_keywords = [
        "goodbye", "bye", "terima kasih banyak", 
        "sampai jumpa", "selesai", "sudah cukup", 
        "thanks bye", "that's all", "cukup segini"
    ]
    
    # Only trigger if keyword is in last 20 characters
    if any(kw in message[-20:] for kw in farewell_keywords):
        logger.info(f"Conversation end: farewell keyword detected")
        return True
    
    # Signal 2: Inactivity timeout
    last_message_time = state.get("last_message_timestamp")
    if last_message_time:
        inactive_minutes = (datetime.utcnow() - last_message_time).total_seconds() / 60
        if inactive_minutes > 30:
            logger.info(f"Conversation end: timeout ({inactive_minutes:.1f} min)")
            return True
    
    # Signal 3: Explicit end session flag (from frontend button)
    if state.get("explicit_session_end", False):
        logger.info(f"Conversation end: explicit user action")
        return True
    
    return False

# Use in aika_decision_node:
state["conversation_ended"] = detect_conversation_end(state)
```
```

**Section to Add: "Phase 8 - Error Handling and Fallbacks"**
```markdown
### Phase 8: Error Handling

Add try-catch blocks to conversation analyzer:

```python
async def analyze_conversation_risk(
    conversation_history: List[Dict[str, str]],
    current_message: str,
    user_context: Optional[Dict[str, Any]] = None
) -> ConversationAssessment:
    """Analyze full conversation for risk patterns (with error handling)."""
    
    try:
        # ... existing analysis code ...
        
        response_text = await generate_gemini_response_with_fallback(
            prompt=analysis_prompt,
            model=DEFAULT_GEMINI_MODEL,
            temperature=0.3
        )
        
        # Parse JSON with validation
        assessment_data = json.loads(response_text)
        return ConversationAssessment(**assessment_data)
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse conversation assessment JSON: {e}")
        # Fallback: Return safe default assessment
        return ConversationAssessment(
            overall_risk_level="moderate",
            risk_trend="insufficient_data",
            conversation_summary="Analysis failed - using safe default",
            user_context={},
            concerns=["Assessment parsing error"],
            recommended_actions=["Manual review recommended"],
            should_invoke_cma=False,
            reasoning="Error during analysis"
        )
        
    except Exception as e:
        logger.error(f"Conversation analysis error: {e}")
        # Fallback: Return high-risk default (fail safe)
        return ConversationAssessment(
            overall_risk_level="high",
            risk_trend="insufficient_data",
            conversation_summary="Analysis error - defaulting to high risk",
            user_context={},
            concerns=["System error during analysis"],
            recommended_actions=["Immediate manual review required"],
            should_invoke_cma=True,  # Escalate on error
            reasoning=f"Error: {str(e)}"
        )
```
```

### For AGENT_RENAME_CHANGE_GUIDE.md

**Section to Add: "Part 5 - Frontend Changes"**
```markdown
### Part 5: Frontend Changes (If Applicable)

**File:** `frontend/src/components/features/chat/ChatInterface.tsx` (or similar)

#### Update Agent Name Display

If your chat UI displays which agent responded:

```typescript
// OLD
const agentNames = {
  STA: "Safety Triage",
  SCA: "Support Coach",
  SDA: "Service Desk",
  IA: "Insights"
};

// NEW
const agentNames = {
  STA: "Safety Triage",
  TCA: "Therapeutic Coach",
  CMA: "Case Management",
  IA: "Insights"
};
```

#### Update Agent Icons/Colors

```typescript
// OLD
const agentIcons = {
  SCA: "💬",
  SDA: "🗂️"
};

// NEW
const agentIcons = {
  TCA: "💬",  // Therapeutic Coach
  CMA: "📋"   // Case Management (changed from folder to clipboard)
};
```

#### Update Help Text

```typescript
// OLD help text
"The Support Coach Agent provides CBT-based guidance"
"The Service Desk Agent handles appointments"

// NEW help text
"The Therapeutic Coach Agent provides evidence-based CBT therapy"
"The Case Management Agent handles crisis escalation and appointments"
```
```

**Section to Add: "Part 6 - Configuration Files"**
```markdown
### Part 6: Environment Variables and Config

**File:** `.env.example` or `config/agents.yaml`

Check if any config files reference agent names:

```yaml
# OLD
agents:
  sca:
    enabled: true
    temperature: 0.7
  sda:
    enabled: true
    temperature: 0.3

# NEW
agents:
  tca:
    enabled: true
    temperature: 0.7
  cma:
    enabled: true
    temperature: 0.3
```

**File:** `backend/app/core/config.py`

```python
# OLD
AGENT_NAMES = ["STA", "SCA", "SDA", "IA"]

# NEW
AGENT_NAMES = ["STA", "TCA", "CMA", "IA"]
```
```

---

## ✅ Final Pre-Implementation Checklist

Before starting implementation, verify:

### Documentation Complete?
- [x] Two-tier risk monitoring plan written
- [x] Agent rename guide written
- [x] Master checklist created (this document)
- [ ] **MISSING SECTIONS ADDED** (conversation end, CMA auto-invoke, error handling)

### Understanding Clear?
- [x] Understand two-tier architecture (Tier 1 vs Tier 2)
- [x] Understand agent roles (TCA vs CMA)
- [x] Understand cost savings logic (11 vs 20 calls)
- [ ] **CLARIFY:** Conversation lifecycle management
- [ ] **CLARIFY:** CMA duplicate invocation prevention

### Dependencies Ready?
- [x] Thesis LaTeX compilation working
- [x] Backend dev environment set up
- [x] Database accessible
- [x] Git repository clean (no uncommitted changes)
- [ ] **CHECK:** Gemini API quota sufficient for testing
- [ ] **CHECK:** No merge conflicts pending

### Time Allocated?
- [x] Priority 1 tasks identified (18 hours)
- [x] Priority 2 tasks identified (10 hours)
- [x] Priority 3 tasks identified (7 hours)
- [ ] **DECIDE:** Which priorities to tackle given deadline

---

## 🚀 Recommended Next Steps

1. **Immediate (Next 1 hour):**
   - [ ] Review this checklist with supervisor/advisor
   - [ ] Decide which priorities to implement (Priority 1 only? 1+2?)
   - [ ] Add missing sections to TWO_TIER plan (conversation end, CMA auto-invoke)
   - [ ] Add missing sections to AGENT_RENAME plan (frontend, config files)

2. **Short-term (Next 8 hours):**
   - [ ] Implement agent rename (Priority 1.1) - 4 hours
   - [ ] Implement two-tier core (Priority 1.2) - 4 hours

3. **Mid-term (Next 10 hours):**
   - [ ] Update thesis Chapters 1, 3, 4 (Priority 1.3) - 6 hours
   - [ ] Implement two-tier advanced features (Priority 2.1) - 4 hours

4. **Final (Next 6 hours):**
   - [ ] Run basic tests (Priority 2.2) - 3 hours
   - [ ] Final thesis polish (Priority 2.3) - 3 hours

**Total Estimated Time: 24 hours (3 full days)**

---

## 📞 Questions to Answer Before Implementation

1. **Thesis Defense Date:** When is the actual deadline? (Determines scope)
   
2. **Evaluation Expectations:** Does thesis require full working implementation + results, or is architecture design sufficient?

3. **Git Strategy:** Create feature branches or work on main? (Recommendation: feature/two-tier-monitoring and feature/agent-rename)

4. **Database:** Can you modify production schema, or need separate test database?

5. **Frontend:** Does frontend show agent names that need updating?

6. **Collaboration:** Are other team members working on codebase simultaneously?

---

**Document End - All known gaps and missing items documented above**
