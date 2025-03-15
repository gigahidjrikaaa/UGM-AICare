import json
import logging
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from app.core.llm import AikaLLM
from app.core.memory import AikaMemory
from app.database import init_db
from app.routes import email
from app.routes import docs
from app.routes import router as chat_router
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
app.include_router(chat_router)

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: str = None

@app.get("/")
async def root():
    return {"message": "Welcome to Aika Chatbot API"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        user_id = request.user_id
        message = request.message
        
        # Add detailed logging for debugging
        print(f"\n=== New Request from {user_id} ===")
        print(f"Message: {message}")

        # Check connection to Redis
        AikaMemory.check_connection()

        # Get conversation history from memory
        history = AikaMemory.get_memory(user_id)
        
        # Debug history content
        print(f"Retrieved history length: {len(history)}")
        for idx, entry in enumerate(history):
            print(f"History entry {idx}: role={entry.get('role')}, content={entry.get('content')[:50]}...")
        
        # Get response from LLM
        response = llm.chat(message, history)
        
        # Save the interaction to memory
        AikaMemory.save_memory(user_id, message)
        
        # Also save the AI's response to memory
        history = AikaMemory.get_memory(user_id)
        # print(f"History: {json.dumps(history)}")
        
        history.append({"role": "assistant", "content": response})
        AikaMemory.save_memory_direct(user_id, history)

        # Log request and response
        logging.info(f"User: {user_id} | Message: {message} | Response: {response}")

        return {"response": response}
    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return {"error": str(e)}, 500
    
# For Render deployment
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)