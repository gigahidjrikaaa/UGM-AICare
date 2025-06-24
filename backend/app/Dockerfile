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

# Install bash and netcat, required by the startup scripts
RUN apt-get update && apt-get install -y bash netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Copy installed wheels from builder stage
COPY --from=builder /app/wheels /wheels

# Install dependencies from wheels
RUN pip install --no-cache-dir /wheels/*

# Copy application code
# Note: Ensure .dockerignore is properly configured to exclude .git, .vscode, etc.
COPY . .

# Copy startup scripts and make them executable
COPY ./scripts /app/scripts
RUN chmod +x /app/scripts/*.sh

# Change ownership of the app directory to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Set the entrypoint for the container to our startup script
ENTRYPOINT ["/app/scripts/start.sh"]

# Expose the port the app runs on
EXPOSE 8000