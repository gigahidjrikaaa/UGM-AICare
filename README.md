# UGM-AICare: Aika - Your Mental Health Companion

![UGM-AICare Logo](frontend/public/aicare_logo.png)

## Overview

UGM-AICare is an AI-powered mental health support system developed at Universitas Gadjah Mada. It aims to provide accessible, empathetic conversations and resources to support student well-being, primarily through its core component, Aika, an AI chatbot companion.

This repository contains the monorepo for the UGM-AICare project, including the frontend web application, backend API, blockchain components for rewards, and potentially related AI engine experiments.

## Core Features

* **AI Chatbot (Aika):**
  * Provides empathetic, supportive conversations using Large Language Models (LLMs like Gemini or Llama 3 via TogetherAI).
  * Supports standard conversational flow.
  * Includes guided **Chat Modules** (e.g., Thought Record, Problem Breakdown) with state managed via Redis.
  * Features dynamic loading indicators and intelligent message chunking for readability.
* **User Authentication:**
  * Secure login via Google OAuth (primarily for UGM domains but configurable).
  * Admin login via Credentials provider.
  * Managed using NextAuth with JWT strategy.
* **Journaling:** Allows users to write and save dated journal entries.
* **Activity Tracking & Streaks:** Tracks user activity (chat, journaling) to calculate daily streaks.
* **NFT Achievement Badges:**
  * Awards users with unique NFT badges on the Polygon Amoy testnet for achieving milestones (e.g., activity streaks, journal counts).
  * Uses a custom ERC1155 smart contract (`UGMJournalBadges.sol`).
  * Backend handles minting via `blockchain_utils.py` (though current implementation might need review).
* **DID Wallet Linking:** Users can link their blockchain wallet address (presumably for receiving badges).
* **Feedback System:** Collects user feedback on their experience via a dedicated form/modal.
* **Email Check-ins:** Optional proactive email check-ins for users based on inactivity, managed by APScheduler.
* **Profile Management:** Users can view their profile information and manage settings like email check-ins.
* **Admin Features:** Basic structure for admin roles via NextAuth.

## Tech Stack

* **Monorepo Structure:** Managed potentially via npm/yarn workspaces (implied by structure).
* **Frontend:**
  * Framework: Next.js 15+ (App Router, Turbopack)
  * Language: TypeScript
  * Styling: Tailwind CSS 4, `clsx`, `tailwind-merge`
  * UI Components: React 19, Headless UI, Framer Motion, shadcn/ui (implied by `Button`/`Textarea` structure & `cn`), `react-icons` / `lucide-react`.
  * State Management: React Hooks (`useState`, `useEffect`, `useContext`), Custom Hooks (`useChat`).
  * Authentication: NextAuth.js (v4)
  * Data Fetching: Axios
  * Markdown Rendering: `react-markdown`
  * Web3 Interaction: Ethers.js (v6)
* **Backend:**
  * Framework: FastAPI (Python)
  * Language: Python 3.9+
  * Database ORM: SQLAlchemy 2+
  * Database Migrations: Alembic
  * Database: PostgreSQL
  * Caching/State: Redis (via `redis-py` asyncio)
  * Authentication: JWT (`python-jose`), Passlib
  * LLM Integration: Google Generative AI SDK, `httpx` (for TogetherAI)
  * Task Scheduling: APScheduler (Celery also listed in `requirements.txt` but APScheduler seems used)
  * Web3 Interaction: Web3.py (listed but potentially unused in favor of Ethers.js scripts?)
  * Validation: Pydantic
  * Email: `smtplib`, `email` modules
* **Blockchain:**
  * Framework: Hardhat
  * Language: Solidity (0.8.28)
  * Libraries: OpenZeppelin Contracts, Ethers.js (for scripts)
  * Testing: Hardhat Toolbox (Chai, Mocha, etc.)
  * Network: Polygon Amoy Testnet (configured), EDUChain Testnet (mentioned in `blockchain_utils.py`)
* **AI Engine (Separate Service):**
  * Framework: FastAPI
  * Database: Neo4j
  * Purpose: Seems experimental for knowledge graph context retrieval.

## Project Structure

```.txt
├── backend/          # FastAPI Backend API
│   ├── alembic/      # Alembic migration scripts
│   ├── app/          # Main application source code
│   │   ├── core/       # Core logic (LLM, memory, blockchain, scheduler, etc.)
│   │   ├── database/   # SQLAlchemy setup, base model
│   │   ├── routes/     # API endpoint definitions
│   │   ├── services/   # Business logic services (e.g., user creation)
│   │   ├── utils/      # Utility functions (security, email)
│   │   ├── models.py   # Database ORM models
│   │   ├── schemas.py  # Pydantic data validation models
│   │   ├── main.py     # FastAPI app entrypoint
│   │   └── ...
│   ├── logs/         # Log storage (local)
│   ├── test/         # API tests
│   ├── .env.example  # Example environment variables
│   └── requirements.txt
│
├── blockchain/       # Hardhat Smart Contracts & Scripts
│   ├── contracts/    # Solidity contracts (e.g., UGMJournalBadges.sol)
│   ├── ignition/     # Hardhat Ignition deployment modules
│   ├── metadata/     # NFT metadata JSON files
│   ├── scripts/      # Deployment and interaction scripts
│   ├── test/         # Contract tests
│   ├── hardhat.config.ts
│   └── package.json
│
├── frontend/         # Next.js Frontend Web Application
│   ├── public/       # Static assets (images, fonts)
│   ├── src/          # Main application source code
│   │   ├── app/        # Next.js App Router pages & layouts
│   │   ├── components/ # React components (UI, features, layout)
│   │   ├── context/    # React context providers (e.g., SidebarContext)
│   │   ├── hooks/      # Custom React hooks (e.g., useChat)
│   │   ├── lib/        # Utility functions, constants, auth config
│   │   ├── services/   # API interaction layer
│   │   ├── types/      # TypeScript type definitions
│   │   └── ...
│   ├── .env.local.example # Example environment variables
│   └── package.json
│
├── ai/               # Optional/Experimental AI Engine (FastAPI + Neo4j)
│   └── src/
│
├── .gitignore
└── README.md         # This file
```

