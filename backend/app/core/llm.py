# backend/app/core/llm.py

import os
import httpx
import asyncio
import re
import time
import threading
from typing import Any, AsyncIterator, cast

# NEW SDK imports
from google import genai
from google.genai import types
from dotenv import load_dotenv, find_dotenv
import logging

from app.core.gemini_key_tracker import gemini_tracker
from typing import List, Dict, Literal, Optional, Tuple

# Langfuse Tracing
from app.core.langfuse_config import trace_llm_call
from app.core import llm_request_tracking

# Load environment variables
load_dotenv(find_dotenv())

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
# Load primary key and any additional keys (GOOGLE_GENAI_API_KEY_2, _3, etc.)
GEMINI_API_KEYS = []
if os.environ.get("GOOGLE_GENAI_API_KEY"):
    GEMINI_API_KEYS.append(os.environ.get("GOOGLE_GENAI_API_KEY"))

# Check for additional keys (up to 5)
for i in range(2, 6):
    key = os.environ.get(f"GOOGLE_GENAI_API_KEY_{i}")
    if key:
        GEMINI_API_KEYS.append(key)

logger.info(f"Loaded {len(GEMINI_API_KEYS)} Gemini API keys for rotation.")

# Backward compatibility for legacy call sites that still reference GOOGLE_API_KEY.
# Keep as a nullable string so older guards like `if llm.GOOGLE_API_KEY` continue to work.
GOOGLE_API_KEY: Optional[str] = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else None

# Gemini models for different use cases
# NOTE: These are constrained to models confirmed usable in your AI Studio project.
DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview"  # Default for general use
GEMINI_LITE_MODEL = "gemini-2.5-flash-lite"  # For high-volume conversational
GEMINI_FLASH_MODEL = "gemini-3-flash-preview"  # For most agent tasks
GEMINI_PRO_MODEL = "gemini-3-pro-preview"  # For advanced reasoning (use where it matters)

# Circuit breaker tuning
_MODEL_FAILURE_WINDOW_S = 60.0
_MODEL_FAILURE_THRESHOLD = 5
_MODEL_COOLDOWN_S = 60.0
_gemini_model_failures: dict[str, list[float]] = {}
_gemini_model_open_until: dict[str, float] = {}
_gemini_model_breaker_events: dict[str, dict[str, Any]] = {}
_gemini_model_lock = threading.Lock()

# Fallback chain for Gemini models (in order of preference)
# Keep this list limited to models you can actually call; otherwise the chain may abort early.
GEMINI_FALLBACK_CHAIN = [
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-preview-09-2025",
]

DEFAULT_GEMMA_LOCAL_MODEL = "gemma-3-12b-it-gguf"  # Local inference via Ollama/vLLM

# --- Client Management ---
_gemini_client: Optional[genai.Client] = None
_gemini_client_by_key: dict[int, genai.Client] = {}
_gemini_key_cooldowns: dict[int, float] = {}
_current_key_index: int = 0
_gemini_client_lock = threading.Lock()


def _select_gemini_key_index(force_rotate: bool) -> int:
    global _current_key_index

    if not GEMINI_API_KEYS:
        logger.error("No GOOGLE_GENAI_API_KEYs found. Gemini API will not be available.")
        raise ValueError("Google API keys not configured.")

    start_idx = (_current_key_index + 1) % len(GEMINI_API_KEYS) if force_rotate else _current_key_index
    now = time.monotonic()
    chosen_idx: Optional[int] = None

    for offset in range(len(GEMINI_API_KEYS)):
        idx = (start_idx + offset) % len(GEMINI_API_KEYS)
        if _gemini_key_cooldowns.get(idx, 0.0) <= now:
            chosen_idx = idx
            break

    if chosen_idx is None:
        earliest_idx = min(range(len(GEMINI_API_KEYS)), key=lambda i: _gemini_key_cooldowns.get(i, 0.0))
        wait_s = max(0.0, _gemini_key_cooldowns.get(earliest_idx, now) - now)
        logger.warning(
            "All Gemini API keys are in cooldown. Selecting index %s (ready in %.2fs).",
            earliest_idx,
            wait_s,
        )
        chosen_idx = earliest_idx

    _current_key_index = int(chosen_idx)
    return _current_key_index


def _get_or_create_gemini_client(key_index: int) -> genai.Client:
    if key_index in _gemini_client_by_key:
        return _gemini_client_by_key[key_index]
    try:
        client = genai.Client(api_key=GEMINI_API_KEYS[key_index])
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")
        raise
    _gemini_client_by_key[key_index] = client
    return client


def select_gemini_model(
    *,
    intent: str | None,
    role: str | None,
    has_tools: bool,
    preferred_model: str | None = None,
) -> str:
    """Select a Gemini model based on intent/role and tool usage.

    This is a lightweight routing policy to reduce cost/latency for low-risk tasks.
    """
    if preferred_model:
        return preferred_model

    normalized_intent = (intent or "").lower()
    normalized_role = (role or "").lower()

    if normalized_role in ("admin", "counselor") and normalized_intent in (
        "analytics_query",
        "crisis_intervention",
        "emergency_escalation",
    ):
        return GEMINI_PRO_MODEL

    if normalized_intent in ("crisis_intervention", "emergency_escalation"):
        return GEMINI_PRO_MODEL

    if has_tools or normalized_intent in (
        "emotional_support",
        "appointment_scheduling",
        "information_inquiry",
    ):
        return GEMINI_FLASH_MODEL

    return GEMINI_LITE_MODEL


