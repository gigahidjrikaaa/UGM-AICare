# backend/app/core/llm.py

import os
import httpx
from typing import Any, AsyncIterator, cast

import google.generativeai as genai
import google.generativeai.types as genai_types
from google.generativeai.types import HarmBlockThreshold, HarmCategory, content_types
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

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash" 
DEFAULT_GEMMA_LOCAL_MODEL = "gemma-3-12b-it-gguf"

# Configure Gemini client (do this once at module load)
if GOOGLE_API_KEY:
    try:
        configure_fn = getattr(genai, "configure", None)
        if callable(configure_fn):
            configure_fn(api_key=GOOGLE_API_KEY)
            logger.info("Google Generative AI SDK configured successfully.")
        else:
            logger.error("google.generativeai.configure is unavailable; Gemini support disabled.")
    except Exception as e:
        logger.error(f"Failed to configure Google Generative AI SDK: {e}")
else:
    logger.warning("GOOGLE_API_KEY not found. Gemini API will not be available.")

# --- Provider Type ---
LLMProvider = Literal['gemini', 'gemma_local']

# --- Helper: Convert Generic History to Gemini Format ---
# Gemini expects alternating user/model roles, and uses 'model' instead of 'assistant'
def _make_text_part(text: str) -> content_types.PartDict:
    return cast(content_types.PartDict, {"text": text})


def _convert_history_for_gemini(history: List[Dict[str, str]]) -> List[content_types.ContentDict]:
    gemini_history: List[content_types.ContentDict] = []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content")
        if not content:
            continue
        if role == "assistant":
            gemini_history.append(cast(
                content_types.ContentDict,
                {
                "role": "model",
                "parts": [_make_text_part(content)],
                },
            ))
        elif role == "user":
            gemini_history.append(cast(
                content_types.ContentDict,
                {
                "role": "user",
                "parts": [_make_text_part(content)],
                },
            ))
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

        # Handle system prompt - convert to structured content if provided
        gemini_model_args: Dict[str, Any] = {"model_name": model}
        if system_prompt:
            gemini_model_args["system_instruction"] = cast(
                content_types.ContentDict,
                {
                    "role": "system",
                    "parts": [_make_text_part(system_prompt)],
                },
            )

        generative_model_cls = getattr(genai, "GenerativeModel", None)
        if generative_model_cls is None:
            raise RuntimeError("google.generativeai.GenerativeModel is not available in the installed SDK")
        gemini_model = generative_model_cls(**gemini_model_args)

        # Convert history and extract the latest user prompt
        if not history or history[-1]['role'] != 'user':
             return "Error: Conversation history must end with a user message."
        
        last_user_prompt = history[-1]['content']
        gemini_history = _convert_history_for_gemini(history[:-1]) # Pass history *before* the last prompt

        generation_config = genai_types.GenerationConfig(
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
                 cast(
                     content_types.ContentDict,
                     {"role": "user", "parts": [_make_text_part(last_user_prompt)]},
                 ),
                 generation_config=generation_config,
                 safety_settings=safety_settings,
                 # stream=False # Set to True for streaming later
             )
        else:
             # If no history, just generate content from the single prompt
             response = await gemini_model.generate_content_async( # Use async method
                 [
                     cast(
                         content_types.ContentDict,
                         {"role": "user", "parts": [_make_text_part(last_user_prompt)]},
                     )
                 ],
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


async def stream_gemini_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 512,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
) -> AsyncIterator[str]:
    """Yield response chunks from the Gemini API."""
    if not GOOGLE_API_KEY:
        raise ValueError("Google API key not configured.")

    generative_model_cls = getattr(genai, "GenerativeModel", None)
    if generative_model_cls is None:
        raise RuntimeError("google.generativeai.GenerativeModel is not available in the installed SDK")

    gemini_model_args: Dict[str, Any] = {"model_name": model}
    if system_prompt:
        gemini_model_args["system_instruction"] = cast(
            content_types.ContentDict,
            {
                "role": "system",
                "parts": [_make_text_part(system_prompt)],
            },
        )

    gemini_model = generative_model_cls(**gemini_model_args)

    if not history or history[-1]["role"] != "user":
        yield "Error: Conversation history must end with a user message."
        return

    last_user_prompt = history[-1]["content"]
    gemini_history = _convert_history_for_gemini(history[:-1])

    generation_config = genai_types.GenerationConfig(
        max_output_tokens=max_tokens,
        temperature=temperature,
    )

    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    }

    async def _iter_stream(stream: Any) -> AsyncIterator[str]:
        async for chunk in stream:
            try:
                if hasattr(chunk, "text") and chunk.text:
                    yield chunk.text
                    continue
                candidates = getattr(chunk, "candidates", None)
                if not candidates:
                    continue
                for candidate in candidates:
                    content = getattr(candidate, "content", None)
                    parts = getattr(content, "parts", None) if content else None
                    if not parts:
                        continue
                    for part in parts:
                        text = getattr(part, "text", None) or part.get("text") if isinstance(part, dict) else None
                        if text:
                            yield text
            except Exception as err:  # pragma: no cover - defensive logging
                logger.debug("Gemini stream chunk parse failed: %s", err)

    try:
        if gemini_history:
            chat_session = gemini_model.start_chat(history=gemini_history)
            stream = chat_session.send_message_async(
                cast(
                    content_types.ContentDict,
                    {"role": "user", "parts": [_make_text_part(last_user_prompt)]},
                ),
                generation_config=generation_config,
                safety_settings=safety_settings,
                stream=True,
            )
        else:
            stream = gemini_model.generate_content_async(
                [
                    cast(
                        content_types.ContentDict,
                        {"role": "user", "parts": [_make_text_part(last_user_prompt)]},
                    )
                ],
                generation_config=generation_config,
                safety_settings=safety_settings,
                stream=True,
            )

        yielded = False
        async for chunk_text in _iter_stream(stream):
            if chunk_text:
                yielded = True
                yield chunk_text

        if not yielded:
            fallback = await generate_gemini_response(
                history=history,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system_prompt=system_prompt,
            )
            if fallback:
                yield fallback

    except Exception as exc:
        logger.error("Error streaming from Gemini API: %s", exc, exc_info=True)
        yield f"Error: An unexpected error occurred with Gemini API. {exc}"

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
