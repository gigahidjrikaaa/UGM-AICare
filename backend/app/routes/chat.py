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
from app.core.memory import get_module_state, set_module_state, clear_module_state
from app.dependencies import get_current_active_user
from app.schemas import ChatRequest, ChatResponse, ConversationHistoryItem, SummarizeRequest, ChatEvent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__) # Create a logger for this module

router = APIRouter()

# --- Constants for Summarization ---
MIN_TURNS_FOR_SUMMARY = 2  # Minimum number of full conversation turns (user msg + AI response) to trigger a summary.
MAX_HISTORY_CHARS_FOR_SUMMARY = 15000  # Approx 3k-4k tokens, adjust based on your summarization LLM's limits and desired performance.

# --- Helper Function for Background Task Session ---
def get_background_db():
    """Dependency to get a DB session specifically for background tasks."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Placeholder for getting module starting prompts ---
async def get_module_start_prompt(module_id: str, step: int) -> str:
    """
    Placeholder function to get the initial prompt for a guided module.
    Replace with actual logic (e.g., database lookup, LLM call, hardcoded strings).
    """
    logger.info(f"Getting start prompt for module: {module_id}, step: {step}")
    start_prompts = {
        "thought_record": "Okay, let's try exploring those thoughts. First, could you briefly describe the situation or event that triggered the difficult feeling? Just a few words is fine.",
        "problem_breakdown": "Got it. Sometimes breaking things down helps. What's the main problem or task that feels overwhelming right now?",
        "activity_scheduling": "Planning something positive, even small, can make a difference. What's one simple, enjoyable, or useful activity you could realistically do in the next day or so?",
        "help_me_start": "No problem! Sometimes it's hard to know where to begin. I have a few exercises we can try: 'Explore My Thoughts' helps look at difficult thinking patterns, 'Break Down a Problem' helps with feeling overwhelmed, and 'Plan a Small Step' helps schedule positive activities. Which one sounds most useful right now? (You can also just tell me what's on your mind!)"
    }
    # Basic step handling example (expand later)
    if step == 1:
        return start_prompts.get(module_id, "Let's try this exercise. What's the first thing on your mind?")
    else:
        # Handle subsequent steps later
        return f"Continuing {module_id}... (Step {step} prompt placeholder)"

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
    db: DBSession = next(get_db())
    try:
        session_id = request.session_id
        user_id = current_user.id
        aika_response_text: str = "" 
        history_to_return: List[Dict[str, str]] = []

        #! --- Crucial Note on Frontend session_id Management ---
        #! The backend's summarization trigger relies on the `session_id` changing
        #! when a user starts a new distinct conversation.
        #! Ensure the frontend maintains a consistent `session_id` for an ongoing
        #! interaction (e.g., until tab closure, explicit logout, or significant inactivity)
        #! and generates a new one when a new logical session begins.
        #! Avoid new `session_id` on simple page refreshes if it's the same conversation.
        
        # --- Determine Flow: Event or Message ---
        if request.event:
            # --- === Handle Event (e.g., Button Click) === ---
            if request.event.type == 'start_module':
                module_id = request.event.module_id
                logger.info(f"EVENT: User {user_id} starting module '{module_id}' in session {session_id}")

                # 1. Set Initial Module State in Redis (Placeholder call)
                initial_step = 1
                try:
                    await set_module_state(session_id, module_id, initial_step)
                    logger.info(f"Redis: Set state for session {session_id} - module={module_id}, step={initial_step}")
                except Exception as e:
                    logger.error(f"Redis Error setting module state for session {session_id}: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail="Failed to initialize module state")

                # 2. Get the Starting Prompt/Message for this Module
                try:
                    aika_response_text = await get_module_start_prompt(module_id, initial_step)
                except Exception as e:
                    logger.error(f"Error getting start prompt for module {module_id}: {e}", exc_info=True)
                    # Clean up Redis state if start fails
                    try:
                        await clear_module_state(session_id)
                    except Exception as redis_clear_err:
                        logger.error(f"Redis Error clearing state after failed start for session {session_id}: {redis_clear_err}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Failed to generate start message for module {module_id}")

                # 3. Prepare history for response: Use history *sent by frontend* + new assistant message
                # Frontend already has its history; we add the new assistant message to it.
                # If frontend didn't send history with event, use an empty list.
                history_basis = request.history if request.history is not None else []
                history_to_return = history_basis + [{"role": "assistant", "content": aika_response_text}]

                # NOTE: We are NOT saving this initial assistant prompt to the Conversation DB here.
                # We could, but it might be better to save only after the *user's first response* within the module.
                # Or save it now if required. Let's skip saving for now.

            else:
                logger.warning(f"Unsupported event type received: {request.event.type} for session {session_id}")
                raise HTTPException(status_code=400, detail=f"Unsupported event type: {request.event.type}")

        elif request.message:
            # --- === Handle Standard Text Message === ---
            user_message_content = request.message
            # History is guaranteed by Pydantic validator if message is present
            history_from_request = request.history if request.history is not None else []
            logger.info(f"MESSAGE: User {user_id} sent message in session {session_id}")

            # 1. Check for Active Module State in Redis (Placeholder call)
            module_state = await get_module_state(session_id)

            if module_state:
                # --- User is inside a Guided Module ---
                module_id = module_state['module']
                current_step = module_state['step']
                logger.info(f"MODULE_STEP: Session {session_id} continuing module '{module_id}' at step {current_step}")

                # TODO: Implement LLM call specific to this module/step
                #   - Need a function like `get_llm_module_response(module_id, current_step, user_message_content, history_from_request)`
                #   - This function would use a specific prompt for the step.
                #   - It would return the AI response text.
                aika_response_text = f"TEMP: Processing '{user_message_content}' for {module_id} Step {current_step}. (LLM Response Needed)" # Placeholder

                # TODO: Update module state (Placeholder call)
                #   - Determine the next step based on module logic.
                #   - `next_step = calculate_next_step(module_id, current_step, user_message_content)`
                #   - Handle module completion or exit commands.
                #   - `await set_module_state(session_id, module_id, next_step)` OR `await clear_module_state(session_id)`
                logger.warning(f"MODULE_STEP: State update logic not implemented yet for session {session_id}")

                # --- Save conversation turn for module step ---
                try:
                    # Save user message and AI response for this step
                    conv_entry = Conversation(user_id=user_id, session_id=session_id, message=user_message_content, response=aika_response_text, timestamp=datetime.now())
                    db.add(conv_entry)
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"DB Error saving module conversation turn for session {session_id}: {e}", exc_info=True)
                    # Decide if we should raise HTTPException or try to return response anyway
                    raise HTTPException(status_code=500, detail="Could not save module conversation turn.")

                # Prepare history for response
                history_to_return = history_from_request + [{"role": "assistant", "content": aika_response_text}]

            else:
                # --- Standard Conversation Flow (No Active Module) ---
                logger.info(f"STANDARD_CHAT: Processing standard message for session {session_id}")

                # --- Session Change Detection & Summary Handling (Your existing logic, MOVED INSIDE this block) ---
                previous_session_id_to_summarize = None
                # Query the last message saved in the DB for this user to check its session_id
                latest_db_message_for_user = db.query(Conversation)\
                    .filter(Conversation.user_id == user_id)\
                    .order_by(Conversation.timestamp.desc())\
                    .first()

                is_new_session = False
                if latest_db_message_for_user:
                    if latest_db_message_for_user.session_id != session_id:
                        # Session ID from request is different from the last saved session ID for this user
                        previous_session_id_to_summarize = latest_db_message_for_user.session_id
                        is_new_session = True
                        logger.info(f"STANDARD_CHAT: New session detected ({session_id}). Previous DB session: {previous_session_id_to_summarize}. Triggering summary for previous session.")
                        background_tasks.add_task(summarize_and_save, user_id, previous_session_id_to_summarize)
                    # else: it's an ongoing session, no summary trigger based on this condition
                else:
                    # No previous messages for this user in the DB, so this is their first interaction.
                    is_new_session = True
                    logger.info(f"STANDARD_CHAT: First message ever for user {user_id} in session {session_id}. No previous session to summarize.")

                # --- Prepare History for LLM - Inject Summary on New Session Start ---
                history_for_llm = list(history_from_request) # Create a mutable copy
                if is_new_session:
                    N_SUMMARIES_FOR_CONTEXT = 3 # Number of recent summaries to include
                    past_summaries = db.query(UserSummary)\
                        .filter(UserSummary.user_id == user_id)\
                        .order_by(UserSummary.timestamp.desc())\
                        .limit(N_SUMMARIES_FOR_CONTEXT)\
                        .all()

                    if past_summaries:
                        past_summaries.reverse() # To have them in chronological order (oldest of the N first)

                        # Prepare a concise header for the combined summaries
                        combined_summary_text = "Untuk membantumu mengingat, berikut adalah beberapa poin penting dari beberapa sesi terakhir kita:\n"

                        for idx, summary_obj in enumerate(past_summaries):
                            # Make each summary distinct and slightly more conversational if possible
                            combined_summary_text += f"\n--- Sesi sekitar {summary_obj.timestamp.strftime('%d %B %Y, %H:%M')} ---\n"
                            combined_summary_text += f"{summary_obj.summary_text}\n"

                        combined_summary_text += "\n--- Akhir dari ringkasan sesi sebelumnya ---"

                        # Optional: Add a character limit for the combined summaries to avoid overly long context
                        MAX_COMBINED_SUMMARY_LENGTH = 4000 # Example: ~1000 tokens, adjust as needed
                        if len(combined_summary_text) > MAX_COMBINED_SUMMARY_LENGTH:
                            combined_summary_text = combined_summary_text[:MAX_COMBINED_SUMMARY_LENGTH] + "... (beberapa ringkasan mungkin dipotong karena panjang)"
                            logger.warning(f"Combined summary text for user {user_id} was truncated to {MAX_COMBINED_SUMMARY_LENGTH} chars.")

                        summary_injection = {
                            "role": "system", # System message to provide context
                            "content": combined_summary_text
                        }

                        # Inject after system prompt if one exists from request, otherwise at the beginning
                        if history_for_llm and history_for_llm[0]['role'] == 'system':
                            history_for_llm.insert(1, summary_injection)
                        else:
                            history_for_llm.insert(0, summary_injection)
                        logger.info(f"STANDARD_CHAT: Injected {len(past_summaries)} previous summaries for user {user_id} into LLM context.")

                # --- Call the Standard LLM ---
                try:
                    aika_response_text = await llm.generate_response(
                        history=history_for_llm,
                        provider=request.provider,
                        model=request.model,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature,
                        system_prompt=request.system_prompt # This might be None if not sent from frontend
                    )
                except Exception as llm_err:
                     logger.error(f"LLM generation failed for standard chat session {session_id}: {llm_err}", exc_info=True)
                     # Handle error appropriately, maybe raise HTTPException
                     raise HTTPException(status_code=503, detail=f"LLM service unavailable or failed: {llm_err}")


                if aika_response_text.startswith("Error:"):
                    logger.error(f"LLM generation returned error for session {session_id}: {aika_response_text}")
                    status_code = 400 if "API key" in aika_response_text or "Invalid history" in aika_response_text else 503
                    raise HTTPException(status_code=status_code, detail=aika_response_text)

                # --- Save the standard conversation turn ---
                try:
                    conversation_entry = Conversation(
                        user_id=user_id,
                        session_id=session_id,
                        message=user_message_content,
                        response=aika_response_text,
                        timestamp=datetime.now()
                    )
                    db.add(conversation_entry)
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"DB error saving standard conversation turn for session {session_id}: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail="Could not save conversation turn.")

                # Prepare history for response
                history_to_return = history_from_request + [{"role": "assistant", "content": aika_response_text}]

                # --- Placeholder for Proactive Suggestion Logic ---
                # TODO: Analyze user_message_content & aika_response_text
                # if should_suggest_module(...):
                #    ... modify aika_response_text or add metadata to ChatResponse ...
                # logger.info(f"STANDARD_CHAT: Proactive suggestion check needed for session {session_id}")


        else:
            # This case should be prevented by the Pydantic validator
            logger.error(f"Invalid request structure for session {session_id}: Neither message nor event found.")
            raise HTTPException(status_code=400, detail="Invalid request: Missing message/history or event.")

        # --- Prepare and return the final response ---
        actual_model_used = request.model or llm.DEFAULT_PROVIDERS.get(request.provider, "unknown")

        return ChatResponse(
            response=aika_response_text,
            provider_used=request.provider,
            model_used=actual_model_used,
            history=history_to_return # Return the correctly constructed history
        )

    except ValueError as e:
        logger.warning(f"Value error in /chat endpoint processing request: {e}")
        raise HTTPException(status_code=400, detail=str(e)) # Pydantic validation errors often raise ValueError
    except HTTPException as http_exc:
         raise http_exc # Re-raise known HTTP exceptions
    except Exception as e:
        logger.error(f"Unhandled exception in /chat endpoint for user {current_user.id if current_user else 'unknown'}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
    finally:
        db.close()


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

        if not conversation_history or len(conversation_history) < MIN_TURNS_FOR_SUMMARY:
             logger.info(f"Background Task: Skipping summarization for session {session_id_to_summarize} (less than {MIN_TURNS_FOR_SUMMARY} turns).")
             return

        # 2. Format history for LLM
        history_lines = []
        for turn in conversation_history:
            history_lines.append(f"user: {turn.message}")
            history_lines.append(f"assistant: {turn.response}")
        formatted_history = "\n".join(history_lines)

        # --- Optional: Truncate history if too long ---
        # This is a simple truncation; you might want to use a more sophisticated method
        if len(formatted_history) > MAX_HISTORY_CHARS_FOR_SUMMARY:
            original_len = len(formatted_history)
            formatted_history = formatted_history[-MAX_HISTORY_CHARS_FOR_SUMMARY:] # Take the most recent part
            logger.warning(f"Background Task: Truncated conversation history for session {session_id_to_summarize} from {original_len} to {len(formatted_history)} chars for summarization.")
            # Optionally, add a note to the prompt that history was truncated
            # formatted_history = "[History truncated due to length]\n...\n" + formatted_history


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
             model= llm.DEFAULT_PROVIDERS.get("gemini", "togegerai"),
             max_tokens=1024, # Adjust as needed
             temperature=0.5 # Lower temp often better for summaries
        )

        if summary_text.startswith("Error:"):
             # Log the full error from LLM for better debugging
             logger.error(f"Background Task: LLM Error during summarization for session {session_id_to_summarize}: {summary_text}")
             raise Exception(f"LLM Error during summarization") # Generic error to frontend/caller

        # 5. Save the summary
        new_summary = UserSummary(
             user_id=user_id,
             summarized_session_id=session_id_to_summarize,
             summary_text=summary_text.strip(),
             timestamp=datetime.now() # Ensure timestamp is set here
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
        logger.info(f"Fetching conversation turns for user {current_user.id}") # Use the module's logger

        # 1. Fetch conversation turns from DB in chronological order
        conversation_turns = db.query(Conversation)\
            .filter(Conversation.user_id == current_user.id)\
            .order_by(Conversation.timestamp.asc()) \
            .all()
        logger.info(f"Retrieved {len(conversation_turns)} conversation turns for user {current_user.id}")

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
        logger.info(f"Returning {len(paginated_history)} transformed history items for user {current_user.id} (skip={skip}, limit={limit})")

        # 5. Return the transformed list (FastAPI will validate against response_model)
        return paginated_history

    except Exception as e:
        logger.error(f"Error fetching/transforming chat history for user {current_user.id}: {e}", exc_info=True)
        # Ensure a generic error is raised to avoid leaking details
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")