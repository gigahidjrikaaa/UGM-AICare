import os
import logging

def check_env():
    """
    Checks for the presence of all required environment variables for the backend.
    Logs warnings for missing or empty variables.
    """
    required_env_vars = [
        # Database
        "DATABASE_URL",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",

        # Redis
        "REDIS_HOST",
        "REDIS_PORT",
        # Optional: "REDIS_DB", "REDIS_USERNAME", "REDIS_PASSWORD"

        # Auth/JWT
        "JWT_SECRET_KEY",

        # Internal API
        "INTERNAL_API_KEY",

        # FastAPI/Frontend
        "ALLOWED_ORIGINS",
        "FRONTEND_URL",
        "BACKEND_URL",

        # Email
        "EMAIL_USERNAME",
        "EMAIL_PASSWORD",
        "EMAIL_SMTP_SERVER",
        "EMAIL_SMTP_PORT",

        # LLM/AI
        "TOGETHER_API_KEY",
        "GOOGLE_GENAI_API_KEY",

        # Blockchain
        "EDU_TESTNET_RPC_URL",
        "NFT_CONTRACT_ADDRESS",
        "BACKEND_MINTER_PRIVATE_KEY",

        # Twitter
        "TWITTER_BEARER_TOKEN",
        "TWITTER_API_KEY",
        "TWITTER_API_SECRET",
        "TWITTER_ACCESS_TOKEN",
        "TWITTER_ACCESS_SECRET",

        # Encryption
        "EMAIL_ENCRYPTION_KEY",

        # App
        "APP_ENV",
        "PORT",
    ]

    print("--- Backend Environment Variable Check ---")
    for var in required_env_vars:
        value = os.environ.get(var)
        if value is None:
            logging.warning(f"ENV CHECK: {var} is UNDEFINED.")
        elif value == "":
            logging.warning(f"ENV CHECK: {var} is an EMPTY STRING.")
        else:
            if var in ["DATABASE_URL", "REDIS_HOST", "REDIS_PORT", "ALLOWED_ORIGINS", "FRONTEND_URL", "APP_ENV", "PORT"]:
                print(f"ENV CHECK: {var} is SET to: \"{value}\"")
            else:
                print(f"ENV CHECK: {var} is SET (value hidden for security).")
    print("--- End Backend Environment Variable Check ---")