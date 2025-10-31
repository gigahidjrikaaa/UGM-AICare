#!/bin/bash
# Start UGM-AICare monitoring stack

set -e

echo "🚀 Starting UGM-AICare Monitoring Stack..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Start ELK Stack
echo "📊 Starting ELK Stack (Elasticsearch, Logstash, Kibana, Filebeat)..."
docker compose -f docker-compose.elk.yml up -d
echo "✅ ELK Stack started"
echo ""

# Wait for Elasticsearch to be healthy
echo "⏳ Waiting for Elasticsearch to be healthy..."
timeout=60
counter=0
until docker exec ugm_aicare_elasticsearch curl -f http://localhost:9200/_cluster/health 2>/dev/null | grep -q '"status":"green"\|"status":"yellow"'; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "⚠️  Elasticsearch health check timed out after ${timeout}s. Continuing anyway..."
        break
    fi
    echo "  Still waiting... (${counter}s/${timeout}s)"
done
echo "✅ Elasticsearch is healthy"
echo ""

# Start Prometheus + Grafana
echo "📈 Starting Prometheus + Grafana Stack..."
docker compose -f docker-compose.monitoring.yml up -d
echo "✅ Monitoring Stack started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10
echo ""

# Display service status
echo "✅ Monitoring stack is ready!"
echo ""
echo "📍 Access Points:"
echo "  • Kibana (Logs):       http://localhost:5601"
echo "  • Grafana (Metrics):   http://localhost:3001 (admin/admin123)"
echo "  • Prometheus:          http://localhost:9090"
echo "  • AlertManager:        http://localhost:9093"
echo "  • Backend Metrics:     http://localhost:8000/metrics"
echo ""
echo "📚 Quick Commands:"
echo "  • View logs:           docker compose -f docker-compose.elk.yml logs -f"
echo "  • Stop ELK:            docker compose -f docker-compose.elk.yml down"
echo "  • Stop monitoring:     docker compose -f docker-compose.monitoring.yml down"
echo "  • Stop all:            ./scripts/stop-monitoring.sh"
echo ""
echo "🎉 All monitoring services are running!"
