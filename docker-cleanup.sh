#!/bin/bash
# Docker Compose Cleanup Script
# Removes redundant and deprecated docker-compose files
# Run from project root: bash docker-cleanup.sh

set -e

echo "🧹 Docker Compose Cleanup Script"
echo "=================================="
echo ""

# Files to delete from project root
ROOT_FILES=(
    "docker-compose.yml"
    "docker-compose.override.yml"
    "docker-compose.dev-monitoring.yml"
    "docker-compose.elk-minimal.yml"
    "docker-compose.elk.yml"
    "docker-compose.loki.yml"
    "docker-compose.monitoring.yml"
)

# Backup before cleanup
BACKUP_DIR="backups/docker-compose-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup of old files..."
for file in "${ROOT_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/$file"
        echo "   ✓ Backed up: $file → $BACKUP_DIR/$file"
    fi
done

echo ""
echo "🗑️  Removing redundant files from root..."
for file in "${ROOT_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "   ✓ Deleted: $file"
    fi
done

echo ""
echo "🗑️  Cleaning up /infra/compose (if empty or duplicate)..."
if [ -d "infra/compose" ]; then
    if [ "$(ls -A infra/compose)" ]; then
        # Check if files are duplicates (older versions)
        if grep -q "# docker-compose.dev.yml\|# docker-compose.prod.yml" infra/compose/* 2>/dev/null || [ ! -s "infra/compose"/* ] 2>/dev/null; then
            rm -rf "infra/compose"
            echo "   ✓ Deleted: infra/compose/"
        else
            echo "   ⚠️  /infra/compose has files - review before deletion"
            ls -la infra/compose/
        fi
    else
        rm -rf "infra/compose"
        echo "   ✓ Deleted: infra/compose/ (empty)"
    fi
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 New compose files (ready to use):"
echo "   • docker-compose.base.yml          (shared definitions)"
echo "   • docker-compose.dev.yml           (development environment)"
echo "   • docker-compose.preprod.yml       (pre-production environment)"
echo "   • docker-compose.prod.yml          (production environment)"
echo ""
echo "📖 Documentation:"
echo "   • DOCKER_COMPOSE_USAGE.md          (how to use the new setup)"
echo "   • DOCKER_REFACTORING_SUMMARY.md    (what changed and why)"
echo ""
echo "🚀 Quick start:"
echo "   Development:   docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d"
echo "   Preprod:       docker compose -f docker-compose.base.yml -f docker-compose.preprod.yml up -d"
echo "   Production:    docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d"
echo ""
echo "💾 Backup location: $BACKUP_DIR"
echo ""
