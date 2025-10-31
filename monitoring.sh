#!/bin/bash
# Standalone monitoring stack management script for UGM-AICare
# Manages ELK Stack (logs) + Prometheus + Grafana (metrics)

set -e

ELK_COMPOSE="docker-compose.elk.yml"
MONITORING_COMPOSE="docker-compose.monitoring.yml"

show_help() {
    echo "UGM-AICare Monitoring Stack Manager"
    echo ""
    echo "Usage: ./monitoring.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start           Start monitoring stack (ELK + Prometheus + Grafana)"
    echo "  stop            Stop monitoring stack"
    echo "  restart         Restart monitoring stack"
    echo "  status          Show monitoring services status"
    echo "  logs [service]  View logs (with follow mode)"
    echo "  clean           Remove containers and volumes (WARNING: deletes all logs)"
    echo "  urls            Show access URLs"
    echo ""
    echo "Examples:"
    echo "  ./monitoring.sh start              # Start all monitoring services"
    echo "  ./monitoring.sh logs kibana        # Watch Kibana logs"
    echo "  ./monitoring.sh logs prometheus    # Watch Prometheus logs"
    echo "  ./monitoring.sh status             # Check service health"
    echo ""
    echo "Access URLs (after start):"
    echo "  • Kibana (Logs):       http://localhost:8254"
    echo "  • Grafana (Metrics):   http://localhost:8256 (admin/admin123)"
    echo "  • Prometheus:          http://localhost:8255"
    echo "  • AlertManager:        http://localhost:8261"
    echo "  • Elasticsearch:       http://localhost:8250"
    echo "  • Backend Metrics:     http://localhost:8000/metrics"
    echo ""
}

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
}

wait_for_health() {
    echo "⏳ Waiting for services to be healthy..."
    local timeout=60
    local counter=0
    
    while [ $counter -lt $timeout ]; do
        if docker exec ugm_aicare_elasticsearch curl -f http://localhost:9200/_cluster/health 2>/dev/null | grep -q '"status":"green"\|"status":"yellow"'; then
            echo "✅ Elasticsearch is healthy"
            break
        fi
        sleep 2
        counter=$((counter + 2))
        if [ $counter -ge $timeout ]; then
            echo "⚠️  Elasticsearch health check timed out. Continuing anyway..."
        fi
    done
}

