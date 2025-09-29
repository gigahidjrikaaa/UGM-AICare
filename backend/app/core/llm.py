# backend/app/core/llm.py

import os
import httpx
import google.generativeai as genai # type: ignore
from google.generativeai.types import HarmCategory, HarmBlockThreshold # type: ignore
from dotenv import load_dotenv
import logging
from typing import List, Dict, Literal, Optional, Tuple

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
GOOGLE_API_KEY = os.environ.get("GOOGLE_GENAI_API_KEY")

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash" 
DEFAULT_GEMMA_LOCAL_MODEL = "gemma-3-12b-it-gguf"

# Configure Gemini client (do this once at module load)
if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        logger.info("Google Generative AI SDK configured successfully.")
    except Exception as e:
        logger.error(f"Failed to configure Google Generative AI SDK: {e}")
else:
    logger.warning("GOOGLE_API_KEY not found. Gemini API will not be available.")

# --- Provider Type ---
LLMProvider = Literal['gemini', 'gemma_local']

# --- Helper: Convert Generic History to Gemini Format ---
# Gemini expects alternating user/model roles, and uses 'model' instead of 'assistant'
def _convert_history_for_gemini(history: List[Dict[str, str]]) -> List[Dict[str, str]]:
    gemini_history = []
    for msg in history:
        role = msg.get('role')
        content = msg.get('content')
        if role == 'assistant':
            gemini_history.append({'role': 'model', 'parts': [content]})
        elif role == 'user':
            gemini_history.append({'role': 'user', 'parts': [content]})
        # Silently ignore system messages for now, or handle as needed
        # elif role == 'system':
            # Gemini doesn't have a direct 'system' role in the chat history array like OpenAI-style providers.
            # System prompts are often handled differently (e.g., in `GenerativeModel` constructor or passed separately).
            # For simplicity here, we'll omit them from the direct history conversion.
            # logger.warning("System messages are not directly passed in Gemini history.")
    # Ensure history ends with a user message if the last message added was 'model'
    # This might be handled by the calling function ensuring the *new* prompt is the last item.
    return gemini_history



# --- Gemini API Function (Async) ---
async def generate_gemini_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 512,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None # Add system prompt handling
) -> str:
    """Generates a response using the Google Gemini API (async)."""
    if not GOOGLE_API_KEY:
        # The warning during initial module load already indicated if the key was missing.
        # This check prevents proceeding if the key was definitely not provided.
        logger.error("Attempted to use Gemini, but GOOGLE_API_KEY was not found in environment.")
        raise ValueError("Google API key not configured.")

    try:
        logger.info(f"Sending request to Gemini API (Model: {model})")

        # Handle system prompt - Gemini Pro API has specific 'system_instruction' parameter
        gemini_model_args = {"model_name": model}
        if system_prompt:
             gemini_model_args["system_instruction"] = system_prompt
        
        gemini_model = genai.GenerativeModel(**gemini_model_args)

        # Convert history and extract the latest user prompt
        if not history or history[-1]['role'] != 'user':
             return "Error: Conversation history must end with a user message."
        
        last_user_prompt = history[-1]['content']
        gemini_history = _convert_history_for_gemini(history[:-1]) # Pass history *before* the last prompt

        generation_config = genai.types.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature
        )

        # Basic safety settings (adjust as needed)
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }

        # Start a chat session if there's history
        chat_session = None
        if gemini_history:
             chat_session = gemini_model.start_chat(history=gemini_history)
             response = await chat_session.send_message_async( # Use async method
                 last_user_prompt,
                 generation_config=generation_config,
                 safety_settings=safety_settings,
                 # stream=False # Set to True for streaming later
             )
        else:
             # If no history, just generate content from the single prompt
             response = await gemini_model.generate_content_async( # Use async method
                 last_user_prompt, # Send only the last user prompt
                 generation_config=generation_config,
                 safety_settings=safety_settings,
                 # stream=False
             )


        # Handle potential blocks or errors (check response structure)
        try:
            # Accessing response.text might raise ValueError if blocked
            response_text = response.text
            # logger.info("Received response from Gemini API.")
            # logger.info("System Prompt: " + system_prompt)
            # logger.info("User Prompt: " + last_user_prompt)
            # logger.info("Response: " + response_text.strip())
            return response_text.strip()
        except ValueError as e:
            # This often indicates blocked content or unusual finish reason
            logger.warning(f"Gemini response might be blocked or empty: {e}. Checking feedback/candidates.")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                 reason = response.prompt_feedback.block_reason.name
                 logger.warning(f"Gemini request blocked. Reason: {reason}")
                 return f"Error: Request blocked by safety filters ({reason}). Please rephrase your prompt."
            elif response.candidates and response.candidates[0].finish_reason != 'STOP':
                 reason = response.candidates[0].finish_reason.name
                 logger.warning(f"Gemini generation stopped unexpectedly. Reason: {reason}")
                 return f"Error: Generation stopped ({reason})."
            else:
                 logger.warning(f"Gemini returned empty or invalid response. Full response obj: {response}")
                 return "Error: Received an empty or invalid response from Gemini."
        
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        # More specific error handling can be added based on google.api_core.exceptions
        return f"Error: An unexpected error occurred with Gemini API. {e}"

