#!/bin/bash
# Standalone monitoring stack management script for UGM-AICare
# Manages ELK Stack (logs) + Prometheus + Grafana (metrics)

set -e

COMPOSE_FILE="infra/compose/docker-compose.dev.yml"

MONITORING_SERVICES=(
    prometheus
    grafana
    node-exporter
    cadvisor
    postgres-exporter
    redis-exporter
    langfuse-server
)

ELK_SERVICES=(
    elasticsearch
    logstash
    kibana
    filebeat
)

COMPOSE_PROFILES=(--profile monitoring --profile elk)

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
    echo "  • Kibana (Logs):       http://localhost:22024"
    echo "  • Grafana (Metrics):   http://localhost:22011 (user: ${GRAFANA_ADMIN_USER:-admin}; password from env)"
    echo "  • Prometheus:          http://localhost:22010"
    echo "  • Elasticsearch:       http://localhost:22020"
    echo "  • Backend Metrics:     http://localhost:22001/metrics (requires backend running)"
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
        ES_CONTAINER="ugm_aicare_elasticsearch_dev"
        if ! docker ps --format "{{.Names}}" | grep -q "^${ES_CONTAINER}$"; then
            ES_CONTAINER="ugm_aicare_elasticsearch"
        fi

        if docker exec "$ES_CONTAINER" curl -f http://localhost:9200/_cluster/health 2>/dev/null | grep -q '"status":"green"\|"status":"yellow"'; then
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
        
        echo "📊 Starting monitoring stack (profiles: monitoring + elk)..."
        docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" up -d \
            "${MONITORING_SERVICES[@]}" \
            "${ELK_SERVICES[@]}"
        echo "✅ Monitoring stack started"
        echo ""

        wait_for_health
        echo ""
        
        echo "⏳ Waiting for services to initialize..."
        sleep 10
        echo ""
        
        echo "✅ Monitoring stack is ready!"
        echo ""
        echo "📍 Access Points:"
        echo "  • Kibana (Logs):       http://localhost:22024"
        echo "  • Grafana (Metrics):   http://localhost:22011 (user: ${GRAFANA_ADMIN_USER:-admin}; password from env)"
        echo "  • Prometheus:          http://localhost:22010"
        echo "  • Langfuse (Traces):   http://localhost:22016 (setup on first access)"
        echo "  • Elasticsearch:       http://localhost:22020"
        echo "  • Backend Metrics:     http://localhost:22001/metrics (requires backend running)"
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
        docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" stop \
            "${MONITORING_SERVICES[@]}" \
            "${ELK_SERVICES[@]}"
        echo ""
        echo "✅ Monitoring stack stopped"
        echo ""
        echo "💡 To remove volumes and data:"
        echo "  ./monitoring.sh clean"
        ;;
    
    restart)
        echo "🔄 Restarting monitoring stack..."
        echo ""
        docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" restart \
            "${MONITORING_SERVICES[@]}" \
            "${ELK_SERVICES[@]}"
        echo ""
        echo "✅ Monitoring stack restarted"
        ;;
    
    status)
        echo "📊 Monitoring Stack Status"
        echo ""
        echo "═══════════════════════════════════════════════════════"
        echo "ELK Stack:"
        echo "═══════════════════════════════════════════════════════"
        docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" ps "${ELK_SERVICES[@]}" || true
        echo ""
        echo "═══════════════════════════════════════════════════════"
        echo "Prometheus + Grafana:"
        echo "═══════════════════════════════════════════════════════"
        docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" ps "${MONITORING_SERVICES[@]}" || true
        echo ""
        echo "💡 Check service health:"
        echo "  Elasticsearch:  curl http://localhost:22020/_cluster/health"
        echo "  Prometheus:     curl http://localhost:22010/-/healthy"
        echo "  Grafana:        curl http://localhost:22011/api/health"
        ;;
    
    logs)
        if [ -n "${2:-}" ]; then
            SERVICE="$2"
            echo "📜 Viewing logs for: $SERVICE"
            echo "   (Press Ctrl+C to exit)"
            echo ""

            if docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" config --services | grep -q "^${SERVICE}$"; then
                docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" logs -f "$SERVICE"
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

            echo "Stopping and removing monitoring containers..."
            docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" stop \
                "${MONITORING_SERVICES[@]}" \
                "${ELK_SERVICES[@]}" || true
            docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" rm -f -v \
                "${MONITORING_SERVICES[@]}" \
                "${ELK_SERVICES[@]}" || true

            echo ""
            echo "Removing monitoring volumes (metrics/logs only)..."

            VOLUME_SUFFIXES=(
                prometheus-data-dev
                grafana-data-dev
                loki-data-dev
                elasticsearch-data-dev
                filebeat-data-dev
            )

            for suffix in "${VOLUME_SUFFIXES[@]}"; do
                while IFS= read -r vol; do
                    if [ -n "$vol" ]; then
                        docker volume rm "$vol" || true
                    fi
                done < <(docker volume ls -q | grep -E "(_${suffix}$|^${suffix}$)" || true)
            done

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
        echo "  • Kibana:           http://localhost:22024"
        echo "  • Elasticsearch:    http://localhost:22020"
        echo "  • Logstash:         http://localhost:22023"
        echo ""
        echo "Metrics (Prometheus + Grafana):"
        echo "  • Grafana:          http://localhost:22011"
        echo "    Credentials:      see GRAFANA_ADMIN_USER / GRAFANA_ADMIN_PASSWORD env vars"
        echo "  • Prometheus:       http://localhost:22010"
        echo ""
        echo "Application Metrics:"
        echo "  • Backend Metrics:  http://localhost:22001/metrics"
        echo "  • FastAPI Metrics:  http://localhost:22001/metrics/fastapi"
        echo ""
        echo "Exporters:"
        echo "  • Node Exporter:    http://localhost:22012/metrics"
        echo "  • cAdvisor:         http://localhost:22013/metrics"
        echo "  • Postgres:         http://localhost:22014/metrics"
        echo "  • Redis:            http://localhost:22015/metrics"
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
