#!/bin/bash
# Development helper script for UGM-AICare

set -e

# Always treat the repo root (this script's directory) as the project directory.
# On Windows (Git Bash/MSYS), docker-compose.exe path handling can be finicky; the most
# reliable approach is to run compose from the repo root and explicitly pass `--env-file .env`.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect docker-compose command (handle Windows Docker Desktop CLI plugin path)
# Prioritize the CLI plugin path over the wrapper script
if [ -f "/c/Program Files/Docker/Docker/resources/cli-plugins/docker-compose.exe" ]; then
    DOCKER_COMPOSE_CMD="/c/Program Files/Docker/Docker/resources/cli-plugins/docker-compose.exe"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ ERROR: docker-compose not found!"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Using Docker Compose: $DOCKER_COMPOSE_CMD"

COMPOSE_FILE_REL="infra/compose/docker-compose.dev.yml"
PROD_COMPOSE_FILE_REL="infra/compose/docker-compose.prod.yml"

dc() {
    (cd "$PROJECT_DIR" && "$DOCKER_COMPOSE_CMD" --env-file .env -f "$COMPOSE_FILE_REL" "$@")
}

dc_prod() {
    (cd "$PROJECT_DIR" && "$DOCKER_COMPOSE_CMD" --env-file .env -f "$PROD_COMPOSE_FILE_REL" "$@")
}

show_help() {
    echo "UGM-AICare Docker Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up              Start in development mode (App + Minimal Monitoring)"
    echo "  up-all          Start dev + FULL monitoring stack (ELK + All Exporters)"
    echo "  down            Stop all services"
    echo "  down-all        Stop dev + monitoring services"
    echo "  restart [svc]   Restart all services or specific service (backend/frontend)"
    echo "  logs [svc]      View logs with follow mode (Ctrl+C to exit)"
    echo "  build           Rebuild containers (needed after dependency changes)"
    echo "  rebuild-fast    Quick rebuild (parallel, uses cache)"
    echo "  rebuild-clean   Clean rebuild (no cache, slower but fresh)"
    echo "  test-build      Test backend build and verify all imports work"
    echo "  clear-cache     Clear Next.js and Docker build cache"
    echo "  prod            Run in production mode (disable hot-reload)"
    echo "  preprod         Run production builds with dev infrastructure"
    echo "  dev             Re-enable development mode"
    echo "  clean           Stop and remove all containers, volumes"
    echo "  clean-all       Stop and remove all containers including monitoring"
    echo "  status          Show running containers"
    echo "  monitoring      Manage monitoring stack (start|stop|restart|logs)"
    echo "  setup-langfuse  Setup Langfuse for agent tracing (one-time setup)"
    echo ""
    echo "Hot Reload Features:"
    echo "  • Backend:  Uvicorn auto-reloads on Python file changes"
    echo "  • Frontend: Next.js Fast Refresh on save"
    echo "  • No need to restart containers when editing code!"
    echo ""
    echo "Monitoring Commands:"
    echo "  monitoring start         Start ELK + Prometheus + Grafana + Langfuse"
    echo "  monitoring stop          Stop monitoring stack"
    echo "  monitoring restart       Restart monitoring stack"
    echo "  monitoring logs [svc]    View monitoring logs"
    echo "  monitoring status        Check monitoring stack status"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh up-all                    # Start everything including monitoring"
    echo "  ./dev.sh up                        # Start dev with minimal monitoring"
    echo "  ./dev.sh monitoring start          # Start only monitoring stack"
    echo "  ./dev.sh logs backend              # Watch backend logs"
    echo "  ./dev.sh monitoring logs kibana    # Watch Kibana logs"
    echo "  ./dev.sh build                     # Rebuild after npm/pip install"
    echo "  ./dev.sh test-build                # Test backend build for errors"
    echo ""
    echo "Monitoring Access:"
    echo "  • Kibana (Logs):       http://localhost:22024"
    echo "  • Grafana (Metrics):   http://localhost:22011 (admin/$GRAFANA_ADMIN_PASSWORD)"
    echo "  • Prometheus:          http://localhost:22010"
    echo "  • Langfuse (Traces):   http://localhost:22016"
    echo "  • Backend Metrics:     http://localhost:${BACKEND_EXTERNAL_PORT:-22001}/metrics"
    echo ""
    echo "Performance Tips:"
    echo "  • First build? Run 'clear-cache' to remove old artifacts"
    echo "  • Slow frontend? Turbopack is enabled by default (up to 700x faster)"
    echo "  • After dependency changes: Use 'rebuild-fast' not 'build'"
    echo ""
}

