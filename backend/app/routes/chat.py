from fastapi import APIRouter
from app.services.llm import get_ai_response

router = APIRouter()

@router.post("/chat")
def chat_with_ai(message: str, user_id: str):
    response = get_ai_response(message, user_id)
    return {"response": response}