# --- Local Gemma 3 API Function (Async) ---
async def generate_gemma_local_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMMA_LOCAL_MODEL, # Model name is for logging
    max_tokens: int = 512,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None
) -> str:
    """Generates a response using the self-hosted Gemma 3 API."""
    # The URL uses the Docker service name, which acts as a hostname.
    gemma_api_url = "http://gemma_service:6666/v1/generate"
    
    # Construct a single prompt from history. Llama-based models often work best this way.
    # You may need to experiment with the prompt templating for your fine-tuned model.
    prompt_lines = []
    if system_prompt:
        prompt_lines.append(f"<|system|>\n{system_prompt}")
    for msg in history:
        role = msg.get("role")
        content = msg.get("content")
        if role == 'user':
            prompt_lines.append(f"<|user|>\n{content}")
        elif role == 'assistant':
            prompt_lines.append(f"<|assistant|>\n{content}")
            
    # Combine into a single string
    full_prompt = "\n".join(prompt_lines)

    data = {
        "prompt": full_prompt,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=120.0) as client: # Longer timeout for local generation
        try:
            logger.info(f"Sending request to local Gemma API (Model: {model})")
            response = await client.post(gemma_api_url, json=data)
            response.raise_for_status()
            result = response.json()
            
            if "generated_text" in result:
                logger.info("Received response from local Gemma API.")
                return result["generated_text"].strip()
            else:
                logger.warning(f"Unexpected response structure from local Gemma API: {result}")
                return "Error: Could not parse response from local Gemma API."

        except httpx.RequestError as e:
            logger.error(f"HTTP error calling local Gemma API: {e}")
            return "Error: Failed to connect to local Gemma API. Ensure the 'gemma_service' container is running and healthy."
        except httpx.HTTPStatusError as e:
             logger.error(f"Local Gemma API returned error status {e.response.status_code}: {e.response.text}")
             return f"Error: Local Gemma API failed ({e.response.status_code}). Please check its logs."
        except Exception as e:
            logger.error(f"An unexpected error occurred with local Gemma API: {e}", exc_info=True)
            return f"Error: An unexpected error occurred. {e}"

# --- Unified Generation Function (Async) ---
async def generate_response(
    history: List[Dict[str, str]],
    model: Optional[str] = None,
    max_tokens: int = 512,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None # Pass system prompt through
) -> str:
    """
    Generates a response using the specified LLM provider (async) without fallback.

    Args:
        history: The conversation history (list of {'role': str, 'content': str}).
                 Must end with a 'user' message.
        provider: The LLM provider ('gemma_local' or 'gemini').
        model: The specific model name (optional, uses default for provider if None).
        max_tokens: Maximum number of tokens to generate.
        temperature: Controls randomness (0.0-1.0+).
        system_prompt: An optional system prompt.

    Returns:
        The generated text response string or an error message.
    """
    logger.info(f"Generating response using model: {model}")

    if not history or history[-1].get('role') != 'user':
        logger.error("Invalid history: Must not be empty and end with a 'user' message.")
        return "Error: Invalid conversation history provided."

    if model == "gemma_local":
        gemma_model = model if model else DEFAULT_GEMMA_LOCAL_MODEL
        logger.info(f"Direct request: Using gemma_local (Model: {gemma_model})")
        return await generate_gemma_local_response(
            history=history, model=gemma_model, max_tokens=max_tokens, temperature=temperature, system_prompt=system_prompt
        )

    elif model == "gemini_google":
        gemini_model = DEFAULT_GEMINI_MODEL
        logger.info(f"Direct request: Using gemini (Model: {gemini_model})")
        return await generate_gemini_response(
            history=history, model=gemini_model, max_tokens=max_tokens, temperature=temperature, system_prompt=system_prompt
        )
    
    else:
        # This case should ideally be prevented by Pydantic/FastAPI validation
        error_msg = f"Invalid LLM model: {model}. Choose 'gemma_local' or 'gemini_google'."
        logger.error(error_msg)
        return error_msg

# --- Constants for default models (can be imported elsewhere) ---
DEFAULT_PROVIDERS = {
    "gemini": DEFAULT_GEMINI_MODEL,
    "gemma_local": DEFAULT_GEMMA_LOCAL_MODEL
}