case "${1:-}" in
    start)
        check_docker
        echo "🚀 Starting UGM-AICare Monitoring Stack..."
        echo ""
        
        echo "📊 Starting ELK Stack (Elasticsearch, Logstash, Kibana, Filebeat)..."
        docker compose -f "$ELK_COMPOSE" up -d
        echo "✅ ELK Stack started"
        echo ""
        
        wait_for_health
        echo ""
        
        echo "📈 Starting Prometheus + Grafana Stack..."
        docker compose -f "$MONITORING_COMPOSE" up -d
        echo "✅ Monitoring Stack started"
        echo ""
        
        echo "⏳ Waiting for services to initialize..."
        sleep 10
        echo ""
        
        echo "✅ Monitoring stack is ready!"
        echo ""
        echo "📍 Access Points:"
        echo "  • Kibana (Logs):       http://localhost:8254"
        echo "  • Grafana (Metrics):   http://localhost:8256 (admin/admin123)"
        echo "  • Prometheus:          http://localhost:8255"
        echo "  • AlertManager:        http://localhost:8261"
        echo "  • Langfuse (Traces):   http://localhost:8262 (setup on first access)"
        echo "  • Elasticsearch:       http://localhost:8250"
        echo "  • Backend Metrics:     http://localhost:8000/metrics"
        echo ""
        echo "📚 Quick Commands:"
        echo "  • View logs:           ./monitoring.sh logs [service]"
        echo "  • Stop services:       ./monitoring.sh stop"
        echo "  • Check status:        ./monitoring.sh status"
        echo ""
        echo "🎉 All monitoring services are running!"
        ;;
    
    stop)
        echo "🛑 Stopping monitoring stack..."
        echo ""
        echo "Stopping Prometheus + Grafana..."
        docker compose -f "$MONITORING_COMPOSE" down
        echo ""
        echo "Stopping ELK Stack..."
        docker compose -f "$ELK_COMPOSE" down
        echo ""
        echo "✅ Monitoring stack stopped"
        echo ""
        echo "💡 To remove volumes and data:"
        echo "  ./monitoring.sh clean"
        ;;
    
    restart)
        echo "🔄 Restarting monitoring stack..."
        echo ""
        docker compose -f "$MONITORING_COMPOSE" restart
        docker compose -f "$ELK_COMPOSE" restart
        echo ""
        echo "✅ Monitoring stack restarted"
        ;;
    
    status)
        echo "📊 Monitoring Stack Status"
        echo ""
        echo "═══════════════════════════════════════════════════════"
        echo "ELK Stack:"
        echo "═══════════════════════════════════════════════════════"
        docker compose -f "$ELK_COMPOSE" ps
        echo ""
        echo "═══════════════════════════════════════════════════════"
        echo "Prometheus + Grafana:"
        echo "═══════════════════════════════════════════════════════"
        docker compose -f "$MONITORING_COMPOSE" ps
        echo ""
        echo "💡 Check service health:"
        echo "  Elasticsearch:  curl http://localhost:8250/_cluster/health"
        echo "  Prometheus:     curl http://localhost:8255/-/healthy"
        echo "  Grafana:        curl http://localhost:8256/api/health"
        ;;
    
    logs)
        if [ -n "${2:-}" ]; then
            SERVICE="$2"
            echo "📜 Viewing logs for: $SERVICE"
            echo "   (Press Ctrl+C to exit)"
            echo ""
            
            # Try to find service in either compose file
            if docker compose -f "$MONITORING_COMPOSE" ps | grep -q "$SERVICE"; then
                docker compose -f "$MONITORING_COMPOSE" logs -f "$SERVICE"
            elif docker compose -f "$ELK_COMPOSE" ps | grep -q "$SERVICE"; then
                docker compose -f "$ELK_COMPOSE" logs -f "$SERVICE"
            else
                echo "❌ Service '$SERVICE' not found"
                echo ""
                echo "Available services:"
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
                exit 1
            fi
        else
            echo "Available monitoring services:"
            echo ""
            echo "ELK Stack:"
            echo "  • elasticsearch - Log storage and search"
            echo "  • logstash      - Log aggregation and parsing"
            echo "  • kibana        - Log visualization"
            echo "  • filebeat      - Log shipping"
            echo ""
            echo "Prometheus + Grafana:"
            echo "  • prometheus        - Metrics database"
            echo "  • grafana          - Metrics dashboards"
            echo "  • alertmanager     - Alert routing"
            echo "  • node-exporter    - System metrics"
            echo "  • cadvisor         - Container metrics"
            echo "  • postgres-exporter - Database metrics"
            echo "  • redis-exporter   - Cache metrics"
            echo ""
            echo "Usage: ./monitoring.sh logs <service>"
            echo "Example: ./monitoring.sh logs kibana"
        fi
        ;;
    
    clean)
        echo "🧹 Cleaning up monitoring containers and volumes..."
        echo ""
        echo "⚠️  WARNING: This will delete all collected logs and metrics!"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "Removing Prometheus + Grafana..."
            docker compose -f "$MONITORING_COMPOSE" down -v
            echo ""
            echo "Removing ELK Stack..."
            docker compose -f "$ELK_COMPOSE" down -v
            echo ""
            echo "✅ Monitoring stack cleaned"
            echo ""
            echo "💡 Run './monitoring.sh start' to start fresh"
        else
            echo "❌ Cancelled"
        fi
        ;;
    
    urls)
        echo "📍 Monitoring Access URLs"
        echo ""
        echo "Logs (ELK Stack):"
        echo "  • Kibana:           http://localhost:8254"
        echo "  • Elasticsearch:    http://localhost:8250"
        echo "  • Logstash:         http://localhost:8253"
        echo ""
        echo "Metrics (Prometheus + Grafana):"
        echo "  • Grafana:          http://localhost:8256"
        echo "    Credentials:      admin / admin123"
        echo "  • Prometheus:       http://localhost:8255"
        echo "  • AlertManager:     http://localhost:8261"
        echo ""
        echo "Application Metrics:"
        echo "  • Backend Metrics:  http://localhost:8000/metrics"
        echo "  • FastAPI Metrics:  http://localhost:8000/metrics/fastapi"
        echo ""
        echo "Exporters:"
        echo "  • Node Exporter:    http://localhost:8257/metrics"
        echo "  • cAdvisor:         http://localhost:8258/metrics"
        echo "  • Postgres:         http://localhost:8259/metrics"
        echo "  • Redis:            http://localhost:8260/metrics"
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