## Getting Started

### Prerequisites

* Node.js (v18+ recommended)
* npm or yarn or pnpm
* Python (3.9+ recommended)
* pip and virtualenv (`python -m venv venv`)
* PostgreSQL Server
* Redis Server (v6+ recommended)
* Access keys for:
  * Google Cloud (for OAuth Credentials)
  * LLM Providers (TogetherAI and/or Google Gemini)
  * Redis Cloud (or local connection details)
  * Blockchain Testnet (e.g., Alchemy/Infura API Key for Polygon Amoy) + Private Key for Deployer/Minter Wallet
  * Email Service (e.g., Gmail App Password or Resend API Key if used)

### Setup Steps

1. **Clone Repository:**

    ```bash
    git clone https://github.com/gigahidjrikaaa/UGM-AICare.git
    cd UGM-AICare
    ```

2. **Backend Setup:**

    ```bash
    cd backend
    python -m venv venv
    # Activate venv (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
    pip install -r requirements.txt
    # Create .env file from .env.example and fill in variables (See Environment Variables section)
    cp .env.example .env
    nano .env # Or use your editor
    # Setup PostgreSQL database (create user/db if needed)
    # Run database migrations
    alembic upgrade head
    # Start Redis server if running locally
    cd ..
    ```

3. **Frontend Setup:**

    ```bash
    cd frontend
    npm install # or yarn install / pnpm install
    # Create .env.local file from .env.local.example and fill in variables
    cp .env.local.example .env.local
    nano .env.local # Or use your editor
    cd ..
    ```

4. **Blockchain Setup:**

    ```bash
    cd blockchain
    npm install # or yarn install / pnpm install
    # Create .env file from .env.example and fill in variables
    cp .env.example .env
    nano .env # Or use your editor
    # Compile contracts (optional, deploy script usually does this)
    # npx hardhat compile
    cd ..
    ```

### Running Locally

1. **Start Blockchain Node (Optional but Recommended):**

    ```bash
    cd blockchain
    npx hardhat node
    cd ..
    ```

    *(Note: For interacting with deployed contracts on testnet, this isn't needed)*

2. **Start Backend Server:**

    ```bash
    cd backend
    # Ensure virtualenv is active
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    cd ..
    ```

3. **Start Frontend Server:**

    ```bash
    cd frontend
    npm run dev # Uses Turbopack
    cd ..
    ```

* Frontend usually runs on `http://localhost:3000`
* Backend usually runs on `http://localhost:8000` (API docs at `http://localhost:8000/docs`)
* Hardhat node usually runs on `http://127.0.0.1:8545/`

## Environment Variables

Create the necessary `.env` (for backend/blockchain) and `.env.local` (for frontend) files. Fill them based on the `.env.example` files inside each directory.

## Key Components & Logic

* **Authentication Flow:** `frontend/src/lib/auth.ts` handles NextAuth config, Google Sign-in, JWT/Session callbacks, and calls `backend/app/routes/internal.py` (`/sync-user`) for user DB sync. Backend uses `backend/app/auth_utils.py` to validate tokens and `backend/app/dependencies.py` for route protection.
* **Chat Logic:** `frontend/src/hooks/useChat.ts` manages frontend state, message chunking, variable delays, and loading indicators. It calls `backend/app/routes/chat.py`, which uses `backend/app/core/llm.py` for LLM interaction and `backend/app/core/memory.py` for Redis module state.
* **Database:** `backend/app/models.py` defines SQLAlchemy models. `backend/app/database/__init__.py` handles DB connection. Migrations managed by Alembic (`backend/migrations/`).
* **NFT Badges:** `blockchain/contracts/UGMJournalBadges.sol` is the ERC1155 contract. `backend/app/routes/profile.py` likely triggers minting via `backend/app/core/blockchain_utils.py` (which uses Ethers.js via scripts or potentially Web3.py directly). Hardhat (`blockchain/hardhat.config.ts`, `blockchain/scripts/`) handles deployment/interaction. Frontend fetches badges via `backend/app/routes/summary.py` (`/my-badges`).
* **Layout:** `frontend/src/app/layout.tsx` sets up the root structure, providers, and uses `frontend/src/components/layout/AppLayout.tsx` for the main layout including Header, Sidebar, Footer, conditional blurring, and the global Feedback button/modal logic.

## Deployment

* **Frontend:** Deployed on Vercel (`ugm-ai-care.vercel.app`). Configure environment variables in Vercel project settings.
* **Backend:** Deployed on Render. Configure environment variables, database (PostgreSQL), and Redis service in Render dashboard. Ensure `start.sh` script runs migrations (`alembic upgrade head`) before starting Uvicorn.

## Contributing

We welcome contributions! Please contact the main developer (gigahidjrikaaa) and after getting confirmation, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with clear messages.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

* Special thanks to the UGM AICare team and contributors for their hard work and dedication.
* Thanks to the open-source community for the libraries and tools that made this project possible.

## Contacts

* **Main Developer:** [Giga Hidjrika Aura Adkhy](https://linkedin.com/in/gigahidjrikaaa)
* **Developers:** [Ega Rizky Setiawan](https://linkedin.com/in/egarizkysetiawan)
* **Advisor:** [Bimo Sunarfri Hartono](https://ugm.ac.id/en/lecturers/bimo-sunarfri-hartono)
