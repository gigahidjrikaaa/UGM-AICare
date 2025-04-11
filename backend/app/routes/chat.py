# backend/app/routes/chat.py

from sqlalchemy.orm import Session # Import Session
from sqlalchemy import desc
import hashlib # Import hashlib
from fastapi import APIRouter, HTTPException, Body, Depends, status, BackgroundTasks, Query # type: ignore # Added Depends
from typing import List, Dict, Optional, Literal
from datetime import datetime # Import datetime

# Adjust import based on your project structure
from app.database import get_db
from app.models import User, Conversation, UserSummary # Import User and Conversation models
from app.core import llm
from app.core.llm import LLMProvider # Import the type hint
from app.dependencies import get_current_active_user
from app.schemas import ChatRequest, ChatResponse, ConversationHistoryItem, SummarizeRequest

router = APIRouter()

# Simplified backend get_or_create_user - now receives the already-hashed ID
def get_or_create_user(db: Session, received_google_sub: str) -> User:
    """Finds a user by hashed identifier or creates a new one."""
    user = db.query(User).filter(User.google_sub == received_google_sub).first()
    if not user:
        # User not found, create a new one
        llm.logger.info(f"Creating new user record for identifier hash: {received_google_sub[:10]}...") 
        user = User(google_sub=received_google_sub) # Store the hash directly
        # Potentially fetch email/name from Google token *if* frontend sends it securely, 
        # but avoid storing if not necessary for functionality.
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
            llm.logger.info(f"Successfully created user with DB ID: {user.id}")
        except Exception as e:
            db.rollback()
            llm.logger.error(f"Database error creating user: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create user record.")
    return user

