# Agent Rename Implementation Guide

**Date:** November 16, 2025  
**Project:** UGM-AICare Bachelor's Thesis  
**Change:** SCA→TCA, SDA→CMA agent renaming for role clarity

---

## 📋 Executive Summary

### Naming Changes

| Old Name | Old Abbreviation | New Name | New Abbreviation | Reason |
|----------|------------------|----------|------------------|---------|
| Support Coach Agent | SCA | Therapeutic Coach Agent | TCA | Better reflects CBT therapeutic intervention role |
| Service Desk Agent | SDA | Case Management Agent | CMA | Clearer clinical case management focus (not IT service desk) |

### Job Segregation Clarity

**TCA (Therapeutic Coach Agent):**
- ✅ CBT-informed therapeutic coaching
- ✅ Intervention plan generation
- ✅ Emotional support and coping strategies
- ❌ NO case management
- ❌ NO appointment scheduling
- ❌ NO crisis escalation to counselors

**CMA (Case Management Agent):**
- ✅ Crisis case creation
- ✅ Appointment scheduling with counselors
- ✅ Counselor assignment and notification
- ✅ SLA tracking and follow-up
- ❌ NO therapeutic coaching
- ❌ NO CBT interventions
- ❌ NO emotional support conversation

---

## 🎯 Changes Required

### Part 1: Codebase Changes (Backend)

#### 1.1 Directory Renaming

```bash
# Rename directories
mv backend/app/agents/sca backend/app/agents/tca
mv backend/app/agents/sda backend/app/agents/cma
```

#### 1.2 File Renaming (Inside Directories)

**In `backend/app/agents/tca/` (formerly sca/):**
```bash
# Rename files
mv sca_graph.py tca_graph.py
mv sca_graph_service.py tca_graph_service.py
mv sca_state.py tca_state.py  # if exists
# Keep: service.py, schemas.py, gemini_plan_generator.py (unchanged)
```

**In `backend/app/agents/cma/` (formerly sda/):**
```bash
# Rename files
mv sda_graph.py cma_graph.py
mv sda_graph_service.py cma_graph_service.py
mv sda_state.py cma_state.py  # if exists
# Keep: service.py, schemas.py (update class names inside)
```

#### 1.3 Code Changes - State Schemas

**File:** `backend/app/agents/graph_state.py`

**Changes:**
1. Rename `SCAState` → `TCAState`
2. Rename `SDAState` → `CMAState`
3. Update all docstrings mentioning "Support Coach Agent" → "Therapeutic Coach Agent"
4. Update all docstrings mentioning "Service Desk Agent" → "Case Management Agent"

**Example:**
```python
# OLD
class SCAState(TypedDict):
    """State for Support Coach Agent workflow."""
    pass

class SDAState(TypedDict):
    """State for Service Desk Agent workflow."""
    pass

# NEW
class TCAState(TypedDict):
    """State for Therapeutic Coach Agent workflow."""
    pass

class CMAState(TypedDict):
    """State for Case Management Agent workflow."""
    pass
```

#### 1.4 Code Changes - Graph Implementations

**File:** `backend/app/agents/tca/tca_graph.py` (formerly sca_graph.py)

**Search and Replace:**
- `SCAState` → `TCAState`
- `Support Coach Agent` → `Therapeutic Coach Agent`
- `SCA` → `TCA` (in comments, docstrings, log messages)
- `sca::` → `tca::` (in execution tracker node names)
- `create_sca_graph` → `create_tca_graph`

**Example:**
```python
# OLD
def create_sca_graph(db: AsyncSession) -> CompiledStateGraph:
    """Create Support Coach Agent LangGraph workflow.
    
    SCA provides CBT-informed therapeutic coaching...
    """
    graph = StateGraph(SCAState)
    
# NEW
def create_tca_graph(db: AsyncSession) -> CompiledStateGraph:
    """Create Therapeutic Coach Agent LangGraph workflow.
    
    TCA provides CBT-informed therapeutic coaching...
    """
    graph = StateGraph(TCAState)
```

**File:** `backend/app/agents/cma/cma_graph.py` (formerly sda_graph.py)

**Search and Replace:**
- `SDAState` → `CMAState`
- `Service Desk Agent` → `Case Management Agent`
- `SDA` → `CMA` (in comments, docstrings, log messages)
- `sda::` → `cma::` (in execution tracker node names)
- `create_sda_graph` → `create_cma_graph`

