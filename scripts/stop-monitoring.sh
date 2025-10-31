#!/bin/bash
# Stop UGM-AICare monitoring stack

set -e

echo "🛑 Stopping UGM-AICare Monitoring Stack..."
echo ""

# Stop Prometheus + Grafana
echo "Stopping Prometheus + Grafana..."
docker compose -f docker-compose.monitoring.yml down
echo "✅ Monitoring stack stopped"
echo ""

# Stop ELK Stack
echo "Stopping ELK Stack..."
docker compose -f docker-compose.elk.yml down
echo "✅ ELK stack stopped"
echo ""

echo "🎉 All monitoring services stopped!"
echo ""
echo "💡 To remove volumes and data:"
echo "  docker compose -f docker-compose.elk.yml down -v"
echo "  docker compose -f docker-compose.monitoring.yml down -v"
