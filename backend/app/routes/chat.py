from fastapi import APIRouter, Depends
from app.core.llm import AikaLLM
from app.core.memory import AikaMemory
from pydantic import BaseModel

router = APIRouter()
llm = AikaLLM()

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: str = None
    model: str = None  # Add optional model parameter

@router.post("/")
async def chat_with_aika(request: ChatRequest):
    history = AikaMemory.get_memory(request.user_id)
    response = llm.chat(request.message, history, request.model)
    AikaMemory.save_memory(request.user_id, request.message)
    return {"response": response}
