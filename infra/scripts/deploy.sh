#!/usr/bin/env bash

set -euo pipefail

GIT_SHA=$1
if [[ -z "$GIT_SHA" ]]; then
  echo "Usage: $0 <GIT_SHA>"
  exit 1
fi

echo "[deploy.sh] Starting deployment for GIT_SHA: $GIT_SHA"

# 1. Docker login to GHCR
echo "[deploy.sh] Logging into GHCR..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
echo "[deploy.sh] GHCR login successful."

# 2. Pull images
echo "[deploy.sh] Pulling backend image: ghcr.io/gigahidjrikaaa/UGM-AICare/backend:$GIT_SHA"
docker pull ghcr.io/gigahidjrikaaa/UGM-AICare/backend:"$GIT_SHA"
echo "[deploy.sh] Pulling frontend image: ghcr.io/gigahidjrikaaa/UGM-AICare/frontend:$GIT_SHA"
docker pull ghcr.io/gigahidjrikaaa/UGM-AICare/frontend:"$GIT_SHA"
echo "[deploy.sh] Images pulled successfully."

# 3. Write/refresh .env from secret if provided
if [[ -n "${ENV_FILE_PRODUCTION:-}" ]]; then
  echo "[deploy.sh] Writing .env file from ENV_FILE_PRODUCTION secret..."
  echo -e "$ENV_FILE_PRODUCTION" > .env
  echo "[deploy.sh] .env file written."
else
  echo "[deploy.sh] ENV_FILE_PRODUCTION secret not provided, assuming .env exists or is not needed."
fi

# 4. Run DB migrations
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

# Execute the migration script
./infra/scripts/migrate.sh
echo "[deploy.sh] Database migrations completed."

# 5. Bring up services with docker compose
echo "[deploy.sh] Bringing up services with docker-compose.prod.yml..."
# Stop and remove old containers, then start new ones
docker compose -f infra/compose/docker-compose.prod.yml down || true # Ignore errors if containers don't exist

# Pass GIT_SHA as environment variable to docker compose
GIT_SHA="$GIT_SHA" docker compose -f infra/compose/docker-compose.prod.yml up -d
echo "[deploy.sh] Services started."

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