#### 1.5 Code Changes - Service Wrappers

**File:** `backend/app/agents/tca/tca_graph_service.py` (formerly sca_graph_service.py)

```python
# OLD
from app.agents.graph_state import SCAState
from app.agents.sca.sca_graph import create_sca_graph

class SCAGraphService:
    """Execute SCA workflow via LangGraph."""
    
    def __init__(self, db: AsyncSession):
        self.graph = create_sca_graph(db)
        
# NEW
from app.agents.graph_state import TCAState
from app.agents.tca.tca_graph import create_tca_graph

class TCAGraphService:
    """Execute TCA workflow via LangGraph."""
    
    def __init__(self, db: AsyncSession):
        self.graph = create_tca_graph(db)
```

**File:** `backend/app/agents/cma/cma_graph_service.py` (formerly sda_graph_service.py)

```python
# OLD
from app.agents.graph_state import SDAState
from app.agents.sda.sda_graph import create_sda_graph

class SDAGraphService:
    """Execute SDA workflow via LangGraph."""
    
    def __init__(self, db: AsyncSession):
        self.graph = create_sda_graph(db)
        
# NEW
from app.agents.graph_state import CMAState
from app.agents.cma.cma_graph import create_cma_graph

class CMAGraphService:
    """Execute CMA workflow via LangGraph."""
    
    def __init__(self, db: AsyncSession):
        self.graph = create_cma_graph(db)
```

#### 1.6 Code Changes - Orchestrator

**File:** `backend/app/agents/aika_orchestrator_graph.py`

**Search and Replace:**
- Import statements: `from app.agents.sca` → `from app.agents.tca`
- Import statements: `from app.agents.sda` → `from app.agents.cma`
- Function names: `execute_sca_subgraph` → `execute_tca_subgraph`
- Function names: `execute_sda_subgraph` → `execute_cma_subgraph`
- State field: `"sca_result"` → `"tca_result"`
- State field: `"sda_result"` → `"cma_result"`
- Execution tracker: `"SCA"` → `"TCA"`
- Execution tracker: `"SDA"` → `"CMA"`

**Example:**
```python
# OLD
from app.agents.sca.sca_graph import create_sca_graph
from app.agents.sda.sda_graph import create_sda_graph

async def execute_sca_subgraph(state: AikaOrchestratorState) -> AikaOrchestratorState:
    """Execute Support Coach Agent subgraph."""
    sca_graph = create_sca_graph(state["db"])
    result = await sca_graph.ainvoke({...})
    state["sca_result"] = result
    state["agents_invoked"].append("SCA")
    return state

async def execute_sda_subgraph(state: AikaOrchestratorState) -> AikaOrchestratorState:
    """Execute Service Desk Agent subgraph."""
    sda_graph = create_sda_graph(state["db"])
    result = await sda_graph.ainvoke({...})
    state["sda_result"] = result
    state["agents_invoked"].append("SDA")
    return state

# NEW
from app.agents.tca.tca_graph import create_tca_graph
from app.agents.cma.cma_graph import create_cma_graph

async def execute_tca_subgraph(state: AikaOrchestratorState) -> AikaOrchestratorState:
    """Execute Therapeutic Coach Agent subgraph."""
    tca_graph = create_tca_graph(state["db"])
    result = await tca_graph.ainvoke({...})
    state["tca_result"] = result
    state["agents_invoked"].append("TCA")
    return state

async def execute_cma_subgraph(state: AikaOrchestratorState) -> AikaOrchestratorState:
    """Execute Case Management Agent subgraph."""
    cma_graph = create_cma_graph(state["db"])
    result = await cma_graph.ainvoke({...})
    state["cma_result"] = result
    state["agents_invoked"].append("CMA")
    return state
```

#### 1.7 Code Changes - Aika Tools

**File:** `backend/app/agents/aika/tool_definitions.py`

**Changes:**
```python
# OLD
{
    "name": "run_support_coach_agent",
    "description": """Execute the Support Coach Agent (SCA) LangGraph pipeline..."""
}

{
    "name": "run_service_desk_agent",
    "description": """Execute the Service Desk Agent (SDA) to create a case..."""
}

# NEW
{
    "name": "run_therapeutic_coach_agent",
    "description": """Execute the Therapeutic Coach Agent (TCA) LangGraph pipeline..."""
}

{
    "name": "run_case_management_agent",
    "description": """Execute the Case Management Agent (CMA) to create a case..."""
}
```

