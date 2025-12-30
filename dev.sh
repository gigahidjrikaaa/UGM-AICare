#!/usr/bin/env bash
# Development helper script for UGM-AICare (app-only stack)
# Uses root compose files: docker-compose.base.yml + docker-compose.{dev,preprod,prod}.yml

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ensure_docker() {
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
}

load_env_if_present() {
  local env_file="$PROJECT_DIR/.env"

  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  else
    echo "⚠️  WARNING: .env not found at $env_file" >&2
    echo "    Some local runs may fail due to missing environment variables." >&2
  fi
}

resolve_python() {
  local candidates=(
    "$PROJECT_DIR/../.venv/Scripts/python.exe"
    "$PROJECT_DIR/.venv/Scripts/python.exe"
    "$PROJECT_DIR/backend/.venv/Scripts/python.exe"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi

  return 1
}

run_local_no_reload() {
  load_env_if_present

  local backend_port="${BACKEND_EXTERNAL_PORT:-22001}"
  local frontend_port="${FRONTEND_EXTERNAL_PORT:-22000}"

  local python_bin
  if ! python_bin="$(resolve_python)"; then
    echo "❌ ERROR: Python not found. Install Python 3 and ensure it's on PATH." >&2
    exit 1
  fi

  echo "Using Python: $python_bin"

  if ! "$python_bin" -c "import uvicorn; import bs4" >/dev/null 2>&1; then
    echo "❌ ERROR: Backend dependencies are missing for: $python_bin" >&2
    echo "Run this once to install backend deps into that environment:" >&2
    echo "  \"$python_bin\" -m pip install -r \"$PROJECT_DIR/backend/requirements.txt\"" >&2
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "❌ ERROR: npm not found. Install Node.js (which includes npm)." >&2
    exit 1
  fi

  echo "Starting LOCAL (no reload):"
  echo "- Backend:  http://localhost:${backend_port}"
  echo "- Frontend: http://localhost:${frontend_port}"
  echo "Press Ctrl+C to stop."

  (
    cd "$PROJECT_DIR/backend"
    "$python_bin" -m uvicorn app.main:app --host 127.0.0.1 --port "$backend_port"
  ) &
  local backend_pid=$!

  (
    cd "$PROJECT_DIR/frontend"
    rm -rf .next
    npm run build
    npm run start -- -p "$frontend_port"
  ) &
  local frontend_pid=$!

  cleanup() {
    echo "Stopping local processes..."
    kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
    wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
  }

  trap cleanup INT TERM

  set +e
  wait -n "$backend_pid" "$frontend_pid"
  local exit_code=$?
  set -e

  cleanup
  exit "$exit_code"
}

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
  echo "  up            Start DEV (no reload; stable default)"
  echo "  down          Stop DEV"
  echo "  logs [svc]    Follow logs (default: all)"
  echo "  build         Build images (DEV compose)"
  echo "  restart [svc] Restart services"
  echo "  status        Show container status"
  echo "  preprod       Start PREPROD (no hot reload)"
  echo "  prod          Start PROD (production config)"
  echo "  clean         Stop + remove containers (DEV compose)"
  echo "  local         Run backend+frontend locally (no reload)"
  echo "  help          Show this help"
  echo ""
  echo "Examples:"
  echo "  ./dev.sh up"
  echo "  ./dev.sh logs backend"
  echo "  ./dev.sh preprod"
  echo "  ./dev.sh prod"
  echo "  ./dev.sh local"
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  up)
    ensure_docker
    echo "Starting DEV (backend + frontend)..."
    dc_dev up -d "$@"
    ;;
  down)
    ensure_docker
    dc_dev down "$@"
    ;;
  logs)
    ensure_docker
    dc_dev logs -f "$@"
    ;;
  build)
    ensure_docker
    dc_dev build "$@"
    ;;
  restart)
    ensure_docker
    dc_dev restart "$@"
    ;;
  status)
    ensure_docker
    dc_dev ps "$@"
    ;;
  preprod)
    ensure_docker
    echo "Starting PREPROD (production builds)..."
    dc_preprod up -d "$@"
    ;;
  prod)
    ensure_docker
    echo "Starting PROD (production config)..."
    dc_prod up -d "$@"
    ;;
  clean)
    ensure_docker
    dc_dev down -v --remove-orphans "$@"
    ;;
  local)
    run_local_no_reload
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
