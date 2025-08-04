# Development Workflow Guide

## Environment Setup

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 16
- Redis 7

### Local Development

#### **Clone and Setup**

```bash
git clone https://github.com/yourusername/UGM-AICare.git
cd UGM-AICare
cp .env.example .env
# Configure environment variables
```

#### **Backend Setup**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

#### **Frontend Setup**

```bash
cd frontend
pnpm install
pnpm dev
```

#### **Services via Docker**

```bash
docker compose up -d db redis
```

## Code Patterns

### Frontend Patterns

- **Components**: Functional components with TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism theme
- **State**: React Context for global state, hooks for local
- **API Calls**: Centralized in `services/api.ts`

### Backend Patterns

- **Routes**: RESTful design with FastAPI routers
- **Dependencies**: Dependency injection for auth/db
- **Models**: SQLAlchemy ORM with type hints
- **Services**: Business logic separated from routes

## Testing Approach

### Student Features

1. Test chat flow with both LLM providers
2. Verify badge earning logic
3. Check journal CRUD operations
4. Validate activity tracking

### Admin Features

1. Test analytics data aggregation
2. Verify user management permissions
3. Check report generation
4. Validate intervention alerts

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis connection verified
- [ ] LLM API keys valid
- [ ] N8N webhooks configured
- [ ] SSL certificates installed
- [ ] Monitoring enabled
