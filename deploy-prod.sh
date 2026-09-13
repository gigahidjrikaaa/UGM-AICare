#!/usr/bin/env bash
# deploy-prod.sh
# Minimal production deployment helper (app-only stack: backend + frontend).
#
# Uses the per-service compose files that ship in this repository:
#   backend/docker-compose.yml
#   frontend/docker-compose.yml
#
# Configure managed services (DATABASE_URL, REDIS_URL, MINIO_*) via each
# service's env file (backend/.env, frontend/.env.local). A root .env is used
# for compose variable interpolation only when present.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMPOSE_FILES=(
  -f "$PROJECT_DIR/backend/docker-compose.yml"
  -f "$PROJECT_DIR/frontend/docker-compose.yml"
)

_dc() {
  local env_args=()
  if [ -f "$PROJECT_DIR/.env" ]; then
    env_args=(--env-file "$PROJECT_DIR/.env")
  fi
  (cd "$PROJECT_DIR" && docker compose "${env_args[@]+"${env_args[@]}"}" "${COMPOSE_FILES[@]}" "$@")
}

dc_prod() { _dc "$@"; }

show_help() {
  echo "UGM-AICare Production Deployment Script (app-only)"
  echo ""
  echo "Usage: ./deploy-prod.sh [command]"
  echo ""
  echo "Commands:"
  echo "  deploy     Pull latest code, build and restart (default)"
  echo "  restart    Restart services without rebuilding"
  echo "  logs       Follow logs for backend + frontend"
  echo "  status     Show running containers"
  echo "  help       Show this help message"
  echo ""
  echo "Notes:"
  echo "  - Composes backend/docker-compose.yml + frontend/docker-compose.yml."
  echo "  - Configure managed services via backend/.env and frontend/.env.local."
  echo "  - The bundled monitoring stack has been removed from this repository."
}

cmd="${1:-deploy}"

case "$cmd" in
  deploy)
    echo "Starting production deployment/restart..."
    echo "Pulling latest code from Git..."
    git -C "$PROJECT_DIR" pull

    echo "Building and restarting Docker containers..."
    dc_prod up --build -d --remove-orphans

    echo "Showing backend/frontend logs (30s)..."
    timeout 30s dc_prod logs -f backend frontend || true
    ;;

  restart)
    echo "Restarting production services..."
    dc_prod restart
    ;;

  logs)
    dc_prod logs -f backend frontend
    ;;

  status)
    dc_prod ps
    ;;

  help|--help|-h)
    show_help
    ;;

  *)
    echo "❌ Unknown command: $cmd" >&2
    echo "Run: ./deploy-prod.sh help" >&2
    exit 2
    ;;
esac
