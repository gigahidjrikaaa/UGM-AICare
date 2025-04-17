# backend/app/routes/chat.py
import json
from sqlalchemy.orm import Session as DBSession # DBSession is a common alias for SQLAlchemy session
from sqlalchemy import desc
from fastapi import APIRouter, HTTPException, Body, Depends, status, BackgroundTasks, Query # type: ignore
from typing import List, Dict, Optional, Literal
from datetime import datetime, timedelta # Import datetime
import logging

# Adjust import based on your project structure
from app.database import get_db, SessionLocal
from app.models import User, Conversation, UserSummary
from app.core import llm
from app.dependencies import get_current_active_user
from app.schemas import ChatRequest, ChatResponse, ConversationHistoryItem, SummarizeRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__) # Create a logger for this module

router = APIRouter()

# --- Helper Function for Background Task Session ---
def get_background_db():
    """Dependency to get a DB session specifically for background tasks."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoint (Async) ---
# Add dependencies=[Depends(get_current_user)] if you have authentication
@router.post("/chat", response_model=ChatResponse)
async def handle_chat_request(
    request: ChatRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(), # For background tasks
    current_user: User = Depends(get_current_active_user) # Get authenticated user
    ):
    """
    Handles chat, detects session changes to trigger summarization of the *previous* session,
    and injects the *latest available* summary into the context for the *current* session.
    """
    db: DBSession = next(get_db()) # Get the session for this request
    try:
        user_message_content = request.history[-1]['content']
        current_session_id = request.session_id
        user_id = current_user.id # Use ID from the authenticated user object

        # --- 2. Detect Session Change and Trigger Previous Summary ---
        previous_session_id_to_summarize = None
        latest_message_from_user = db.query(Conversation)\
            .filter(Conversation.user_id == user_id)\
            .order_by(Conversation.timestamp.desc())\
            .first()

        is_new_session = False # Flag to track if it's a new session
        if latest_message_from_user and latest_message_from_user.session_id != current_session_id:
            previous_session_id_to_summarize = latest_message_from_user.session_id
            is_new_session = True
            logger.info(f"New session detected ({current_session_id}) for user {user_id}. Previous session was {previous_session_id_to_summarize}.")
            # --- Trigger background task ---
            # Pass IDs, not the full DB session object
            background_tasks.add_task(summarize_and_save, user_id, previous_session_id_to_summarize)
        elif not latest_message_from_user:
            is_new_session = True # First message ever is technically a new session start
            logger.info(f"First ever message for user {user_id} in session {current_session_id}.")
        # else: same session


        # --- 3. Prepare History for LLM - Inject Summary on New Session Start ---
        history_for_llm = request.history

        # Fetch latest summary only if it's a new session starting
        if is_new_session:
            latest_summary = db.query(UserSummary)\
                .filter(UserSummary.user_id == user_id)\
                .order_by(UserSummary.timestamp.desc())\
                .first()

            if latest_summary:
                summary_injection = {
                    "role": "system",
                    "content": f"Reminder of key points from a previous conversation (summarized on {latest_summary.timestamp.strftime('%Y-%m-%d')}): {latest_summary.summary_text}"
                }
                history_for_llm = [summary_injection] + history_for_llm
                logger.info(f"Injected previous summary for user {user_id} into LLM context for new session.")

        # --- 4. Call the LLM ---
        generated_text = await llm.generate_response(
            history=history_for_llm,
            provider=request.provider,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system_prompt=request.system_prompt
        )

        if generated_text.startswith("Error:"):
            logger.error(f"LLM generation failed for user {user_id}, provider {request.provider}: {generated_text}")
            status_code = 400 if "API key" in generated_text or "Invalid history" in generated_text else 503
            raise HTTPException(status_code=status_code, detail=generated_text)

        # --- 5. Save the CURRENT conversation turn ---
        try:
            conversation_entry = Conversation(
                user_id=user_id,
                session_id=current_session_id,
                message=user_message_content,
                response=generated_text,
                timestamp=datetime.now()
            )
            db.add(conversation_entry)
            db.commit() # Commit within the request scope
        except Exception as e:
            db.rollback()
            logger.error(f"DB error saving conversation turn for user {user_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Could not save conversation turn.")

        # --- 6. Prepare and return the response ---
        actual_model_used = request.model or llm.DEFAULT_PROVIDERS.get(request.provider, "unknown")
        updated_history_for_frontend = request.history + [{"role": "assistant", "content": generated_text}]

        return ChatResponse(
            response=generated_text,
            provider_used=request.provider,
            model_used=actual_model_used,
            history=updated_history_for_frontend
        )

    except ValueError as e: # Handle Pydantic validation errors if they reach here
        logger.warning(f"Value error in /chat endpoint for user {current_user.id if current_user else 'unknown'}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e: # Catch-all for other unexpected errors
        logger.error(f"Unhandled exception in /chat endpoint for user {current_user.id if current_user else 'unknown'}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
    finally:
        db.close() # Close the session to avoid leaks
        pass


# --- Define the Summarization Function ---
async def summarize_and_save(user_id: int, session_id_to_summarize: str):
    """Fetches history, calls LLM to summarize, and saves to UserSummary table."""
    logger.info(f"Background Task: Starting summarization for user {user_id}, session {session_id_to_summarize}")
    # --- Use a dedicated DB session for the background task ---
    db: DBSession = next(get_background_db())
    try:
        # 1. Retrieve conversation history
        conversation_history = db.query(Conversation)\
            .filter(Conversation.session_id == session_id_to_summarize, Conversation.user_id == user_id)\
            .order_by(Conversation.timestamp.asc())\
            .all()

        if not conversation_history or len(conversation_history) < 2:
             logger.info(f"Background Task: Skipping summarization for session {session_id_to_summarize} (too short/no history).")
             return

        # 2. Format history for LLM
        history_lines = []
        for turn in conversation_history:
            history_lines.append(f"user: {turn.message}")
            history_lines.append(f"assistant: {turn.response}")
        formatted_history = "\n".join(history_lines)

        # 3. Create the summarization prompt
        # --- Using your improved prompt ---
        summarization_prompt = f"""Please summarize the key points, user's expressed feelings, and main topics discussed in the following conversation history. Focus on aspects relevant to mental well-being for UGM-AICare users. Be concise. Write the response in Indonesian/Bahasa Indonesia. Do not use markdown format because the value is stored in a SQL cell.

