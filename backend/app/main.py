import json
import logging
from fastapi import FastAPI # type: ignore
from datetime import datetime
from app.database import init_db
from app.routes import email, docs, chat, feedback, link_did, internal, journal, summary
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import os
from dotenv import load_dotenv

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

app = FastAPI(
    title="Aika Chatbot API", 
    description="API for the UGM-AICare application, supporting multiple LLM providers.",
    version="0.1"
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
app.include_router(summary.router)
# logger.info(f"List of routers (/api/v1): {app.routes}")
logger.info(f"Allowed origins: {origins}")

@app.get("/")
async def root():
    return {"message": "Welcome to the Aika Chatbot API!"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# For Render deployment
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)