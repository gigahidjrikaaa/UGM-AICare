#!/usr/bin/env bash

# Simple migration script for UGM-AICare
# This is a streamlined version focusing on core functionality

set -euo pipefail

# Load environment from project root .env file
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
    echo "[migrations] Loading environment from $ENV_FILE"
    set -a
    source <(grep -E '^[^#]*=' "$ENV_FILE" | sed -E 's/^[[:space:]]*//; s/[[:space:]]*$//; s/[[:space:]]*=[[:space:]]*/=/')
    set +a
else
    echo "[migrations] ERROR: .env file not found at $ENV_FILE"
    exit 1
fi

# Set paths from environment with fallbacks
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/backend}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$ROOT_DIR/artifacts}"
REPORT_FILE="$ARTIFACTS_DIR/migration_report.md"

# Validate required variables
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[migrations] ERROR: DATABASE_URL not found in .env file"
    exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
    echo "[migrations] ERROR: Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Create artifacts directory
mkdir -p "$ARTIFACTS_DIR"

echo "[migrations] Starting migration routine" | tee "$REPORT_FILE"
echo "[migrations] ROOT_DIR: $ROOT_DIR" | tee -a "$REPORT_FILE"
echo "[migrations] BACKEND_DIR: $BACKEND_DIR" | tee -a "$REPORT_FILE"
echo "[migrations] ARTIFACTS_DIR: $ARTIFACTS_DIR" | tee -a "$REPORT_FILE"
echo "[migrations] DATABASE_URL: ${DATABASE_URL%@*}@***" | tee -a "$REPORT_FILE"

# Run Alembic migrations
echo "[migrations] Running alembic upgrade head..." | tee -a "$REPORT_FILE"
cd "$BACKEND_DIR"
if alembic upgrade head; then
    echo "[migrations] ✅ Alembic migration completed successfully" | tee -a "$REPORT_FILE"
else
    echo "[migrations] ❌ Alembic migration failed" | tee -a "$REPORT_FILE"
    echo "[migrations] Check the error above and run fix_enum_migration.py if needed" | tee -a "$REPORT_FILE"
    exit 1
fi

# Run backfill script if it exists
BACKFILL_SCRIPT="$BACKEND_DIR/scripts/backfill_agent_data.py"
if [[ -f "$BACKFILL_SCRIPT" ]]; then
    echo "[migrations] Running backfill script..." | tee -a "$REPORT_FILE"
    if python "$BACKFILL_SCRIPT"; then
        echo "[migrations] ✅ Backfill completed successfully" | tee -a "$REPORT_FILE"
    else
        echo "[migrations] ⚠️  Backfill script failed, but continuing..." | tee -a "$REPORT_FILE"
    fi
else
    echo "[migrations] Backfill script not found, skipping..." | tee -a "$REPORT_FILE"
fi

# Verify database state
echo "[migrations] Verifying database state..." | tee -a "$REPORT_FILE"
python3 -c "
import asyncio
from sqlalchemy import select, func, text
import sys
sys.path.append('$BACKEND_DIR')

async def verify_db():
    try:
        from app.database import async_engine
        async with async_engine.begin() as conn:
            # Check alembic version
            result = await conn.execute(text('SELECT version_num FROM alembic_version'))
            version = result.scalar()
            print(f'[migrations] Current database version: {version}')
            
            # Check if key tables exist
            result = await conn.execute(text(\"\"\"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            \"\"\"))
            tables = [row[0] for row in result.fetchall()]
            print(f'[migrations] Tables in database: {len(tables)}')
            for table in tables[:10]:  # Show first 10 tables
                print(f'[migrations]   - {table}')
            if len(tables) > 10:
                print(f'[migrations]   ... and {len(tables) - 10} more')
                
    except Exception as e:
        print(f'[migrations] ❌ Database verification failed: {e}')
        return False
    return True

if not asyncio.run(verify_db()):
    exit(1)
" 2>&1 | tee -a "$REPORT_FILE"

echo "[migrations] ✅ Migration routine completed successfully" | tee -a "$REPORT_FILE"
echo "[migrations] Report saved to: $REPORT_FILE"