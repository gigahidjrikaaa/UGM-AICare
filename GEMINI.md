# GEMINI.md - UGM-AICare Project Context

## Project Overview

This repository contains the UGM-AICare project, a sophisticated, AI-powered mental health support system designed for university environments. The core of the project is "Aika," an empathetic AI chatbot. The system is evolving into a proactive mental health framework using a "3-Agent System" (Analytics, Intervention, Triage) to identify trends and deliver timely support.

The project is a monorepo composed of three main parts:

* **Frontend:** A Next.js admin dashboard and user interface.
* **Backend:** A FastAPI application that serves as the core API and AI logic hub.
* **Blockchain:** A Hardhat project for managing NFT-based achievement badges on the Polygon Amoy testnet.

## Key Technologies

* **Frontend:** Next.js 15+, TypeScript, React 19, Tailwind CSS 4, NextAuth.js, Ethers.js
* **Backend:** Python 3.9+, FastAPI, SQLAlchemy 2+, PostgreSQL, Redis
* **AI/LLM:** LangChain, Google Gemini, Gemma 3 (self-hosted), LangGraph
* **Blockchain:** Solidity, Hardhat, OpenZeppelin Contracts
* **Deployment:** Vercel (Frontend), Render (Backend), Docker is also used.

## Building and Running the Project

To ensure all services work together as expected, the recommended method for running the project is using Docker Compose. This handles the setup for the frontend, backend, database, and Redis.

### Recommended: Docker Compose

This is the primary method for testing and development.

1. **Environment Files:**
    * Create a `.env` file in the root directory by copying `env.example`. This file will be used by Docker Compose to supply environment variables to all services.
    * Ensure the variables in this root `.env` file are correctly configured for the database, Redis, and API keys.

2. **Run Docker Compose:**
    * Execute the following command from the root of the project:

    ```bash
    docker compose up --build -d
    ```

    * This command will build the images for the services and run them in detached mode.

### Manual Setup (Alternative)

If you prefer to run each service manually, follow these steps.

#### 1. Backend (FastAPI)

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up the .env file (copy from env.example)
cp .env.example .env
# Edit .env with your database, Redis, and API key credentials

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend (Next.js)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Set up the .env.local file (copy from env.example)
cp env.example .env.local
# Edit .env.local with your backend URL and NextAuth secrets

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:4000`.

#### 3. Blockchain (Hardhat)

```bash
# Navigate to the blockchain directory
cd blockchain

# Install dependencies
npm install

# Start a local Hardhat node
npx hardhat node
```

This will start a local Ethereum node at `http://127.0.0.1:8545/`.

## Development Conventions

* **Monorepo Structure:** The project is organized as a monorepo with clear separation between `frontend`, `backend`, and `blockchain`.
* **Authentication:** Authentication is handled by NextAuth.js on the frontend, which communicates with the FastAPI backend to synchronize user data. Backend routes are protected using JWT.
* **Database:** PostgreSQL is the primary database, with migrations managed by Alembic. Redis is used for caching and session management.
* **AI Logic:** The core AI and agent logic is implemented in the backend using LangChain and LangGraph, connecting to LLM providers like Google Gemini.
* **Styling:** The frontend uses Tailwind CSS for styling.
* **Typing:** The project enforces strict typing with TypeScript on the frontend and Python type hints with Pydantic on the backend.