# --- API Endpoint (Async) ---
# Add dependencies=[Depends(get_current_user)] if you have authentication
@router.post("/chat", response_model=ChatResponse)
async def handle_chat_request(
    request: ChatRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(), # For background tasks
    db: Session = Depends(get_db) # Use the database session dependency
    ):
    """
    Handles chat, detects session changes to trigger summarization of the *previous* session,
    and injects the *latest available* summary into the context for the *current* session.
    """
    try:
        # 1. Get or Create User (using the hashed identifier)
        try:
            db_user = get_or_create_user(db, request.google_sub) 
        except Exception as e:
             llm.logger.error(f"Failed during user lookup/creation: {e}", exc_info=True)
             raise HTTPException(status_code=500, detail="Error processing user information.")

        user_message_content = request.history[-1]['content']
        current_session_id = request.session_id

        # 2. Detect Session Change and Trigger Previous Summary (if applicable)
        previous_session_id_to_summarize = None
        latest_message_from_user = db.query(Conversation)\
            .filter(Conversation.user_id == db_user.id)\
            .order_by(Conversation.timestamp.desc())\
            .first()

        if latest_message_from_user and latest_message_from_user.session_id != current_session_id:
            # This is a new session (or the very first message ever for the user)
            # We need to summarize the *previous* session
            previous_session_id_to_summarize = latest_message_from_user.session_id
            llm.logger.info(f"New session detected ({current_session_id}) for user {db_user.id}. Previous session was {previous_session_id_to_summarize}.")
            # Run summarization in the background to avoid delaying the current chat response
            background_tasks.add_task(summarize_and_save, db, db_user.id, previous_session_id_to_summarize)
        elif not latest_message_from_user:
             llm.logger.info(f"First ever message for user {db_user.id} in session {current_session_id}.")
             # No previous session to summarize
        # else: it's the same session, do nothing regarding summarization trigger


        # 3. Prepare History for LLM - Inject *Latest Available* Summary
        history_for_llm = request.history # Start with history from current request

        # Fetch the most recent summary for this user, regardless of which session it's from
        latest_summary = db.query(UserSummary)\
            .filter(UserSummary.user_id == db_user.id)\
            .order_by(UserSummary.timestamp.desc())\
            .first()

        if latest_summary:
            summary_injection = {
                "role": "system", 
                "content": f"Reminder of key points from a previous conversation (summarized on {latest_summary.timestamp.strftime('%Y-%m-%d')}): {latest_summary.summary_text}"
            }
            # Prepend the summary. Consider if this should only happen on the *first* message of a new session.
            # For simplicity now, let's prepend it always if a summary exists.
            history_for_llm = [summary_injection] + history_for_llm
            llm.logger.info(f"Injected previous summary for user {db_user.id} into LLM context.")

        # 4. Call the LLM to get a response for the CURRENT message
        generated_text = await llm.generate_response(
            history=history_for_llm, # Use history potentially including the summary
            provider=request.provider,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system_prompt=request.system_prompt # The main system prompt still applies
        )

        # Check for errors from LLM generation
        if generated_text.startswith("Error:"):
            llm.logger.error(f"LLM generation failed for provider {request.provider}: {generated_text}")
            status_code = 400 if "API key" in generated_text or "Invalid history" in generated_text else 503
            raise HTTPException(status_code=status_code, detail=generated_text)

        # 5. Save the CURRENT conversation turn to the database
        try:
            conversation_entry = Conversation(
                user_id=db_user.id, 
                session_id=current_session_id, # Use the current session ID
                message=user_message_content,
                response=generated_text,
                timestamp=datetime.now() 
            )
            db.add(conversation_entry)
            db.commit()
        except Exception as e:
            # ... (handle DB save error, rollback) ...
            raise HTTPException(status_code=500, detail="Could not save current conversation turn.")

        # 6. Prepare and return the response
        actual_model_used = request.model or llm.DEFAULT_PROVIDERS.get(request.provider, "unknown")
        # The history returned to frontend should ideally NOT include the injected summary, just the actual chat turns
        updated_history_for_frontend = request.history + [{"role": "assistant", "content": generated_text}]


        return ChatResponse(
            response=generated_text,
            provider_used=request.provider,
            model_used=actual_model_used,
            history=updated_history_for_frontend 
        )

    # Handle potential validation errors from Pydantic
    except ValueError as e:
        llm.logger.warning(f"Value error in /chat endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    # Catch-all for other unexpected errors
    except Exception as e:
        llm.logger.error(f"Unhandled exception in /chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

    # Handle potential validation errors from Pydantic (though FastAPI usually does this)
    except ValueError as e:
        llm.logger.warning(f"Value error in /chat endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    # Catch-all for other unexpected errors during the request handling
    except Exception as e:
        llm.logger.error(f"Unhandled exception in /chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


# --- Define the Summarization Function (can be in this file or a helper module) ---
async def summarize_and_save(db: Session, user_id: int, session_id_to_summarize: str):
    """Fetches history, calls LLM to summarize, and saves to UserSummary table."""
    llm.logger.info(f"Background Task: Starting summarization for user {user_id}, session {session_id_to_summarize}")
    try:
        # 1. Retrieve conversation history (same as before)
        conversation_history = db.query(Conversation)\
            .filter(Conversation.session_id == session_id_to_summarize, Conversation.user_id == user_id)\
            .order_by(Conversation.timestamp.asc())\
            .all()

        if not conversation_history or len(conversation_history) < 2: 
             llm.logger.info(f"Background Task: Skipping summarization for session {session_id_to_summarize} (too short/no history).")
             return

        # 2. Format history for LLM - CORRECTED LOGIC
        history_lines = []
        for turn in conversation_history:
            # Add the user message associated with this turn
            history_lines.append(f"user: {turn.message}") 
            # Add the assistant response associated with this turn
            history_lines.append(f"assistant: {turn.response}") 
            
        formatted_history = "\n".join(history_lines)

        # 3. Create the summarization prompt (same as before)
        summarization_prompt = f"""Please summarize the key points, user's expressed feelings, and main topics discussed in the following conversation history. Focus on aspects relevant to mental well-being for UGM-AICare users. Be concise. Write the response in Indonesian/Bahasa Indonesia. Do not use markdown format because the value is stored in a SQL cell.

        Conversation:
        {formatted_history}

        Summary:"""

        # 4. Call the LLM (same as before)
        summary_llm_history = [{"role": "user", "content": summarization_prompt}]
        summary_text = await llm.generate_response(
             history=summary_llm_history, 
             provider="gemini", 
             max_tokens=250, 
             temperature=0.5 
        )

        if summary_text.startswith("Error:"):
             raise Exception(f"LLM Error: {summary_text}")

        # 5. Save the summary (same as before, maybe adjust the text slightly)
        new_summary = UserSummary(
            user_id=user_id,
            summary_text=summary_text.strip() # Removed the session ID prefix for clarity, but you can add it back if desired
        )
        db.add(new_summary)
        # Careful with commit/session management in background tasks - see previous note
        try:
             db.commit()
             llm.logger.info(f"Background Task: Saved summary for user {user_id} from session {session_id_to_summarize}")
        except Exception as commit_exc:
             db.rollback()
             llm.logger.error(f"Background Task: DB Commit Error saving summary: {commit_exc}", exc_info=True)
             raise # Re-raise the commit error


    except Exception as e:
        # db.rollback() # Rollback might happen automatically depending on session scope
        llm.logger.error(f"Background Task: Failed to summarize session {session_id_to_summarize} for user {user_id}: {e}", exc_info=True)
    finally:
        # Ensure session is closed if this task manages its own session
        # db.close() # Uncomment if needed based on your session management strategy
        pass 

# --- New Endpoint for Chat History ---
@router.get("/history", response_model=List[ConversationHistoryItem])
async def get_chat_history(
    limit: int = Query(100, ge=1, le=500), # Limit for pagination
    skip: int = Query(0, ge=0), # Optional pagination
    db: Session = Depends(get_db),
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