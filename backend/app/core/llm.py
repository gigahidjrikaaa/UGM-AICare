# backend/app/core/llm.py

import os
import httpx
from typing import Any, AsyncIterator, cast

# NEW SDK imports
from google import genai
from google.genai import types
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

# --- Client Singleton ---
_gemini_client: Optional[genai.Client] = None

def get_gemini_client() -> genai.Client:
    """Get or create Gemini client instance (singleton pattern).
    
    This replaces the old global genai.configure() pattern with a client-based approach.
    The client is created once and reused across the application.
    
    Returns:
        genai.Client: Initialized Gemini client
        
    Raises:
        ValueError: If GOOGLE_API_KEY is not configured
    """
    global _gemini_client
    if _gemini_client is None:
        if not GOOGLE_API_KEY:
            logger.error("GOOGLE_API_KEY not found. Gemini API will not be available.")
            raise ValueError("Google API key not configured.")
        try:
            _gemini_client = genai.Client(api_key=GOOGLE_API_KEY)
            logger.info("Gemini client initialized successfully with new google-genai SDK.")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            raise
    return _gemini_client

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



# --- Gemini API Function (Async) - Migrated to new SDK ---
async def generate_gemini_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    tools: Optional[List[Any]] = None,
    return_full_response: bool = False,
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
        
    Returns:
        Generated response text, or full response object if return_full_response=True
    """
    try:
        client = get_gemini_client()
        logger.info(f"Sending request to Gemini API (Model: {model}, Tools: {bool(tools)})")
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
        
        # Add system prompt if provided
        if system_prompt:
            config.system_instruction = system_prompt
        
        # Add tools if provided
        if tools:
            converted_tools = _convert_tool_schemas_for_new_sdk(tools)
            config.tools = converted_tools
            logger.debug(f"Enabled {len(tools)} tool(s) for this request")
        
        # Add safety settings
        config.safety_settings = [
            types.SafetySetting(
                category='HARM_CATEGORY_HARASSMENT',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
            types.SafetySetting(
                category='HARM_CATEGORY_HATE_SPEECH',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
            types.SafetySetting(
                category='HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
            types.SafetySetting(
                category='HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
        ]

        # Generate content with new SDK
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config
        )

        # Return full response if requested (for tool calling)
        if return_full_response:
            return response
        
        # Extract text from response
        try:
            response_text = response.text
            return response_text.strip()
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
        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        return f"Error: An unexpected error occurred with Gemini API. {e}"



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
        client = get_gemini_client()

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
        
        # Add tools if provided
        if tools:
            converted_tools = _convert_tool_schemas_for_new_sdk(tools)
            config.tools = converted_tools
            logger.debug(f"Enabled {len(tools)} tool(s) for streaming request")

        # Add safety settings
        config.safety_settings = [
            types.SafetySetting(
                category='HARM_CATEGORY_HARASSMENT',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
            types.SafetySetting(
                category='HARM_CATEGORY_HATE_SPEECH',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
            types.SafetySetting(
                category='HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
            types.SafetySetting(
                category='HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
        ]

        # Stream content with new SDK (note: this is NOT async, returns regular generator)
        # The new SDK's generate_content_stream returns a synchronous generator
        stream = client.models.generate_content_stream(
            model=model,
            contents=contents,
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
