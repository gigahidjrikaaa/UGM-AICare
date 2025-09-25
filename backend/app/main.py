import json
import logging
from fastapi import FastAPI, Request as FastAPIRequest # type: ignore
from datetime import datetime, timezone
from app.database import init_db, close_db
from sqlalchemy import text
from app.routes import (
    auth,
    email,
    chat,
    feedback,
    link_did,
    internal,
    journal,
    journal_prompts,
    summary,
    profile,
    session_events,
    appointments,
    admin,
    agents,
    surveys,
    cbt_modules,
    triage,
    langgraph,
    langgraph_analytics,
    clinical_analytics_routes,
)
from contextlib import asynccontextmanager
from app.core.scheduler import start_scheduler, shutdown_scheduler
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from app.utils.env_check import check_env
import os
from dotenv import load_dotenv

from app.core.memory import get_redis_client

load_dotenv()

# This call is being moved to the lifespan event handler to avoid race conditions.
# init_db()

import httpx

# Set up logging
# Ensure logs directory exists
log_dir = "logs" if os.getenv("APP_ENV") != "production" else "/tmp/logs"
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "chat.log")

import aiofiles # type: ignore

# Simplified log file existence check for clarity
if os.getenv("APP_ENV") != "production" and not os.path.exists(log_file):
    try:
        async def create_log_file():
            async with aiofiles.open(log_file, "w") as f:
                await f.write(f"Log file created at {datetime.now()}\n")
        import asyncio
        asyncio.run(create_log_file())
    except IOError as e:
        print(f"Warning: Could not create log file {log_file}: {e}") # Use print/stderr for early errors


log_config = {
    "level": logging.INFO,
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
}

# Configure file logging only if not in production OR if specifically needed
if os.getenv("APP_ENV") != "production":
     log_config["filename"] = log_file
     log_config["filemode"] = "a" # Append mode

