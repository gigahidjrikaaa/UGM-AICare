#!/usr/bin/env bash

set -euo pipefail

GIT_SHA=$1
DEPLOY_MONITORING=${2:-false}  # Optional second argument to deploy monitoring

if [[ -z "$GIT_SHA" ]]; then
  echo "Usage: $0 <GIT_SHA> [DEPLOY_MONITORING]"
  echo "  GIT_SHA: Git commit SHA to deploy"
  echo "  DEPLOY_MONITORING: 'true' to deploy monitoring stack (default: false)"
  exit 1
fi

echo "[deploy.sh] Starting deployment for GIT_SHA: $GIT_SHA"
echo "[deploy.sh] Deploy monitoring: $DEPLOY_MONITORING"

# 1. Clean up disk space before deployment
echo "[deploy.sh] Checking disk space..."
df -h / | awk 'NR==1 || /\/$/'

echo "[deploy.sh] Cleaning up Docker resources to free disk space..."
# Remove stopped containers
docker container prune -f || true
# Remove dangling images (untagged)
docker image prune -f || true
# Remove unused networks
docker network prune -f || true
# Remove build cache (keep recent layers)
docker builder prune -f --keep-storage=5GB || true

echo "[deploy.sh] Disk space after cleanup:"
df -h / | awk 'NR==1 || /\/$/'

# 2. Docker login to GHCR
echo "[deploy.sh] Logging into GHCR..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
echo "[deploy.sh] GHCR login successful."

# 2. Pull images
# Convert repository owner to lowercase (Docker requires lowercase)
# Extract ONLY the owner part (in case full repo path was passed)
GHCR_REPOSITORY_OWNER_RAW=${GHCR_REPOSITORY_OWNER:-gigahidjrikaaa}
# Remove any repository name if accidentally included (gigahidjrikaaa/UGM-AICare -> gigahidjrikaaa)
GHCR_REPOSITORY_OWNER_CLEAN=$(echo "$GHCR_REPOSITORY_OWNER_RAW" | cut -d'/' -f1)
# Convert to lowercase
GHCR_REPOSITORY_OWNER_LOWER=$(echo "$GHCR_REPOSITORY_OWNER_CLEAN" | tr '[:upper:]' '[:lower:]')

# Image names: ghcr.io/owner/image:tag (NOT ghcr.io/owner/repo/image:tag)
BACKEND_IMAGE="ghcr.io/${GHCR_REPOSITORY_OWNER_LOWER}/backend:${GIT_SHA}"
FRONTEND_IMAGE="ghcr.io/${GHCR_REPOSITORY_OWNER_LOWER}/frontend:${GIT_SHA}"

echo "[deploy.sh] Pulling backend image: $BACKEND_IMAGE"
docker pull "$BACKEND_IMAGE"
echo "[deploy.sh] Pulling frontend image: $FRONTEND_IMAGE"
docker pull "$FRONTEND_IMAGE"
echo "[deploy.sh] Images pulled successfully."

# Clean up old images after pulling new ones (keep last 3 versions)
echo "[deploy.sh] Removing old backend images (keeping last 3)..."
docker images "ghcr.io/${GHCR_REPOSITORY_OWNER_LOWER}/backend" --format "{{.ID}} {{.Tag}}" | \
  grep -v "latest" | grep -v "$GIT_SHA" | tail -n +4 | awk '{print $1}' | xargs -r docker rmi -f || true

echo "[deploy.sh] Removing old frontend images (keeping last 3)..."
docker images "ghcr.io/${GHCR_REPOSITORY_OWNER_LOWER}/frontend" --format "{{.ID}} {{.Tag}}" | \
  grep -v "latest" | grep -v "$GIT_SHA" | tail -n +4 | awk '{print $1}' | xargs -r docker rmi -f || true

# 3. Write/refresh .env from secret if provided
if [[ -n "${ENV_FILE_PRODUCTION:-}" ]]; then
  echo "[deploy.sh] Writing .env file from ENV_FILE_PRODUCTION secret..."
  echo -e "$ENV_FILE_PRODUCTION" > .env
  echo "[deploy.sh] .env file written."
else
  echo "[deploy.sh] ENV_FILE_PRODUCTION secret not provided, assuming .env exists or is not needed."
fi

# 4. Bring up services with docker compose (moved before migrations)
echo "[deploy.sh] Bringing up services with docker-compose.prod.yml..."

# Export environment variables for docker compose
export GIT_SHA="$GIT_SHA"
export GHCR_REPOSITORY_OWNER="$GHCR_REPOSITORY_OWNER_LOWER"

# Load all variables from .env file so docker-compose can use them
# Use a safer method that handles comments, empty lines, and malformed entries
if [[ -f ".env" ]]; then
  echo "[deploy.sh] Loading environment variables from .env..."
  set -a  # Automatically export all variables
  # Only source lines that are valid key=value pairs (ignore comments and empty lines)
  while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue
    # Only export if line contains '=' and looks like a valid assignment
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line"
    fi
  done < .env
  set +a  # Stop auto-exporting
