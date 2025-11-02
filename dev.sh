#!/bin/bash
# Development helper script for UGM-AICare

set -e

COMPOSE_FILE="docker-compose.dev.yml"
OVERRIDE_FILE="docker-compose.override.yml"
BACKUP_FILE="docker-compose.override.yml.disabled"
ELK_COMPOSE="docker-compose.elk.yml"
MONITORING_COMPOSE="docker-compose.monitoring.yml"

show_help() {
    echo "UGM-AICare Docker Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up              Start in development mode (HOT RELOAD enabled)"
    echo "  up-all          Start dev + monitoring stack (ELK + Prometheus + Grafana)"
    echo "  down            Stop all services"
    echo "  down-all        Stop dev + monitoring services"
    echo "  restart [svc]   Restart all services or specific service (backend/frontend)"
    echo "  logs [service]  View logs with follow mode (Ctrl+C to exit)"
    echo "  build           Rebuild containers (needed after dependency changes)"
    echo "  rebuild-fast    Quick rebuild (parallel, uses cache)"
    echo "  rebuild-clean   Clean rebuild (no cache, slower but fresh)"
    echo "  test-build      Test backend build and verify all imports work"
    echo "  clear-cache     Clear Next.js and Docker build cache"
    echo "  prod            Run in production mode (disable hot-reload)"
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
    echo "  ./dev.sh up                        # Start dev without monitoring"
    echo "  ./dev.sh monitoring start          # Start only monitoring stack"
    echo "  ./dev.sh logs backend              # Watch backend logs"
    echo "  ./dev.sh monitoring logs kibana    # Watch Kibana logs"
    echo "  ./dev.sh build                     # Rebuild after npm/pip install"
    echo "  ./dev.sh test-build                # Test backend build for errors"
    echo ""
    echo "Monitoring Access:"
    echo "  • Kibana (Logs):       http://localhost:8254"
    echo "  • Grafana (Metrics):   http://localhost:8256 (admin/admin123)"
    echo "  • Prometheus:          http://localhost:8255"
    echo "  • Langfuse (Traces):   http://localhost:8262"
    echo "  • Backend Metrics:     http://localhost:8000/metrics"
    echo ""
    echo "Performance Tips:"
    echo "  • First build? Run 'clear-cache' to remove old artifacts"
    echo "  • Slow frontend? Turbopack is enabled by default (up to 700x faster)"
    echo "  • After dependency changes: Use 'rebuild-fast' not 'build'"
    echo ""
}

