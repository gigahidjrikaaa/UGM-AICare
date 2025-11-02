#!/usr/bin/env bash

set -euo pipefail

echo "[migrate.sh] Starting database migration..."

# Ensure DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[migrate.sh] ERROR: DATABASE_URL environment variable is required." >&2
  exit 1
fi

echo "[migrate.sh] DATABASE_URL is set: ${DATABASE_URL%@*}@***" # Hide password

# Check if we should run migrations inside Docker container or directly
# If backend container is running, use it; otherwise run directly (for local dev)
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -n 1)

if [[ -n "$BACKEND_CONTAINER" ]]; then
  echo "[migrate.sh] Running migrations inside Docker container: $BACKEND_CONTAINER"
  
  # Run alembic upgrade inside the container
  # Don't override DATABASE_URL - use the one already set in the container by docker compose
  docker exec "$BACKEND_CONTAINER" \
    bash -c "cd /app && alembic upgrade head"
  
  echo "[migrate.sh] Database migration completed (via Docker)."
else
  echo "[migrate.sh] No backend container found, running migrations directly on host..."
  echo "[migrate.sh] This requires Python, alembic, and dependencies installed locally."
  
  # Navigate to project root if not already there
  if [[ ! -f "scripts/run_migrations.sh" ]]; then
    echo "[migrate.sh] ERROR: scripts/run_migrations.sh not found. Are you in the project root?" >&2
    exit 1
  fi
  
  # Execute the main migration script
  echo "[migrate.sh] Executing scripts/run_migrations.sh..."
  export DATABASE_URL="${DATABASE_URL}"
  bash scripts/run_migrations.sh
  
  echo "[migrate.sh] Database migration completed (direct)."
fi
