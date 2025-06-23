# filepath: d:\Ngoding Moment\Github\UGM-AICare\backend\app\Dockerfile
# Multi-stage build for a more efficient and secure container

# ---- Build Stage (builder) ----
FROM python:3.11-slim-bookworm as builder

# Set work directory
WORKDIR /app

COPY . /app

# Install essential build tools for Python packages and Rust
# Separating this from Rust installation for better layer caching
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    build-essential \
    curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Rust (needed for compiling some Python packages)
# This is a separate layer, so changes to apt packages above don't trigger a Rust reinstall
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable

# Add Rust to PATH for subsequent RUN commands in this stage
ENV PATH="/root/.cargo/bin:${PATH}"

# Verify Rust installation (optional, good for debugging)
RUN rustc --version && cargo --version

# Copy requirements file first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies and compile them into wheels
# Using --no-deps here assumes all dependencies are explicitly in requirements.txt
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt


# ---- Final Stage (production) ----
FROM python:3.11-slim-bookworm

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files to disc
# PYTHONUNBUFFERED: Forces stdin, stdout, and stderr to be totally unbuffered. Useful for logging.
# PYTHONPATH: Adds /app to Python's module search path.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    APP_ENV=production \
    # Ensure Gunicorn and Alembic can find their executables
    PATH="/home/appuser/.local/bin:${PATH}"
# Install runtime system dependencies
# - libpq5 is the runtime library for psycopg2-binary
# - Add any other essential runtime system dependencies here
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    libpq5 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy pre-compiled wheels from the builder stage
COPY --from=builder /app/wheels /wheels

# Add the wait script and make it executable
COPY ./wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Install Python dependencies from wheels
# This is faster than compiling them again and keeps the image cleaner
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && \
    rm -rf /wheels

# Copy application code into the container
# Ensure .dockerignore is properly set up to exclude .git, .venv, __pycache__, etc.
# This should come after installing dependencies to leverage Docker cache
COPY --chown=appuser:appgroup . .

# Create and set permissions for necessary directories (e.g., logs)
# Ensure the path /app/logs matches your application's logging configuration
RUN mkdir -p /app/logs && \
    chown -R appuser:appgroup /app/logs && \
    chmod -R 750 /app/logs # Or more restrictive if appropriate

# Switch to the non-root user
USER appuser

# Expose the port the application runs on
EXPOSE 8000

# Health check (adjust path if your health endpoint is different)
# Checks if the application is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Define the entrypoint for the container
# This will run migrations and then start Gunicorn
ENTRYPOINT ["sh", "-c", "echo 'Running database migrations for PostgreSQL VM...' && alembic -c alembic_pg_vm.ini upgrade head && echo 'Starting FastAPI application with Gunicorn...' && exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --workers ${WORKERS_PER_CORE:-4} --worker-tmp-dir /dev/shm --bind 0.0.0.0:8000"]