# backend/Dockerfile
# Multi-stage build for a more efficient and secure container

# ---- Build Stage (builder) ----
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install essential build tools (no Rust needed for binary wheels)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev libpq-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy only the requirements file to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies using BINARY wheels where possible
# --prefer-binary: Use pre-built wheels instead of compiling from source
# This avoids needing Rust compiler for cryptography and other packages
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip wheel --wheel-dir /app/wheels --prefer-binary -r requirements.txt


# ---- Final Stage (production) ----
FROM python:3.11-slim-bookworm

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install runtime system dependencies, including dos2unix and curl (for health checks)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 \
        dos2unix \
        postgresql-client \
        curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy pre-compiled wheels from the builder stage
COPY --from=builder /app/wheels /wheels

# Install Python dependencies from wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels \
    && python -m spacy download xx_ent_wiki_sm || true \
    && python -m spacy download en_core_web_sm || true

# Copy the entire application code from the build context (./backend)
COPY --chown=appuser:appgroup . .

# Find, convert line endings, and set permissions for all shell scripts
RUN find /app/scripts -name "*.sh" -exec dos2unix {} + -exec chmod +x {} +

# Create and set permissions for the logs directory
RUN mkdir -p /app/logs && \
    chown -R appuser:appgroup /app/logs && \
    chmod -R 750 /app/logs

RUN mkdir -p /app/alembic/versions && \
    chown -R appuser:appgroup /app/alembic/versions && \
    chmod -R 750 /app/alembic/versions

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8000

# Set the command to start the application.
# Using shell form to allow environment variable expansion for WORKERS_PER_CORE.
CMD exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --workers ${WORKERS_PER_CORE:-4} --worker-tmp-dir /dev/shm --bind 0.0.0.0:8000