Conversation:
{formatted_history}

Summary:"""

        # 4. Call the LLM
        summary_llm_history = [{"role": "user", "content": summarization_prompt}]
        summary_text = await llm.generate_response(
             history=summary_llm_history,
             # Explicitly define provider/model for summarization if different
             provider="gemini", # Or fetch default from config
             model= llm.DEFAULT_PROVIDERS.get("gemini", "gemini-pro"), # Fetch default model
             max_tokens=250, # Adjust as needed
             temperature=0.5 # Lower temp often better for summaries
        )

        if summary_text.startswith("Error:"):
             raise Exception(f"LLM Error during summarization: {summary_text}")

        # 5. Save the summary
        new_summary = UserSummary(
             user_id=user_id,
             session_id=session_id_to_summarize, # Store the summarized session ID
             summary_text=summary_text.strip()
        )
        db.add(new_summary)
        db.commit() # Commit within this background task's session
        logger.info(f"Background Task: Saved summary for user {user_id} from session {session_id_to_summarize}")

    except Exception as e:
        db.rollback() # Rollback this background task's session on error
        logger.error(f"Background Task: Failed to summarize session {session_id_to_summarize} for user {user_id}: {e}", exc_info=True)
    finally:
        db.close() # Explicitly close the background task's session

# --- New Endpoint for Chat History ---
@router.get("/history", response_model=List[ConversationHistoryItem])
async def get_chat_history(
    limit: int = Query(100, ge=1, le=500), # Limit for pagination
    skip: int = Query(0, ge=0), # Optional pagination
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Get authenticated user
):
    """Fetches conversation history for the authenticated user."""
    try:
        llm.logger.info(f"Fetching conversation turns for user {current_user.id}")

        # 1. Fetch conversation turns from DB in chronological order
        conversation_turns = db.query(Conversation)\
            .filter(Conversation.user_id == current_user.id)\
            .order_by(Conversation.timestamp.asc()) \
            .all()
        llm.logger.info(f"Retrieved {len(conversation_turns)} conversation turns for user {current_user.id}")

        # 2. Transform the data into individual history items
        history_items: List[Dict] = []
        for turn in conversation_turns:
            # Add user message
            history_items.append({
                "role": "user",
                "content": turn.message, # Map DB 'message' to 'content'
                "timestamp": turn.timestamp,
                "session_id": turn.session_id
            })
            # Add assistant response
            history_items.append({
                "role": "assistant",
                "content": turn.response, # Map DB 'response' to 'content'
                "timestamp": turn.timestamp, # Using same timestamp for simplicity
                "session_id": turn.session_id
            })

        # 3. Sort the combined list of messages (user + assistant) by timestamp descending
        history_items.sort(key=lambda x: x["timestamp"], reverse=True)

        # 4. Apply pagination (limit/skip) to the final transformed list
        paginated_history = history_items[skip : skip + limit]
        llm.logger.info(f"Returning {len(paginated_history)} transformed history items for user {current_user.id} (skip={skip}, limit={limit})")

        # 5. Return the transformed list (FastAPI will validate against response_model)
        return paginated_history

    except Exception as e:
        llm.logger.error(f"Error fetching/transforming chat history for user {current_user.id}: {e}", exc_info=True)
        # Ensure a generic error is raised to avoid leaking details
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")