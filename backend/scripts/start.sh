#!/bin/sh
set -e # Exit immediately if a command exits with a non-zero status.

# Run database migrations
# Assuming Alembic is used, adjust if using another migration tool
echo "Running database migrations..."
alembic upgrade head

# Start the FastAPI application with Gunicorn
echo "Starting FastAPI application with Gunicorn..."
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --workers ${WORKERS_PER_CORE:-4} --worker-tmp-dir /dev/shm --bind 0.0.0.0:8000