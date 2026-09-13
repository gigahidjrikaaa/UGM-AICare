---
sidebar_position: 1
---

# Setup &amp; Infrastructure

## Prerequisites

Before running the project locally, ensure you have:

- **Docker Desktop** (v24+) and **Docker Compose** v2
- **Node.js** v18+ and **pnpm** (for frontend development)
- **Python** 3.11+ (for backend development without Docker)
- A **Google Cloud** project with the Gemini API enabled
- A **Supabase** project (or a local PostgreSQL instance)
- A **Redis** instance (Upstash is recommended for cloud; Docker for local)

---

## Quick Start (Docker)

The full stack (backend + frontend) can be started with one command. The database and Redis are treated as **external services** configured via `.env` — they are not part of the Compose file.

```bash
# Copy environment files first
cp UGM-AICare/backend/env.example UGM-AICare/backend/.env
cp UGM-AICare/frontend/env.example UGM-AICare/frontend/.env.local

# Start the app stack (per-service compose files)
docker compose \
  -f backend/docker-compose.yml \
  -f frontend/docker-compose.yml \
  up -d

# Or use the local dev convenience script
./run_dev.sh local
```

Once running:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:22000` |
| Backend API | `http://localhost:22001` |
| API docs (Swagger) | `http://localhost:22001/docs` |

---

## Running Without Docker

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 22001 --reload
```

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

---

## Environment Variables

Both services read configuration from `.env` files.

### Critical Backend Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/aicare

# Redis
REDIS_URL=redis://localhost:6379

# Google AI
GOOGLE_API_KEY=your_gemini_api_key

# Security
JWT_SECRET_KEY=your-secret-key-here
EMAIL_ENCRYPTION_KEY=your-encryption-key-here
INTERNAL_API_KEY=your-internal-api-key
SECRET_KEY=your_jwt_secret_minimum_32_characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Privacy
USER_HASH_SECRET=your_hmac_secret_for_pseudonymisation

# Google OAuth (Required for authentication)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Langfuse (observability - optional but recommended)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# MinIO (Optional - has defaults)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=content-resources
MINIO_SECURE=false

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CHAT_PER_MINUTE_STUDENT=10
RATE_LIMIT_CHAT_PER_HOUR_STUDENT=100
RATE_LIMIT_CHAT_PER_DAY_STUDENT=500

# Caching
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600

# URLs (adjust for your domain)
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com/api
ALLOWED_ORIGINS=https://your-domain.com
```

### Critical Frontend Variables

```bash
NEXTAUTH_URL=http://localhost:22000
NEXTAUTH_SECRET=your_nextauth_secret
NEXT_PUBLIC_API_URL=http://localhost:22001
```

---

## VM Deployment

### One-Time VM Setup

Run these commands **once** when provisioning a new VM:

```bash
# 1. SSH into VM
ssh deployuser@your_vm_ip

# 2. Navigate to project
cd /path/to/UGM-AICare

# 3. Create .env
cp env.example .env
nano .env  # Edit with actual values

# 4. Create alembic.ini (REQUIRED — this file is gitignored!)
cat > backend/alembic.ini << 'EOF'
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url =

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
EOF

# 5. Create logs directory
mkdir -p backend/logs
chmod 755 backend/logs

# 6. Make scripts executable
chmod +x scripts/*.sh
chmod +x deploy-prod.sh

# 7. Verify setup
[[ -f .env ]] && echo "✅ .env exists" || echo "❌ .env missing"
[[ -f backend/alembic.ini ]] && echo "✅ alembic.ini exists" || echo "❌ alembic.ini missing"
[[ -d backend/logs ]] && echo "✅ logs/ exists" || echo "❌ logs/ missing"
```

### Gitignored Files Reference

Several files required for production are **not committed** to the repository:

| File | Location | Required? | Auto-created? | How to create |
| --- | --- | --- | --- | --- |
| `.env` | `UGM-AICare/.env` | Yes | Yes (by CI/CD) | From `ENV_FILE_PRODUCTION` secret |
| `alembic.ini` | `backend/alembic.ini` | **Yes** | **No** | **Manually create** (see above) |
| `alembic_supa.ini` | `backend/alembic_supa.ini` | Optional | No | Copy from local if using Supabase |
| `logs/` | `backend/logs/` | Optional | Yes (by app) | `mkdir -p backend/logs` |

:::warning
`alembic.ini` is **not** auto-created by CI/CD. You must manually create it on the VM. Without it, database migrations will fail.
:::

### Production Deploy

Deploy to production using the provided script:

```bash
./deploy-prod.sh
```

This script:

1. Pulls the latest images from the container registry
2. Runs `alembic upgrade head` as a pre-deploy step
3. Performs a rolling restart (zero downtime)
4. Runs a health check — rolls back automatically if the health endpoint fails

### CI/CD Integration

The GitHub Actions workflow auto-creates `.env` from the `ENV_FILE_PRODUCTION` secret:

```yaml
# In .github/workflows/ci.yml (deploy job)
- name: Deploy to VM
  script: |
    if [ -n "${{ secrets.ENV_FILE_PRODUCTION }}" ]; then
      echo "${{ secrets.ENV_FILE_PRODUCTION }}" > .env
    fi
```

**But `alembic.ini` is NOT auto-created!** You must manually create it on the VM.

---

## Split-Subdomain Architecture

The production environment isolates the presentation layer from the API and data layer using distinct subdomains, managed through a reverse proxy.

```
Internet → Cloudflare WAF / DNS (TLS termination)
  ├── aicare.sumbu.xyz  → Frontend container (Next.js, port 3000)
  └── api.aicare.sumbu.xyz → Backend container (FastAPI, port 8000)
```

```mermaid
graph TD
  Client[Client Device / Browser] -->|HTTPS| Cloudflare[Cloudflare WAF / DNS]

  Cloudflare -->|aicare.sumbu.xyz| FrontendProxy[Frontend Reverse Proxy]
  Cloudflare -->|api.aicare.sumbu.xyz| BackendProxy[Backend Reverse Proxy]

  subgraph "Presentation Layer (Next.js)"
  FrontendProxy --> UIContainer[UI Service]
  end

  subgraph "API Layer (FastAPI)"
  BackendProxy --> APIContainer[API Service]
  BackendProxy --> WSContainer[WebSocket Service]
  end

  UIContainer -.->|Client-side fetches| Cloudflare
  APIContainer --> PG[(PostgreSQL)]
  APIContainer --> RD[(Redis)]
  WSContainer --> RD

  classDef external fill:#f9f9f9,stroke:#333,stroke-width:2px;
  class Cloudflare,Client external;
```

---

## Alembic Setup

`alembic.ini` is gitignored because it can contain sensitive database URLs. The backend reads the database URL from the `DATABASE_URL` environment variable at runtime — **do not hardcode it** in `alembic.ini`.

To copy from a local development machine:

```bash
scp backend/alembic.ini deployuser@your_vm:/path/to/UGM-AICare/backend/
```

Or create it from scratch using the commands in the [VM Deployment](#vm-deployment) section above.

---

## Database Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Generate a new migration after changing a SQLAlchemy model
alembic revision --autogenerate -m "your migration description"

# Roll back the last migration
alembic downgrade -1
```

---

## Observability

| Tool | URL | What It Shows |
| --- | --- | --- |
| **FastAPI Swagger UI** | `/docs` | All API endpoints, schemas, try-it-now |
| **Langfuse** | `cloud.langfuse.com` | Every LLM trace, tool call, latency, token cost |
| **Grafana** | Internal dashboard | Infrastructure metrics — CPU, memory, DB connections, Redis latency |

---

## Troubleshooting

| Error | Cause | Fix |
| --- | --- | --- |
| `Alembic configuration not found: backend/alembic.ini` | `alembic.ini` is gitignored and not on VM | Create `backend/alembic.ini` using the commands in [VM Deployment](#vm-deployment) |
| `alembic: command not found` | Migrations run before containers start | Fixed in latest deployment script — migrations now run inside Docker. Pull latest. |
| `DATABASE_URL is not set` | `.env` file missing or incomplete | Ensure `.env` contains `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `SOME_VAR: command not found` during `.env` loading | Malformed `.env` (missing `=` or unquoted values) | Check for lines without `=`, empty declarations, or unquoted special characters |
| `Permission denied: backend/logs/` | Logs directory missing or wrong permissions | `mkdir -p backend/logs && chmod 755 backend/logs` |
| `JWT_SECRET_KEY environment variable is not set!` | Critical env vars not passed to container | Add `JWT_SECRET_KEY`, `GOOGLE_GENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to `.env` |
| `EMAIL_ENCRYPTION_KEY: Field required` | Pydantic Settings validation error | Add `EMAIL_ENCRYPTION_KEY=$(openssl rand -hex 32)` to `.env` |
| `No 'script_location' key found` (Alembic) | `alembic.ini` missing or malformed in Docker | The Dockerfile auto-generates it if missing. Rebuild: `git pull origin main` |
| `connection to server at localhost, port 5432 failed` | Migration script using host `DATABASE_URL` inside container | Ensure `DATABASE_URL` points to the managed DB hostname, not `localhost`. Pull latest deploy scripts. |
