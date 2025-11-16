# November 16, 2025 - Implementation Plans

**Status:** Planning Complete, Implementation Pending  
**Next Agent:** Ready for handoff to another laptop/agent

---

## 📁 Files in This Folder

### 1. TWO_TIER_RISK_MONITORING_IMPLEMENTATION_PLAN.md (1098 lines)
**Purpose:** Complete technical specification for cost-optimization architecture

**What it contains:**
- Executive summary (Tier 1: Aika per-message, Tier 2: STA at conversation end)
- Architecture diagrams with full workflows
- 6 implementation phases with line-by-line code changes
- State schema additions (8 new fields in `AikaOrchestratorState`)
- New `ConversationAssessment` Pydantic model (complete code)
- New `conversation_analyzer.py` function (150 lines, complete)
- Orchestrator integration (new node + 2 conditionals)
- 3 test cases with expected JSON outputs
- Thesis integration guidance (Chapter 3 rewrite text)
- Cost comparison tables (45-60% API savings)
- Optional database persistence schema

**Key innovation:** 
- OLD: STA runs on every message (expensive, 20 calls per 10-msg conversation)
- NEW: Aika does lightweight risk check (Tier 1), STA only at conversation end (Tier 2)
- Result: 11 calls per 10-msg conversation = 45% cost reduction

**Files to modify:**
1. `backend/app/agents/graph_state.py` - Add 8 new state fields
2. `backend/app/agents/aika_orchestrator_graph.py` - Update decision node + add STA conversation node
3. `backend/app/agents/sta/conversation_assessment.py` - NEW FILE (Pydantic schema)
4. `backend/app/agents/sta/conversation_analyzer.py` - NEW FILE (analysis function)
5. Thesis: Chapter 1, 3, 4 updates

---

### 2. AGENT_RENAME_CHANGE_GUIDE.md (comprehensive)
**Purpose:** Rename agents for clearer role segregation

**What it contains:**
- Naming rationale: SCA→TCA (Therapeutic Coach Agent), SDA→CMA (Case Management Agent)
- Job segregation clarity (TCA: therapy ONLY, CMA: operations ONLY)
- Complete directory renaming instructions (`sca/` → `tca/`, `sda/` → `cma/`)
- File renaming list (e.g., `sca_graph.py` → `tca_graph.py`)
- Search-and-replace patterns for all Python files
- Thesis LaTeX global find/replace (30+ occurrences)
- New "Role Segregation" section for Chapter 3 (complete LaTeX)
- Verification checklist (grep commands to find missed references)
- Bash automation script (90% of work automated)
- Implementation order (4 hours estimated)

**Why this matters:**
- OLD: "Support Coach" and "Service Desk" have overlapping/unclear responsibilities
- NEW: "Therapeutic Coach" (pure therapy) vs "Case Management" (pure operations)
- Prevents confusion about which agent handles what

**Affects:**
- ~150 backend Python files
- ~50 thesis LaTeX occurrences
- All documentation (README, PROJECT_SINGLE_SOURCE_OF_TRUTH, etc.)
- API routes (`/sca/execute` → `/tca/execute`)
- Database enums (if agent names stored)

---

### 3. IMPLEMENTATION_CHECKLIST.md (gap analysis)
**Purpose:** Master checklist ensuring nothing is missing

**What it contains:**

#### ✅ Documented Areas
- Two-tier architecture (Tier 1 + Tier 2 flows)
- Agent rename (SCA→TCA, SDA→CMA)
- State schema updates
- Thesis updates (Chapters 1, 3, 4)

#### ⚠️ Partially Documented (Needs Attention)
1. **Aika Tool Definitions** - CMA auto-invocation tool
2. **Aika Router Logic** - How `needs_cma_escalation` triggers CMA
3. **Database Models** - Migration for `conversation_assessments` table
4. **API Endpoints** - New endpoints for viewing assessments
5. **Execution Tracker** - Track Tier 1 vs Tier 2 separately

