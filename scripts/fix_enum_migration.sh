#!/usr/bin/env bash

# Quick fix for agent_name_enum duplication error
# This script will attempt to resolve the enum conflict and mark the migration as complete

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# Load environment
if [[ -f "$ENV_FILE" ]]; then
    echo "Loading environment from $ENV_FILE"
    set -a
    source <(grep -E '^[^#]*=' "$ENV_FILE" | sed -E 's/^[[:space:]]*//; s/[[:space:]]*$//; s/[[:space:]]*=[[:space:]]*/=/' | sed 's/^/export /')
    set +a
else
    echo "ERROR: .env file not found at $ENV_FILE"
    exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL not found in environment"
    exit 1
fi

echo "Using DATABASE_URL: ${DATABASE_URL%@*}@***"

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo "ERROR: psql is required but not found in PATH"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo "Checking current enum types..."
psql "$DATABASE_URL" -c "
SELECT 
    t.typname,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%enum'
GROUP BY t.typname
ORDER BY t.typname;
"

echo ""
echo "Checking tables that use agent_name_enum..."
psql "$DATABASE_URL" -c "
SELECT 
    c.table_name,
    c.column_name,
    c.data_type
FROM information_schema.columns c
WHERE c.udt_name = 'agent_name_enum';
"

echo ""
echo "Attempting to fix the enum duplication issue..."

# Strategy 1: If no tables are using the enum, drop and let migration recreate
echo "Trying to drop unused enum types..."
psql "$DATABASE_URL" << 'EOF'
DO $$ 
DECLARE
    enum_name text;
    table_count integer;
BEGIN
    -- Check each problematic enum
    FOR enum_name IN SELECT unnest(ARRAY['agent_name_enum', 'message_role_enum', 'consent_scope_enum', 'case_status_enum', 'case_severity_enum', 'agent_role_enum']) LOOP
        -- Check if enum exists
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = enum_name) THEN
            -- Check if any tables use this enum
            SELECT COUNT(*) INTO table_count
            FROM information_schema.columns 
            WHERE udt_name = enum_name;
            
            IF table_count = 0 THEN
                -- Safe to drop
                EXECUTE 'DROP TYPE ' || enum_name || ' CASCADE';
                RAISE NOTICE 'Dropped unused enum: %', enum_name;
            ELSE
                RAISE NOTICE 'Enum % is in use by % tables, skipping', enum_name, table_count;
            END IF;
        ELSE
            RAISE NOTICE 'Enum % does not exist', enum_name;
        END IF;
    END LOOP;
END $$;
EOF

echo ""
echo "Current alembic revision status:"
cd "$ROOT_DIR/backend"
alembic current

echo ""
echo "Available migration heads:"
alembic heads

echo ""
echo "Attempting to continue with the migration..."

# Try the migration again
if alembic upgrade head; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration still failing. Manual intervention may be required."
    echo ""
    echo "Possible solutions:"
    echo "1. Mark the migration as complete if the schema is already correct:"
    echo "   cd $ROOT_DIR/backend && alembic stamp 9a5f9ae2bf74"
    echo ""
    echo "2. Check if there are multiple migration heads and resolve conflicts:"
    echo "   cd $ROOT_DIR/backend && alembic merge heads"
    echo ""
    echo "3. Reset to a previous migration and try again:"
    echo "   cd $ROOT_DIR/backend && alembic downgrade c613d13854de"
    echo "   cd $ROOT_DIR/backend && alembic upgrade head"
fi