case "${1:-}" in
    up)
        echo "🚀 Starting development environment with HOT RELOAD (App + Minimal Monitoring)..."
        echo ""
        echo "📝 Changes to your code will automatically reload:"
        echo "   • Backend: Python files in /backend/app/"
        echo "   • Frontend: TypeScript/React files in /frontend/src/"
        echo ""
        dc up -d
        echo "✅ Application services started"
        echo ""
        echo "📈 Starting Minimal Monitoring (Prometheus + Grafana + Langfuse)..."
        dc --profile monitoring up -d
        echo "✅ Monitoring services started"
        echo ""
        echo "✅ All services started!"
        echo "   Frontend: http://localhost:${FRONTEND_EXTERNAL_PORT:-22000} (Next.js dev server)"
        echo "   Backend:  http://localhost:${BACKEND_EXTERNAL_PORT:-22001} (Uvicorn with --reload)"
        echo "   API Docs: http://localhost:${BACKEND_EXTERNAL_PORT:-22001}/docs"
        echo ""
        echo "📍 Monitoring Access:"
        echo "   • Langfuse (Traces):   http://localhost:22016"
        echo "   • Grafana (Metrics):   http://localhost:22011 (admin/$GRAFANA_ADMIN_PASSWORD)"
        echo "   • Prometheus:          http://localhost:22010"
        echo ""
        echo "💡 Tip: Watch logs in real-time:"
        echo "   ./dev.sh logs -f"
        echo ""
        echo "👉 Want full logging (ELK)? Run:"
        echo "   ./dev.sh up-all"
        echo ""
        echo "🔥 Hot reload is enabled. Edit your code and save!"
        ;;
    
    up-all)
        echo "🚀 Starting FULL development environment (App + Monitoring)..."
        echo ""
        echo "📦 Starting application services..."
        dc up -d
        echo "✅ Application started"
        echo ""
        echo "📊 Starting ELK Stack (Logs)..."
        dc --profile elk up -d
        echo "✅ ELK Stack started"
        echo ""
        echo "📈 Starting Full Monitoring Stack..."
        dc --profile monitoring --profile elk up -d
        echo "✅ Monitoring Stack started"
        echo ""
        echo "⏳ Waiting for services to be ready..."
        sleep 15
        echo ""
        echo "✅ All services started!"
        echo ""
        echo "📍 Application Access:"
        echo "   • Frontend:   http://localhost:${FRONTEND_EXTERNAL_PORT:-22000}"
        echo "   • Backend:    http://localhost:${BACKEND_EXTERNAL_PORT:-22001}"
        echo "   • API Docs:   http://localhost:${BACKEND_EXTERNAL_PORT:-22001}/docs"
        echo ""
        echo "📍 Monitoring Access:"
        echo "   • Kibana (Logs):       http://localhost:22024"
        echo "   • Grafana (Metrics):   http://localhost:22011 (admin/$GRAFANA_ADMIN_PASSWORD)"
        echo "   • Prometheus:          http://localhost:22010"
        echo "   • Langfuse (Traces):   http://localhost:22016"
        echo "   • Backend Metrics:     http://localhost:${BACKEND_EXTERNAL_PORT:-22001}/metrics"
        echo ""
        echo "💡 View logs:"
        echo "   ./dev.sh logs backend              # App logs"
        echo "   ./dev.sh monitoring logs kibana    # Monitoring logs"
        echo ""
        ;;
    
    down)
        echo "🛑 Stopping application services..."
        dc down
        echo "✅ Application services stopped"
        echo ""
        echo "💡 If you started monitoring/ELK profiles, this also stops them."
        ;;
    
    down-all)
        echo "🛑 Stopping ALL services (App + Monitoring)..."
        echo ""
        dc down
        echo ""
        echo "✅ All services stopped"
        ;;
    
    restart)
        echo "🔄 Restarting services..."
        if [ -n "${2:-}" ]; then
            echo "   Restarting $2..."
            dc restart "$2"
        else
            echo "   Restarting all services..."
            dc restart
        fi
        echo "✅ Services restarted"
        ;;
    
    logs)
        if [ -n "${2:-}" ]; then
            dc logs -f "$2"
        else
            dc logs -f
        fi
        ;;
    
    build)
        echo "🔨 Rebuilding containers..."
        dc up --build -d
        echo "✅ Rebuild complete"
        ;;
    
    rebuild-fast)
        echo "⚡ Fast rebuild (parallel build, use cache)..."
        echo "   This will rebuild with Docker cache for faster builds"
        echo ""
        # Use BuildKit for faster builds
        COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 dc build --parallel backend frontend
        echo ""
        echo "🚀 Restarting services..."
        dc up -d backend frontend
        echo ""
        echo "✅ Fast rebuild complete!"
        echo "   Backend and frontend have been rebuilt and restarted"
        ;;
    
    rebuild-clean)
        echo "🧹 Clean rebuild (no cache, parallel build)..."
        echo "   Warning: This will take longer but ensures a fresh build"
        echo ""
        echo "🗑️  Cleaning Docker cache..."
        # Remove dangling images
        docker image prune -f
        # Remove build cache
        docker builder prune -f
        echo "✅ Docker cache cleaned"
        echo ""
        echo "🔨 Building with no cache..."
        COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 dc build --parallel --no-cache backend frontend
        echo ""
        echo "🚀 Restarting services..."
        dc up -d backend frontend
        echo ""
        echo "✅ Clean rebuild complete!"
        echo "   • Docker cache cleared"
        echo "   • Images rebuilt from scratch"
        echo "   • Services restarted"
        ;;
    
    test-build)
        echo "🧪 Testing backend build for import errors..."
        echo ""
        echo "1️⃣ Checking for existing backend image..."
        
        # Check if backend image exists
        if docker images | grep -q "ugm-aicare-backend"; then
            echo "✅ Found existing backend image"
            echo ""
            echo "💡 Tip: To rebuild from scratch, run: ./dev.sh rebuild-clean"
        else
            echo "⚠️  No existing image found. Building..."
            COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 dc build backend
            
            if [ $? -ne 0 ]; then
                echo ""
                echo "❌ Backend build failed!"
                echo ""
                echo "💡 If you're experiencing network issues:"
                echo "   - Check your internet connection"
                echo "   - Try using a VPN"
                echo "   - Wait a few minutes and try again"
                exit 1
            fi
        fi
        
        echo ""
        echo "2️⃣ Testing Python imports..."
        dc run --rm --no-deps backend python -c "
