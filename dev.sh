#!/usr/bin/env bash
# Development helper script for UGM-AICare
# Primary: ./dev.sh local  - Run backend + frontend locally (fast iteration)
# Docker:  ./dev.sh prod   - Simulate production Docker deployment

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

load_env() {
  local env_file="$PROJECT_DIR/.env"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  else
    echo "⚠️  WARNING: .env not found at $env_file" >&2
  fi
}

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not found. Install Docker Desktop." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Start Docker Desktop." >&2
    exit 1
  fi
}

resolve_python() {
  # Prioritize workspace root venv (where dependencies are installed)
  local candidates=(
    "$PROJECT_DIR/../.venv/Scripts/python.exe"
    "$PROJECT_DIR/.venv/Scripts/python.exe"
    "$PROJECT_DIR/backend/.venv/Scripts/python.exe"
  )
  for candidate in "${candidates[@]}"; do
    [[ -x "$candidate" ]] && echo "$candidate" && return 0
  done
  command -v python3 2>/dev/null || command -v python 2>/dev/null || return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# LOCAL: Run backend + frontend directly (no Docker)
# ─────────────────────────────────────────────────────────────────────────────

run_local() {
  load_env

  local backend_port="${BACKEND_EXTERNAL_PORT:-22001}"
  local frontend_port="${FRONTEND_EXTERNAL_PORT:-22000}"
  local backend_origin="http://localhost:${backend_port}"
  local frontend_origin="http://localhost:${frontend_port}"

  # Rewrite Docker URLs to localhost
  rewrite_url() {
    local val="${1:-}" fallback="${2:-}"
    [[ -z "$val" || "$val" == *"://backend"* || "$val" == *"://frontend"* ]] && echo "$fallback" || echo "$val"
  }

  export INTERNAL_API_URL="$(rewrite_url "${INTERNAL_API_URL:-}" "$backend_origin")"
  export NEXT_PUBLIC_API_URL="$(rewrite_url "${NEXT_PUBLIC_API_URL:-}" "$backend_origin")"
  export NEXT_PUBLIC_BACKEND_BASE="$(rewrite_url "${NEXT_PUBLIC_BACKEND_BASE:-}" "$backend_origin")"
  export BACKEND_URL="$(rewrite_url "${BACKEND_URL:-}" "$backend_origin")"
  export NEXTAUTH_URL="$(rewrite_url "${NEXTAUTH_URL:-}" "$frontend_origin")"
  export COOKIE_SECURE="${COOKIE_SECURE:-false}"
  export COOKIE_SAMESITE="${COOKIE_SAMESITE:-lax}"
  
  # Enable UTF-8 mode for Python (fixes emoji logging on Windows)
  export PYTHONUTF8=1
  export PYTHONIOENCODING=utf-8

  # Validate Python
  local python_bin
  if ! python_bin="$(resolve_python)"; then
    echo "❌ Python not found. Install Python 3." >&2
    exit 1
  fi

  if ! "$python_bin" -c "import uvicorn" >/dev/null 2>&1; then
    echo "❌ Backend dependencies missing. Run:" >&2
    echo "   $python_bin -m pip install -r backend/requirements.txt" >&2
    exit 1
  fi

  # Validate npm
  if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm not found. Install Node.js." >&2
    exit 1
  fi

  echo "┌─────────────────────────────────────────┐"
  echo "│  🚀 LOCAL Development Mode             │"
  echo "├─────────────────────────────────────────┤"
  echo "│  Backend:  http://localhost:${backend_port}      │"
  echo "│  Frontend: http://localhost:${frontend_port}      │"
  echo "└─────────────────────────────────────────┘"
  echo ""

  # Set Windows console to UTF-8 mode if on Windows (for emoji support in logs)
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    chcp.com 65001 >/dev/null 2>&1 || true
  fi

  # Kill any existing processes on the ports
  echo "Cleaning up any existing processes on ports ${backend_port} and ${frontend_port}..."
  for port in "$backend_port" "$frontend_port"; do
    local pids=$(netstat -ano 2>/dev/null | grep ":${port}" | awk '{print $5}' | sort -u | grep -v "0")
    for pid in $pids; do
      taskkill //F //PID "$pid" 2>/dev/null || true
    done
  done

  # Check if --separate-terminals flag is passed or on Windows
  local use_separate_terminals=false
  if [[ "${1:-}" == "--separate" || "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    use_separate_terminals=true
  fi

  if [[ "$use_separate_terminals" == "true" ]]; then
    echo "Starting backend and frontend in separate terminals..."
    echo ""
    
    # On Windows (Git Bash/MSYS2), use mintty or start command
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
      # Create temporary scripts for each process
      local backend_script=$(mktemp --suffix=.sh)
      local frontend_script=$(mktemp --suffix=.sh)
      
      # Determine venv activation script path - prefer workspace root .venv first
      local venv_activate=""
      if [[ -f "$PROJECT_DIR/../.venv/Scripts/activate" ]]; then
        venv_activate="$PROJECT_DIR/../.venv/Scripts/activate"
      elif [[ -f "$PROJECT_DIR/.venv/Scripts/activate" ]]; then
        venv_activate="$PROJECT_DIR/.venv/Scripts/activate"
      elif [[ -f "$PROJECT_DIR/backend/.venv/Scripts/activate" ]]; then
        venv_activate="$PROJECT_DIR/backend/.venv/Scripts/activate"
      fi
      
      cat > "$backend_script" <<EOF
#!/usr/bin/env bash
cd "$PROJECT_DIR/backend"
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8
chcp.com 65001 2>/dev/null || true

# Cleanup function for when terminal is closed
cleanup() {
  echo ""
  echo "Shutting down backend..."
  # Kill any child processes
  pkill -P \$\$ 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

# Activate virtual environment
if [[ -f "$venv_activate" ]]; then
  source "$venv_activate"
  echo "✓ Virtual environment activated"
fi

echo ""
echo "🔧 UGM-AICare Backend Server"
echo "=============================="
echo "URL: http://localhost:${backend_port}"
echo ""
python -m uvicorn app.main:app --host 127.0.0.1 --port "$backend_port" --reload
EOF
      
      cat > "$frontend_script" <<EOF
#!/usr/bin/env bash
cd "$PROJECT_DIR/frontend"
chcp.com 65001 2>/dev/null || true

# Cleanup function for when terminal is closed
cleanup() {
  echo ""
  echo "Shutting down frontend..."
  pkill -P \$\$ 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

echo "🎨 UGM-AICare Frontend Server"
echo "=============================="
echo "URL: http://localhost:${frontend_port}"
echo ""
npm run dev -- -p "$frontend_port"
EOF
      
      chmod +x "$backend_script" "$frontend_script"
      
      # Launch in new mintty terminals (Git Bash)
      mintty --title "UGM-AICare Backend" --exec bash "$backend_script" &
      mintty --title "UGM-AICare Frontend" --exec bash "$frontend_script" &
      
      echo "✅ Started backend and frontend in separate terminals."
      echo "   Close the terminal windows to stop the servers."
      echo ""
      echo "   Backend:  http://localhost:${backend_port}"
      echo "   Frontend: http://localhost:${frontend_port}"
      
      # Clean up temp scripts after a delay
      (sleep 5 && rm -f "$backend_script" "$frontend_script") &
      
    else
      # On Linux/macOS, try gnome-terminal, xterm, or Terminal.app
      echo "Separate terminals not supported on this OS. Running inline."
      use_separate_terminals=false
    fi
  fi
  
  # Fallback: run in same terminal with background processes
  if [[ "$use_separate_terminals" == "false" ]]; then
    echo "Press Ctrl+C to stop both servers."
    echo ""
    
    # Start backend
    (
      cd "$PROJECT_DIR/backend"
      "$python_bin" -m uvicorn app.main:app --host 127.0.0.1 --port "$backend_port" --reload
    ) &
    local backend_pid=$!

    # Start frontend
    (
      cd "$PROJECT_DIR/frontend"
      npm run dev -- -p "$frontend_port"
    ) &
    local frontend_pid=$!

    cleanup() {
      echo ""
      echo "Stopping..."
      kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
      wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
    }
    trap cleanup INT TERM

    wait -n "$backend_pid" "$frontend_pid" 2>/dev/null || true
    cleanup
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Docker Compose Helpers
# ─────────────────────────────────────────────────────────────────────────────

dc() {
  (cd "$PROJECT_DIR" && docker compose --env-file .env -f docker-compose.base.yml "$@")
}

dc_dev()  { dc -f docker-compose.dev.yml "$@"; }
dc_prod() { dc -f docker-compose.prod.yml "$@"; }

# ─────────────────────────────────────────────────────────────────────────────
# Commands
# ─────────────────────────────────────────────────────────────────────────────

show_help() {
  cat << 'EOF'
UGM-AICare Development Script

Usage: ./dev.sh <command>

Primary Commands:
  local              Run backend + frontend locally with hot reload
                     On Windows (Git Bash): automatically opens separate terminals
  local --separate   Force separate terminal windows (Windows only)
  prod               Start production Docker containers

Docker Commands:
  up            Start dev Docker containers
  down          Stop Docker containers  
  logs [svc]    Follow container logs
  build         Build Docker images
  restart       Restart containers
  status        Show container status
  clean         Stop + remove all containers and volumes

Examples:
  ./dev.sh local          # Start local dev (separate terminals on Windows)
  ./dev.sh prod           # Simulate production deployment
  ./dev.sh logs backend   # View backend logs
EOF
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  # Primary commands
  local)
    run_local "$@"
    ;;
  prod)
    ensure_docker
    echo "🚀 Starting PRODUCTION Docker containers..."
    dc_prod up -d --build "$@"
    echo ""
    dc_prod ps
    ;;

  # Docker dev commands  
  up)
    ensure_docker
    echo "🚀 Starting DEV Docker containers..."
    dc_dev up -d "$@"
    ;;
  down)
    ensure_docker
    dc_dev down "$@"
    dc_prod down 2>/dev/null || true
    ;;
  logs)
    ensure_docker
    dc_dev logs -f "$@" 2>/dev/null || dc_prod logs -f "$@"
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
    echo "DEV containers:"
    dc_dev ps 2>/dev/null || true
    echo ""
    echo "PROD containers:"
    dc_prod ps 2>/dev/null || true
    ;;
  clean)
    ensure_docker
    echo "🧹 Cleaning up all containers..."
    dc_dev down -v --remove-orphans 2>/dev/null || true
    dc_prod down -v --remove-orphans 2>/dev/null || true
    ;;

  help|--help|-h|"")
    show_help
    ;;
  *)
    echo "❌ Unknown command: $cmd" >&2
    echo "Run: ./dev.sh help" >&2
    exit 2
    ;;
esac
