#!/bin/sh
set -e # Exit immediately if a command exits with a non-zero status.

# Run database migrations
echo "Running database migrations for PostgreSQL VM..."
# Specify the config file and the script directory if it's not the default 'alembic'
# The -x dir option tells alembic where the script directory is relative to the ini file.
# However, if script_location in alembic_pg_vm.ini is set correctly (e.g. to "alembic_pg_vm"),
# just -c should be enough.
alembic -c alembic_pg_vm.ini upgrade head

# Start the FastAPI application with Gunicorn
echo "Starting FastAPI application with Gunicorn..."
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --workers ${WORKERS_PER_CORE:-4} --worker-tmp-dir /dev/shm --bind 0.0.0.0:8000