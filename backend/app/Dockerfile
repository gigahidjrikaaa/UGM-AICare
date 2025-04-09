# Multi-stage build for a more efficient and secure container

# ---- Build Stage ----
    FROM alpine:3.13-slim-bookworm as builder

    # Set work directory
    WORKDIR /app
    
    # Install build dependencies
    RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        python3-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # Install Python dependencies
    COPY requirements.txt .
    RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt
    
    # ---- Final Stage ----
    FROM alpine:3.13-slim-bookworm
    
    # Create a non-root user
    RUN useradd -m -s /bin/bash appuser
    
    # Set work directory
    WORKDIR /app
    
    # Set environment variables
    ENV PYTHONDONTWRITEBYTECODE=1 \
        PYTHONUNBUFFERED=1 \
        PYTHONPATH=/app
    
    # Install runtime dependencies
    RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # Copy wheels from builder and install
    COPY --from=builder /app/wheels /wheels
    RUN pip install --no-cache /wheels/* && rm -rf /wheels
    
    # Copy application code
    COPY --chown=appuser:appuser . .
    
    # Create necessary directories with proper permissions
    RUN mkdir -p /app/logs && chown -R appuser:appuser /app/logs
    
    # Expose port
    EXPOSE 8000
    
    # Switch to non-root user
    USER appuser
    
    # Health check
    HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
      CMD curl -f http://localhost:8000/health || exit 1
    
    # Add startup script
    COPY --chown=appuser:appuser ./scripts/start.sh /app/start.sh
    RUN chmod +x /app/start.sh
    
    # Entrypoint
    ENTRYPOINT ["/app/start.sh"]