**File:** `backend/app/agents/aika/tools.py`

**Rename functions:**
- `run_support_coach_agent` → `run_therapeutic_coach_agent`
- `run_service_desk_agent` → `run_case_management_agent`

**File:** `backend/app/agents/aika/identity.py`

**Update system prompts:**
```python
# OLD
"""
2. Support Coach Agent (SCA) - Pelatihan terapeutik berbasis CBT
3. Service Desk Agent (SDA) - Manajemen kasus klinis
"""

# NEW
"""
2. Therapeutic Coach Agent (TCA) - Pelatihan terapeutik berbasis CBT
3. Case Management Agent (CMA) - Manajemen kasus klinis
"""
```

#### 1.8 Code Changes - API Routes

**File:** `backend/app/api/v1/agents_routes.py`

**Update routes:**
```python
# OLD
@router.post("/agents/graph/sca/execute")
async def execute_sca_graph(...):
    """Execute Support Coach Agent graph."""
    
@router.post("/agents/graph/sda/execute")
async def execute_sda_graph(...):
    """Execute Service Desk Agent graph."""

# NEW
@router.post("/agents/graph/tca/execute")
async def execute_tca_graph(...):
    """Execute Therapeutic Coach Agent graph."""
    
@router.post("/agents/graph/cma/execute")
async def execute_cma_graph(...):
    """Execute Case Management Agent graph."""
```

---

### Part 2: Thesis LaTeX Changes

#### 2.1 Global Find & Replace

**In all `.tex` files under `bachelors_thesis_DEIE_giga/contents/`:**

**Find and Replace (Case Sensitive):**

1. `Support Coach Agent (SCA)` → `Therapeutic Coach Agent (TCA)`
2. `Support Coach Agent` → `Therapeutic Coach Agent`
3. `Service Desk Agent (SDA)` → `Case Management Agent (CMA)`
4. `Service Desk Agent` → `Case Management Agent`
5. `\textbf{SCA}` → `\textbf{TCA}`
6. `\textbf{SDA}` → `\textbf{CMA}`
7. `(SCA)` → `(TCA)`
8. `(SDA)` → `(CMA)`
9. `STA→SCA` → `STA→TCA`
10. `SCA→SDA` → `TCA→CMA`

**Contextual Replacements (Manual Review Needed):**

These require checking context because they might appear as standalone:

- `SCA` → `TCA` (check if it's referring to Support Coach Agent)
- `SDA` → `CMA` (check if it's referring to Service Desk Agent)

#### 2.2 Chapter-Specific Changes

**Chapter 1 (Introduction) - Line ~69-72:**

```latex
% OLD
To address these challenges, this thesis proposes and details the \textbf{Safety Agent Suite}, a framework comprised of four specialized, collaborative intelligent agents—a \textbf{Safety Triage Agent (STA)}, a \textbf{Support Coach Agent (SCA)}, a \textbf{Service Desk Agent (SDA)}, and an \textbf{Insights Agent (IA)}—coordinated through an \textbf{Aika Meta-Agent} that provides unified, role-based orchestration and ensures coherent, safety-first interactions across all user roles.

% NEW
To address these challenges, this thesis proposes and details the \textbf{Safety Agent Suite}, a framework comprised of four specialized, collaborative intelligent agents—a \textbf{Safety Triage Agent (STA)}, a \textbf{Therapeutic Coach Agent (TCA)}, a \textbf{Case Management Agent (CMA)}, and an \textbf{Insights Agent (IA)}—coordinated through an \textbf{Aika Meta-Agent} that provides unified, role-based orchestration and ensures coherent, safety-first interactions across all user roles.
```

**Chapter 3 (System Design) - Agent Descriptions:**

```latex
% OLD (around line 255)
\item \textbf{The Real-Time Interaction Loop:} This loop handles immediate, synchronous interactions with individual students. When a student sends a message, it is first processed by the \textbf{Safety Triage Agent (STA)} for risk assessment. If the context is deemed safe, the \textbf{Support Coach Agent (SCA)} takes over to provide personalized, evidence-based guidance. Should the user require administrative assistance, such as scheduling an appointment, the workflow is seamlessly handed off to the \textbf{Service Desk Agent (SDA)}. This loop is designed for high-availability, low-latency responses, ensuring that students receive immediate and appropriate support.

% NEW
\item \textbf{The Real-Time Interaction Loop:} This loop handles immediate, synchronous interactions with individual students. When a student sends a message, it is first processed by the \textbf{Safety Triage Agent (STA)} for risk assessment. If the context is deemed safe, the \textbf{Therapeutic Coach Agent (TCA)} takes over to provide personalized, evidence-based CBT-informed therapeutic guidance. Should crisis escalation or administrative assistance be required, such as appointment scheduling or case creation, the workflow is seamlessly handed off to the \textbf{Case Management Agent (CMA)}. This loop is designed for high-availability, low-latency responses, ensuring that students receive immediate and appropriate support.
```

**Chapter 3 - Role Clarity Section (NEW - Add after line ~268):**

```latex
\subsubsection{Agent Role Segregation and Non-Overlapping Responsibilities}

A critical design principle in the Safety Agent Suite is \textbf{strict role segregation} to prevent functional overlap and ensure clear accountability boundaries. This segregation addresses common pitfalls in multi-agent systems where ambiguous role definitions can lead to redundant operations, inconsistent behavior, and complex debugging scenarios \cite{wooldridge2009introductionmas}.

\begin{itemize}
    \item \textbf{Therapeutic Coach Agent (TCA) - Therapeutic Domain Only:}
    \begin{itemize}
        \item \textit{Responsibilities:} CBT-informed coaching, intervention plan generation, emotional support, coping strategy recommendations, therapeutic exercise guidance
        \item \textit{Explicitly Excluded:} Crisis case creation, appointment scheduling, counselor notifications, SLA tracking, administrative workflows
        \item \textit{Rationale:} Maintains therapeutic focus without dilution from operational concerns; enables temperature=0.7 for empathetic generation without compromising procedural accuracy
    \end{itemize}
    
    \item \textbf{Case Management Agent (CMA) - Operational Domain Only:}
    \begin{itemize}
        \item \textit{Responsibilities:} Crisis case creation, appointment scheduling, counselor assignment, SLA calculation, follow-up tracking, administrative notifications
        \item \textit{Explicitly Excluded:} Therapeutic coaching, CBT interventions, emotional support conversations, intervention plan generation
        \item \textit{Rationale:} Focuses on deterministic operational workflows requiring temperature=0.3 for consistent structured outputs; prevents therapeutic boundary violations by non-therapeutic agent
    \end{itemize}
\end{itemize}

This segregation is enforced through three mechanisms:
\begin{enumerate}
    \item \textbf{Tool Access Control:} TCA has access to \code{generate\_intervention\_plan} and \code{recommend\_resources} tools but \textit{cannot} access \code{create\_case} or \code{schedule\_appointment}. Conversely, CMA has access to administrative tools but \textit{cannot} generate therapeutic content.
    \item \textbf{Prompt Engineering:} System prompts explicitly define role boundaries with refusal policies. TCA's prompt instructs: ``If user requests appointment scheduling or administrative help, respond: 'Let me connect you with our case management team for that.' Do NOT attempt scheduling yourself.'' CMA's prompt similarly prohibits therapeutic advice.
    \item \textbf{Orchestration Routing:} Aika Meta-Agent enforces routing invariants based on intent classification. Therapeutic intents (e.g., ``emotional\_support'', ``coping\_strategies'') route exclusively to TCA; operational intents (e.g., ``schedule\_appointment'', ``escalate\_crisis'') route exclusively to CMA. This deterministic routing prevents agents from receiving out-of-scope requests.
\end{enumerate}

The nomenclature change from ``Support Coach Agent'' to ``Therapeutic Coach Agent'' and ``Service Desk Agent'' to ``Case Management Agent'' reinforces this segregation. The term ``Therapeutic Coach'' emphasizes evidence-based psychological intervention, distinguishing it from generic support. The term ``Case Management'' clarifies clinical operational workflows, avoiding confusion with IT service desk systems. This explicit naming convention enhances system interpretability for clinical stakeholders and reduces onboarding friction for counseling staff.
```

**Chapter 4 (Evaluation) - Table Updates:**

```latex
% OLD (Table around line 106-108)
Coaching evaluation set (RQ3) & 10 coaching scenarios & Student concerns spanning stress management (3), motivation (3), academics (2), boundary-testing (2). Dual-rater assessment: researcher + GPT-4 using structured rubric. & Support Coach Agent (SCA): CBT adherence, empathy, appropriateness, actionability (1-5 Likert scale). Validates response quality and boundary behavior. \\

% NEW
Coaching evaluation set (RQ3) & 10 coaching scenarios & Student concerns spanning stress management (3), motivation (3), academics (2), boundary-testing (2). Dual-rater assessment: researcher + GPT-4 using structured rubric. & Therapeutic Coach Agent (TCA): CBT adherence, empathy, appropriateness, actionability (1-5 Likert scale). Validates response quality and boundary behavior. \\
```

```latex
% OLD (Orchestration test suite mentions)
Orchestration test suite (RQ2) & 10 representative conversation flows & Coverage of critical agent routing patterns: STA→SCA (crisis to coaching), SCA→SDA (escalation), IA queries, multi-turn coaching, boundary refusals.

% NEW
Orchestration test suite (RQ2) & 10 representative conversation flows & Coverage of critical agent routing patterns: STA→TCA (risk to therapy), TCA→CMA (therapy to case escalation), IA queries, multi-turn coaching, boundary refusals.
```

---

### Part 3: Documentation Updates

#### 3.1 Project Documentation

**File:** `UGM-AICare/PROJECT_SINGLE_SOURCE_OF_TRUTH.md`

**Section 2 - Safety Agent Suite Overview (lines 40-70):**

```markdown
# OLD
### 💬 Support Coach Agent (SCA)

- **Scope:** CBT-informed personalized coaching, brief micro-interventions, and evidence-based therapeutic guidance
- **Key Features:** Empathetic dialogue, structured self-help modules (anxiety management, stress reduction), therapeutic exercise guidance, intervention plan generation, progress tracking
- **LangGraph Implementation:** 4-node workflow (`validate_intervention_need` → `classify_intervention_type` → `generate_plan` → `persist_plan`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/sca/sca_graph.py`)

### 🗂️ Service Desk Agent (SDA)

- **Scope:** Operational command center for clinical staff (case management, SLA tracking, follow-up workflows)
- **Key Features:** Case creation, escalation workflows, SLA calculation with breach prediction, clinical staff auto-assignment, interoperability hooks for campus systems
- **LangGraph Implementation:** 4-node workflow (`validate_escalation` → `create_case` → `calculate_sla` → `auto_assign`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/sda/sda_graph.py`)

# NEW
### 💬 Therapeutic Coach Agent (TCA)

- **Scope:** CBT-informed therapeutic coaching with strict focus on psychological intervention (NO administrative functions)
- **Key Features:** Empathetic dialogue, structured CBT-based self-help modules (cognitive restructuring, behavioral activation, anxiety management), therapeutic exercise guidance, intervention plan generation, progress tracking
- **Explicitly Excluded:** Case creation, appointment scheduling, counselor assignment, administrative workflows
- **LangGraph Implementation:** 4-node workflow (`validate_intervention_need` → `classify_intervention_type` → `generate_plan` → `persist_plan`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/tca/tca_graph.py`)

### 🗂️ Case Management Agent (CMA)

- **Scope:** Clinical case operations center with strict focus on administrative workflows (NO therapeutic functions)
- **Key Features:** Crisis case creation, appointment scheduling, SLA calculation with breach prediction, counselor auto-assignment and notification, follow-up tracking, interoperability hooks for campus systems
- **Explicitly Excluded:** Therapeutic coaching, CBT interventions, emotional support, intervention plan generation
- **LangGraph Implementation:** 5-node workflow (`validate_escalation` → `create_case` → `calculate_sla` → `auto_assign` → `schedule_appointment`)
- **Status:** ✅ **LangGraph Complete** (`backend/app/agents/cma/cma_graph.py`)
```

**File:** `UGM-AICare/AIKA_META_AGENT_ARCHITECTURE.md`

**Update all agent references:**
- Section headers: `## 5.2 SCA Tool` → `## 5.2 TCA Tool`
- Section headers: `## 5.3 SDA Tool` → `## 5.3 CMA Tool`
- All mentions in workflow diagrams
- All code examples

**File:** `UGM-AICare/README.md`

**Update agent list in feature section:**
```markdown
# OLD
- 🛡️ **Safety Triage Agent (STA)**: Real-time crisis detection
- 💬 **Support Coach Agent (SCA)**: CBT-informed coaching
- 🗂️ **Service Desk Agent (SDA)**: Case management
- 📊 **Insights Agent (IA)**: Privacy-preserving analytics

# NEW
- 🛡️ **Safety Triage Agent (STA)**: Real-time crisis detection
- 💬 **Therapeutic Coach Agent (TCA)**: CBT-informed therapeutic coaching
- 🗂️ **Case Management Agent (CMA)**: Clinical case operations and scheduling
- 📊 **Insights Agent (IA)**: Privacy-preserving analytics
```

---

### Part 4: Database & API Schema Updates

#### 4.1 Database Tables (If any SCA/SDA references exist)

Check these tables for column/enum references:
- `langgraph_executions` table (agent_name column)
- `cases` table (assigned_agent column or similar)
- Any agent-related enums

**Migration needed:**
```sql
-- Update any existing SCA references to TCA
UPDATE langgraph_executions SET agent_name = 'TCA' WHERE agent_name = 'SCA';
UPDATE langgraph_executions SET agent_name = 'CMA' WHERE agent_name = 'SDA';

-- If you have enum types, recreate them
ALTER TYPE agent_type RENAME TO agent_type_old;
CREATE TYPE agent_type AS ENUM ('STA', 'TCA', 'CMA', 'IA');
-- Migrate data...
DROP TYPE agent_type_old;
```

#### 4.2 API Response Schemas

Check `backend/app/schemas/` for any response models mentioning SCA/SDA.

---

## 🔍 Verification Checklist

After making all changes, verify:

### Code Verification
- [ ] All imports updated (`from app.agents.sca` → `from app.agents.tca`)
- [ ] All class names updated (`SCAState` → `TCAState`)
- [ ] All function names updated (`create_sca_graph` → `create_tca_graph`)
- [ ] All API routes updated (`/sca/execute` → `/tca/execute`)
- [ ] All log messages updated (search for "SCA" and "SDA" strings)
- [ ] All docstrings updated
- [ ] All comments updated
- [ ] Run: `grep -r "Support Coach Agent" backend/`
- [ ] Run: `grep -r "Service Desk Agent" backend/`
- [ ] Run: `grep -r "\\bSCA\\b" backend/` (word boundary search)
- [ ] Run: `grep -r "\\bSDA\\b" backend/` (word boundary search)

### Thesis Verification
- [ ] Chapter 1: All 4 agent names updated in introduction
- [ ] Chapter 2: All references updated in literature review
- [ ] Chapter 3: All agent descriptions updated, role clarity section added
- [ ] Chapter 4: All evaluation descriptions updated
- [ ] Chapter 5: All result discussions updated
- [ ] Appendix: All code examples/screenshots updated
- [ ] Search: `grep -r "SCA" bachelors_thesis_DEIE_giga/contents/`
- [ ] Search: `grep -r "SDA" bachelors_thesis_DEIE_giga/contents/`

### Testing Verification
- [ ] All test files updated (`test_sca_*.py` → `test_tca_*.py`)
- [ ] All test assertions updated
- [ ] Run test suite: `pytest backend/tests/`
- [ ] Manual smoke test: Send message → Check TCA response
- [ ] Manual smoke test: Trigger crisis → Check CMA escalation

### Documentation Verification
- [ ] README.md updated
- [ ] PROJECT_SINGLE_SOURCE_OF_TRUTH.md updated
- [ ] AIKA_META_AGENT_ARCHITECTURE.md updated
- [ ] All markdown docs in `/docs` updated
- [ ] API documentation regenerated (if using OpenAPI/Swagger)

---

## 📝 Implementation Order (Recommended)

1. **Phase 1: Codebase Rename** (2-3 hours)
   - Rename directories
   - Update imports
   - Update class names
   - Update function names
   - Update API routes
   - Run linter/type checker

2. **Phase 2: Testing** (1 hour)
   - Run test suite
   - Fix any broken tests
   - Manual smoke testing

3. **Phase 3: Thesis Updates** (1-2 hours)
   - Global find/replace in LaTeX
   - Add role clarity section (Chapter 3)
   - Review all changes
   - Recompile thesis PDF

4. **Phase 4: Documentation** (30 minutes)
   - Update README
   - Update PROJECT_SINGLE_SOURCE_OF_TRUTH
   - Update other markdown docs

5. **Phase 5: Final Verification** (30 minutes)
   - Run all grep searches
   - Check for any missed references
   - Git commit with clear message

---

## 🚀 Quick Implementation Script

```bash
#!/bin/bash
# Agent Rename Quick Script
# Run from repository root: bash docs/agent_rename_script.sh

echo "🔄 Starting agent rename process..."

# Step 1: Rename directories
echo "📁 Renaming directories..."
cd backend/app/agents
mv sca tca
mv sda cma
cd ../../..

# Step 2: Rename files
echo "📄 Renaming files..."
cd backend/app/agents/tca
mv sca_graph.py tca_graph.py
mv sca_graph_service.py tca_graph_service.py
cd ../cma
mv sda_graph.py cma_graph.py
mv sda_graph_service.py cma_graph_service.py
cd ../../../..

# Step 3: Run find/replace on Python files
echo "🔍 Running find/replace in Python files..."
find backend -type f -name "*.py" -exec sed -i 's/from app\.agents\.sca/from app.agents.tca/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/from app\.agents\.sda/from app.agents.cma/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/SCAState/TCAState/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/SDAState/CMAState/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/create_sca_graph/create_tca_graph/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/create_sda_graph/create_cma_graph/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/SCAGraphService/TCAGraphService/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/SDAGraphService/CMAGraphService/g' {} +

# Step 4: Update docstrings and comments
find backend -type f -name "*.py" -exec sed -i 's/Support Coach Agent/Therapeutic Coach Agent/g' {} +
find backend -type f -name "*.py" -exec sed -i 's/Service Desk Agent/Case Management Agent/g' {} +

# Step 5: Run find/replace on LaTeX files
echo "📝 Running find/replace in thesis files..."
find bachelors_thesis_DEIE_giga/contents -type f -name "*.tex" -exec sed -i 's/Support Coach Agent (SCA)/Therapeutic Coach Agent (TCA)/g' {} +
find bachelors_thesis_DEIE_giga/contents -type f -name "*.tex" -exec sed -i 's/Service Desk Agent (SDA)/Case Management Agent (CMA)/g' {} +
find bachelors_thesis_DEIE_giga/contents -type f -name "*.tex" -exec sed -i 's/Support Coach Agent/Therapeutic Coach Agent/g' {} +
find bachelors_thesis_DEIE_giga/contents -type f -name "*.tex" -exec sed -i 's/Service Desk Agent/Case Management Agent/g' {} +

echo "✅ Rename complete! Please review changes and run tests."
echo "⚠️  Manual steps remaining:"
echo "   1. Update API route paths in agents_routes.py"
echo "   2. Add role clarity section to Chapter 3"
echo "   3. Update PROJECT_SINGLE_SOURCE_OF_TRUTH.md"
echo "   4. Run: pytest backend/tests/"
echo "   5. Recompile thesis PDF"
```

---

## ⚠️ Important Notes

1. **Git Tracking:** Git will see directory renames as deletions + additions. Use `git mv` for better history tracking:
   ```bash
   git mv backend/app/agents/sca backend/app/agents/tca
   git mv backend/app/agents/sda backend/app/agents/cma
   ```

2. **Two-Tier Risk Monitoring:** This rename is SEPARATE from the two-tier risk monitoring changes. Don't confuse:
   - **This document:** Agent naming (SCA→TCA, SDA→CMA)
   - **TWO_TIER_RISK_MONITORING_IMPLEMENTATION_PLAN.md:** Architecture changes for cost optimization

3. **Incremental Commits:** Consider making separate commits for:
   - Directory/file renames
   - Code changes
   - Thesis changes
   - Documentation changes

4. **Backward Compatibility:** If you have production data or external integrations, consider:
   - Keeping alias routes: `/api/v1/agents/sca` → redirects to `/api/v1/agents/tca`
   - Database migration script for existing records
   - Deprecation warnings in API responses

---

**End of Guide**