fi

# Stop and remove old containers, then start new ones
docker compose -f infra/compose/docker-compose.prod.yml down || true # Ignore errors if containers don't exist

# Clean up stopped containers before starting new ones
echo "[deploy.sh] Cleaning up stopped containers..."
docker container prune -f || true

# Start new containers (pass --env-file to use root .env)
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env up -d
echo "[deploy.sh] Services started."

# Start monitoring stack if requested
if [[ "$DEPLOY_MONITORING" == "true" ]]; then
  echo "[deploy.sh] Starting monitoring stack..."
  
  # Check if langfuse_db exists, create if not
  echo "[deploy.sh] Checking if langfuse_db exists..."
  DB_EXISTS=$(docker compose -f infra/compose/docker-compose.prod.yml exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1 FROM pg_database WHERE datname='langfuse_db'" 2>/dev/null || echo "0")
  
  if [[ "$DB_EXISTS" != "1" ]]; then
    echo "[deploy.sh] Creating langfuse_db database..."
    docker compose -f infra/compose/docker-compose.prod.yml exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "CREATE DATABASE langfuse_db;" || true
    echo "[deploy.sh] langfuse_db database created."
  else
    echo "[deploy.sh] langfuse_db database already exists."
  fi
  
  # Start monitoring services
  docker compose -f infra/compose/docker-compose.prod.yml -f infra/compose/docker-compose.prod-monitoring.yml --env-file .env up -d
  echo "[deploy.sh] Monitoring stack started."
  
  # Wait for monitoring services to be ready
  echo "[deploy.sh] Waiting for monitoring services to be ready..."
  sleep 15
  
  # Check Elasticsearch health
  echo "[deploy.sh] Checking Elasticsearch health..."
  ELASTICSEARCH_READY=false
  for i in $(seq 1 12); do
    if curl -s http://localhost:8250/_cluster/health > /dev/null 2>&1; then
      echo "[deploy.sh] Elasticsearch is ready."
      ELASTICSEARCH_READY=true
      break
    fi
    echo "[deploy.sh] Waiting for Elasticsearch... ($i/12)"
    sleep 5
  done
  
  if [[ "$ELASTICSEARCH_READY" == "false" ]]; then
    echo "[deploy.sh] WARNING: Elasticsearch not ready after timeout. Check logs: docker logs ugm_aicare_elasticsearch_prod"
  fi
  
  # Check Prometheus health
  echo "[deploy.sh] Checking Prometheus health..."
  PROMETHEUS_READY=false
  for i in $(seq 1 6); do
    if curl -s http://localhost:8255/-/healthy > /dev/null 2>&1; then
      echo "[deploy.sh] Prometheus is ready."
      PROMETHEUS_READY=true
      break
    fi
    echo "[deploy.sh] Waiting for Prometheus... ($i/6)"
    sleep 5
  done
  
  if [[ "$PROMETHEUS_READY" == "false" ]]; then
    echo "[deploy.sh] WARNING: Prometheus not ready after timeout. Check logs: docker logs ugm_aicare_prometheus_prod"
  fi
  
  # Check Langfuse health
  echo "[deploy.sh] Checking Langfuse health..."
  LANGFUSE_READY=false
  for i in $(seq 1 12); do
    if curl -s http://localhost:8262/api/public/health > /dev/null 2>&1; then
      echo "[deploy.sh] Langfuse is ready."
      LANGFUSE_READY=true
      break
    fi
    echo "[deploy.sh] Waiting for Langfuse... ($i/12)"
    sleep 5
  done
  
  if [[ "$LANGFUSE_READY" == "false" ]]; then
    echo "[deploy.sh] WARNING: Langfuse not ready after timeout. Check logs: docker logs ugm_aicare_langfuse_prod"
  fi
  
  echo "[deploy.sh] Monitoring stack health checks completed."
fi

# Wait for database to be ready
echo "[deploy.sh] Waiting for database to be ready..."
MAX_DB_WAIT=30
DB_READY=false
for i in $(seq 1 $MAX_DB_WAIT); do
  if docker compose -f infra/compose/docker-compose.prod.yml exec -T db pg_isready -U "${POSTGRES_USER:-postgres}" > /dev/null 2>&1; then
    echo "[deploy.sh] Database is ready."
    DB_READY=true
    break
  fi
  echo "[deploy.sh] Waiting for database... ($i/$MAX_DB_WAIT)"
  sleep 2
done

if [[ "$DB_READY" == "false" ]]; then
  echo "[deploy.sh] ERROR: Database failed to become ready after ${MAX_DB_WAIT} attempts."
  echo "[deploy.sh] Showing database logs:"
  docker compose -f infra/compose/docker-compose.prod.yml logs db --tail 50
  exit 1
fi

# Wait for backend container to be ready
echo "[deploy.sh] Waiting for backend container to be ready..."
MAX_BACKEND_WAIT=30
BACKEND_READY=false
for i in $(seq 1 $MAX_BACKEND_WAIT); do
  if docker compose -f infra/compose/docker-compose.prod.yml exec -T backend echo "ready" > /dev/null 2>&1; then
    echo "[deploy.sh] Backend container is ready."
    BACKEND_READY=true
    break
  fi
  echo "[deploy.sh] Waiting for backend container... ($i/$MAX_BACKEND_WAIT)"
  sleep 2
done

if [[ "$BACKEND_READY" == "false" ]]; then
  echo "[deploy.sh] ERROR: Backend container failed to become ready."
  echo "[deploy.sh] Showing backend logs:"
  docker compose -f infra/compose/docker-compose.prod.yml logs backend --tail 50
  exit 1
fi

# 5. Run DB migrations (after containers are up)
echo "[deploy.sh] Running database migrations..."
# Extract DATABASE_URL from .env if it exists
if [[ -f ".env" ]]; then
  DB_URL_FROM_ENV=$(grep -E '^DATABASE_URL=' .env | sed -E 's/^DATABASE_URL=(.*)/\1/' | tr -d '\r')
  if [[ -n "$DB_URL_FROM_ENV" ]]; then
    export DATABASE_URL="$DB_URL_FROM_ENV"
    echo "[deploy.sh] Exported DATABASE_URL from .env for migration."
  else
    echo "[deploy.sh] Warning: DATABASE_URL not found in .env. Migration might fail if not set elsewhere."
  fi
fi

# Execute the safe migration script (will run inside Docker container)
# This handles both fresh databases and existing schemas gracefully
chmod +x ./infra/scripts/migrate-safe.sh
if ./infra/scripts/migrate-safe.sh; then
  echo "[deploy.sh] Database migrations completed successfully."
else
  echo "[deploy.sh] ERROR: Database migration failed!"
  echo "[deploy.sh] Showing backend logs:"
  docker compose -f infra/compose/docker-compose.prod.yml logs backend --tail 100
  exit 1
fi

# 6. Health check endpoints
echo "[deploy.sh] Performing health checks..."
# Example health checks (replace with actual application endpoints)
# For backend:
BACKEND_HEALTH_URL="http://localhost:8000/health" # Assuming /health endpoint exists
FRONTEND_HEALTH_URL="http://localhost:4000" # Assuming frontend serves on root

HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=10
HEALTH_CHECK_SUCCESS=false

for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
  echo "[deploy.sh] Attempt $i: Checking backend health at $BACKEND_HEALTH_URL..."
  if curl -s -f "$BACKEND_HEALTH_URL" > /dev/null; then
    echo "[deploy.sh] Backend health check passed."
    HEALTH_CHECK_SUCCESS=true
    break
  else
    echo "[deploy.sh] Backend health check failed. Retrying in $HEALTH_CHECK_INTERVAL seconds..."
    sleep $HEALTH_CHECK_INTERVAL
  fi
done

if [[ "$HEALTH_CHECK_SUCCESS" == "false" ]]; then
  echo "[deploy.sh] ERROR: Backend health check failed after multiple retries."
  exit 1
fi

HEALTH_CHECK_SUCCESS=false
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
  echo "[deploy.sh] Attempt $i: Checking frontend health at $FRONTEND_HEALTH_URL..."
  if curl -s -f "$FRONTEND_HEALTH_URL" > /dev/null; then
    echo "[deploy.sh] Frontend health check passed."
    HEALTH_CHECK_SUCCESS=true
    break
  else
    echo "[deploy.sh] Frontend health check failed. Retrying in $HEALTH_CHECK_INTERVAL seconds..."
    sleep $HEALTH_CHECK_INTERVAL
  fi
done

if [[ "$HEALTH_CHECK_SUCCESS" == "false" ]]; then
  echo "[deploy.sh] ERROR: Frontend health check failed after multiple retries."
  exit 1
fi

echo "[deploy.sh] All health checks passed. Deployment successful!"

# Display access information
echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
echo "Application:"
echo "  • Backend:  http://localhost:8000"
echo "  • Frontend: http://localhost:4000"
echo ""

if [[ "$DEPLOY_MONITORING" == "true" ]]; then
  echo "Monitoring Stack:"
  echo "  • Kibana (Logs):       http://localhost:8254"
  echo "  • Grafana (Metrics):   http://localhost:8256 (admin/admin123)"
  echo "  • Prometheus:          http://localhost:8255"
  echo "  • Langfuse (Traces):   http://localhost:8262"
  echo "  • AlertManager:        http://localhost:8261"
  echo ""
  echo "Next Steps for Langfuse:"
  echo "  1. Access http://localhost:8262"
  echo "  2. Create account and project"
  echo "  3. Generate API keys from Settings"
  echo "  4. Update .env with LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY"
  echo "  5. Restart backend: docker compose -f infra/compose/docker-compose.prod.yml restart backend"
  echo ""
fi

echo "========================================="