def _get_breaker_event_entry(model: str) -> dict[str, Any]:
    if model not in _gemini_model_breaker_events:
        _gemini_model_breaker_events[model] = {
            "total_opens": 0,
            "total_closes": 0,
            "last_opened_at": None,
            "last_closed_at": None,
        }
    return _gemini_model_breaker_events[model]


def _close_expired_breakers(now_mono: float, now_epoch: float) -> None:
    for model, until in list(_gemini_model_open_until.items()):
        if until <= now_mono:
            _gemini_model_open_until.pop(model, None)
            entry = _get_breaker_event_entry(model)
            entry["total_closes"] = int(entry.get("total_closes", 0)) + 1
            entry["last_closed_at"] = now_epoch


def _record_model_failure(model: str) -> None:
    now = time.monotonic()
    now_epoch = time.time()
    with _gemini_model_lock:
        failures = _gemini_model_failures.get(model, [])
        failures = [t for t in failures if now - t <= _MODEL_FAILURE_WINDOW_S]
        failures.append(now)
        _gemini_model_failures[model] = failures

        if len(failures) >= _MODEL_FAILURE_THRESHOLD:
            is_open = _gemini_model_open_until.get(model, 0.0) > now
            if not is_open:
                _gemini_model_open_until[model] = now + _MODEL_COOLDOWN_S
                entry = _get_breaker_event_entry(model)
                entry["total_opens"] = int(entry.get("total_opens", 0)) + 1
                entry["last_opened_at"] = now_epoch


def _record_model_success(model: str) -> None:
    now_epoch = time.time()
    with _gemini_model_lock:
        was_open = model in _gemini_model_open_until
        _gemini_model_failures.pop(model, None)
        _gemini_model_open_until.pop(model, None)
        if was_open:
            entry = _get_breaker_event_entry(model)
            entry["total_closes"] = int(entry.get("total_closes", 0)) + 1
            entry["last_closed_at"] = now_epoch


def _is_model_open(model: str) -> bool:
    now = time.monotonic()
    with _gemini_model_lock:
        return _gemini_model_open_until.get(model, 0.0) > now


def get_gemini_circuit_breaker_status(models: Optional[list[str]] = None) -> list[dict[str, Any]]:
    """Return circuit breaker status for observability."""
    now_mono = time.monotonic()
    now_epoch = time.time()

    with _gemini_model_lock:
        _close_expired_breakers(now_mono, now_epoch)

        if models is None:
            models = list({
                DEFAULT_GEMINI_MODEL,
                GEMINI_LITE_MODEL,
                GEMINI_FLASH_MODEL,
                GEMINI_PRO_MODEL,
                *GEMINI_FALLBACK_CHAIN,
            })

        statuses: list[dict[str, Any]] = []
        for model in models:
            failures = _gemini_model_failures.get(model, [])
            failures = [t for t in failures if now_mono - t <= _MODEL_FAILURE_WINDOW_S]
            if failures:
                _gemini_model_failures[model] = failures
            else:
                _gemini_model_failures.pop(model, None)

            open_until = _gemini_model_open_until.get(model, 0.0)
            is_open = open_until > now_mono
            remaining_s = max(0.0, open_until - now_mono) if is_open else 0.0
            entry = _get_breaker_event_entry(model)

            statuses.append({
                "model": model,
                "is_open": is_open,
                "open_remaining_s": round(remaining_s, 2),
                "failures_in_window": len(failures),
                "total_opens": int(entry.get("total_opens", 0)),
                "total_closes": int(entry.get("total_closes", 0)),
                "last_opened_at": entry["last_opened_at"],
                "last_closed_at": entry["last_closed_at"],
            })

        return statuses


def _mark_gemini_key_cooldown(retry_after_s: float | None) -> None:
    if not GEMINI_API_KEYS:
        return

    min_cooldown_s = 5.0
    max_cooldown_s = 120.0
    cooldown_s = retry_after_s if retry_after_s is not None else min_cooldown_s
    cooldown_s = max(min_cooldown_s, min(cooldown_s, max_cooldown_s))
    key_idx, key_last4 = _current_gemini_key_fingerprint()

    with _gemini_client_lock:
        _gemini_key_cooldowns[key_idx] = time.monotonic() + cooldown_s

    logger.warning(
        "Cooling down Gemini API key index %s (last4=%s) for %.2fs.",
        key_idx,
        key_last4,
        cooldown_s,
    )


def get_gemini_client(force_rotate: bool = False) -> genai.Client:
    """Get Gemini client, optionally rotating to the next API key.
    
    Args:
        force_rotate: If True, switches to the next available API key before returning client.
        
    Returns:
        genai.Client: Initialized Gemini client
        
    Raises:
        ValueError: If no API keys are configured
    """
    global _gemini_client

    with _gemini_client_lock:
        prev_idx = _current_key_index
        selected_idx = _select_gemini_key_index(force_rotate)

        if force_rotate:
            logger.info(
                "Rotating Gemini API key: %s -> %s (key ending in ...%s)",
                prev_idx,
                selected_idx,
                GEMINI_API_KEYS[selected_idx][-4:],
            )
        client = _get_or_create_gemini_client(selected_idx)
        _gemini_client = client
        return client

# --- Provider Type ---
LLMProvider = Literal['gemini', 'gemma_local']

