import json
import logging
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from app.core.llm import AikaLLM
from app.core.memory import AikaMemory
from app.database import init_db
from app.routes import email, docs, chat
from typing import List, Optional, Union
from fastapi.middleware.cors import CORSMiddleware
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

if not os.path.exists(log_file) and os.getenv("APP_ENV") != "production":
    with open(log_file, "w") as f:
        f.write(f"Log file created at {datetime.now()}\n")
    
if os.getenv("APP_ENV") != "production":
    # Add a console handler in development
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
    logging.getLogger().addHandler(console_handler)

logging.basicConfig(
    filename=log_file if os.getenv("APP_ENV") != "production" else None,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

app = FastAPI(title="Aika Chatbot API", version="0.1")
llm = AikaLLM()

# Add CORS middleware
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # Allow all origins. Change to FRONTEND_URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the email router
app.include_router(email.router)

# Register the docs router
app.include_router(docs.router)

# Register the chat router
app.include_router(chat.router, prefix="/chat", tags=["chat"])

# Data Models
class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: Optional[str] = None
    model: Optional[str] = None  # Add optional model parameter

class ChatResponse(BaseModel):
    response: Union[str, List[str]]
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Welcome to Aika Chatbot API"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# For Render deployment
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)