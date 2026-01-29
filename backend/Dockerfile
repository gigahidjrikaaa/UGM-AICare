# syntax=docker/dockerfile:1.6

# backend/Dockerfile
# Multi-stage build for a more efficient and secure container

# ---- Build Stage (builder) ----
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Conservative defaults for Python/pip in containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install essential build tools (no Rust needed for binary wheels)
ARG DEBIAN_FRONTEND=noninteractive
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get -o Acquire::Retries=3 update && \
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
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Sensible default (platforms like Coolify typically override this)
ENV PORT=22001

# Install runtime system dependencies.
# NOTE: postgresql-client is only needed if you exec into the container and run psql-based maintenance scripts.
ARG DEBIAN_FRONTEND=noninteractive
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get -o Acquire::Retries=3 update && \
    apt-get install -y --no-install-recommends \
        libpq5 \
        dos2unix \
        postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy pre-compiled wheels from the builder stage
COPY --from=builder /app/wheels /wheels

# Copy requirements to guarantee deterministic installation from wheels
COPY requirements.txt ./requirements.txt

# Install Python dependencies strictly from wheels.
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

# Optional: download SpaCy models at build time (requires network access)
ARG DOWNLOAD_SPACY_MODELS=0
RUN if [ "$DOWNLOAD_SPACY_MODELS" = "1" ]; then \
        python -m spacy download xx_ent_wiki_sm || true; \
        python -m spacy download en_core_web_sm || true; \
    fi

# Copy the entire application code from the build context (./backend)
COPY --chown=appuser:appgroup . .

# Find, convert line endings, and set permissions for all shell scripts
RUN if [ -d /app/scripts ]; then \
        find /app/scripts -name "*.sh" -exec dos2unix {} + -exec chmod +x {} +; \
    fi

# Create and set permissions for the logs directory
RUN mkdir -p /app/logs && \
    chown -R appuser:appgroup /app/logs && \
    chmod -R 750 /app/logs

RUN if [ -d /app/alembic ]; then \
        mkdir -p /app/alembic/versions && \
        chown -R appuser:appgroup /app/alembic/versions && \
        chmod -R 750 /app/alembic/versions; \
    fi

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 22001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import os,sys,urllib.request; port=os.getenv('PORT','22001'); url=f'http://127.0.0.1:{port}/health';\
try:\
    urllib.request.urlopen(url, timeout=3).read();\
except Exception:\
    sys.exit(1)"

# Set the command to start the application.
# Using shell form to allow environment variable expansion for WORKERS_PER_CORE.
CMD exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --workers ${WORKERS_PER_CORE:-4} --worker-tmp-dir /dev/shm --bind 0.0.0.0:${PORT:-22001}
