# UGM-AICare: Aika - Your Mental Health Companion 🌟

![UGM-AICare Logo](frontend/public/aicare_logo.png)

**Live Demo:** [https://aicare.sumbu.xyz](https://aicare.sumbu.xyz) | **API:** [https://api.aicare.sumbu.xyz](https://api.aicare.sumbu.xyz)

## 🎭 Meet Aika (愛佳)

**Aika** (愛佳 - Love, Excellence) is the unified AI consciousness of UGM-AICare—a meta-agent orchestrator coordinating four specialized agents to provide comprehensive mental health support for university students.

**Key Capabilities:**
- 🎯 **Unified AI Personality**: Consistent experience across chat, admin, and clinical support
- �️ **Crisis Detection**: Real-time safety monitoring with Gemini-based semantic analysis
- 💬 **CBT-Informed Coaching**: Evidence-based interventions via Support Coach Agent (SCA)
- 🗂️ **Case Management**: Clinical escalation and SLA tracking via Service Desk Agent (SDA)
- 📊 **Privacy-First Analytics**: Differential privacy (ε-δ budgets) via Insights Agent (IA)

→ **[Full Architecture Documentation](docs/AIKA_META_AGENT_ARCHITECTURE.md)**

---

## Overview

**UGM-AICare** is a mental health platform for Universitas Gadjah Mada students, featuring a Safety Agent Suite powered by LangGraph and Google Gemini 2.5 API. The system provides 24/7 empathetic support, proactive crisis intervention, and privacy-preserving analytics.

**Deployment:** Hosted on personal VM at [aicare.sumbu.xyz](https://aicare.sumbu.xyz) with automated CI/CD via GitHub Actions.

## 🌟 Core Features

### 🛡️ Safety Agent Suite (LangGraph Orchestration)

**Agent Workflow:**
```
User Message → STA (Triage) → [Low/Moderate] → SCA (Coach) → Intervention Plans
                            → [High/Critical] → SDA (Escalate) → Clinical Staff
Analytics → IA (Privacy-Preserving) → Differential Privacy Reports
```

**Four Specialized Agents:**

| Agent | Purpose | Key Features |
|-------|---------|-------------|
| **🚨 STA** (Safety Triage) | Crisis detection | Gemini-based semantic analysis, 3-tier assessment (rules→Gemini→cache), PII redaction, 0-5ms response for crisis keywords |
| **💬 SCA** (Support Coach) | CBT coaching | Evidence-based interventions, AI-generated action plans, progress tracking, therapeutic exercises |
| **🗂️ SDA** (Service Desk) | Case management | Clinical escalation, SLA monitoring, workflow automation, case timelines |
| **🔍 IA** (Insights) | Analytics | k-anonymity (k≥5), differential privacy (ε-δ budgets), consent-aware, population-level insights |

**Orchestration:** LangGraph StateGraph with conditional routing, real-time execution tracking, and graceful error recovery.

### 🤖 Aika Meta-Agent

**Intelligent Routing:**
```
User Message → Aika (Classify Intent) → Route to Specialist
                                       ├─ STA: Safety assessment
                                       ├─ SCA: CBT coaching  
                                       ├─ SDA: Case management
                                       └─ IA: Analytics (admin)
```

- **Unified Personality**: Single AI consciousness across all interactions
- **Smart Caching**: 60%+ reduction in redundant assessments via conversation state tracking
- **Context Preservation**: Full history maintained across agent handoffs
- **Crisis Monitoring**: Real-time safety checks on every message
### 🧠 Crisis Detection (Gemini-Based, No ML Dependencies)

**3-Tier Assessment Strategy** (75% fewer API calls):
1. **Rules (0-5ms)**: Instant detection of crisis keywords and safe greetings
2. **Gemini (200-500ms)**: Semantic analysis for ambiguous messages with chain-of-thought reasoning
3. **Cache**: Skip redundant assessments in stable conversations

**Performance:**
- Accuracy: 90%+ with deep semantic understanding
- Average latency: ~100ms (75% instant rule-based, 25% Gemini API)
- Languages: English + Indonesian (native support, no separate models)
- Explainability: 8-step chain-of-thought reasoning for each assessment

**Why Gemini vs ML Models:**
- ✅ No PyTorch/ONNX dependencies (500MB+ saved, 5-10min faster builds)
- ✅ Better semantic context understanding (tone, meaning, cultural nuance)
- ✅ Zero model maintenance (no training, no ONNX exports)
- ✅ Continuous improvements via API updates

**Safety:** PII redaction before API calls, fail-closed design, complete audit trails, human oversight for escalations.

→ **[Migration Documentation](docs/PYTORCH_TO_GEMINI_MIGRATION.md)**

### 📚 Other Features

- **CBT Interventions**: AI-generated action plans, progress tracking, therapeutic exercises
- **NFT Badges**: ERC1155 achievement tokens on EDU Chain testnet
- **Journaling**: Dated entries with streak tracking
- **Admin Dashboard**: Case management, SLA monitoring, privacy-preserving analytics
- **Multi-Language**: English and Bahasa Indonesia
- **Authentication**: NextAuth.js with Google OAuth, JWT/JWE tokens

## 🛠️ Tech Stack

**Frontend:** Next.js 15 (TypeScript, React 19, Tailwind CSS 4) • NextAuth.js • Axios • Ethers.js (Web3)

**Backend:** FastAPI (Python 3.9+) • SQLAlchemy 2 + PostgreSQL • Redis • Google Gemini 2.5 API • LangGraph

**Blockchain:** Hardhat • Solidity 0.8.28 • OpenZeppelin • ERC1155 NFTs (EDU Chain testnet)

**Deployment:** Docker + Docker Compose • Personal VM (aicare.sumbu.xyz) • GitHub Actions CI/CD • Nginx reverse proxy

**Monitoring:** Prometheus + Grafana • ELK Stack (Elasticsearch, Logstash, Kibana) • Langfuse (LLM observability)

## 🏗️ Project Structure

```
├── backend/          # FastAPI API with Safety Agent Suite
│   ├── app/
│   │   ├── agents/   # STA, SCA, SDA, IA (LangGraph orchestration)
│   │   ├── routes/   # API endpoints
│   │   ├── models/   # Database ORM models
│   │   └── services/ # Business logic
│   ├── alembic/      # Database migrations
│   └── tests/        # API & service tests
│
├── frontend/         # Next.js 15 web application
│   └── src/
│       ├── app/      # App Router (main, admin routes)
│       ├── components/ # React UI components
│       └── services/ # API clients
│
├── blockchain/       # Hardhat smart contracts (ERC1155 NFTs)
│   ├── contracts/    # Solidity contracts
│   └── scripts/      # Deployment scripts
│
└── docs/             # Project documentation
```

→ **[Full Structure Details](PROJECT_SINGLE_SOURCE_OF_TRUTH.md)**

## 🚀 Getting Started

### Production Deployment

**Live Instance:** [https://aicare.sumbu.xyz](https://aicare.sumbu.xyz) (Personal VM)

The platform is deployed using Docker Compose on a personal VM with automated CI/CD via GitHub Actions:
- **Frontend**: Next.js app at `aicare.sumbu.xyz`
- **Backend API**: FastAPI at `api.aicare.sumbu.xyz`  
- **Reverse Proxy**: Nginx with SSL/TLS (Let's Encrypt)
- **CI/CD**: Automated build, test, scan (Trivy), and deployment on push to `main`

→ **[Deployment Guide](infra/README.md)** • **[CI/CD Documentation](docs/CI_CD_FLOW_DIAGRAM.md)**

### Local Development

**Prerequisites:** Node.js 18+, Python 3.9+, PostgreSQL, Redis, Docker (optional)

**Quick Start with Docker:**
```bash
git clone https://github.com/gigahidjrikaaa/UGM-AICare.git
cd UGM-AICare
cp .env.example .env  # Configure environment variables
./dev.sh up           # Start development environment
```

**Access:**
- Frontend: http://localhost:4000
- Backend API: http://localhost:8000 (Docs: /docs)
- Monitoring: `./dev.sh monitoring start` (Kibana: :8254, Grafana: :8256)

**Manual Setup:**
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install && npm run dev

# Blockchain (optional)
cd blockchain
npm install && npx hardhat node
```

→ **[Detailed Setup Guide](docs/BACKEND_BUILD_TEST_GUIDE.md)**

## 🔑 Architecture Overview

**Aika Meta-Agent Orchestration:**
- **Intent Classification**: Routes messages to specialist agents (STA/SCA/SDA/IA)
- **Conversation Caching**: 60%+ reduction in redundant assessments
- **Crisis Detection**: Gemini-based 3-tier assessment (rules → semantic → cache)
- **Intervention System**: CBT-informed coaching with trackable action plans

**Key Technologies:**
- **LangGraph**: Agent orchestration with conditional routing
- **Google Gemini 2.5**: Semantic analysis and chain-of-thought reasoning
- **SQLAlchemy 2**: Async ORM with event-centric design
- **NextAuth.js**: JWT/JWE authentication with RBAC
- **ERC1155**: Achievement NFT badges on EDU Chain testnet

→ **[Full Architecture Details](docs/AIKA_META_AGENT_ARCHITECTURE.md)** • **[Gemini Migration](docs/PYTORCH_TO_GEMINI_MIGRATION.md)**

## 📊 Monitoring & Observability

**Production Stack:**
- **ELK Stack**: Centralized logging (Elasticsearch, Logstash, Kibana, Filebeat)
- **Prometheus + Grafana**: Metrics, alerts, dashboards (50+ custom metrics)
- **Langfuse**: LLM tracing and observability

**Quick Start:**
```bash
./dev.sh up-all                    # Start app + monitoring
./dev.sh monitoring start          # Start monitoring only
```

**Access Points:**
- Kibana (Logs): http://localhost:8254
- Grafana (Metrics): http://localhost:8256 (admin/admin123)
- Prometheus: http://localhost:8255

→ **[Complete Monitoring Guide](docs/PRODUCTION_MONITORING.md)** • **[Quick Reference](docs/MONITORING_QUICK_REFERENCE.md)**

## 🧪 Testing

**Backend:**
```bash
cd backend
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm test
```

**Smart Contracts:**
```bash
cd blockchain
npx hardhat test
```

## 📖 Documentation

- **[Architecture](docs/AIKA_META_AGENT_ARCHITECTURE.md)** - Aika meta-agent orchestration
- **[Crisis Detection](docs/PYTORCH_TO_GEMINI_MIGRATION.md)** - Gemini-based classifier migration
- **[CI/CD Pipeline](docs/CI_CD_FLOW_DIAGRAM.md)** - GitHub Actions deployment
- **[Deployment Guide](infra/README.md)** - VM setup and production deployment
- **[Monitoring Stack](docs/PRODUCTION_MONITORING.md)** - ELK + Prometheus + Grafana
- **[Ethics & Guidelines](docs/mental-health-ai-guidelines.md)** - Mental health AI best practices
- **[Project Reference](PROJECT_SINGLE_SOURCE_OF_TRUTH.md)** - Complete technical reference

## 🆕 Recent Updates (November 2025)

**✅ Migrated to Gemini-Based Crisis Detection**
- Removed PyTorch/ONNX (500MB+ saved, 5-10min faster builds)
- 3-tier assessment: Rules (0-5ms) → Gemini (200-500ms) → Cache
- 90%+ accuracy with chain-of-thought reasoning and explainability
- 75% fewer API calls via intelligent pre-screening

**✅ Aika Meta-Agent Orchestration**
- Unified AI personality coordinating STA/SCA/SDA/IA specialists
- Intent classification with intelligent routing
- 60%+ reduction in redundant assessments via conversation caching
- Seamless context preservation across agent handoffs

→ **[Migration Docs](docs/PYTORCH_TO_GEMINI_MIGRATION.md)** • **[Aika Architecture](docs/AIKA_META_AGENT_ARCHITECTURE.md)**

## 🤝 Contributing

Contact [Giga Hidjrika Aura Adkhy](https://linkedin.com/in/gigahidjrikaaa) for approval, then fork and submit PRs with tests and documentation.

**Guidelines:** TypeScript strict mode, async/await patterns, type-safe APIs, comprehensive error handling, no hardcoded secrets.

→ **[CI/CD Test Behavior](docs/CI_CD_TEST_BEHAVIOR.md)**

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Special thanks to the UGM AICare team and contributors for their hard work and dedication
- Thanks to the open-source community for the libraries and tools that made this project possible
- Indonesian Ministry of Health for JUKNIS P2 Gangguan Mental Emosional clinical guidelines

## 📞 Contacts

- **Main Developer:** [Giga Hidjrika Aura Adkhy](https://linkedin.com/in/gigahidjrikaaa)
- **Developers:** [Ega Rizky Setiawan](https://linkedin.com/in/egarizkysetiawan)
- **Advisor:** [Bimo Sunarfri Hartono](https://ugm.ac.id/en/lecturers/bimo-sunarfri-hartono)

---

Built with ❤️ for university mental health by the UGM AICare Team