# --- Helper: Convert Generic History to New SDK Format ---
def _convert_history_to_contents(history: List[Dict[str, str]]) -> List[types.Content]:
    """Convert generic history format to new SDK Content objects.
    
    Args:
        history: List of {'role': 'user'|'assistant', 'content': str}
        
    Returns:
        List of types.Content objects
    """
    contents: List[types.Content] = []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content")
        if not content:
            continue

        # System instructions should be passed via config.system_instruction.
        if role == "system":
            continue
        
        # Map 'assistant' to 'model' for Gemini
        gemini_role = "model" if role == "assistant" else "user"
        
        contents.append(
            types.Content(
                role=gemini_role,
                parts=[types.Part.from_text(text=content)]  # keyword argument
            )
        )
    return contents


def _convert_tool_schemas_for_new_sdk(tool_wrappers: List[Dict[str, Any]]) -> List[types.Tool]:
    """Convert tool schemas to new google-genai SDK format.
    
    The new SDK uses:
    - types.Tool with function_declarations
    - types.FunctionDeclaration for each tool
    - Lowercase type names: "object", "string", "integer" (not "OBJECT", "STRING")
    - Pydantic-based validation
    
    Expected input format: [{"function_declarations": [{"name": ..., "description": ..., "parameters": ...}]}]
    
    Args:
        tool_wrappers: List of tool wrapper dicts containing function_declarations
        
    Returns:
        List of types.Tool objects compatible with new SDK
    """
    # Fields allowed in Schema (parameters and nested properties)
    SCHEMA_ALLOWED_FIELDS = {"type", "description", "properties", "required", "items", "enum", "format"}
    # Fields allowed in FunctionDeclaration
    FUNCTION_ALLOWED_FIELDS = {"name", "description", "parameters"}
    
    def convert_types_to_lowercase(obj: Any) -> Any:
        """Recursively convert type strings to lowercase (new SDK requirement)."""
        if isinstance(obj, dict):
            result = {}
            for key, value in obj.items():
                if key == "type" and isinstance(value, str):
                    # Convert "STRING" -> "string", "OBJECT" -> "object"
                    result[key] = value.lower()
                else:
                    result[key] = convert_types_to_lowercase(value)
            return result
        elif isinstance(obj, list):
            return [convert_types_to_lowercase(item) for item in obj]
        else:
            return obj
    
    def clean_schema(schema: Any, path: str = "") -> Any:
        """Recursively clean schema objects, removing non-standard fields."""
        if isinstance(schema, dict):
            cleaned = {}
            for key, value in schema.items():
                if key in SCHEMA_ALLOWED_FIELDS:
                    # Recursively clean nested schemas
                    if key == "properties" and isinstance(value, dict):
                        cleaned[key] = {k: clean_schema(v, f"{path}.{k}") for k, v in value.items()}
                    elif key == "items" and isinstance(value, dict):
                        cleaned[key] = clean_schema(value, f"{path}.items")
                    else:
                        cleaned[key] = value
                else:
                    logger.debug(f"Removing non-standard Schema field '{key}' from {path or 'root'}")
            return cleaned
        elif isinstance(schema, list):
            return [clean_schema(item, path) for item in schema]
        else:
            return schema
    
    def clean_function_declaration(func_decl: Dict[str, Any]) -> Dict[str, Any]:
        """Remove non-standard fields from function declaration."""
        cleaned = {}
        tool_name = func_decl.get('name', 'unknown')
        
        for key, value in func_decl.items():
            if key in FUNCTION_ALLOWED_FIELDS:
                if key == "parameters" and isinstance(value, dict):
                    # Deep clean the parameters schema
                    cleaned[key] = clean_schema(value, f"tool:{tool_name}")
                else:
                    cleaned[key] = value
            else:
                logger.debug(f"Removing non-standard FunctionDeclaration field '{key}' from tool '{tool_name}'")
        
        return cleaned
    
    # Process each tool wrapper and convert to new SDK format
    result: List[types.Tool] = []
    for wrapper in tool_wrappers:
        if "function_declarations" not in wrapper:
            logger.warning(f"Tool wrapper missing 'function_declarations': {wrapper}")
            continue
        
        func_decls_list: List[types.FunctionDeclaration] = []
        for decl in wrapper["function_declarations"]:
            # Convert types to lowercase and clean
            converted = convert_types_to_lowercase(decl)
            cleaned = clean_function_declaration(converted)
            
            # Create FunctionDeclaration object
            try:
                func_decl = types.FunctionDeclaration(
                    name=cleaned["name"],
                    description=cleaned.get("description", ""),
                    parameters=cleaned.get("parameters", {})
                )
                func_decls_list.append(func_decl)
            except Exception as e:
                logger.error(f"Failed to create FunctionDeclaration for {cleaned.get('name')}: {e}")
                continue
        
        if func_decls_list:
            result.append(types.Tool(function_declarations=func_decls_list))
    
    logger.debug(f"Converted {len(tool_wrappers)} tool wrappers to {len(result)} Tool objects for new SDK")
    return result


def _normalize_tools_for_generate_config(tools: Optional[List[Any]]) -> Optional[List[types.Tool]]:
    if not tools:
        return None
    if isinstance(tools[0], types.Tool):
        return cast(List[types.Tool], tools)
    return _convert_tool_schemas_for_new_sdk(tools)


def _is_invalid_model_error(status_code: int, error_msg: str) -> bool:
    """Best-effort detection for "model not available / not found" errors.

    We treat these as a signal to try the next fallback model (not a hard failure),
    because AI Studio projects can have per-model allowlists.
    """
    msg = (error_msg or "").lower()
    if status_code == 404:
        return True

    # Some SDKs return 400 for invalid model names.
    if status_code == 400:
        keywords = [
            "model",
            "not found",
            "not supported",
            "invalid model",
            "unknown model",
        ]
        return any(k in msg for k in keywords)

    return any(k in msg for k in ["model not found", "not supported", "unknown model", "not_found"])