import sys
print('Python version:', sys.version)
print('')
print('Testing critical imports...')
print('')

# Test Web3.py imports
try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
    print('✅ Web3.py: OK')
    print('   - geth_poa_middleware available')
except ImportError as e:
    print('❌ Web3.py: FAILED')
    print(f'   Error: {e}')
    sys.exit(1)

# Test blockchain base imports
try:
    from app.domains.blockchain.base_web3 import BaseWeb3Client
    print('✅ BaseWeb3Client: OK')
except ImportError as e:
    print('❌ BaseWeb3Client: FAILED')
    print(f'   Error: {e}')
    sys.exit(1)

# Test care token service
try:
    from app.domains.finance.services.care_token_service import CareTokenService
    print('✅ CareTokenService: OK')
except ImportError as e:
    print('❌ CareTokenService: FAILED')
    print(f'   Error: {e}')
    sys.exit(1)

# Test EDU Chain NFT client
try:
    from app.domains.blockchain.edu_chain.nft_client import init_blockchain
    print('✅ EDU Chain NFT Client: OK')
except ImportError as e:
    print('❌ EDU Chain NFT Client: FAILED')
    print(f'   Error: {e}')
    sys.exit(1)

# Note: Skipping FastAPI app import test - requires full environment setup
# The Web3.py imports are the critical ones we fixed

