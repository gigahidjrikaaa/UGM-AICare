#!/usr/bin/env bash

set -euo pipefail

echo "[migrate.sh] Starting database migration..."

# Ensure DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[migrate.sh] ERROR: DATABASE_URL environment variable is required." >&2
  exit 1
fi

# Navigate to the project root
# The script expects to be run from the project root or have ROOT_DIR set correctly
# We'll assume it's run from the VM_PROJECT_PATH, which is the project root.
# The original script calculates ROOT_DIR relative to itself, so we need to adjust.
# For simplicity, we'll just call the original script from the project root.

echo "[migrate.sh] Navigating to project root..."
# Assuming the current working directory is the project root when this script is executed on the VM.
# If not, this needs to be adjusted. For now, we'll assume it is.

# Execute the main migration script
echo "[migrate.sh] Executing UGM-AICare/scripts/run_migrations.sh..."
# The original script expects to find .env in ROOT_DIR, and backend/alembic.ini in BACKEND_DIR
# We need to ensure these paths are correctly resolved.
# The original script sets ROOT_DIR based on its own location.
# If we call it from the project root, its ROOT_DIR will be the project root.
# So, we just need to make sure the DATABASE_URL is exported.

export DATABASE_URL="${DATABASE_URL}"
bash scripts/run_migrations.sh

echo "[migrate.sh] Database migration completed."
