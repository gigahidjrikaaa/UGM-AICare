import json
import logging
from fastapi import FastAPI, requests # type: ignore
from datetime import datetime, timezone
from app.database import get_db, init_db
from sqlalchemy import text
from app.routes import email, docs, chat, feedback, link_did, internal, journal, summary, profile
from contextlib import asynccontextmanager
from app.core.scheduler import start_scheduler, shutdown_scheduler
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import os
from dotenv import load_dotenv

from app.core.memory import get_redis_client

load_dotenv()

# Initialize database
init_db()

# Set up logging
# Ensure logs directory exists
log_dir = "logs" if os.getenv("APP_ENV") != "production" else "/tmp/logs"
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "chat.log")

# Simplified log file existence check for clarity
if os.getenv("APP_ENV") != "production" and not os.path.exists(log_file):
    try:
        with open(log_file, "w") as f:
            f.write(f"Log file created at {datetime.now()}\n")
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

console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logging.getLogger().addHandler(console_handler) # Add to root logger
logging.getLogger().setLevel(logging.INFO) # Ensure root logger level is set

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    logger.info("Application startup...")
    start_scheduler() # Start the scheduler
    yield
    # Code to run on shutdown
    logger.info("Application shutdown...")
    shutdown_scheduler() # Shut down the scheduler

# FastAPI app instance with lifespan context manager
app = FastAPI(
    title="Aika Chatbot API", 
    description="API for Aika Chatbot - UGM AI Care. Uses FastAPI.",
    version="0.1",
    lifespan=lifespan, # Use the async context manager for startup/shutdown
)

# Add CORS middleware
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # Allow all origins. Change to FRONTEND_URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Including API routers...")

app.include_router(docs.router, prefix="/api/v1", tags=["Documents"]) # Added prefix/tag consistency
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"]) # Use /api/v1 prefix
app.include_router(feedback.router, prefix="/api/v1", tags=["Feedback"]) # Added prefix/tag consistency
app.include_router(link_did.router, prefix="/api/v1", tags=["Link DID"]) # Added prefix/tag consistency)

app.include_router(email.router) 
app.include_router(journal.router)
app.include_router(internal.router) 
app.include_router(summary.activity_router) # This will have prefix /api/v1/activity-summary
app.include_router(summary.user_data_router)  # This will have prefix /api/v1/user
app.include_router(profile.router)
# logger.info(f"List of routers (/api/v1): {app.routes}")
logger.info(f"Allowed origins: {origins}")

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
    db = next(get_db())
    try:
        # Execute a simple query to check the database connection
        result = db.execute(text("SELECT 1")).scalar()
        if result == 1:
            return {"status": "healthy", "db_status": "connected"}
        else:
            return {"status": "unhealthy", "db_status": "not connected"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "db_status": str(e)}
    finally:
        db.close()
        logger.debug("Database session closed after health check.")
    raise HTTPException(status_code=403, detail="Invalid API key")

@app.get("/health/redis")
async def redis_health_check():
    """Redis health check endpoint"""
    logger.info("Redis health check endpoint accessed")
    try:
        # Assuming you have a Redis client instance named `redis_client`
        redis_client = get_redis_client()  # Replace with your actual Redis client initialization
        pong = redis_client.ping()
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
        
        response = requests.get(frontend_url)
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