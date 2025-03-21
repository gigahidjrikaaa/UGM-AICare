from fastapi import APIRouter, Depends
from app.core.llm import AikaLLM
from app.core.memory import AikaMemory
from pydantic import BaseModel

router = APIRouter()
# Initialize LLM without a specific provider - it will use the default or env var
llm = AikaLLM()

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: str = None
    model: str = None  # Add optional model parameter

@router.post("/")
async def chat_with_aika(request: ChatRequest):
    # Get conversation history from memory
    history = AikaMemory.get_memory(request.user_id)

    # Request a response from the LLM
    response = llm.chat(request.message, history, request.model)

    # Save the user message to memory
    # AikaMemory.save_memory(request.user_id, request.message)

    # Save the conversation (both user message and system response)
    AikaMemory.save_memory(
        request.user_id, 
        {"role": "user", "content": request.message},
        request.conversation_id
    )
    
    # Also save assistant response
    AikaMemory.save_memory(
        request.user_id, 
        {"role": "assistant", "content": response},
        request.conversation_id
    )

    return {"response": response}
