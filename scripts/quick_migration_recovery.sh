#!/usr/bin/env bash
# Quick recovery script - gets development environment working again
# USE WITH CAUTION: This modifies database state

set -e

echo "=========================================="
echo "MIGRATION RECOVERY SCRIPT"
echo "=========================================="
echo ""
echo "This script will:"
echo "1. Stop all containers"
echo "2. Reset the database"
echo "3. Mark all migrations as applied (skip running them)"
echo "4. Restart services"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Stopping containers..."
docker compose -f infra/compose/docker-compose.dev.yml down

echo ""
echo "Step 2: Starting database only..."
docker compose -f infra/compose/docker-compose.dev.yml up -d db
sleep 10

echo ""
echo "Step 3: Resetting database..."
docker exec ugm_aicare_db_dev psql -U giga -d postgres -c "DROP DATABASE IF EXISTS aicare_db;"
docker exec ugm_aicare_db_dev psql -U giga -d postgres -c "CREATE DATABASE aicare_db OWNER giga;"

echo ""
echo "Step 4: Starting migrate container..."
docker compose -f infra/compose/docker-compose.dev.yml up -d migrate
sleep 5

echo ""
echo "Step 5: Stamping database to HEAD (marking all as applied)..."
docker exec ugm_aicare_migrate_dev alembic stamp head

echo ""
echo "Step 6: Starting all services..."
docker compose -f infra/compose/docker-compose.dev.yml up -d

echo ""
echo "=========================================="
echo "✅ RECOVERY COMPLETE"
echo "=========================================="
echo ""
echo "Database has been reset and all migrations marked as applied."
echo "Your development environment should now work."
echo ""
echo "⚠️  WARNING: You still need to fix the migrations properly!"
echo "   Follow the steps in URGENT_ACTION_PLAN.md"
echo ""
echo "Check status with:"
echo "  docker compose -f infra/compose/docker-compose.dev.yml ps"
echo "  docker logs ugm_aicare_migrate_dev"
echo ""
