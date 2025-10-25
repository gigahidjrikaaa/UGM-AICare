# filepath: d:\Ngoding Moment\Github\UGM-AICare\backend\app\Dockerfile
# Multi-stage build for a more efficient and secure container

# ---- Build Stage (builder) ----
FROM python:3.11-slim-bookworm as builder

WORKDIR /app

# Install essential build tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev build-essential curl && \
    curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Add Rust to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Copy only the requirements file to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies and compile them into wheels
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt


# ---- ONNX Model Build Stage ----
FROM python:3.11-slim-bookworm as model-builder

WORKDIR /app

# Install only dependencies needed for ONNX model export
RUN pip install --no-cache-dir \
    torch>=2.0.0 --index-url https://download.pytorch.org/whl/cpu \
    transformers>=4.41.0 \
    onnxruntime>=1.16.0

# Copy model export script
COPY scripts/ensure_onnx_model.py scripts/

# Build ONNX model (downloads from HuggingFace and exports)
RUN python scripts/ensure_onnx_model.py || echo "⚠️ ONNX model build failed, will retry at runtime"


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

# Install Python dependencies from wheels (EXCLUDING torch - not needed at runtime!)
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels \
    && python -m spacy download xx_ent_wiki_sm || true \
    && python -m spacy download en_core_web_sm || true

# Copy the entire application code from the build context (./backend)
COPY --chown=appuser:appgroup . .

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
