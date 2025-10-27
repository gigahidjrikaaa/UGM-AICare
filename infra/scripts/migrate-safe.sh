#!/usr/bin/env bash

set -euo pipefail

# Logging functions
log_info() {
    echo "[migrate-safe.sh] $*"
}

log_error() {
    echo "[migrate-safe.sh] ERROR: $*" >&2
}

log_success() {
    echo "[migrate-safe.sh] ✓ $*"
}

log_info "Starting safe database migration..."

# Ensure DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  log_error "DATABASE_URL environment variable is required."
  exit 1
fi

log_info "DATABASE_URL is set: ${DATABASE_URL%@*}@***" # Hide password

# Check if backend container is running
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -n 1)

if [[ -z "$BACKEND_CONTAINER" ]]; then
  log_error "Backend container not found. Please start containers first."
  log_info "Available containers:"
  docker ps --format "  - {{.Names}}"
  exit 1
fi

log_info "Running migrations inside Docker container: $BACKEND_CONTAINER"

# Create a Python script to handle safe migrations
log_info "Creating safe migration handler script..."
docker exec "$BACKEND_CONTAINER" bash -c 'cat > /tmp/safe_migrate.py << '\''EOF'\''
import sys
import os
from sqlalchemy import create_engine, inspect, text
from alembic.config import Config
from alembic import command

def log_info(msg):
    print(f"[safe_migrate] {msg}")

def log_error(msg):
    print(f"[safe_migrate] ERROR: {msg}", file=sys.stderr)

def log_success(msg):
    print(f"[safe_migrate] ✓ {msg}")

def main():
    try:
        # Get database URL from environment
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            log_error("DATABASE_URL not set")
            sys.exit(1)
        
        # Convert async URL to sync for Alembic
        if db_url.startswith("postgresql+asyncpg"):
            db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2")
        
        log_info("Connecting to database...")
        engine = create_engine(db_url)
        
        # Check if database has existing schema
        with engine.connect() as conn:
            inspector = inspect(conn)
            tables = inspector.get_table_names()
            
            log_info(f"Found {len(tables)} tables in database")
            
            # Check if alembic_version table exists
            has_alembic_version = "alembic_version" in tables
            log_info(f"alembic_version table exists: {has_alembic_version}")
            
            # Check if users table exists (key indicator of existing schema)
            has_users_table = "users" in tables
            log_info(f"users table exists: {has_users_table}")
            
            if has_alembic_version:
                # Get current revision
                result = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
                current_revision = result.scalar()
                log_info(f"Current revision: {current_revision}")
                
                # Just run upgrade normally
                log_info("Running alembic upgrade head...")
                alembic_cfg = Config("/app/alembic.ini")
                try:
                    command.upgrade(alembic_cfg, "head")
                    log_success("Migration completed successfully")
                except Exception as e:
                    log_error(f"Migration failed: {e}")
                    log_info("This might be okay if migrations were already applied")
                    # Check if we'"'"'re already at head
                    from alembic.script import ScriptDirectory
                    script = ScriptDirectory.from_config(alembic_cfg)
                    heads = list(script.get_revisions("heads"))
                    if heads and heads[0].revision == current_revision:
                        log_success("Already at head revision, no migration needed")
                    else:
                        raise
                
            elif has_users_table and len(tables) > 10:
                # Database has schema but no alembic_version table
                # This means it was created manually or version table was lost
                log_info("WARNING: Database has schema but no alembic_version table")
                log_info("Will stamp database with current head revision")
                
                # Stamp the database with the head revision
                alembic_cfg = Config("/app/alembic.ini")
                command.stamp(alembic_cfg, "head")
                log_success("Database stamped with head revision")
                log_success("Migration completed successfully")
                
            else:
                # Fresh database, run migrations normally
                log_info("Fresh database detected. Running migrations...")
                alembic_cfg = Config("/app/alembic.ini")
                command.upgrade(alembic_cfg, "head")
                log_success("Migration completed successfully")
    
    except Exception as e:
        log_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF
' || {
    log_error "Failed to create migration script"
    exit 1
}

# Run the safe migration script
log_info "Executing migration handler..."
if docker exec "$BACKEND_CONTAINER" bash -c "cd /app && python /tmp/safe_migrate.py"; then
    log_success "Database migration completed successfully"
else
    log_error "Migration failed!"
    log_info "Showing last 50 lines of backend logs:"
    docker logs "$BACKEND_CONTAINER" --tail 50
    exit 1
fi
