import logging
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from app.core.llm import AikaLLM
from app.core.memory import AikaMemory

# Set up logging
logging.basicConfig(
    filename="logs/chat.log",  # Log file
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

app = FastAPI()
llm = AikaLLM()

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

    # Get conversation history from memory
    history = AikaMemory.get_memory(user_id)
    
    # Get response from OpenAI
    response = llm.chat(message, history)
    
    # Save the interaction to memory
    AikaMemory.save_memory(user_id, message)
    
    # Also save the AI's response to memory
    history = AikaMemory.get_memory(user_id)
    history.append({"role": "assistant", "content": response})
    AikaMemory.save_memory_direct(user_id, history)

    # Log request and response
    logging.info(f"User: {user_id} | Message: {message} | Response: {response}")

    return {"response": response}