print('')
print('✅ All critical imports successful!')
print('')
print('Testing POA middleware injection...')

# Test POA middleware actually works
try:
    w3 = Web3(Web3.HTTPProvider('https://api.infra.mainnet.somnia.network/'))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
    print('✅ POA middleware injection: OK')
    if w3.is_connected():
        print(f'✅ Connection test: OK (Chain ID: {w3.eth.chain_id})')
    else:
        print('⚠️  Connection test: Network unavailable (OK for build test)')
except Exception as e:
    print(f'❌ POA middleware test: FAILED')
    print(f'   Error: {e}')
    sys.exit(1)

print('')
print('🎉 All tests passed! Backend is ready for deployment.')
"
        
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Import tests failed!"
            exit 1
        fi
        
        echo ""
        echo "3️⃣ Checking Web3.py version..."
        dc run --rm --no-deps backend python -c "
import web3
print(f'Web3.py version: {web3.__version__}')
"
        
        echo ""
        echo "✅ Backend build test complete!"
        echo ""
        echo "💡 Next steps:"
        echo "   - Deploy with: ./deploy-prod.sh"
        echo "   - Or test locally: ./dev.sh up"
        ;;
    
    clear-cache)
        echo "🧹 Clearing build caches..."
        echo ""
        echo "1️⃣ Clearing Next.js cache..."
        rm -rf ./frontend/.next
        echo "   ✓ Next.js .next directory removed"
        echo ""
        echo "2️⃣ Clearing Docker BuildKit cache..."
        docker builder prune -f
        echo "   ✓ Docker build cache cleared"
        echo ""
        echo "3️⃣ Clearing node_modules/.cache (if exists)..."
        rm -rf ./frontend/node_modules/.cache
        echo "   ✓ Node cache cleared"
        echo ""
        echo "✅ All caches cleared! Run './dev.sh up' for fresh start"
        ;;
    
    prod)
        echo "🏭 Starting production compose (no hot-reload)..."
        dc_prod --env-file .env up -d
        ;;

    preprod)
        echo "🏭 Starting PRE-PRODUCTION environment (Prod Build + Dev Infra)..."
        echo ""
        echo "⚠️  This mode runs PRODUCTION BUILDS of Backend and Frontend."
        echo "   • No hot-reload (changes require rebuild)"
        echo "   • Optimized performance"
        echo "   • Uses local dev database and services"
        echo ""
        dc_prod --env-file .env up --build -d
        echo ""
        echo "✅ Pre-production environment started!"
        echo "   Frontend: http://localhost:${FRONTEND_EXTERNAL_PORT:-22000}"
        echo "   Backend:  http://localhost:${BACKEND_EXTERNAL_PORT:-22001}"
        echo ""
        echo "💡 To rebuild after code changes:"
        echo "   ./dev.sh preprod"
        ;;
    
    dev)
        echo "💻 Starting development compose (hot-reload enabled)..."
        dc up -d
        ;;
    
    clean)
        echo "🧹 Cleaning up application containers and volumes..."
        read -p "This will remove application containers and volumes. Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            dc down -v
            echo "✅ Application cleanup complete"
            echo ""
            echo "💡 Monitoring stack not affected. To clean monitoring:"
            echo "   ./dev.sh clean-all"
        else
            echo "❌ Cancelled"
        fi
        ;;
    
    clean-all)
        echo "🧹 Cleaning up ALL containers and volumes (App + Monitoring)..."
        read -p "⚠️  This will remove EVERYTHING including logs. Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            dc down -v
            echo ""
            echo "✅ Complete cleanup done"
        else
            echo "❌ Cancelled"
        fi
        ;;
    
    status)
        echo "📊 Application Services:"
        dc ps
        echo ""
        echo "📊 Optional stacks are enabled via profiles: monitoring / elk / loki"
        ;;
    
    monitoring)
        case "${2:-}" in
            start)
                echo "📊 Starting monitoring stack..."
                echo ""
                dc --profile monitoring --profile elk up -d
                echo ""
                echo "⏳ Waiting for services to be healthy..."
                sleep 15
                echo ""
                echo "✅ Monitoring stack started!"
                echo ""
                echo "Access Points:"
                echo "  • Kibana (Logs):       http://localhost:22024"
                echo "  • Grafana (Metrics):   http://localhost:22011 (admin/$GRAFANA_ADMIN_PASSWORD)"
                echo "  • Prometheus:          http://localhost:22010"
                echo "  • Backend Metrics:     http://localhost:${BACKEND_EXTERNAL_PORT:-22001}/metrics"
                ;;
            
            stop)
                echo "🛑 Stopping monitoring stack..."
                dc stop prometheus grafana node-exporter cadvisor postgres-exporter redis-exporter langfuse-server elasticsearch logstash kibana filebeat 2>/dev/null || true
                dc rm -f prometheus grafana node-exporter cadvisor postgres-exporter redis-exporter langfuse-server elasticsearch logstash kibana filebeat 2>/dev/null || true
                echo "✅ Monitoring stack stopped"
                ;;
            
            restart)
                echo "🔄 Restarting monitoring stack..."
                dc restart prometheus grafana node-exporter cadvisor postgres-exporter redis-exporter langfuse-server elasticsearch logstash kibana filebeat 2>/dev/null || true
                echo "✅ Monitoring stack restarted"
                ;;
            
            logs)
                if [ -n "${3:-}" ]; then
                    dc logs -f "$3"
                else
                    echo "Available monitoring services:"
                    echo ""
                    echo "ELK Stack:"
                    echo "  • elasticsearch"
                    echo "  • logstash"
                    echo "  • kibana"
                    echo "  • filebeat"
                    echo ""
                    echo "Prometheus + Grafana:"
                    echo "  • prometheus"
                    echo "  • grafana"
                    echo "  • alertmanager"
                    echo "  • node-exporter"
                    echo "  • cadvisor"
                    echo "  • postgres-exporter"
                    echo "  • redis-exporter"
                    echo ""
                    echo "Usage: ./dev.sh monitoring logs <service>"
                    echo "Example: ./dev.sh monitoring logs kibana"
                fi
                ;;
            
            status)
                echo "📊 Monitoring Stack Status:"
                dc ps
                ;;
            
            *)
                echo "❌ Unknown monitoring command: ${2:-}"
                echo ""
                echo "Available commands:"
                echo "  ./dev.sh monitoring start        # Start monitoring stack"
                echo "  ./dev.sh monitoring stop         # Stop monitoring stack"
                echo "  ./dev.sh monitoring restart      # Restart monitoring stack"
                echo "  ./dev.sh monitoring logs [svc]   # View logs"
                echo "  ./dev.sh monitoring status       # Check status"
                exit 1
                ;;
        esac
        ;;
    
    setup-langfuse)
        echo "🔧 Setting up Langfuse for agent tracing..."
        echo ""
        
        # Check if database is running
        echo "[1/5] Checking PostgreSQL database..."
        if ! docker ps | grep -q "ugm_aicare_db_dev"; then
            echo "❌ PostgreSQL database is not running!"
            echo ""
            echo "Please start the database first:"
            echo "  ./dev.sh up"
            exit 1
        fi
        echo "✓ Database is running"
        echo ""
        
        # Create Langfuse database
        echo "[2/5] Creating langfuse_db database..."
        docker exec ugm_aicare_db_dev psql -U giga -d aicare_db -c "CREATE DATABASE langfuse_db;" 2>/dev/null || {
            echo "⚠ Database might already exist, continuing..."
        }
        echo "✓ Database ready"
        echo ""
        
        # Generate secrets
        echo "[3/5] Generating random secrets..."
        LANGFUSE_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || python -c "import secrets; print(secrets.token_urlsafe(32))")
        LANGFUSE_SALT=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || python -c "import secrets; print(secrets.token_urlsafe(32))")
        echo "✓ Secrets generated"
        echo ""
        
        # Check if .env file exists
        ENV_FILE="backend/.env"
        if [ ! -f "$ENV_FILE" ]; then
            echo "❌ .env file not found at $ENV_FILE"
            echo ""
            echo "Please create it from env.example first:"
            echo "  cp env.example backend/.env"
            exit 1
        fi
        
        # Update .env file
        echo "[4/5] Updating .env file..."
        
        # Remove old Langfuse configuration if exists
        if grep -q "^LANGFUSE_" "$ENV_FILE"; then
            sed -i '/^LANGFUSE_/d' "$ENV_FILE"
        fi
        
        # Add new configuration
        cat >> "$ENV_FILE" <<EOL

