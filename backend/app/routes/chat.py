# backend/app/routes/chat.py
import json
from sqlalchemy.orm import Session as DBSession # DBSession is a common alias for SQLAlchemy session
from sqlalchemy import desc
from fastapi import APIRouter, HTTPException, Body, Depends, status, BackgroundTasks, Query # type: ignore
from typing import Any, List, Dict, Optional, Literal
from datetime import datetime, timedelta # Import datetime
import logging

# Adjust import based on your project structure
from app.database import get_db, SessionLocal
from app.models import User, Conversation, UserSummary
from app.core import llm
from app.core.memory import get_module_state, set_module_state, clear_module_state
from app.dependencies import get_current_active_user
from app.schemas import ChatRequest, ChatResponse, ConversationHistoryItem, SummarizeRequest
from app.core.cbt_module_logic import (
    get_module_step_prompt,
    process_user_response_for_step,
    # get_module_definition # if needed for descriptions, etc.
)
from app.core.cbt_module_types import CBTModuleData # For type hinting

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
    module_just_completed_id: Optional[str] = None # Variable to hold completed module ID
    module_state_full: Optional[Dict[str, Any]] = None # Initialize here
    session_id = request.session_id # Define session_id early for use in error logging if needed
    conversation_id = request.conversation_id # Define conversation_id early
    try:
        user_id = current_user.id
        aika_response_text: str = "" 

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

                initial_step = 1
                initial_module_data: CBTModuleData = {}
                try:
                    # Get the first prompt using the new CBT logic
                    aika_response_text = get_module_step_prompt(module_id, initial_step, initial_module_data)
                    if aika_response_text is None:
                        logger.error(f"Could not find module or step 1 for module_id: {module_id}")
                        raise HTTPException(status_code=404, detail=f"Module {module_id} or its first step not found.")

                    # Set initial module state in Redis, now including module_data
                    await set_module_state(session_id, module_id, initial_step, initial_module_data)
                    logger.info(f"Redis: Set state for session {session_id} - module={module_id}, step={initial_step}, data={initial_module_data}")

                except HTTPException as http_exc: # Catch specific known exception
                    raise http_exc
                except Exception as e:
                    logger.error(f"Error initializing or getting start prompt for module {module_id}: {e}", exc_info=True)
                    # Attempt to clear Redis state if start fails partially
                    try:
                        await clear_module_state(session_id)
                    except Exception as redis_clear_err:
                        logger.error(f"Redis Error clearing state after failed start for session {session_id}: {redis_clear_err}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Failed to initialize or generate start message for module {module_id}")

                # For events, history for response is just the new AI message appended to what frontend might have sent
                # Frontend's types/api.ts shows ChatRequestPayload.history can be List[ApiMessage]
                # And ApiMessage is {role, content, timestamp?}
                # ChatResponse.history needs to be List[Dict[str,str]]
                # Ensure history from request (if any) is correctly formatted.
                # The frontend's useChat.tsx `handleStartModule` sends history, so it should be used.
                final_history_to_return: List[Dict[str, str]] = []
                if request.history:
                    final_history_to_return.extend(request.history)
                final_history_to_return.append({"role": "assistant", "content": aika_response_text}) # Add AI response

            else: # Other event types
                logger.warning(f"Unsupported event type received: {request.event.type} for session {session_id}")
                raise HTTPException(status_code=400, detail=f"Unsupported event type: {request.event.type}")

        elif request.message:
            # --- === Handle Standard Text Message === ---
            user_message_content = request.message

            history_from_request_api_messages: List[Dict[str, str]] = []
            if request.history:
                 history_from_request_api_messages = [{"role": item["role"], "content": item["content"]} for item in request.history]

            logger.info(f"MESSAGE: User {user_id} sent message in session {session_id}, conversation {conversation_id}")

            module_state_full = await get_module_state(session_id)

            if module_state_full:
                module_id = module_state_full['module_id'] # Key changed in memory.py
                current_step_id = module_state_full['step_id'] # Key changed in memory.py
                current_module_data: CBTModuleData = module_state_full['data']
                logger.info(f"MODULE_STEP: Session {session_id} continuing module '{module_id}' at step {current_step_id}")

                try:
                    updated_module_data, next_step_id, action = process_user_response_for_step(
                        module_id, current_step_id, user_message_content, current_module_data
                    )

                    if action == "complete_module":
                        aika_response_text = get_module_step_prompt(module_id, current_step_id, updated_module_data) # Get prompt of the completing step
                        if aika_response_text is None: # Fallback if completing step has no prompt
                            aika_response_text = "Modul telah selesai. Terima kasih!"
                        await clear_module_state(session_id)
                        logger.info(f"MODULE_COMPLETE: Module {module_id} completed for session {session_id}. State cleared.")
                        module_just_completed_id = module_id
                    else:
                        await set_module_state(session_id, module_id, next_step_id, updated_module_data)
                        aika_response_text = get_module_step_prompt(module_id, next_step_id, updated_module_data)
                        if aika_response_text is None:
                            logger.error(f"Could not find next step prompt for module {module_id}, step {next_step_id}")
                            # This case might mean module ended without explicit "complete_module"
                            # Or an issue in module definition.
                            await clear_module_state(session_id) # Clear state to prevent loop
                            aika_response_text = "Sepertinya ada sedikit kendala dengan langkah selanjutnya di modul ini. Mari kita coba lagi nanti atau kembali ke percakapan biasa."
                            module_just_completed_id = module_id


                except Exception as e:
                    logger.error(f"Error processing module step for {module_id}, step {current_step_id}: {e}", exc_info=True)
                    # Consider clearing module state on error to prevent user from being stuck
                    await clear_module_state(session_id)
                    module_just_completed_id = module_id # Consider this an end to the module attempt
                    aika_response_text = "Maaf, terjadi kesalahan internal saat memproses modul ini. Kita kembali ke percakapan biasa ya."
                    # raise HTTPException(status_code=500, detail="Terjadi kesalahan saat memproses langkah modul.")

                # Save conversation turn for module step
                try:
                    conv_entry = Conversation(user_id=user_id, session_id=session_id, conversation_id=conversation_id, message=user_message_content, response=aika_response_text, timestamp=datetime.now())
                    db.add(conv_entry)
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"DB Error saving module conversation turn for session {session_id}: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail="Could not save module conversation turn.")
            
            else: # No active module, check for memory query
                memory_trigger_phrases = [
                    "apakah kamu ingat percakapan kita",
                    "kamu inget gak obrolan kita",
                    "ingat percakapan kita",
                    "inget obrolan kita",
                    "apa kamu ingat kita ngobrol apa",
                    "do you remember our conversation",
                    "do you remember what we talked about"
                ]
                normalized_user_message = user_message_content.lower().strip()
                asked_about_memory = any(phrase in normalized_user_message for phrase in memory_trigger_phrases)

                if asked_about_memory:
                    logger.info(f"MEMORY_QUERY: User {user_id} asked about previous conversation memory in session {session_id}.")
                    latest_summary = db.query(UserSummary)\
                        .filter(UserSummary.user_id == user_id)\
                        .order_by(UserSummary.timestamp.desc())\
                        .first()

                    if latest_summary and latest_summary.summary_text:
                        summary_snippet = latest_summary.summary_text
                        # Optional: Truncate summary_snippet if too long for a natural response
                        if len(summary_snippet) > 150: # Keep it brief for a natural response
                            summary_snippet = summary_snippet[:147] + "..."
                        
                        aika_response_text = (
                            f"Tentu, aku ingat percakapan kita sebelumnya. "
                            f"Secara garis besar, kita sempat membahas tentang {summary_snippet}. "
                            f"Ada yang ingin kamu diskusikan lebih lanjut dari situ, atau ada hal baru yang ingin kamu ceritakan hari ini?"
                        )
                        logger.info(f"MEMORY_QUERY: Responded with summary for user {user_id}.")
                    else:
                        aika_response_text = (
                            "Sepertinya ini percakapan pertama kita, atau aku belum punya ringkasan dari obrolan kita sebelumnya untuk diingat. "
                            "Ada yang ingin kamu ceritakan untuk memulai?"
                        )
                        logger.info(f"MEMORY_QUERY: No summary found, responded accordingly for user {user_id}.")

                    # --- Save this specific interaction ---
                    try:
                        conv_entry = Conversation(
                            user_id=user_id, session_id=session_id, conversation_id=conversation_id,
                            message=user_message_content, response=aika_response_text, timestamp=datetime.now()
                        )
                        db.add(conv_entry)
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        logger.error(f"DB Error saving memory query conversation turn for session {session_id}: {e}", exc_info=True)
                    
                    # --- Prepare and return the constructed response directly ---
                    final_history_to_return: List[Dict[str, str]] = []
                    if request.history: # request.history is List[ApiMessage] which is List[Dict[str,str]]
                        final_history_to_return.extend(request.history)
                    final_history_to_return.append({"role": "user", "content": user_message_content})
                    final_history_to_return.append({"role": "assistant", "content": aika_response_text})
                    
                    return ChatResponse(
                        response=aika_response_text,
                        provider_used="system_direct_response", # Custom provider string
                        model_used="memory_retrieval",      # Custom model string
                        history=final_history_to_return,
                        module_completed_id=None # No module involved here
                    )
                else: # Standard Conversation Flow (No Active Module AND not a memory query)
                    logger.info(f"STANDARD_CHAT: Processing standard message for session {session_id}, conversation {conversation_id}")
                    
                    # --- Session Change Detection & Summary Handling ---
                    previous_session_id_to_summarize = None
                    latest_db_message_for_user = db.query(Conversation)\
                        .filter(Conversation.user_id == user_id)\
                        .order_by(Conversation.timestamp.desc())\
                        .first()

                    is_new_session = False
                    if latest_db_message_for_user:
                        if latest_db_message_for_user.session_id != session_id:
                            previous_session_id_to_summarize = latest_db_message_for_user.session_id
                            is_new_session = True
                            logger.info(f"STANDARD_CHAT: New session detected ({session_id}). Previous DB session: {previous_session_id_to_summarize}. Triggering summary for previous session.")
                            background_tasks.add_task(summarize_and_save, user_id, previous_session_id_to_summarize, db_session_creator=get_background_db) # Pass db_session_creator
                        else: # Check for new conversation within the same session
                            if latest_db_message_for_user.conversation_id != conversation_id:
                                is_new_session = True # Treat as new context for summary injection
                                logger.info(f"STANDARD_CHAT: New conversation detected ({conversation_id}) in existing session {session_id}. Will inject summary if available.")

                    else:
                        is_new_session = True
                        logger.info(f"STANDARD_CHAT: First message ever for user {user_id} in session {session_id}. No previous session to summarize.")

                    # --- Prepare History for LLM - Inject Summary on New Session/Conversation Start ---
                    history_for_llm_call = list(history_from_request_api_messages) # Make a copy to modify


                    if is_new_session:
                        past_summary = db.query(UserSummary)\
                            .filter(UserSummary.user_id == user_id)\
                            .order_by(UserSummary.timestamp.desc())\
                            .first()

                        if past_summary:
                            summary_injection_text = (
                                "Untuk membantumu mengingat, ini ringkasan singkat dari percakapan kita sebelumnya:\n"
                                f"{past_summary.summary_text}\n"
                                "--- Akhir dari ringkasan ---\n\nSekarang, mari kita lanjutkan. Ada apa?"
                            )
                            summary_injection_message = {"role": "system", "content": summary_injection_text}
                            
                            temp_history_for_llm = []
                            if request.system_prompt:
                                 temp_history_for_llm.append({"role": "system", "content": request.system_prompt})
                            temp_history_for_llm.append(summary_injection_message)
                            temp_history_for_llm.extend(history_for_llm_call) # Add the actual chat history
                            history_for_llm_call = temp_history_for_llm # Replace with augmented history
                            logger.info(f"STANDARD_CHAT: Injected previous summary for user {user_id} into LLM context for new session.")

                    history_for_llm_call.append({"role": "user", "content": user_message_content})

                    # --- Call the Standard LLM ---
                    try:
                        # llm.generate_response expects history as List[Dict[str, str]]
                        # request.history is already List[Dict[str,str]] if it comes from ChatRequest
                        # history_for_llm_api_message is the one to use here.
                        aika_response_text = await llm.generate_response(
                            history=history_for_llm_call, # Use the potentially augmented history
                            provider=request.provider,
                            model=request.model,
                            max_tokens=request.max_tokens,
                            temperature=request.temperature,
                            system_prompt=request.system_prompt if not any(h['role'] == 'system' for h in history_for_llm_call) else None
                        )
                    except Exception as llm_err:
                        logger.error(f"LLM generation failed for standard chat session {session_id}: {llm_err}", exc_info=True)
                        raise HTTPException(status_code=503, detail=f"LLM service unavailable or failed: {str(llm_err)}")


                    if aika_response_text.startswith("Error:"): # Check for errors returned by LLM service itself
                        logger.error(f"LLM generation returned error for session {session_id}: {aika_response_text}")
                        status_code_llm = 400 if "API key" in aika_response_text or "Invalid history" in aika_response_text else 503
                        raise HTTPException(status_code=status_code_llm, detail=aika_response_text)

                    # --- Save the standard conversation turn ---
                    try:
                        conversation_entry = Conversation(
                            user_id=user_id,
                            session_id=session_id,
                            conversation_id=conversation_id, # Save conversation_id
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

        else: # Neither message nor event
            logger.error(f"Invalid request structure for session {session_id}: Neither message nor event found.")
            raise HTTPException(status_code=400, detail="Invalid request: Missing message/history or event.")

        # --- Prepare and return the final response ---
        # The history returned to frontend should be the original history + new AI response
        # request.history is List[Dict[str, str]]
        final_history_to_return: List[Dict[str, str]] = []
        if request.history:
            final_history_to_return.extend(request.history)
        if request.message : # Add user message to history if it was a message request
             final_history_to_return.append({"role": "user", "content": request.message})
        final_history_to_return.append({"role": "assistant", "content": aika_response_text})


        # Determine model_used based on provider and request, fallback to default if not specified
        actual_provider_used = request.provider or "gemini" # Default if not specified
        actual_model_used = request.model # Use model from request if provided
        if not actual_model_used and llm.DEFAULT_PROVIDERS: # Check if DEFAULT_PROVIDERS is defined in llm
             actual_model_used = llm.DEFAULT_PROVIDERS.get(actual_provider_used, "unknown_model")
        elif not actual_model_used:
             actual_model_used = "unknown_model"


        return ChatResponse(
            response=aika_response_text,
            provider_used=str(actual_provider_used), # Ensure it's string
            model_used=str(actual_model_used), # Ensure it's string
            history=final_history_to_return,
            module_completed_id=module_just_completed_id
        )

    except ValueError as e: # Catch Pydantic validation errors
        logger.warning(f"Value error in /chat endpoint processing request: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        user_id_for_log = current_user.id if current_user else "unknown_user"
        logger.error(f"Unhandled exception in /chat endpoint for user {user_id_for_log}, session {session_id}: {e}", exc_info=True)
        # Try to clear module state if an unexpected error occurs during module processing
        if module_state_full: # If we were in a module
            try:
                await clear_module_state(session_id)
                logger.info(f"MODULE_CLEARED_ON_ERROR: Cleared module state for session {session_id} due to unhandled exception.")
            except Exception as redis_err:
                logger.error(f"Failed to clear module state for session {session_id} during unhandled exception: {redis_err}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
    finally:
        if db: # Ensure db is closed
            db.close()


# --- Define the Summarization Function ---
async def summarize_and_save(user_id: int, session_id_to_summarize: str, db_session_creator: Optional[DBSession] = None):
    """Fetches history, calls LLM to summarize, and saves to UserSummary table."""
    logger.info(f"Background Task: Starting summarization for user {user_id}, session {session_id_to_summarize}")
    # --- Use a dedicated DB session for the background task ---
    db: DBSession = next(db_session_creator())
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
        summarization_prompt = f"""Kamu adalah Aika, AI pendamping dari UGM-AICare. Tugasmu adalah membuat ringkasan singkat dari percakapan sebelumnya dengan pengguna. Ringkasan ini akan kamu gunakan untuk mengingatkan pengguna tentang apa yang telah dibahas jika mereka bertanya "apakah kamu ingat percakapan kita?".

Buatlah ringkasan dalam 1-2 kalimat saja, dalam Bahasa Indonesia yang alami dan kasual, seolah-olah kamu sedang berbicara santai dengan teman. Fokus pada inti atau perasaan utama yang diungkapkan pengguna.
Hindari penggunaan daftar, poin-poin, judul seperti "Poin Utama", atau format markdown. Cukup tuliskan sebagai paragraf singkat yang mengalir.

Contoh output yang baik:
"kita sempat ngobrolin soal kamu yang lagi ngerasa nggak nyaman karena pernah gagal memimpin organisasi."
"kamu cerita tentang perasaanmu yang campur aduk setelah kejadian di kampus."
"kita kemarin membahas tentang kesulitanmu mencari teman dan bagaimana itu membuatmu merasa kesepian."

Percakapan yang perlu diringkas:
{formatted_history}

Ringkasan singkat dan kasual:"""

        # 4. Call the LLM
        summary_llm_history = [{"role": "user", "content": summarization_prompt}]
        # Ensure DEFAULT_PROVIDERS and actual model name resolution logic is robust in llm.py
        summary_provider = "gemini" # Or configurable
        summary_model = llm.DEFAULT_PROVIDERS.get(summary_provider, "gemini-pro") if hasattr(llm, 'DEFAULT_PROVIDERS') else "gemini-pro"

        summary_text = await llm.generate_response(
             history=summary_llm_history,
             provider=summary_provider,
             model= summary_model,
             max_tokens=1024,
             temperature=0.5
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
        history_items: List[Dict[str, Any]] = []
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
        history_items.sort(key=lambda x: x["timestamp"], reverse=False)

        # 4. Apply pagination (limit/skip) to the final transformed list
        paginated_history = history_items[skip : skip + limit]
        logger.info(f"Returning {len(paginated_history)} transformed history items for user {current_user.id} (skip={skip}, limit={limit})")

        # 5. Return the transformed list (FastAPI will validate against response_model)
        return [ConversationHistoryItem(**item) for item in paginated_history] # Ensure all fields match

    except Exception as e:
        logger.error(f"Error fetching/transforming chat history for user {current_user.id}: {e}", exc_info=True)
        # Ensure a generic error is raised to avoid leaking details
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")