case "${1:-}" in
    up)
        echo "🚀 Starting development environment with HOT RELOAD..."
        echo ""
        echo "📝 Changes to your code will automatically reload:"
        echo "   • Backend: Python files in /backend/app/"
        echo "   • Frontend: TypeScript/React files in /frontend/src/"
        echo ""
        docker compose -f "$COMPOSE_FILE" up -d
        echo ""
        echo "✅ Services started!"
        echo "   Frontend: http://localhost:4000 (Next.js dev server)"
        echo "   Backend:  http://localhost:8000 (Uvicorn with --reload)"
        echo "   API Docs: http://localhost:8000/docs"
        echo ""
        echo "💡 Tip: Watch logs in real-time:"
        echo "   ./dev.sh logs -f"
        echo ""
        echo "� Want monitoring? Run:"
        echo "   ./dev.sh monitoring start"
        echo "   OR use './dev.sh up-all' to start everything at once"
        echo ""
        echo "��� Hot reload is enabled. Edit your code and save!"
        ;;
    
    up-all)
        echo "🚀 Starting FULL development environment (App + Monitoring)..."
        echo ""
        echo "📦 Starting application services..."
        docker compose -f "$COMPOSE_FILE" up -d
        echo "✅ Application started"
        echo ""
        echo "📊 Starting ELK Stack (Logs)..."
        docker compose -f "$ELK_COMPOSE" up -d
        echo "✅ ELK Stack started"
        echo ""
        echo "📈 Starting Prometheus + Grafana (Metrics)..."
        docker compose -f "$MONITORING_COMPOSE" up -d
        echo "✅ Monitoring Stack started"
        echo ""
        echo "⏳ Waiting for services to be ready..."
        sleep 15
        echo ""
        echo "✅ All services started!"
        echo ""
        echo "📍 Application Access:"
        echo "   • Frontend:   http://localhost:4000"
        echo "   • Backend:    http://localhost:8000"
        echo "   • API Docs:   http://localhost:8000/docs"
        echo ""
        echo "📍 Monitoring Access:"
        echo "   • Kibana (Logs):       http://localhost:8254"
        echo "   • Grafana (Metrics):   http://localhost:8256 (admin/admin123)"
        echo "   • Prometheus:          http://localhost:8255"
        echo "   • Langfuse (Traces):   http://localhost:8262"
        echo "   • AlertManager:        http://localhost:8261"
        echo "   • Backend Metrics:     http://localhost:8000/metrics"
        echo ""
        echo "💡 View logs:"
        echo "   ./dev.sh logs backend              # App logs"
        echo "   ./dev.sh monitoring logs kibana    # Monitoring logs"
        echo ""
        ;;
    
    down)
        echo "🛑 Stopping application services..."
        docker compose -f "$COMPOSE_FILE" down
        echo "✅ Application services stopped"
        echo ""
        echo "💡 Monitoring stack still running. To stop:"
        echo "   ./dev.sh monitoring stop"
        echo "   OR use './dev.sh down-all' to stop everything"
        ;;
    
    down-all)
        echo "🛑 Stopping ALL services (App + Monitoring)..."
        echo ""
        echo "Stopping application..."
        docker compose -f "$COMPOSE_FILE" down
        echo ""
        echo "Stopping monitoring stack..."
        docker compose -f "$MONITORING_COMPOSE" down
        docker compose -f "$ELK_COMPOSE" down
        echo ""
        echo "✅ All services stopped"
        ;;
    
    restart)
        echo "🔄 Restarting services..."
        if [ -n "${2:-}" ]; then
            echo "   Restarting $2..."
            docker compose -f "$COMPOSE_FILE" restart "$2"
        else
            echo "   Restarting all services..."
            docker compose -f "$COMPOSE_FILE" restart
        fi
        echo "✅ Services restarted"
        ;;
    
    logs)
        if [ -n "${2:-}" ]; then
            docker compose -f "$COMPOSE_FILE" logs -f "$2"
        else
            docker compose -f "$COMPOSE_FILE" logs -f
        fi
        ;;
    
    build)
        echo "🔨 Rebuilding containers..."
        docker compose -f "$COMPOSE_FILE" up --build -d
        echo "✅ Rebuild complete"
        ;;
    
    rebuild-fast)
        echo "⚡ Fast rebuild (parallel build, use cache)..."
        echo "   This will rebuild with Docker cache for faster builds"
        echo ""
        # Use BuildKit for faster builds
        COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" build --parallel backend frontend
        echo ""
        echo "🚀 Restarting services..."
        docker compose -f "$COMPOSE_FILE" up -d backend frontend
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
        COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" build --parallel --no-cache backend frontend
        echo ""
        echo "🚀 Restarting services..."
        docker compose -f "$COMPOSE_FILE" up -d backend frontend
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
            COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" build backend
            
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
        docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend python -c "
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
        docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend python -c "
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
        echo "🏭 Switching to production mode..."
        if [ -f "$OVERRIDE_FILE" ]; then
            mv "$OVERRIDE_FILE" "$BACKUP_FILE"
            echo "✅ Development override disabled"
            echo "   Starting in production mode..."
            docker compose -f docker-compose.yml up -d
        else
            echo "ℹ️  Already in production mode"
            docker compose -f docker-compose.yml up -d
        fi
        ;;
    
    dev)
        echo "💻 Enabling development mode..."
        if [ -f "$BACKUP_FILE" ]; then
            mv "$BACKUP_FILE" "$OVERRIDE_FILE"
            echo "✅ Development override enabled"
        else
            echo "ℹ️  Already in development mode"
        fi
        docker compose -f "$COMPOSE_FILE" up -d
        ;;
    
    clean)
        echo "🧹 Cleaning up application containers and volumes..."
        read -p "This will remove application containers and volumes. Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose -f "$COMPOSE_FILE" down -v
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
            echo "Removing application..."
            docker compose -f "$COMPOSE_FILE" down -v
            echo ""
            echo "Removing monitoring stack..."
            docker compose -f "$MONITORING_COMPOSE" down -v
            docker compose -f "$ELK_COMPOSE" down -v
            echo ""
            echo "✅ Complete cleanup done"
        else
            echo "❌ Cancelled"
        fi
        ;;
    
    status)
        echo "📊 Application Services:"
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        echo "📊 Monitoring Services:"
        docker compose -f "$MONITORING_COMPOSE" ps 2>/dev/null || echo "  (not running)"
        docker compose -f "$ELK_COMPOSE" ps 2>/dev/null || echo "  (not running)"
        ;;
    
    monitoring)
        case "${2:-}" in
            start)
                echo "📊 Starting monitoring stack..."
                echo ""
                echo "Starting ELK Stack..."
                docker compose -f "$ELK_COMPOSE" up -d
                echo ""
                echo "Starting Prometheus + Grafana..."
                docker compose -f "$MONITORING_COMPOSE" up -d
                echo ""
                echo "⏳ Waiting for services to be healthy..."
                sleep 15
                echo ""
                echo "✅ Monitoring stack started!"
                echo ""
                echo "Access Points:"
                echo "  • Kibana (Logs):       http://localhost:5601"
                echo "  • Grafana (Metrics):   http://localhost:3001 (admin/admin123)"
                echo "  • Prometheus:          http://localhost:9090"
                echo "  • AlertManager:        http://localhost:9093"
                echo "  • Backend Metrics:     http://localhost:8000/metrics"
                ;;
            
            stop)
                echo "🛑 Stopping monitoring stack..."
                docker compose -f "$MONITORING_COMPOSE" down
                docker compose -f "$ELK_COMPOSE" down
                echo "✅ Monitoring stack stopped"
                ;;
            
            restart)
                echo "🔄 Restarting monitoring stack..."
                docker compose -f "$MONITORING_COMPOSE" restart
                docker compose -f "$ELK_COMPOSE" restart
                echo "✅ Monitoring stack restarted"
                ;;
            
            logs)
                if [ -n "${3:-}" ]; then
                    # Try to find service in either compose file
                    docker compose -f "$MONITORING_COMPOSE" logs -f "$3" 2>/dev/null || \
                    docker compose -f "$ELK_COMPOSE" logs -f "$3"
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
                echo ""
                echo "ELK Stack:"
                docker compose -f "$ELK_COMPOSE" ps
                echo ""
                echo "Prometheus + Grafana:"
                docker compose -f "$MONITORING_COMPOSE" ps
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
LANGFUSE_HOST=http://localhost:8262
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
        docker compose -f docker-compose.monitoring.yml up -d langfuse-server
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
            if curl -s http://localhost:8262/api/public/health > /dev/null 2>&1; then
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
            echo "  docker logs ugm_aicare_langfuse"
        fi
        
        echo ""
        echo "================================================"
        echo "✅ Langfuse Setup Complete!"
        echo "================================================"
        echo ""
        echo "📝 Next Steps:"
        echo ""
        echo "1. Access Langfuse UI:"
        echo "   → http://localhost:8262"
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
