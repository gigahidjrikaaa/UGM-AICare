# filepath: d:\Ngoding Moment\Github\UGM-AICare\backend\app\Dockerfile
# Multi-stage build for a more efficient and secure container

# ---- Build Stage (builder) ----
FROM python:3.11-slim-bookworm as builder

WORKDIR /app

# Install essential build tools (Rust needed for cryptography, bcrypt; cmake for onnx)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc g++ python3-dev build-essential curl cmake && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Rust (required for cryptography package)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --default-toolchain stable --profile minimal && \
    rm -rf /root/.cargo/registry

# Add Rust to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Copy only the requirements file to leverage Docker cache
COPY requirements.txt .

# Install CPU-only PyTorch FIRST to avoid CUDA dependencies
# This ensures all subsequent builds use the CPU version
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel && \
    pip install --index-url https://download.pytorch.org/whl/cpu torch>=2.0.0

# Create requirements without torch to prevent CUDA wheel creation
# Remove torch and triton (torch dependency) from requirements
RUN grep -v -E "^torch>=|^triton" requirements.txt > requirements-no-torch.txt

# Use BuildKit cache mount for pip to speed up repeated builds
# Build wheels ONLY for non-torch dependencies
# --prefer-binary speeds up builds by using pre-built wheels when available
RUN --mount=type=cache,target=/root/.cache/pip \
    pip wheel --prefer-binary --wheel-dir /app/wheels -r requirements-no-torch.txt

# ---- ONNX Model Build Stage ----
FROM python:3.11-slim-bookworm as model-builder

WORKDIR /app

# Install only minimal dependencies needed for model export
# Use BuildKit cache mount to speed up pip installs
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install --upgrade pip setuptools wheel && \
    python -m pip install --index-url https://download.pytorch.org/whl/cpu \
        torch>=2.0.0 && \
    python -m pip install \
        transformers>=4.41.0 \
        onnxruntime>=1.16.0

# Copy model export script
COPY scripts/ensure_onnx_model.py scripts/

# Build ONNX model with caching support
# The HuggingFace cache will be preserved across builds with BuildKit
RUN --mount=type=cache,target=/root/.cache/huggingface \
    python scripts/ensure_onnx_model.py || echo "⚠️ ONNX model build failed, will retry at runtime"


# ---- Final Stage (production) ----
FROM python:3.11-slim-bookworm

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install runtime system dependencies, including dos2unix
RUN apt-get update &&     apt-get install -y --no-install-recommends libpq5 dos2unix postgresql-client &&     apt-get clean &&     rm -rf /var/lib/apt/lists/*

# Copy pre-compiled wheels from the builder stage
COPY --from=builder /app/wheels /wheels

# Copy ONNX model from model-builder stage (if successful)
COPY --from=model-builder /app/models/onnx /app/models/onnx

# Install CPU-only PyTorch FIRST in production (since it's not in wheels)
# Then install remaining dependencies from wheels
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install --index-url https://download.pytorch.org/whl/cpu torch>=2.0.0 && \
    pip install --no-index --find-links=/wheels /wheels/* && \
    rm -rf /wheels && \
    python -m spacy download xx_ent_wiki_sm || true && \
    python -m spacy download en_core_web_sm || true

# Copy the entire application code from the build context (./backend)
COPY --chown=appuser:appgroup . .

# Create alembic.ini if it doesn't exist (it's in .gitignore)
# This ensures migrations can run inside the container
RUN if [ ! -f /app/alembic.ini ]; then \
      echo "[alembic]" > /app/alembic.ini && \
      echo "script_location = alembic" >> /app/alembic.ini && \
      echo "prepend_sys_path = ." >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[alembic:exclude]" >> /app/alembic.ini && \
      echo "tables = spatial_ref_sys" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[loggers]" >> /app/alembic.ini && \
      echo "keys = root,sqlalchemy,alembic" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[handlers]" >> /app/alembic.ini && \
      echo "keys = console" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[formatters]" >> /app/alembic.ini && \
      echo "keys = generic" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[logger_root]" >> /app/alembic.ini && \
      echo "level = WARN" >> /app/alembic.ini && \
      echo "handlers = console" >> /app/alembic.ini && \
      echo "qualname =" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[logger_sqlalchemy]" >> /app/alembic.ini && \
      echo "level = WARN" >> /app/alembic.ini && \
      echo "handlers =" >> /app/alembic.ini && \
      echo "qualname = sqlalchemy.engine" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[logger_alembic]" >> /app/alembic.ini && \
      echo "level = INFO" >> /app/alembic.ini && \
      echo "handlers =" >> /app/alembic.ini && \
      echo "qualname = alembic" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[handler_console]" >> /app/alembic.ini && \
      echo "class = StreamHandler" >> /app/alembic.ini && \
      echo "args = (sys.stderr,)" >> /app/alembic.ini && \
      echo "level = NOTSET" >> /app/alembic.ini && \
      echo "formatter = generic" >> /app/alembic.ini && \
      echo "" >> /app/alembic.ini && \
      echo "[formatter_generic]" >> /app/alembic.ini && \
      echo "format = %%(levelname)-5.5s [%%(name)s] %%(message)s" >> /app/alembic.ini && \
      echo "datefmt = %%H:%%M:%%S" >> /app/alembic.ini && \
      chown appuser:appgroup /app/alembic.ini; \
    fi

# Find, convert line endings, and set permissions for all shell scripts
# This is still needed for the 'migrate' service which uses wait-for-it.sh
RUN find /app/scripts -name "*.sh" -exec dos2unix {} + -exec chmod +x {} +

# Create and set permissions for the logs directory
RUN mkdir -p /app/logs &&     chown -R appuser:appgroup /app/logs &&     chmod -R 750 /app/logs

RUN mkdir -p /app/alembic/versions &&     chown -R appuser:appgroup /app/alembic/versions &&     chmod -R 750 /app/alembic/versions

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8000

# Set the command to start the application.
# This replaces the need for start.sh for the backend service.
# Using shell form to allow environment variable expansion for WORKERS_PER_CORE.
CMD exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --workers ${WORKERS_PER_CORE:-4} --worker-tmp-dir /dev/shm --bind 0.0.0.0:8000