#### ❌ Missing Items (Documented in Checklist)
1. **Conversation End Detection** - Multi-signal (keywords + timeout + button)
2. **CMA Auto-Invocation Flow** - Complete path from Aika → CMA
3. **Conversation Context Management** - How to retrieve full history
4. **Error Handling** - Fallbacks if Tier 2 analysis fails
5. **Testing Strategy** - Integration tests, load tests

#### Priority Matrix
- **Priority 1 (Must Do):** Agent rename + Two-tier core + Thesis Ch 1,3,4 = **18 hours**
- **Priority 2 (Should Do):** Advanced features + Testing = **10 hours**
- **Priority 3 (Nice to Have):** Polish + Load tests = **7 hours**

#### Risk Assessment
- Technical risks: State management, duplicate CMA invocations
- Thesis risks: Timeline pressure (November deadline)
- Mitigation strategies documented

#### Missing Sections to Add
- Phase 6.5: CMA Auto-Invocation (code provided)
- Phase 7: Conversation Lifecycle Management (multi-signal detection code)
- Phase 8: Error Handling (try-catch blocks)
- Part 5: Frontend Changes (agent name display)
- Part 6: Config Files (env vars)

---

## 🎯 Quick Start for Next Agent

### Immediate Context
**What we're doing:** Two major changes to UGM-AICare bachelor's thesis project
1. **Two-tier risk monitoring** - Optimize STA to reduce API costs by 45%
2. **Agent rename** - SCA→TCA, SDA→CMA for role clarity

