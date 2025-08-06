from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_db
from app.models import Conversation, User # Assuming User is needed for auth
from app.dependencies import get_current_active_user # If you want to ensure only an authenticated user can end their own session
from app.routes.chat import summarize_and_save
import logging

logger = logging.getLogger(__name__)
session_event_router = APIRouter(prefix="/api/v1/chat", tags=["Chat Session Events"])

class SessionEndRequest(BaseModel):
    session_id: str

@session_event_router.post("/end-session", status_code=status.HTTP_202_ACCEPTED)
async def end_chat_session(
    request: SessionEndRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db), # For querying user_id
    # current_user: User = Depends(get_current_active_user) # Optional: ensure user matches session
):
    logger.info(f"Received request to end session: {request.session_id}")

    # Find the user_id associated with this session_id
    # This assumes that the session_id is unique enough or you might need
    # current_user.id to scope the query if session_ids are not globally unique.
    from sqlalchemy import select, desc
    stmt = select(Conversation).where(Conversation.session_id == request.session_id).order_by(desc(Conversation.timestamp))
    result = await db.execute(stmt)
    last_message_in_session = result.first()

    if not last_message_in_session:
        logger.warning(f"No conversation found for session_id: {request.session_id} to end and summarize.")
        # Still return 202 not to block client, or 404 if strictness is needed
        return {"message": "Session end acknowledged, no active conversation found to summarize."}

    user_id = last_message_in_session.user_id

    # Optional: Verify current_user.id matches user_id from session if auth is used
    # if current_user.id != user_id:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to end this session")

    logger.info(f"Scheduling summarization for user {user_id}, session {request.session_id} due to explicit end.")
    background_tasks.add_task(summarize_and_save, user_id, request.session_id)
    return {"message": "Session end acknowledged, summarization scheduled."}