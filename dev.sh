#!/usr/bin/env bash
# Development helper script for UGM-AICare (app-only stack)
# Uses root compose files: docker-compose.base.yml + docker-compose.{dev,preprod,prod}.yml

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ ERROR: docker not found. Install Docker Desktop." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ ERROR: Docker is not running. Start Docker Desktop." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ ERROR: Docker Compose plugin not available (docker compose)." >&2
  exit 1
fi

_dc() {
  (cd "$PROJECT_DIR" && docker compose --env-file .env "$@")
}

dc_dev() {
  _dc -f docker-compose.base.yml -f docker-compose.dev.yml "$@"
}

dc_preprod() {
  _dc -f docker-compose.base.yml -f docker-compose.preprod.yml "$@"
}

dc_prod() {
  _dc -f docker-compose.base.yml -f docker-compose.prod.yml "$@"
}

show_help() {
  echo "UGM-AICare Docker Helper (app-only)"
  echo ""
  echo "Usage: ./dev.sh [command]"
  echo ""
  echo "Commands:"
  echo "  up            Start DEV (hot reload)"
  echo "  down          Stop DEV"
  echo "  logs [svc]    Follow logs (default: all)"
  echo "  build         Build images (DEV compose)"
  echo "  restart [svc] Restart services"
  echo "  status        Show container status"
  echo "  preprod       Start PREPROD (no hot reload)"
  echo "  prod          Start PROD (production config)"
  echo "  clean         Stop + remove containers (DEV compose)"
  echo "  help          Show this help"
  echo ""
  echo "Examples:"
  echo "  ./dev.sh up"
  echo "  ./dev.sh logs backend"
  echo "  ./dev.sh preprod"
  echo "  ./dev.sh prod"
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  up)
     echo "Starting DEV (backend + frontend)..."
    dc_dev up -d "$@"
    ;;
  down)
    dc_dev down "$@"
    ;;
  logs)
    dc_dev logs -f "$@"
    ;;
  build)
    dc_dev build "$@"
    ;;
  restart)
    dc_dev restart "$@"
    ;;
  status)
    dc_dev ps "$@"
    ;;
  preprod)
     echo "Starting PREPROD (production builds)..."
    dc_preprod up -d "$@"
    ;;
  prod)
     echo "Starting PROD (production config)..."
    dc_prod up -d "$@"
    ;;
  clean)
    dc_dev down -v --remove-orphans "$@"
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "❌ Unknown command: $cmd" >&2
    echo "Run: ./dev.sh help" >&2
    exit 2
    ;;
esac
