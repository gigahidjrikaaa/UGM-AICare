#!/usr/bin/env bash

set -euo pipefail

GIT_SHA=$1
if [[ -z "$GIT_SHA" ]]; then
  echo "Usage: $0 <GIT_SHA>"
  exit 1
fi

echo "[deploy.sh] Starting deployment for GIT_SHA: $GIT_SHA"

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
# Stop and remove old containers, then start new ones
docker compose -f infra/compose/docker-compose.prod.yml down || true # Ignore errors if containers don't exist

# Clean up stopped containers before starting new ones
echo "[deploy.sh] Cleaning up stopped containers..."
docker container prune -f || true

# Export environment variables for docker compose
export GIT_SHA="$GIT_SHA"
export GHCR_REPOSITORY_OWNER="$GHCR_REPOSITORY_OWNER_LOWER"

# Start new containers
docker compose -f infra/compose/docker-compose.prod.yml up -d
echo "[deploy.sh] Services started."

# Wait a bit for containers to be ready
echo "[deploy.sh] Waiting for containers to be ready..."
sleep 5

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

# Execute the migration script (will run inside Docker container)
./infra/scripts/migrate.sh
echo "[deploy.sh] Database migrations completed."

# 6. Health check endpoints
echo "[deploy.sh] Bringing up services with docker-compose.prod.yml..."
# Stop and remove old containers, then start new ones
docker compose -f infra/compose/docker-compose.prod.yml down || true # Ignore errors if containers don't exist

# Export environment variables for docker compose
export GIT_SHA="$GIT_SHA"
export GHCR_REPOSITORY_OWNER="$GHCR_REPOSITORY_OWNER_LOWER"

# Start new containers
docker compose -f infra/compose/docker-compose.prod.yml up -d
echo "[deploy.sh] Database migrations completed."

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
