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
from fastapi.middleware.cors import CORSMiddleware
import os
import dotenv 

# Load environment variables from .env file
dotenv.load_dotenv()

# Initialize database
init_db()

# Set up logging
logging.basicConfig(
    filename="logs/chat.log",  # Log file
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

app = FastAPI()
llm = AikaLLM()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Allow all origins. Change to FRONTEND_URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the email router
app.include_router(email.router)

# Register the docs router
app.include_router(docs.router)

class ChatRequest(BaseModel):
    user_id: str
    message: str

@app.get("/")
async def root():
    return {"message": "Welcome to Aika Chatbot API"}

@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        user_id = request.user_id
        message = request.message
        
        # Add detailed logging for debugging
        print(f"\n=== New Request from {user_id} ===")
        print(f"Message: {message}")

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