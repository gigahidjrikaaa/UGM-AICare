# UGM-AICare: Agentic Mental Health Support System 🌟

![UGM-AICare Logo](frontend/public/aicare_logo.png)

**Live Demo:** [https://aicare.sumbu.xyz](https://aicare.sumbu.xyz) | **API:** [https://api.aicare.sumbu.xyz](https://api.aicare.sumbu.xyz)

---

## 📖 Chapter 1: Introduction & Problem Statement

### 1.1 The Challenge
University mental health services globally face a "reactive capacity crisis." Traditional support systems are:
- **Reactive:** Waiting for students to reach crisis points before intervention.
- **Under-Resourced:** High counselor-to-student ratios (often 1:1000+).
- **Data-Constrained:** Lacking real-time insights into population-level mental health trends.

### 1.2 Mission & Solution Goal
**UGM-AICare** aims to transform university mental health support from a reactive service to a **proactive, agentic ecosystem**.
- **Proactive Intervention:** Early detection of distress signals using semantic analysis.
- **Agentic Automation:** Coordinated AI agents handling triage, coaching, and case management.
- **Privacy-First:** Institution-grade privacy with k-anonymity and differential privacy.

---

## 🧠 Chapter 2: BDI Architecture & Agent Roles

### 2.1 Agentic Architecture Principles
Unlike traditional chatbots, UGM-AICare uses a **Multi-Agent System (MAS)** based on the **Belief-Desire-Intention (BDI)** model.
- **Belief (State):** What the agent knows (User Profile, Conversation History, Risk Level).
- **Desire (Goal):** What the agent wants to achieve (Ensure Safety, Reduce Anxiety).
- **Intention (Action):** What the agent decides to do (Execute Triage, Generate Plan).

### 2.2 Specialized Agent Roles
The system is orchestrated by **Aika**, a Meta-Agent that coordinates four specialized sub-agents:

| Agent | Role | BDI Mapping |
|-------|------|-------------|
| **🤖 Aika** (Meta-Agent) | **Unified Orchestrator** | **B:** User intent requires specialization.<br>**D:** Seamless user experience.<br>**I:** Route to STA/SCA/SDA/IA. |
| **🛡️ STA** (Safety Triage) | **First Responder** | **B:** Potential risk in message.<br>**D:** Prevent harm.<br>**I:** Assess severity (0-3) & redact PII. |
| **🧠 TCA** (Therapeutic Coach) | **Support Provider** | **B:** Moderate distress detected.<br>**D:** Alleviate anxiety.<br>**I:** Generate CBT intervention plan. |
| **📋 CMA** (Case Management) | **Resource Coordinator** | **B:** High-risk/Crisis detected.<br>**D:** Connect to human.<br>**I:** Create case & assign counselor. |
| **📊 IA** (Insights) | **Strategic Analyst** | **B:** Data holds valuable trends.<br>**D:** Protect privacy.<br>**I:** Execute k-anonymous queries. |

---

## 🔬 Chapter 3: Methodology & Governance

### 3.1 Research Questions (RQ)
This project is guided by three core research questions:
- **RQ1 (Proactive Safety):** Can an agentic system detect crisis signals with high sensitivity (>90%) and low false negatives?
- **RQ2 (Functional Correctness):** Can a LangGraph-based orchestrator reliably route intents without hallucinations?
- **RQ3 (Output Quality & Privacy):** Can the system generate clinically valid CBT responses while maintaining k-anonymity?

### 3.2 Clinical Governance
- **Human-in-the-Loop:** Critical risks (Level 3) are strictly escalated to human counselors via CMA.
- **Evidence-Based:** Interventions are grounded in CBT (Cognitive Behavioral Therapy) principles.
- **Consent Ledger:** Immutable audit trail of user consents and withdrawals.

### 3.3 Privacy & Compliance
- **k-Anonymity (k≥5):** Analytics queries never return data sets smaller than 5 individuals.
- **Differential Privacy:** Noise injection (ε-δ budgets) to prevent re-identification.
- **PII Redaction:** All text is scrubbed of names/phones/emails before storage or analysis.

---

## 🛠️ Chapter 4: Implementation Details

### 4.1 Technical Stack
- **Orchestration:** LangGraph (StateGraph, Conditional Edges).
- **Intelligence:** Google Gemini 2.5 (Chain-of-Thought Reasoning).
- **Backend:** FastAPI (Python), SQLAlchemy 2 (Async), Redis.
- **Frontend:** Next.js 15, Tailwind CSS 4, Framer Motion.
- **Blockchain:** EDU Chain (ERC1155) for Achievement Badges.

### 4.2 Crisis Detection Engine
Migrated from PyTorch/BERT to **Gemini 2.5** for superior semantic understanding.
- **Tier 1:** Regex Rules (0-5ms) for immediate keywords.
- **Tier 2:** Gemini Semantic Analysis (200ms) for context.
- **Tier 3:** Conversation Caching for redundant inputs.

### 4.3 Project Structure
```
├── backend/
│   ├── app/agents/       # LangGraph Agent Implementations
│   │   ├── aika/         # Meta-Agent Orchestrator
│   │   ├── sta/          # Safety Triage Agent
│   │   ├── tca/          # Therapeutic Coach Agent
│   │   ├── cma/          # Case Management Agent
│   │   └── ia/           # Insights Agent
│   └── app/routes/       # API Endpoints
├── frontend/             # Next.js Application
│   ├── src/app/admin/    # Admin Dashboard (Monitoring)
│   └── src/components/   # UI Components
└── docs/                 # Architecture Documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL & Redis

### Local Development
```bash
# 1. Clone Repository
git clone https://github.com/gigahidjrikaaa/UGM-AICare.git

# 2. Start Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 3. Start Frontend
cd frontend
npm install && npm run dev
```

---

## 🤝 Contributing & License
**Maintainer:** [Giga Hidjrika Aura Adkhy](https://linkedin.com/in/gigahidjrikaaa)  
**License:** MIT License. See [LICENSE](LICENSE) for details.

*Built with ❤️ for UGM Students.*
