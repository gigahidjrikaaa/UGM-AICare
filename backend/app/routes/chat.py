from fastapi import APIRouter, Depends
from app.core.llm import AikaLLM
from app.core.memory import AikaMemory

router = APIRouter()
llm = AikaLLM()

@router.post("/")
async def chat_with_aika(user_id: str, message: str):
    history = AikaMemory.get_memory(user_id)
    response = llm.chat(message, history)
    AikaMemory.save_memory(user_id, message)
    return {"response": response}
