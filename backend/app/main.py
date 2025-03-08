import logging
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

# Set up logging
logging.basicConfig(
    filename="logs/chat.log",  # Log file
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

app = FastAPI()

class ChatRequest(BaseModel):
    user_id: str
    message: str

@app.get("/")
async def root():
    return {"message": "Welcome to Aika Chatbot API"}

@app.post("/chat/")
async def chat(request: ChatRequest):
    user_id = request.user_id
    message = request.message

    # Simulated AI response (replace with your AI logic)
    response = f"Hello {user_id}, I see that you said: '{message}'. How can I help you?"

    # Log request and response
    logging.info(f"User: {user_id} | Message: {message} | Response: {response}")

    return {"response": response}