**Why:** 
- Cost: Current system wastes Gemini API calls (STA on every message)
- Clarity: Agent names are confusing (what's "Support Coach" vs "Service Desk"?)

**Deadline:** November 2025 (thesis defense this month - URGENT)

**Status:** All planning done, zero implementation started

---

### Project Context

**Repository:** UGM-AICare (https://github.com/gigahidjrikaaa/UGM-AICare)
- **Branch:** main
- **Backend:** FastAPI + LangGraph + Google Gemini 2.5
- **Frontend:** Next.js 15 + Tailwind CSS 4
- **Database:** PostgreSQL + Redis
- **Thesis:** LaTeX in `bachelors_thesis_DEIE_giga/` folder

**Current Architecture:**
```
User Message → Aika Meta-Agent → [Decides if agents needed]
                                        ↓
                                   STA (Safety Triage) - Per-message risk
                                        ↓
                                   [Routes based on severity]
                                        ↓
                    ┌──────────────────┴──────────────────┐
                    ↓                                     ↓
                SCA (Support Coach)                   SDA (Service Desk)
                CBT therapy                           Case management
```

**Four Specialized Agents:**
1. **STA** (Safety Triage Agent) - Crisis detection
2. **SCA** (Support Coach Agent) - CBT coaching → **RENAME TO TCA**
3. **SDA** (Service Desk Agent) - Case management → **RENAME TO CMA**
4. **IA** (Insights Agent) - Analytics

---

### Thesis Context

**Title:** "Transforming University Mental Health Support: An Agentic AI Framework for Proactive Intervention and Resource Management"

**Type:** Bachelor's thesis, Design Science Research methodology

**Institution:** Universitas Gadjah Mada (UGM), Indonesia

**Key Files:**
- `bachelors_thesis_DEIE_giga/main.tex` - Main thesis file
- `bachelors_thesis_DEIE_giga/contents/chapter-1/` - Introduction
- `bachelors_thesis_DEIE_giga/contents/chapter-3/` - System Design (MAJOR CHANGES NEEDED)
- `bachelors_thesis_DEIE_giga/contents/chapter-4/` - Evaluation

**Current Thesis State:**
- ✅ Describes four agents (STA, SCA, SDA, IA)
- ✅ Claims per-message risk detection by STA
- ❌ **OUTDATED:** Still uses old names (SCA, SDA)
- ❌ **OUTDATED:** Doesn't mention two-tier architecture
- ❌ **NEEDS:** Chapter 3 rewrite for two-tier design
- ❌ **NEEDS:** Role segregation section (TCA vs CMA)
- ❌ **NEEDS:** Updated evaluation metrics (Chapter 4)

**Research Questions (RQs):**
1. **RQ1 (Safety):** Can STA detect crisis with high sensitivity? → **CHANGES TO TWO-TIER**
2. **RQ2 (Orchestration):** Does LangGraph routing work reliably?
3. **RQ3 (Quality):** Do SCA responses meet CBT standards? → **RENAME TO TCA**
4. **RQ4 (Insights):** Does IA preserve privacy with k-anonymity?

---

### What Has Been Discussed

**Our Conversation History:**
1. User proposed two-tier risk monitoring (save LLM calls)
2. We designed architecture (Tier 1: Aika, Tier 2: STA at conversation end)
3. User realized Aika already returns JSON (can add risk fields for free)
4. We created 6-phase implementation plan (1098 lines)
5. User asked about thesis changes needed
6. We identified 7 required thesis updates (Chapters 1, 3, 4)
7. User asked about agent name changes (confused about SCA/SDA roles)
8. We discovered naming mismatch: Plan uses "CMA" but code uses "SDA"
9. We created comprehensive rename guide (SCA→TCA, SDA→CMA)
10. User requested plans moved to `/docs/todo/16Nov/`
11. We created master checklist with gap analysis
12. **NOW:** User switching to another laptop/agent

---

## 🚀 How to Continue Implementation

### Step 1: Read All Three Documents (30 min)
1. Start with IMPLEMENTATION_CHECKLIST.md (understand gaps)
2. Read TWO_TIER_RISK_MONITORING_IMPLEMENTATION_PLAN.md (technical specs)
3. Read AGENT_RENAME_CHANGE_GUIDE.md (renaming instructions)

### Step 2: Decide Scope (15 min)
Answer these questions:
1. **When is thesis defense?** (Determines if you do Priority 1 only or 1+2)
2. **Need working code or architecture only?** (Some theses accept design without full implementation)
3. **Can you modify production DB?** (For conversation_assessments table)
4. **Is frontend affected?** (Does UI show agent names?)

### Step 3: Choose Implementation Order (Choose One)

#### Option A: Agent Rename First (Recommended)
**Why:** Clean foundation, prevents confusion
```
Day 1 (4h): Agent rename (SCA→TCA, SDA→CMA)
Day 2 (8h): Two-tier core implementation
Day 3 (6h): Thesis updates (Chapters 1, 3, 4)
```

#### Option B: Two-Tier First (Faster to Results)
**Why:** Can test cost savings immediately
```
Day 1 (8h): Two-tier core (state + Aika + STA analyzer)
Day 2 (4h): Agent rename
Day 3 (6h): Thesis updates
```

#### Option C: Parallel (If Multiple People)
**Why:** Fastest, but needs coordination
```
Person A: Agent rename (code + thesis)
Person B: Two-tier implementation
Person C: Testing + documentation
```

### Step 4: Use the Bash Scripts

**For Agent Rename:**
```bash
cd /d/Ngoding\ Moment/Github/Skripsi-UGM-AICare/UGM-AICare
bash docs/todo/16Nov/agent_rename_script.sh  # (if you extract it from the guide)
```

**For Two-Tier:**
No automation - must follow Phase 1-6 manually in the plan

### Step 5: Verify Completeness

After each phase, run verification commands from IMPLEMENTATION_CHECKLIST.md:
```bash
# Find any missed SCA/SDA references
grep -r "\\bSCA\\b" backend/
grep -r "\\bSDA\\b" backend/
grep -r "Support Coach Agent" backend/
grep -r "Service Desk Agent" backend/

# Find thesis references
grep -r "SCA" bachelors_thesis_DEIE_giga/contents/
grep -r "SDA" bachelors_thesis_DEIE_giga/contents/
```

---

## 📞 Critical Information for Handoff

### Environment Setup
**Backend:**
```bash
cd backend/
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

**Database:**
- PostgreSQL connection string in `.env`
- Redis for caching
- May need Alembic migration for conversation_assessments table

**LLM:**
- Google Gemini 2.5 API (free tier: 5 req/min, 25 req/day)
- API key in `.env` as `GEMINI_API_KEY`

**Thesis Compilation:**
```bash
cd bachelors_thesis_DEIE_giga/
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

### Key File Locations

**Backend - State Management:**
- `backend/app/agents/graph_state.py` - TypedDict schemas (ADD 8 FIELDS HERE)

**Backend - Orchestrator:**
- `backend/app/agents/aika_orchestrator_graph.py` - Main entry point (UPDATE DECISION NODE)
- `backend/app/agents/aika/orchestrator.py` - Alternative Aika implementation (may need sync)

**Backend - Agents (TO BE RENAMED):**
- `backend/app/agents/sca/` → RENAME TO `tca/`
- `backend/app/agents/sda/` → RENAME TO `cma/`
- `backend/app/agents/sta/` - Keep name, add conversation_analyzer.py here

**Thesis - Major Updates:**
- `bachelors_thesis_DEIE_giga/contents/chapter-1/chapter-1.tex` - Lines 69-72 (4 agents intro)
- `bachelors_thesis_DEIE_giga/contents/chapter-3/chapter-3.tex` - Lines 255+ (STA design), 268+ (role segregation), 420+ (STA objectives)
- `bachelors_thesis_DEIE_giga/contents/chapter-4/chapter-4.tex` - Lines 32+ (agents under test), 43+ (test suite), 54+ (coaching eval)

### Project Documentation (MAY BE OUTDATED)
- `PROJECT_SINGLE_SOURCE_OF_TRUTH.md` - Still has SCA/SDA (needs update)
- `AIKA_META_AGENT_ARCHITECTURE.md` - Still has SCA/SDA (needs update)
- `README.md` - Still has SCA/SDA (needs update)

### Testing
**Unit tests:** `backend/tests/agents/`
- May have test files like `test_sca_*.py` that need renaming

**Manual testing endpoints:**
```bash
# Test Aika chat
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I feel stressed", "user_id": 1}'

# Test STA directly (will be /sta/execute)
# Test TCA/CMA after rename (will be /tca/execute, /cma/execute)
```

---

## ⚠️ Known Issues and Pitfalls

### Issue 1: Two Orchestration Systems
- **Problem:** Code has BOTH `orchestrator_graph.py` (pure LangGraph) AND `aika/orchestrator.py` (Gemini function calling)
- **Solution:** Chat endpoint uses `aika/orchestrator.py`, so focus changes there
- **Document:** AIKA_META_AGENT_ARCHITECTURE.md explains the difference

### Issue 2: Conversation End Detection
- **Problem:** Simple keyword matching ("goodbye") can false trigger mid-conversation
- **Solution:** Implement multi-signal detection (keywords + timeout + explicit button)
- **Code:** Provided in IMPLEMENTATION_CHECKLIST.md Phase 7

### Issue 3: CMA Duplicate Invocation
- **Problem:** Both Tier 1 (immediate crisis) and Tier 2 (conversation end) might trigger CMA
- **Solution:** Add `cma_already_invoked` flag in state
- **Code:** Needs implementation (not in current plans)

### Issue 4: Git Directory Rename
- **Problem:** `git mv` preserves history better than `mv`
- **Solution:** Use `git mv backend/app/agents/sca backend/app/agents/tca`
- **Important:** Commit rename separately from code changes

### Issue 5: Thesis Compilation Errors
- **Problem:** LaTeX may break if citations/references to SCA/SDA exist
- **Solution:** Search for `\ref{}, \cite{}, \label{}` patterns before renaming
- **Check:** Run `pdflatex` after each chapter update

---

## 📊 Success Metrics

**You'll know implementation is complete when:**

1. **Agent Rename:**
   - ✅ All `grep -r "\\bSCA\\b"` returns 0 matches in backend/
   - ✅ All `grep -r "\\bSDA\\b"` returns 0 matches in backend/
   - ✅ API routes work: `/api/v1/agents/tca/execute`, `/api/v1/agents/cma/execute`
   - ✅ Thesis compiles without errors after SCA→TCA, SDA→CMA replacements

2. **Two-Tier Monitoring:**
   - ✅ Aika's JSON includes `immediate_risk`, `crisis_keywords`, `risk_reasoning`
   - ✅ New `conversation_assessment` field in state
   - ✅ `conversation_analyzer.py` file exists with `analyze_conversation_risk()` function
   - ✅ STA conversation analysis node added to orchestrator graph
   - ✅ Test: Send "goodbye" → triggers STA conversation analysis
   - ✅ Test: Send crisis message → immediate_risk="critical" → auto-invokes CMA

3. **Thesis:**
   - ✅ Chapter 1 mentions "Therapeutic Coach Agent (TCA)" not SCA
   - ✅ Chapter 3 has new "Role Segregation" section
   - ✅ Chapter 3 describes two-tier architecture (Tier 1 + Tier 2)
   - ✅ Chapter 4 mentions Tier 1 validation (50 messages) + Tier 2 validation (10 conversations)
   - ✅ PDF compiles successfully

4. **Tests:**
   - ✅ Test Case 1: Immediate crisis detection (from TWO_TIER plan)
   - ✅ Test Case 2: Conversation-end analysis (from TWO_TIER plan)
   - ✅ Test Case 3: Cost verification (11 calls vs 20 calls)

---

## 🆘 Emergency Contacts / Resources

**If you get stuck:**

1. **Read the three main docs** in this folder (most answers are there)

2. **Check existing documentation:**
   - `PROJECT_SINGLE_SOURCE_OF_TRUTH.md` - System overview
   - `AIKA_META_AGENT_ARCHITECTURE.md` - Orchestrator details
   - `docs/langgraph-phase5-complete.md` - LangGraph implementation guide

3. **Grep for examples:**
   ```bash
   # Find how STA is currently implemented
   grep -r "create_sta_graph" backend/
   
   # Find state field usage
   grep -r "AikaOrchestratorState" backend/
   
   # Find thesis structure
   grep -r "\\section{" bachelors_thesis_DEIE_giga/contents/
   ```

4. **Key decisions documented in IMPLEMENTATION_CHECKLIST.md:**
   - Section: "⚠️ Risk Assessment"
   - Section: "❌ Missing Items to Add to Plans"

---

## ✅ Final Checklist Before Starting

Before the next agent begins implementation:

- [x] Three main documents exist in `/docs/todo/16Nov/`
- [x] This README explains full context
- [x] All gaps documented in IMPLEMENTATION_CHECKLIST.md
- [x] Priority matrix defined (18h must-do, 10h should-do, 7h nice-to-have)
- [x] Implementation order recommendations provided
- [x] Verification commands listed
- [x] Known issues and pitfalls documented
- [x] Success metrics defined
- [x] Emergency resources listed
- [ ] **ANSWER 6 CRITICAL QUESTIONS** (in IMPLEMENTATION_CHECKLIST.md)
- [ ] **DECIDE SCOPE** (Priority 1 only? 1+2? 1+2+3?)
- [ ] **CHOOSE IMPLEMENTATION ORDER** (Rename first? Two-tier first? Parallel?)

---

## 💡 Pro Tips for Next Agent

1. **Create feature branches:**
   ```bash
   git checkout -b feature/agent-rename
   git checkout -b feature/two-tier-monitoring
   ```

2. **Commit frequently with clear messages:**
   ```bash
   git commit -m "refactor: rename SCA to TCA (directory structure)"
   git commit -m "feat: add Tier 1 immediate risk to Aika decision node"
   ```

3. **Test incrementally:**
   - Don't implement all 6 phases at once
   - Test after each phase
   - Use Langfuse for trace debugging

4. **Keep thesis and code in sync:**
   - Update thesis chapter immediately after code implementation
   - Don't wait until end
   - Compile PDF frequently to catch LaTeX errors early

5. **Use the bash scripts:**
   - Agent rename script automates 90% of work
   - Save time for complex logic (conversation analyzer, CMA auto-invoke)

---

**This README serves as the handoff document. Next agent should read this first, then the three main documents in order: Checklist → Two-Tier Plan → Agent Rename Guide.**

**Good luck! 🚀**
