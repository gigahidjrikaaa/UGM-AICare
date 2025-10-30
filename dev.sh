#!/bin/bash
# Development helper script for UGM-AICare

set -e

COMPOSE_FILE="docker-compose.dev.yml"
OVERRIDE_FILE="docker-compose.override.yml"
BACKUP_FILE="docker-compose.override.yml.disabled"

show_help() {
    echo "UGM-AICare Docker Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up              Start in development mode (HOT RELOAD enabled)"
    echo "  down            Stop all services"
    echo "  restart [svc]   Restart all services or specific service (backend/frontend)"
    echo "  logs [service]  View logs with follow mode (Ctrl+C to exit)"
    echo "  build           Rebuild containers (needed after dependency changes)"
    echo "  rebuild-fast    Quick rebuild (parallel, uses cache)"
    echo "  rebuild-clean   Clean rebuild (no cache, slower but fresh)"
    echo "  clear-cache     Clear Next.js and Docker build cache"
    echo "  prod            Run in production mode (disable hot-reload)"
    echo "  dev             Re-enable development mode"
    echo "  clean           Stop and remove all containers, volumes"
    echo "  status          Show running containers"
    echo ""
    echo "Hot Reload Features:"
    echo "  • Backend:  Uvicorn auto-reloads on Python file changes"
    echo "  • Frontend: Next.js Fast Refresh on save"
    echo "  • No need to restart containers when editing code!"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh up              # Start with hot reload"
    echo "  ./dev.sh logs backend    # Watch backend logs"
    echo "  ./dev.sh logs frontend   # Watch frontend logs"
    echo "  ./dev.sh build           # Rebuild after npm/pip install"
    echo "  ./dev.sh clear-cache     # Clear caches if builds are slow"
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
        docker-compose -f "$COMPOSE_FILE" up -d
        echo ""
        echo "✅ Services started!"
        echo "   Frontend: http://localhost:4000 (Next.js dev server)"
        echo "   Backend:  http://localhost:8000 (Uvicorn with --reload)"
        echo "   API Docs: http://localhost:8000/docs"
        echo ""
        echo "💡 Tip: Watch logs in real-time:"
        echo "   ./dev.sh logs -f"
        echo ""
        echo "🔄 Hot reload is enabled. Edit your code and save!"
        ;;
    
    down)
        echo "🛑 Stopping services..."
        docker-compose -f "$COMPOSE_FILE" down
        echo "✅ Services stopped"
        ;;
    
    restart)
        echo "🔄 Restarting services..."
        if [ -n "${2:-}" ]; then
            echo "   Restarting $2..."
            docker-compose -f "$COMPOSE_FILE" restart "$2"
        else
            echo "   Restarting all services..."
            docker-compose -f "$COMPOSE_FILE" restart
        fi
        echo "✅ Services restarted"
        ;;
    
    logs)
        if [ -n "${2:-}" ]; then
            docker-compose -f "$COMPOSE_FILE" logs -f "$2"
        else
            docker-compose -f "$COMPOSE_FILE" logs -f
        fi
        ;;
    
    build)
        echo "🔨 Rebuilding containers..."
        docker-compose -f "$COMPOSE_FILE" up --build -d
        echo "✅ Rebuild complete"
        ;;
    
    rebuild-fast)
        echo "⚡ Fast rebuild (parallel build, use cache)..."
        echo "   This will rebuild with Docker cache for faster builds"
        echo ""
        # Use BuildKit for faster builds
        COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f "$COMPOSE_FILE" build --parallel backend frontend
        echo ""
        echo "🚀 Restarting services..."
        docker-compose -f "$COMPOSE_FILE" up -d backend frontend
        echo ""
        echo "✅ Fast rebuild complete!"
        echo "   Backend and frontend have been rebuilt and restarted"
        ;;
    
    rebuild-clean)
        echo "🧹 Clean rebuild (no cache, parallel build)..."
        echo "   Warning: This will take longer but ensures a fresh build"
        echo ""
        COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f "$COMPOSE_FILE" build --parallel --no-cache backend frontend
        echo ""
        echo "🚀 Restarting services..."
        docker-compose -f "$COMPOSE_FILE" up -d backend frontend
        echo ""
        echo "✅ Clean rebuild complete!"
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
            docker-compose -f docker-compose.yml up -d
        else
            echo "ℹ️  Already in production mode"
            docker-compose -f docker-compose.yml up -d
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
        docker-compose -f "$COMPOSE_FILE" up -d
        ;;
    
    clean)
        echo "🧹 Cleaning up containers and volumes..."
        read -p "This will remove all containers and volumes. Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f "$COMPOSE_FILE" down -v
            echo "✅ Cleanup complete"
        else
            echo "❌ Cancelled"
        fi
        ;;
    
    status)
        docker-compose -f "$COMPOSE_FILE" ps
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