def _current_gemini_key_fingerprint() -> tuple[int, str]:
    """Return (index, last4) for the currently-selected Gemini API key.

    This is for log attribution only; it never returns the full key.
    """

    global _current_key_index
    idx = int(_current_key_index)
    try:
        key = GEMINI_API_KEYS[idx]
    except Exception:
        return idx, "????"
    key_str = str(key or "")
    return idx, (key_str[-4:] if len(key_str) >= 4 else "????")


def _parse_retry_after_s(error_msg: str) -> float | None:
    """Best-effort parse for SDK messages like: "Please retry in 45.63s"."""

    msg = error_msg or ""
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", msg)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _extract_error_code(error: Exception) -> int:
    """Best-effort extract HTTP-like error code from SDK exceptions/messages."""
    try:
        status_code = getattr(error, "status_code", None)
        if isinstance(status_code, int):
            return status_code
    except Exception:
        pass

    try:
        code = getattr(error, "code", None)
        if isinstance(code, int):
            return code
    except Exception:
        pass

    match = re.search(r"\b(4\d\d|5\d\d)\b", str(error or ""))
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return 0
    return 0


def _is_resource_exhausted_error(status_code: int, error_msg: str) -> bool:
    msg = (error_msg or "")
    return status_code == 429 or "RESOURCE_EXHAUSTED" in msg


class GeminiResourceExhaustedError(RuntimeError):
    """Raised when Gemini returns RESOURCE_EXHAUSTED and we cannot recover.

    This exception carries safe attribution (model name and API key fingerprint)
    so upstream code can log once and clients (e.g. notebook evaluators) can
    pause/resume.
    """

    def __init__(
        self,
        *,
        model: str,
        api_key_index: int,
        api_key_last4: str,
        retry_after_s: float | None,
        message: str,
    ) -> None:
        super().__init__(message)
        self.model = model
        self.api_key_index = api_key_index
        self.api_key_last4 = api_key_last4
        self.retry_after_s = retry_after_s



# --- Gemini API Function (Async) - Migrated to new SDK ---
@trace_llm_call("gemini-genai-sdk")
async def generate_gemini_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    tools: Optional[List[Any]] = None,
    return_full_response: bool = False,
    json_mode: bool = False,
    json_schema: Optional[Dict[str, Any]] = None,
) -> str | Any:
    """Generates a response using the Google Gemini API with new google-genai SDK.
    
    This function has been migrated from google-generativeai to google-genai.
    Key changes:
    - Uses client.models.generate_content() instead of GenerativeModel
    - No more start_chat() - uses contents array with full history
    - System prompt via config.system_instruction
    - Tools via config.tools
    - Types are lowercase ("string" not "STRING")
    
    Args:
        history: Conversation history with role and content
        model: Gemini model to use
        max_tokens: Maximum tokens in response
        temperature: Sampling temperature
        system_prompt: Optional system instruction
        tools: Optional list of Tool objects for function calling
        return_full_response: If True, returns full response object for tool calling
        json_mode: If True, forces the model to output valid JSON
        json_schema: Optional JSON schema to enforce when json_mode=True
        
    Returns:
        Generated response text, or full response object if return_full_response=True
    """
    try:
        call_index = llm_request_tracking.increment_request(model=model)
        client = get_gemini_client()
        logger.info(
            f"Sending request to Gemini API (Model: {model}, Tools: {bool(tools)}, JSON: {json_mode}, Schema: {bool(json_schema)})",
            extra={
                "user_id": llm_request_tracking.get_user_id(),
                "session_id": llm_request_tracking.get_session_id(),
                "prompt_id": llm_request_tracking.get_prompt_id(),
                "llm_call_index": call_index,
                "llm_model": model,
                "llm_phase": "generate_gemini_response",
                "llm_has_tools": bool(tools),
            },
        )
        if system_prompt:
            logger.info(f"🤖 System prompt applied: {system_prompt[:100]}...")

        # Validate history
        if not history or history[-1]['role'] != 'user':
            return "Error: Conversation history must end with a user message."

        # Convert history to new SDK Content format
        contents = _convert_history_to_contents(history)

        # Build generation config
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        
        if json_mode:
            config.response_mime_type = "application/json"
            if json_schema is not None:
                config.response_schema = cast(Any, json_schema)
        
        # Add system prompt if provided
        if system_prompt:
            config.system_instruction = system_prompt
        
        # Add tools if provided
        normalized_tools = _normalize_tools_for_generate_config(tools)
        if normalized_tools:
            config.tools = normalized_tools
            logger.debug(f"Enabled {len(normalized_tools)} tool(s) for this request")
        
        # Add safety settings
        # Note: Use enum values to satisfy typing (Pylance).
        config.safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
        ]

        # Generate content with new SDK
        # Run blocking call in executor to avoid blocking the event loop
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=model,
                contents=cast(Any, contents),
                config=config
            )
        )

        # Return full response if requested (for tool calling)
        if return_full_response:
            return response
        
        # Extract text from response
        try:
            if hasattr(response, 'text') and response.text:
                return response.text.strip()
            
            # If we get here, response.text is None or empty, or doesn't exist
            logger.warning(f"Gemini response text is missing or empty.")

            # Try to provide a more specific error when available.
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                if hasattr(response.prompt_feedback, 'block_reason') and response.prompt_feedback.block_reason:
                    reason = str(response.prompt_feedback.block_reason)
                    logger.warning(f"Gemini request blocked. Reason: {reason}")
                    return f"Error: Request blocked by safety filters ({reason}). Please rephrase your prompt."

            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if hasattr(candidate, 'finish_reason') and candidate.finish_reason:
                    reason = str(candidate.finish_reason)
                    if reason != 'STOP':
                        logger.warning(f"Gemini generation stopped unexpectedly. Reason: {reason}")
                        return f"Error: Generation stopped ({reason})."

            return "Error: Received an empty or invalid response from Gemini."
            
        except (ValueError, AttributeError) as e:
            # Check if this is a function call (not an error)
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            # This is a function call, not an error
                            if return_full_response:
                                return response
                            logger.error("Function call received but return_full_response=False")
                            return "Error: Function calling is not properly configured."
            
            # This is actually an error or blocked content
            logger.warning(f"Gemini response might be blocked or empty: {e}")
            
            # Check for blocked content
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                if hasattr(response.prompt_feedback, 'block_reason') and response.prompt_feedback.block_reason:
                    reason = str(response.prompt_feedback.block_reason)
                    logger.warning(f"Gemini request blocked. Reason: {reason}")
                    return f"Error: Request blocked by safety filters ({reason}). Please rephrase your prompt."
            
            # Check finish reason
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if hasattr(candidate, 'finish_reason') and candidate.finish_reason:
                    reason = str(candidate.finish_reason)
                    if reason != 'STOP':
                        logger.warning(f"Gemini generation stopped unexpectedly. Reason: {reason}")
                        return f"Error: Generation stopped ({reason})."
            
            logger.warning(f"Gemini returned empty or invalid response.")
            return "Error: Received an empty or invalid response from Gemini."
        
    except ValueError as e:
        logger.error(f"ValueError calling Gemini API: {e}")
        return f"Error: Invalid configuration or request. {e}"
    except Exception as e:
        # Let fallback handlers decide what to do; keep expected provider errors concise.
        try:
            from google.genai.errors import ClientError, ServerError
            is_provider_error = isinstance(e, (ClientError, ServerError))
        except Exception:
            is_provider_error = False

        error_code = _extract_error_code(e)
        error_msg = str(e)
        if is_provider_error and _is_resource_exhausted_error(error_code, error_msg):
            logger.warning(
                "Gemini quota/throttle event detected (code=%s): %s",
                error_code,
                error_msg[:300],
            )
            raise

        if is_provider_error:
            logger.warning("Gemini provider error (code=%s): %s", error_code, error_msg[:300])
            raise

        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        raise


