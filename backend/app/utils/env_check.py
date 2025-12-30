import os
import logging
from urllib.parse import urlparse, urlunparse


def _redact_url_credentials(raw_url: str) -> str:
    """Redact URL credentials for log output.

    This prevents leaking passwords (e.g., DATABASE_URL, REDIS_URL) into container logs.
    """
    try:
        parsed = urlparse(raw_url)
        if parsed.username is None:
            return raw_url

        hostname = parsed.hostname or ""
        if parsed.port is not None:
            hostname = f"{hostname}:{parsed.port}"

        auth = parsed.username
        if parsed.password is not None:
            auth = f"{auth}:***"

        netloc = f"{auth}@{hostname}"
        return urlunparse(parsed._replace(netloc=netloc))
    except Exception:
        return "<redacted>"

def check_env():
    """
    Checks for the presence of all required environment variables for the backend.
    Logs warnings for missing or empty variables.
    """
    # Core requirements for the backend to boot.
    required_env_vars = [
        # Database (managed service or local): SQLAlchemy async URL.
        "DATABASE_URL",

        # Auth/JWT
        "JWT_SECRET_KEY",

        # Internal API
        "INTERNAL_API_KEY",

        # FastAPI/Frontend
        "ALLOWED_ORIGINS",
        "FRONTEND_URL",
        "BACKEND_URL",

        # Encryption
        "EMAIL_ENCRYPTION_KEY",

        # App
        "APP_ENV",
        "PORT",

        # LLM/AI (required for most AI features)
        "GOOGLE_GENAI_API_KEY",
    ]

    # Optional features (only required if you use the corresponding integrations/routes).
    optional_env_vars = [
        # Neon/managed Postgres hint (optional, DATABASE_URL can include sslmode=require)
        "DB_SSL",

        # Redis (optional; if not configured, backend will fall back to MockRedis)
        "REDIS_URL",
        "REDIS_HOST",
        "REDIS_PORT",
        "REDIS_DB",
        "REDIS_USERNAME",
        "REDIS_PASSWORD",
        "REDIS_SSL",

        # Celery (only required if you run Celery workers)
        "CELERY_BROKER_URL",
        "CELERY_RESULT_BACKEND",

        # Object storage (MinIO / S3-compatible)
        "MINIO_ENDPOINT",
        "MINIO_ACCESS_KEY",
        "MINIO_SECRET_KEY",
        "MINIO_BUCKET",
        "MINIO_SECURE",

        # Email sending (only required if you send emails)
        "EMAIL_USERNAME",
        "EMAIL_PASSWORD",
        "EMAIL_SMTP_SERVER",
        "EMAIL_SMTP_PORT",
    ]

    print("--- Backend Environment Variable Check (Required) ---")
    for var in required_env_vars:
        value = os.environ.get(var)
        if value is None:
            logging.warning(f"ENV CHECK: {var} is UNDEFINED.")
        elif value == "":
            logging.warning(f"ENV CHECK: {var} is an EMPTY STRING.")
        else:
            if var in ["DATABASE_URL", "REDIS_HOST", "REDIS_PORT", "ALLOWED_ORIGINS", "FRONTEND_URL", "APP_ENV", "PORT"]:
                if var in {"DATABASE_URL"}:
                    safe_value = _redact_url_credentials(value)
                    print(f"ENV CHECK: {var} is SET to: \"{safe_value}\"")
                else:
                    print(f"ENV CHECK: {var} is SET to: \"{value}\"")
            else:
                print(f"ENV CHECK: {var} is SET (value hidden for security).")

    print("--- Backend Environment Variable Check (Optional) ---")
    for var in optional_env_vars:
        value = os.environ.get(var)
        if value is None:
            continue
        if value == "":
            logging.warning(f"ENV CHECK: {var} is set but EMPTY STRING.")
            continue
        if var in ["REDIS_URL", "REDIS_HOST", "REDIS_PORT", "MINIO_ENDPOINT", "MINIO_BUCKET"]:
            if var in {"REDIS_URL"}:
                safe_value = _redact_url_credentials(value)
                print(f"ENV CHECK: {var} is SET to: \"{safe_value}\"")
            else:
                print(f"ENV CHECK: {var} is SET to: \"{value}\"")
        else:
            print(f"ENV CHECK: {var} is SET (value hidden for security).")

    print("--- End Backend Environment Variable Check ---")