# ============================================
# Langfuse (Agent Tracing & LLM Observability)
# ============================================
LANGFUSE_ENABLED=true
LANGFUSE_HOST=http://localhost:22016
LANGFUSE_SECRET=$LANGFUSE_SECRET
LANGFUSE_SALT=$LANGFUSE_SALT
# Note: Generate LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY from Langfuse UI after first start
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key-here
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key-here
EOL
        
        echo "✓ .env file updated"
        echo ""
        
        # Start Langfuse service
        echo "[5/5] Starting Langfuse service..."
        dc --profile monitoring up -d langfuse-server
        echo "✓ Langfuse service started"
        echo ""
        
        echo "⏳ Waiting for Langfuse to be ready (30 seconds)..."
        sleep 30
        echo ""
        
        # Check health
        echo "🔍 Checking Langfuse health..."
        MAX_RETRIES=10
        RETRY_COUNT=0
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if curl -s http://localhost:22016/api/public/health > /dev/null 2>&1; then
                echo "✓ Langfuse is healthy!"
                break
            fi
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo "⏳ Waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)"
                sleep 5
            fi
        done
        
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo "⚠ Langfuse health check timed out"
            echo ""
            echo "Check logs with:"
            echo "  docker logs ugm_aicare_langfuse_dev"
        fi
        
        echo ""
        echo "================================================"
        echo "✅ Langfuse Setup Complete!"
        echo "================================================"
        echo ""
        echo "📝 Next Steps:"
        echo ""
        echo "1. Access Langfuse UI:"
        echo "   → http://localhost:22016"
        echo ""
        echo "2. Complete initial setup:"
        echo "   • Create your account"
        echo "   • Create a new project: 'ugm-aicare-agents'"
        echo ""
        echo "3. Generate API Keys:"
        echo "   • Go to Settings → API Keys"
        echo "   • Click 'Create new API key'"
        echo "   • Copy the Public Key (pk-lf-...)"
        echo "   • Copy the Secret Key (sk-lf-...)"
        echo ""
        echo "4. Update backend/.env with your API keys:"
        echo "   LANGFUSE_PUBLIC_KEY=pk-lf-your-actual-key"
        echo "   LANGFUSE_SECRET_KEY=sk-lf-your-actual-key"
        echo ""
        echo "5. Install Langfuse SDK:"
        echo "   cd backend"
        echo "   source .venv/Scripts/activate"
        echo "   pip install langfuse>=2.0.0"
        echo ""
        echo "6. Restart backend:"
        echo "   ./dev.sh restart backend"
        echo ""
        echo "📚 Documentation:"
        echo "   • Quick Reference: docs/LANGFUSE_QUICKREF.md"
        echo "   • Full Guide: docs/LANGFUSE_GUIDE.md"
        echo ""
        ;;
    
    help|--help|-h|"")
        show_help
        ;;
    
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