@trace_llm_call("gemini-genai-sdk-content")
async def generate_gemini_content(
    *,
    contents: List[types.Content],
    model: str,
    config: types.GenerateContentConfig,
    return_full_response: bool = False,
) -> str | Any:
    """Generate a response using pre-built Content objects.

    This is used by the tool-calling loop, where we must send structured
    function_call and function_response parts back to Gemini.
    """
    try:
        call_index = llm_request_tracking.increment_request(model=model)
        client = get_gemini_client()
        loop = asyncio.get_running_loop()

        logger.info(
            "Sending request to Gemini API (contents mode)",
            extra={
                "user_id": llm_request_tracking.get_user_id(),
                "session_id": llm_request_tracking.get_session_id(),
                "prompt_id": llm_request_tracking.get_prompt_id(),
                "llm_call_index": call_index,
                "llm_model": model,
                "llm_phase": "generate_gemini_content",
                "llm_has_tools": bool(getattr(config, "tools", None)),
            },
        )

        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=model,
                contents=cast(Any, contents),
                config=config,
            ),
        )

        if return_full_response:
            return response

        if hasattr(response, "text") and response.text:
            return response.text.strip()

        return "Error: Received an empty or invalid response from Gemini."
    except Exception as e:
        try:
            from google.genai.errors import ClientError, ServerError
            is_provider_error = isinstance(e, (ClientError, ServerError))
        except Exception:
            is_provider_error = False

        error_code = _extract_error_code(e)
        error_msg = str(e)
        if is_provider_error and _is_resource_exhausted_error(error_code, error_msg):
            logger.warning(
                "Gemini quota/throttle event detected (contents mode, code=%s): %s",
                error_code,
                error_msg[:300],
            )
            raise

        if is_provider_error:
            logger.warning("Gemini provider error in contents mode (code=%s): %s", error_code, error_msg[:300])
            raise

        logger.error(f"Error calling Gemini API (contents): {e}", exc_info=True)
        raise


