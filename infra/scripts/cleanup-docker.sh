#!/usr/bin/env bash

# Docker Cleanup Script for UGM-AICare Production VM
# Run this manually when disk space is critically low
# Or add to crontab: 0 2 * * * /path/to/cleanup-docker.sh

set -euo pipefail

echo "========================================="
echo "Docker Cleanup Script"
echo "========================================="

echo ""
echo "📊 Disk space BEFORE cleanup:"
df -h / | awk 'NR==1 || /\/$/'

echo ""
echo "🗑️  Step 1: Removing stopped containers..."
STOPPED_CONTAINERS=$(docker ps -a -q -f status=exited | wc -l)
echo "Found $STOPPED_CONTAINERS stopped containers"
docker container prune -f

echo ""
echo "🗑️  Step 2: Removing dangling images (untagged)..."
DANGLING_IMAGES=$(docker images -f "dangling=true" -q | wc -l)
echo "Found $DANGLING_IMAGES dangling images"
docker image prune -f

echo ""
echo "🗑️  Step 3: Removing unused volumes..."
UNUSED_VOLUMES=$(docker volume ls -qf dangling=true | wc -l)
echo "Found $UNUSED_VOLUMES unused volumes"
docker volume prune -f

echo ""
echo "🗑️  Step 4: Removing unused networks..."
docker network prune -f

echo ""
echo "🗑️  Step 5: Removing build cache (keeping 5GB)..."
docker builder prune -f --keep-storage=5GB

echo ""
echo "🗑️  Step 6: Removing old backend/frontend images (keeping last 5)..."
# List backend images, exclude latest and current tags, keep last 5
docker images "ghcr.io/*/backend" --format "{{.Repository}}:{{.Tag}} {{.ID}}" | \
  grep -v "latest" | tail -n +6 | awk '{print $2}' | xargs -r docker rmi -f 2>/dev/null || true

docker images "ghcr.io/*/frontend" --format "{{.Repository}}:{{.Tag}} {{.ID}}" | \
  grep -v "latest" | tail -n +6 | awk '{print $2}' | xargs -r docker rmi -f 2>/dev/null || true

echo ""
echo "🗑️  Step 7: Removing container logs older than 7 days..."
find /var/lib/docker/containers/ -type f -name "*-json.log" -mtime +7 -delete 2>/dev/null || true

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "📊 Disk space AFTER cleanup:"
df -h / | awk 'NR==1 || /\/$/'

echo ""
echo "🐳 Docker disk usage:"
docker system df

echo ""
echo "📝 Summary:"
echo "   Stopped containers removed: $STOPPED_CONTAINERS"
echo "   Dangling images removed: $DANGLING_IMAGES"
echo "   Unused volumes removed: $UNUSED_VOLUMES"
