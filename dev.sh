#!/bin/bash
# Development helper script for UGM-AICare

set -e

OVERRIDE_FILE="docker-compose.override.yml"
BACKUP_FILE="docker-compose.override.yml.disabled"

show_help() {
    echo "UGM-AICare Docker Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up              Start in development mode (hot-reload enabled)"
    echo "  down            Stop all services"
    echo "  restart         Restart all services"
    echo "  logs [service]  View logs (optionally for specific service)"
    echo "  build           Rebuild containers (needed after dependency changes)"
    echo "  prod            Run in production mode (disable hot-reload)"
    echo "  dev             Re-enable development mode"
    echo "  clean           Stop and remove all containers, volumes"
    echo "  status          Show running containers"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh up              # Start development environment"
    echo "  ./dev.sh logs backend    # View backend logs"
    echo "  ./dev.sh prod            # Switch to production mode"
    echo "  ./dev.sh build           # Rebuild after npm/pip install"
    echo ""
}

case "${1:-}" in
    up)
        echo "🚀 Starting development environment..."
        docker-compose up -d
        echo ""
        echo "✅ Services started!"
        echo "   Frontend: http://localhost:4000"
        echo "   Backend:  http://localhost:8000"
        echo "   API Docs: http://localhost:8000/docs"
        echo ""
        echo "View logs: ./dev.sh logs"
        ;;
    
    down)
        echo "🛑 Stopping services..."
        docker-compose down
        echo "✅ Services stopped"
        ;;
    
    restart)
        echo "🔄 Restarting services..."
        docker-compose restart
        echo "✅ Services restarted"
        ;;
    
    logs)
        if [ -n "${2:-}" ]; then
            docker-compose logs -f "$2"
        else
            docker-compose logs -f
        fi
        ;;
    
    build)
        echo "🔨 Rebuilding containers..."
        docker-compose up --build -d
        echo "✅ Rebuild complete"
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
        docker-compose up -d
        ;;
    
    clean)
        echo "🧹 Cleaning up containers and volumes..."
        read -p "This will remove all containers and volumes. Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            echo "✅ Cleanup complete"
        else
            echo "❌ Cancelled"
        fi
        ;;
    
    status)
        docker-compose ps
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