@trace_llm_call("gemini-fallback-chain-content")
async def generate_gemini_content_with_fallback(
    *,
    contents: List[types.Content],
    model: str = DEFAULT_GEMINI_MODEL,
    config: Optional[types.GenerateContentConfig] = None,
    return_full_response: bool = False,
    allow_retry_sleep: bool = True,
) -> str | Any:
    """Generate Gemini response with automatic fallback, using pre-built contents."""
    from google.genai.errors import ClientError, ServerError

    if config is None:
        config = types.GenerateContentConfig(max_output_tokens=2048, temperature=0.7)

    models_to_try = [model] + [m for m in GEMINI_FALLBACK_CHAIN if m != model]
    all_models_open = all(_is_model_open(m) for m in models_to_try)
    last_error: Exception | None = None
    last_error_model: str | None = None
    last_error_key: tuple[int, str] | None = None
    last_error_retry_after_s: float | None = None

    for idx, current_model in enumerate(models_to_try):
        if _is_model_open(current_model) and not all_models_open:
            logger.warning("Skipping model %s due to open circuit breaker", current_model)
            continue
        max_retries_per_model = max(3, len(GEMINI_API_KEYS))

        for retry_attempt in range(max_retries_per_model):
            try:
                logger.info(
                    f"🔄 Attempting Gemini request with model: {current_model} "
                    f"(model_idx={idx}, retry={retry_attempt}, contents_mode=True)"
                )

                response = await generate_gemini_content(
                    contents=contents,
                    model=current_model,
                    config=config,
                    return_full_response=return_full_response,
                )

                # Track successful request
                key_idx, _ = _current_gemini_key_fingerprint()
                gemini_tracker.record_request(key_index=key_idx, model=current_model, success=True)
                _record_model_success(current_model)

                if idx > 0 or retry_attempt > 0:
                    logger.warning(f"✅ Fallback/Retry successful! Used model: {current_model}")
                return response

            except (ClientError, ServerError) as e:
                last_error = e
                last_error_model = current_model
                last_error_key = _current_gemini_key_fingerprint()
                last_error_retry_after_s = _parse_retry_after_s(str(e))
                error_code = _extract_error_code(e)
                error_msg = str(e)

                _record_model_failure(current_model)

                # Track failed request
                key_idx_err, _ = _current_gemini_key_fingerprint()
                is_rate_limited = (
                    error_code == 429
                    or "RESOURCE_EXHAUSTED" in error_msg
                )
                gemini_tracker.record_request(
                    key_index=key_idx_err,
                    model=current_model,
                    success=False,
                    is_rate_limited=is_rate_limited,
                    error_message=error_msg[:200],
                )

                if _is_invalid_model_error(error_code, error_msg):
                    logger.warning(
                        f"⚠️ Model {current_model} not available (code={error_code}). "
                        "Skipping to next fallback model..."
                    )
                    break

                should_fallback = (
                    error_code == 429
                    or error_code == 503
                    or "RESOURCE_EXHAUSTED" in error_msg
                    or "overloaded" in error_msg.lower()
                )

                if should_fallback:
                    _mark_gemini_key_cooldown(last_error_retry_after_s)
                    key_idx, key_last4 = _current_gemini_key_fingerprint()
                    logger.warning(
                        "Gemini request throttled/quota-limited: model=%s code=%s key_idx=%s key_last4=%s retry=%s/%s contents_mode=True",
                        current_model,
                        error_code,
                        key_idx,
                        key_last4,
                        retry_attempt,
                        max_retries_per_model,
                    )
                    if len(GEMINI_API_KEYS) > 1 and retry_attempt < len(GEMINI_API_KEYS) - 1:
                        logger.warning("🔑 Rotating Gemini API key and retrying immediately...")
                        get_gemini_client(force_rotate=True)
                        continue

                    retry_after_s = _parse_retry_after_s(error_msg)
                    if allow_retry_sleep and retry_after_s is not None and retry_attempt < max_retries_per_model - 1:
                        delay_seconds = min(retry_after_s, 60.0)
                        logger.warning(
                            f"⏳ Rate limit hit. Sleeping for {delay_seconds:.2f}s before retrying same model..."
                        )
                        await asyncio.sleep(delay_seconds + 1.0)
                        continue

                    if idx < len(models_to_try) - 1:
                        logger.warning(
                            f"⚠️ Model {current_model} unavailable (code={error_code}). "
                            f"Trying fallback model {models_to_try[idx + 1]}..."
                        )
                        break

                    raise

                logger.error(f"❌ Unexpected error with model {current_model}: {e}")
                raise

            except Exception as e:
                last_error = e
                logger.error(f"❌ Unexpected error with model {current_model}: {e}")
                raise

    logger.error(f"❌ All fallback models exhausted. Last error: {last_error}")
    if last_error is not None and last_error_model is not None and last_error_key is not None:
        error_code = _extract_error_code(last_error)
        error_msg = str(last_error)
        if _is_resource_exhausted_error(int(error_code), error_msg):
            key_idx, key_last4 = last_error_key
            raise GeminiResourceExhaustedError(
                model=last_error_model,
                api_key_index=key_idx,
                api_key_last4=key_last4,
                retry_after_s=last_error_retry_after_s,
                message=error_msg,
            ) from last_error
        raise last_error
    raise Exception("All Gemini models failed with unknown error")


@trace_llm_call("gemini-fallback-chain")
async def generate_gemini_response_with_fallback(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    tools: Optional[List[Any]] = None,
    return_full_response: bool = False,
    json_mode: bool = False,
    json_schema: Optional[Dict[str, Any]] = None,
    allow_retry_sleep: bool = True,
) -> str | Any:
    """Generate Gemini response with automatic fallback to alternative models.
    
    This function tries the specified model first, then falls back through
    GEMINI_FALLBACK_CHAIN if quota/rate limit errors occur.
    
    Fallback triggers:
    - 429 RESOURCE_EXHAUSTED (quota exceeded)
    - 503 UNAVAILABLE (model overloaded)
    
    Args:
        Same as generate_gemini_response
        allow_retry_sleep: If False, skip retry-after sleeps for interactive UX.
        
    Returns:
        Generated response or raises exception if all models fail
    """
    from google.genai.errors import ClientError, ServerError
    import asyncio
    
    # Build model list: requested model + fallback chain (deduplicated)
    models_to_try = [model] + [m for m in GEMINI_FALLBACK_CHAIN if m != model]
    # Pre-check: if ALL models have an open circuit breaker we still attempt them so
    # the real API error propagates — silence would be worse than a loud failure.
    all_models_breaker_open = all(_is_model_open(m) for m in models_to_try)

    last_error: Exception | None = None
    last_error_model: str | None = None
    last_error_key: tuple[int, str] | None = None
    last_error_retry_after_s: float | None = None
    for idx, current_model in enumerate(models_to_try):
        # Skip models whose circuit breaker is currently open, unless every model in
        # the chain is tripped — in that case we have no choice but to try anyway.
        if _is_model_open(current_model) and not all_models_breaker_open:
            logger.warning(
                "⚡ Skipping model %s — circuit breaker open. Trying next fallback.",
                current_model,
            )
            continue

        # Retry loop for the SAME model if we get a rate limit with a suggested delay
        # We'll try up to 3 times per model, OR enough times to cycle through all keys
        max_retries_per_model = max(3, len(GEMINI_API_KEYS))

        for retry_attempt in range(max_retries_per_model):
            try:
                logger.info(f"🔄 Attempting Gemini request with model: {current_model} (model_idx={idx}, retry={retry_attempt})")
                
                response = await generate_gemini_response(
                    history=history,
                    model=current_model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system_prompt=system_prompt,
                    tools=tools,
                    return_full_response=return_full_response,
                    json_mode=json_mode,
                    json_schema=json_schema,
                )
                
                # Success! Track it.
                key_idx, _ = _current_gemini_key_fingerprint()
                gemini_tracker.record_request(key_index=key_idx, model=current_model, success=True)
                _record_model_success(current_model)

                if idx > 0 or retry_attempt > 0:
                    logger.warning(f"✅ Fallback/Retry successful! Used model: {current_model}")
                return response
                
            except (ClientError, ServerError) as e:
                last_error = e # Capture error immediately to ensure it's preserved if loop exits
                last_error_model = current_model
                last_error_key = _current_gemini_key_fingerprint()
                last_error_retry_after_s = _parse_retry_after_s(str(e))
                error_code = _extract_error_code(e)
                error_msg = str(e)

                _record_model_failure(current_model)

                # Track failed request
                key_idx_err, _ = _current_gemini_key_fingerprint()
                is_rate_limited = (
                    error_code == 429
                    or "RESOURCE_EXHAUSTED" in error_msg
                )
                gemini_tracker.record_request(
                    key_index=key_idx_err,
                    model=current_model,
                    success=False,
                    is_rate_limited=is_rate_limited,
                    error_message=error_msg[:200],
                )
                
                if _is_invalid_model_error(error_code, error_msg):
                    logger.warning(
                        f"⚠️ Model {current_model} not available (code={error_code}). "
                        "Skipping to next fallback model..."
                    )
                    break

                # Check if this is a quota/rate limit error (429) or overload (503)
                should_fallback = (
                    error_code == 429 or  # RESOURCE_EXHAUSTED
                    error_code == 503 or  # UNAVAILABLE
                    "RESOURCE_EXHAUSTED" in error_msg or
                    "overloaded" in error_msg.lower()
                )
                
                if should_fallback:
                    _mark_gemini_key_cooldown(last_error_retry_after_s)
                    key_idx, key_last4 = _current_gemini_key_fingerprint()
                    logger.warning(
                        "Gemini request throttled/quota-limited: model=%s code=%s key_idx=%s key_last4=%s retry=%s/%s",
                        current_model,
                        error_code,
                        key_idx,
                        key_last4,
                        retry_attempt,
                        max_retries_per_model,
                    )
                    # KEY ROTATION STRATEGY
                    # If we have multiple keys, try rotating first before waiting or changing models
                    if len(GEMINI_API_KEYS) > 1:
                        # We can try rotating keys up to N times (where N is number of keys)
                        # We use a simple heuristic: if we haven't tried all keys for this model attempt yet
                        if retry_attempt < len(GEMINI_API_KEYS) - 1:
                            logger.warning("🔑 Rotating Gemini API key and retrying immediately...")
                            get_gemini_client(force_rotate=True)
                            continue

                    # Check for retry delay in error message
                    # Pattern: "Please retry in 45.63936562s." or similar
                    retry_after_s = _parse_retry_after_s(error_msg)
                    if allow_retry_sleep and retry_after_s is not None:
                        delay_seconds = min(retry_after_s, 60.0)

                        if retry_attempt < max_retries_per_model - 1:
                            logger.warning(f"⏳ Rate limit hit. Sleeping for {delay_seconds:.2f}s before retrying same model...")
                            await asyncio.sleep(delay_seconds + 1.0) # Add 1s buffer
                            continue
                    
                    # If no delay found or retries exhausted for this model, try next model
                    if idx < len(models_to_try) - 1:
                        logger.warning(
                            f"⚠️ Model {current_model} unavailable (code={error_code}). "
                            f"Trying fallback model {models_to_try[idx + 1]}..."
                        )
                        break # Break inner loop to go to next model
                    else:
                        # No more fallbacks
                        logger.error(f"❌ Model {current_model} failed with non-retriable error: {error_msg}")
                        raise
                else:
                    # Non-retriable error
                    logger.error(f"❌ Unexpected error with model {current_model}: {e}")
                    raise
            except Exception as e:
                # Unexpected error - don't fallback
                logger.error(f"❌ Unexpected error with model {current_model}: {e}")
                raise
    
    # All models failed
    logger.error(f"❌ All fallback models exhausted. Last error: {last_error}")

    if last_error is not None and last_error_model is not None and last_error_key is not None:
        error_code = _extract_error_code(last_error)
        error_msg = str(last_error)
        if _is_resource_exhausted_error(int(error_code), error_msg):
            key_idx, key_last4 = last_error_key
            raise GeminiResourceExhaustedError(
                model=last_error_model,
                api_key_index=key_idx,
                api_key_last4=key_last4,
                retry_after_s=last_error_retry_after_s,
                message=error_msg,
            ) from last_error

        raise last_error

    raise Exception("All Gemini models failed with unknown error")



async def stream_gemini_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    tools: Optional[List[Any]] = None,
) -> AsyncIterator[str]:
    """Stream response chunks from the Gemini API with new google-genai SDK.
    
    This function has been migrated to use client.models.generate_content_stream().
    Key changes:
    - No more start_chat() with stream=True
    - Uses generate_content_stream() method directly
    - Contents array includes full history
    
    Args:
        history: Conversation history with role and content
        model: Gemini model to use
        max_tokens: Maximum tokens in response
        temperature: Sampling temperature
        system_prompt: Optional system instruction
        tools: Optional list of Tool objects for function calling
        
    Yields:
        Response text chunks
    """
    try:
        call_index = llm_request_tracking.increment_request(model=model)
        client = get_gemini_client()

        logger.info(
            "Sending streaming request to Gemini API",
            extra={
                "user_id": llm_request_tracking.get_user_id(),
                "session_id": llm_request_tracking.get_session_id(),
                "prompt_id": llm_request_tracking.get_prompt_id(),
                "llm_call_index": call_index,
                "llm_model": model,
                "llm_phase": "stream_gemini_response",
                "llm_has_tools": bool(tools),
            },
        )

        if not history or history[-1]["role"] != "user":
            yield "Error: Conversation history must end with a user message."
            return

        # Convert history to new SDK Content format
        contents = _convert_history_to_contents(history)

        # Build generation config
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        
        # Add system prompt if provided
        if system_prompt:
            config.system_instruction = system_prompt
        
        normalized_tools = _normalize_tools_for_generate_config(tools)
        if normalized_tools:
            config.tools = normalized_tools
            logger.debug(f"Enabled {len(normalized_tools)} tool(s) for streaming request")

        # Add safety settings
        # Note: Use enum values to satisfy typing (Pylance).
        config.safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
        ]

        # Stream content with new SDK (note: this is NOT async, returns regular generator)
        # The new SDK's generate_content_stream returns a synchronous generator
        stream = client.models.generate_content_stream(
            model=model,
            contents=cast(Any, contents),
            config=config
        )

        yielded = False
        # Use regular for loop (not async for) as SDK returns sync generator
        for chunk in stream:
            try:
                if hasattr(chunk, 'text') and chunk.text:
                    yielded = True
                    yield chunk.text
            except (ValueError, AttributeError) as e:
                # Chunk might not have text (could be function call or empty)
                logger.debug(f"Gemini stream chunk parse issue: {e}")
                continue

        # If nothing was yielded, try non-streaming as fallback
        if not yielded:
            logger.warning("No chunks yielded, falling back to non-streaming")
            fallback = await generate_gemini_response(
                history=history,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system_prompt=system_prompt,
                tools=tools,
            )
            if fallback:
                yield fallback

    except Exception as exc:
        try:
            from google.genai.errors import ClientError, ServerError

            if isinstance(exc, (ClientError, ServerError)):
                error_code = getattr(exc, "status_code", 0)
                error_msg = str(exc)
                if _is_resource_exhausted_error(int(error_code), error_msg):
                    key_idx, key_last4 = _current_gemini_key_fingerprint()
                    logger.debug(
                        "Gemini streaming quota exhausted: model=%s code=%s key_idx=%s key_last4=%s",
                        model,
                        error_code,
                        key_idx,
                        key_last4,
                    )
                    raise GeminiResourceExhaustedError(
                        model=model,
                        api_key_index=key_idx,
                        api_key_last4=key_last4,
                        retry_after_s=_parse_retry_after_s(error_msg),
                        message=error_msg,
                    ) from exc
        except Exception:
            pass

        logger.error("Error streaming from Gemini API: %s", exc, exc_info=True)
        yield f"Error: An unexpected error occurred with Gemini API. {exc}"

# --- Local Gemma 3 API Function (Async) ---
async def generate_gemma_local_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMMA_LOCAL_MODEL, # Model name is for logging
    max_tokens: int = 2048,
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
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None, # Pass system prompt through
    preferred_gemini_model: Optional[str] = None,  # Allow specifying exact Gemini model
    json_mode: bool = False,
) -> str:
    """
    Generates a response using the specified LLM provider with automatic fallback.

    Args:
        history: The conversation history (list of {'role': str, 'content': str}).
                 Must end with a 'user' message.
        model: The LLM model ('gemma_local' or 'gemini_google').
        max_tokens: Maximum number of tokens to generate.
        temperature: Controls randomness (0.0-1.0+).
        system_prompt: An optional system prompt.
        preferred_gemini_model: Specific Gemini model to use (e.g., 'gemini-2.5-pro').
                               Only used when model='gemini_google'.
        json_mode: If True, forces the model to output valid JSON (Gemini only).

    Returns:
        The generated text response string or an error message.
    """
    logger.info(f"Generating response using model: {model}, preferred Gemini: {preferred_gemini_model}")

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
        # Use preferred model or default
        gemini_model = preferred_gemini_model or DEFAULT_GEMINI_MODEL
        logger.info(f"Direct request: Using gemini with fallback chain (Primary: {gemini_model})")
        try:
            return await generate_gemini_response_with_fallback(
                history=history, model=gemini_model, max_tokens=max_tokens, temperature=temperature, system_prompt=system_prompt, json_mode=json_mode
            )
        except Exception as e:
            # If all fallbacks fail, return error message
            logger.error(f"All Gemini models failed: {e}")
            return f"Error: All Gemini models are currently unavailable. {str(e)[:200]}"
    
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