logging.basicConfig(**log_config)
logger = logging.getLogger(__name__) # Get a logger for main.py itself

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    """
    logger.info("Starting application lifespan...")
    # Initialize the database
    await init_db()
    # Start the background scheduler
    start_scheduler()
    yield
    # Clean up resources on shutdown
    logger.info("Shutting down application lifespan...")
    shutdown_scheduler()
    # Close database connections
    await close_db()

# You will need to add the lifespan manager to your FastAPI app instance.
# Find the line where you create your `app` and add `lifespan=lifespan`.
# For example, if you have `app = FastAPI()`, change it to:
app = FastAPI(
    title="Aika Chatbot API", 
    description="API for Aika Chatbot - UGM AI Care. Uses FastAPI.",
    version="0.1",
    lifespan=lifespan, # Use the async context manager for startup/shutdown
)

# Add CORS middleware
origins_env = os.getenv("ALLOWED_ORIGINS")
if origins_env:
    origins = [origin.strip() for origin in origins_env.split(",")]
else:
    # Fallback origins for development - ensure all possible origins are covered
    origins = [
        "http://localhost:4000",
        "http://127.0.0.1:4000", 
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://frontend:4000",  # Docker internal
        "http://backend:8000",    # Docker internal
        "https://aicare.ina17.com",
        "https://api.aicare.ina17.com"
    ]

logger.info(f"CORS configured with origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # Allow specific origins for security
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

logger.info("Including API routers...")

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(feedback.router)
app.include_router(link_did.router)

app.include_router(email.router)
app.include_router(journal.router)
app.include_router(journal_prompts.router)
app.include_router(internal.router)
app.include_router(session_events.session_event_router) # This will have prefix /api/v1/chat
app.include_router(summary.activity_router) # This will have prefix /api/v1/activity-summary
app.include_router(summary.user_data_router)  # This will have prefix /api/v1/user
app.include_router(profile.router)
app.include_router(admin.router)  # Admin endpoints
app.include_router(agents.router)
app.include_router(triage.router)
app.include_router(langgraph.router)
app.include_router(langgraph_analytics.router)
app.include_router(appointments.router)
app.include_router(surveys.router)
app.include_router(surveys.user_router)
app.include_router(cbt_modules.router)
app.include_router(clinical_analytics_routes.router)  # New clinical analytics endpoints
# logger.info(f"List of routers (/api/v1): {app.routes}")
logger.info(f"Allowed origins: {origins}")

# Check environment variables
check_env()


@app.get("/")
async def root():
    """Root endpoint for the API"""
    logger.info("Root endpoint accessed")
    return {
        "message": "Welcome to the Aika Chatbot API!",
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc"
        },
        "api_base_url": "/api/v1"
    }

@app.get("/cors-test")
async def cors_test():
    """Test endpoint to verify CORS configuration"""
    logger.info("CORS test endpoint accessed")
    return {
        "message": "CORS test successful",
        "origins": os.getenv("ALLOWED_ORIGINS", "*").split(","),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    logger.info("Health check endpoint accessed")
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),  # UTC timestamp (timezone-aware)
        "version": "0.1",
        "description": "Aika Chatbot API - UGM AI Care",
        "api_version": "v1",
        "api_base_url": "/api/v1",
        "allowed_origins": os.getenv("ALLOWED_ORIGINS", "*").split(","),
        "environment": os.getenv("APP_ENV", "development"),
        "database": {
            "status": "connected" if os.getenv("DATABASE_URL") else "not connected",
            "url": os.getenv("DATABASE_URL", "Not set"),
        },
    }

@app.get("/health/db")
async def db_health_check():
    """Database health check endpoint"""
    logger.info("Database health check endpoint accessed")
    from app.database import check_db_health
    try:
        # Use the async health check function
        is_healthy = await check_db_health()
        if is_healthy:
            return {
            "status": "healthy",
            "db_status": "connected",
            "db_url": os.getenv("DATABASE_URL", "Not set"),
            }
        else:
            return {"status": "unhealthy", "db_status": "not connected"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "db_status": str(e)}
    raise HTTPException(status_code=403, detail="Invalid API key")

@app.get("/health/redis")
async def redis_health_check():
    """Redis health check endpoint"""
    logger.info("Redis health check endpoint accessed")
    try:
        # Assuming you have a Redis client instance named `redis_client`
        redis_client = await get_redis_client()  # Replace with your actual Redis client initialization
        pong = await redis_client.ping()
        if pong:
            return {"status": "healthy", "redis_status": "connected"}
        else:
            return {"status": "unhealthy", "redis_status": "not connected"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {"status": "unhealthy", "redis_status": str(e)}

@app.get("/health/frontend")
async def frontend_health_check():
    """Frontend health check endpoint"""
    logger.info("Frontend health check endpoint accessed")
    try:
        # Assuming you have a way to check the frontend's health
        # This could be a simple HTTP request to the frontend URL
        frontend_url = os.getenv("FRONTEND_URL")
        if not frontend_url:
            raise ValueError("FRONTEND_URL is not set.")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(frontend_url)
        if response.status_code == 200:
            return {"status": "healthy", "frontend_status": "connected"}
        else:
            return {"status": "unhealthy", "frontend_status": f"HTTP {response.status_code}"}
    except Exception as e:
        logger.error(f"Frontend health check failed: {e}")
        return {"status": "unhealthy", "frontend_status": str(e)}

# For Render deployment
if __name__ == "__main__":
    import os
    import uvicorn
    import multiprocessing
    
    try:
        port = int(os.getenv("PORT", 8000))
        workers = min(multiprocessing.cpu_count() + 1, 4)  # A common practice: workers = CPU cores + 1
        
        uvicorn.run(
            "app.main:app", 
            host="0.0.0.0", 
            port=port, 
            reload=False,
            workers=workers,
            proxy_headers=True,
            forwarded_allow_ips="*"
        )
    except Exception as e:
        print(f"Failed to start server: {e}")
        exit(1)
