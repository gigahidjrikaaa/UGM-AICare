#!/bin/bash
# deploy-prod.sh
# Deploys or restarts the production application on the VM.
# Assumes it's run from the project root on the VM.

show_help() {
    echo "UGM-AICare Production Deployment Script"
    echo ""
    echo "Usage: ./deploy-prod.sh [command]"
    echo ""
    echo "Commands:"
    echo "  deploy              Pull latest code, build and restart (default)"
    echo "  deploy-monitoring   Deploy with full monitoring stack (ELK + Prometheus + Langfuse)"
    echo "  restart             Restart services without rebuilding"
    echo "  setup-langfuse      Setup Langfuse for agent tracing (one-time)"
    echo "  logs                Show logs for frontend and backend"
    echo "  status              Show running containers"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy-prod.sh                    # Deploy with rebuild"
    echo "  ./deploy-prod.sh deploy-monitoring  # Deploy with monitoring"
    echo "  ./deploy-prod.sh restart            # Quick restart"
    echo "  ./deploy-prod.sh setup-langfuse     # Setup Langfuse"
    echo ""
}

case "${1:-deploy}" in
    deploy)
        echo "Starting production deployment/restart..."

        # 1. Pull the latest changes from your Git repository
        echo "Pulling latest code from Git..."
        git pull

        # 2. Ensure the production .env file is correctly configured on the VM.
        if [ ! -f .env ]; then
            echo "WARNING: Production .env file not found. Please ensure it exists and is configured."
        fi

        # 3. Build and restart Docker containers in detached mode
        echo "Building and restarting Docker containers..."
        docker-compose up --build -d --remove-orphans

        # 4. Display logs
        echo "Displaying logs for frontend and backend (Ctrl+C to stop)..."
        timeout 30s docker-compose logs -f frontend backend || true

        echo "Production deployment/restart script finished."
        ;;
    
    deploy-monitoring)
        echo "Starting production deployment WITH MONITORING..."
        echo ""
        
        # 1. Pull latest code
        echo "Pulling latest code from Git..."
        git pull
        
        # 2. Check .env file
        if [ ! -f .env ]; then
            echo "WARNING: Production .env file not found. Please ensure it exists and is configured."
        fi
        
        # 3. Check monitoring environment variables
        echo "Checking monitoring configuration..."
        if ! grep -q "^LANGFUSE_SECRET=" .env 2>/dev/null; then
            echo "⚠ WARNING: LANGFUSE_SECRET not found in .env"
            echo "Generating secrets..."
            LANGFUSE_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || python -c "import secrets; print(secrets.token_urlsafe(32))")
            LANGFUSE_SALT=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || python -c "import secrets; print(secrets.token_urlsafe(32))")
            
            echo "" >> .env
            echo "# Langfuse Configuration (Auto-generated)" >> .env
            echo "LANGFUSE_ENABLED=true" >> .env
            echo "LANGFUSE_HOST=http://localhost:8262" >> .env
            echo "LANGFUSE_SECRET=$LANGFUSE_SECRET" >> .env
            echo "LANGFUSE_SALT=$LANGFUSE_SALT" >> .env
            echo "LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key-here" >> .env
            echo "LANGFUSE_SECRET_KEY=sk-lf-your-secret-key-here" >> .env
            echo "LANGFUSE_NEXTAUTH_URL=http://localhost:8262" >> .env
            echo "✓ Langfuse secrets added to .env"
        fi
        
        # 4. Build and restart with monitoring
        echo "Building and restarting Docker containers WITH MONITORING..."
        docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build -d --remove-orphans 2>/dev/null || {
            # Fallback: use infra/compose files if they exist
            if [ -f "infra/compose/docker-compose.prod.yml" ]; then
                docker compose -f infra/compose/docker-compose.prod.yml -f infra/compose/docker-compose.prod-monitoring.yml --env-file .env up --build -d --remove-orphans
            else
                echo "ERROR: Could not find production docker-compose files"
                exit 1
            fi
        }
        
        # 5. Create langfuse_db if needed
        echo "Setting up Langfuse database..."
        sleep 5  # Wait for DB to be ready
        
        DB_CONTAINER=$(docker ps --filter "name=db" --format "{{.Names}}" | head -n 1)
        if [ -n "$DB_CONTAINER" ]; then
            docker exec "$DB_CONTAINER" psql -U "${POSTGRES_USER:-giga}" -d "${POSTGRES_DB:-aicare_db}" -c "CREATE DATABASE langfuse_db;" 2>/dev/null || echo "Database might already exist, continuing..."
        fi
        
        # 6. Display logs and status
        echo ""
        echo "⏳ Waiting for services to initialize (30 seconds)..."
        sleep 30
        
        echo ""
        echo "📊 Checking service health..."
        docker ps --filter "name=ugm_aicare" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        echo ""
        echo "========================================="
        echo "✅ Deployment with Monitoring Complete!"
        echo "========================================="
        echo ""
        echo "Application:"
        echo "  • Backend:  http://localhost:8000"
        echo "  • Frontend: http://localhost:4000"
        echo ""
        echo "Monitoring Stack:"
        echo "  • Kibana (Logs):       http://localhost:8254"
        echo "  • Grafana (Metrics):   http://localhost:8256 (admin/admin123)"
        echo "  • Prometheus:          http://localhost:8255"
        echo "  • Langfuse (Traces):   http://localhost:8262"
        echo "  • AlertManager:        http://localhost:8261"
        echo ""
        echo "📝 Next Steps for Langfuse:"
        echo "  1. Access http://localhost:8262"
        echo "  2. Create account and project: 'ugm-aicare-agents'"
        echo "  3. Go to Settings → API Keys → Create new key"
        echo "  4. Update .env with:"
        echo "     LANGFUSE_PUBLIC_KEY=pk-lf-..."
        echo "     LANGFUSE_SECRET_KEY=sk-lf-..."
        echo "  5. Restart backend: docker-compose restart backend"
        echo ""
        ;;
    
    restart)
        echo "Restarting production services..."
        docker-compose restart
        echo "✅ Services restarted"
        ;;
    
    setup-langfuse)
        echo "🔧 Setting up Langfuse for production agent tracing..."
        echo ""
        
        # Check if database is running
        echo "[1/5] Checking PostgreSQL database..."
        if ! docker ps | grep -q "db"; then
            echo "❌ PostgreSQL database container is not running!"
            echo ""
            echo "Please start services first:"
            echo "  docker-compose up -d db"
            exit 1
        fi
        
        # Get database container name dynamically
        DB_CONTAINER=$(docker ps --filter "name=db" --format "{{.Names}}" | head -n 1)
        if [ -z "$DB_CONTAINER" ]; then
            echo "❌ Could not find database container"
            exit 1
        fi
        
        echo "✓ Database is running (container: $DB_CONTAINER)"
        echo ""
        
        # Create Langfuse database
        echo "[2/5] Creating langfuse_db database..."
        docker exec "$DB_CONTAINER" psql -U giga -d aicare_db -c "CREATE DATABASE langfuse_db;" 2>/dev/null || {
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
        if [ ! -f .env ]; then
            echo "❌ .env file not found"
            echo ""
            echo "Please create it from env.example first:"
            echo "  cp env.example .env"
            exit 1
        fi
        
        # Update .env file
        echo "[4/5] Updating .env file..."
        
        # Remove old Langfuse configuration if exists
        if grep -q "^LANGFUSE_" .env; then
            sed -i '/^LANGFUSE_/d' .env
        fi
        
        # Add new configuration
        cat >> .env <<EOL

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
        echo "   → http://your-server-ip:8262"
        echo "   (Configure reverse proxy for HTTPS access)"
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
        echo "4. Update .env with your API keys:"
        echo "   LANGFUSE_PUBLIC_KEY=pk-lf-your-actual-key"
        echo "   LANGFUSE_SECRET_KEY=sk-lf-your-actual-key"
        echo ""
        echo "5. Restart backend:"
        echo "   docker-compose restart backend"
        echo ""
        ;;
    
    logs)
        echo "Showing logs (Ctrl+C to stop)..."
        docker-compose logs -f frontend backend
        ;;
    
    status)
        echo "📊 Production Services Status:"
        docker-compose ps
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac