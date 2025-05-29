# filepath: d:\Ngoding Moment\Github\UGM-AICare\backend\app\Dockerfile
# Multi-stage build for a more efficient and secure container

# ---- Build Stage ----
FROM python:3.13-slim-bookworm as builder

# Set work directory
WORKDIR /app

# Install build dependencies (if any beyond what python image provides for wheel building)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    build-essential \
    # Add any other specific build-time system dependencies if needed by other packages
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
# Using --no-deps here assumes all dependencies are in requirements.txt
# Consider --no-binary :all: for some packages if wheels are problematic, but usually not needed.
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt

# ---- Final Stage ----
FROM python:3.13-slim-bookworm

# Create a non-root user
RUN useradd -m -s /bin/bash appuser

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    # Add other necessary runtime ENV variables here if not sourced from .env via docker-compose
    APP_ENV=production

# Install runtime system dependencies (e.g., for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    # Add any other runtime system deps
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder and install
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

# Copy application code
# Ensure .dockerignore is properly set up to exclude .git, .venv, __pycache__, etc.
COPY --chown=appuser:appuser . .

# Create necessary directories with proper permissions
# The log directory should match what's in your app's logging config for production
RUN mkdir -p /app/logs && chown -R appuser:appuser /app/logs

EXPOSE 8000

USER appuser

# Health check (adjust path if your health endpoint is different)
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Add startup script
COPY --chown=appuser:appuser ./scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENTRYPOINT ["/app/start.sh"]