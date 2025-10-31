# Google Gemini SDK Migration Plan

**Status:** ⚠️ URGENT - Migration Required  
**Deadline:** November 30, 2025 (Old SDK Support Ends)  
**Created:** October 31, 2025

---

## Executive Summary

Google has **officially deprecated** the `google-generativeai` SDK in favor of the new unified `google-genai` SDK. Our codebase currently uses the legacy SDK and must be migrated before support ends on **November 30, 2025**.

### Key Facts from Official Sources

✅ **Confirmed via Web Search (October 2025):**

- Old SDK: `google-generativeai` → **DEPRECATED**
- New SDK: `google-genai` → **OFFICIAL RECOMMENDATION**
- PyPI Status: "This repository is now considered legacy"
- Support End Date: November 30, 2025
- Source: <https://pypi.org/project/google-generativeai/>
- Official Docs: <https://ai.google.dev/gemini-api/docs/libraries>

✅ **Confirmed via Context7 Documentation:**

- New SDK provides unified API for both Gemini Developer API and Vertex AI
- Better performance, type safety (Pydantic), and active development
- 308+ code samples available in official documentation
- Library ID: `/googleapis/python-genai`

---

## Current Status Analysis

### ✅ COMPLETED Migrations (October 31, 2025)

| File | Status | Lines | Documentation |
|------|--------|-------|---------------|
| `backend/requirements.txt` | ✅ DONE | N/A | Dependency updated to `google-genai>=1.33.0` |
| `backend/app/core/llm.py` | ✅ DONE | 562 | [LLM_MIGRATION_COMPLETE.md](./LLM_MIGRATION_COMPLETE.md) |
| `backend/app/domains/mental_health/services/tool_calling.py` | ✅ DONE | 494 | [TOOL_CALLING_MIGRATION_COMPLETE.md](./TOOL_CALLING_MIGRATION_COMPLETE.md) |

### ⏳ PENDING Migrations

| File | Lines of Code | Complexity | Priority | ETA |
|------|---------------|------------|----------|-----|
| `backend/app/domains/mental_health/services/ai_campaign_generator.py` | 253 | **MEDIUM** | 🟡 High | 1 hour |
| `backend/app/agents/aika/tools.py.backup` | Unknown | **LOW** | 🟢 Low | 30 min |

### Files Using OLD SDK (`google-generativeai`) - ARCHIVED

**Before Migration (October 31, 2025):**

| File | Lines of Code | Complexity | Priority |
|------|---------------|------------|----------|
| `backend/app/core/llm.py` | 562 | **HIGH** | 🔴 Critical |
| `backend/app/domains/mental_health/services/tool_calling.py` | 482 | **HIGH** | 🔴 Critical |
| `backend/app/domains/mental_health/services/ai_campaign_generator.py` | 253 | **MEDIUM** | 🟡 High |
| `backend/app/agents/aika/tools.py.backup` | Unknown | **LOW** | 🟢 Low |
| `backend/requirements.txt` | N/A | **LOW** | 🔴 Critical |

### Files Already Using NEW SDK (`google-genai`)

✅ **Good News:** `ai/src/service/llm.py` is already using the new SDK!

```python
from google import genai
from google.genai import types

class LLMService:
    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY
        self.client = genai.Client(api_key=self.api_key)  # ✅ Correct pattern
```

This file can serve as a **migration reference** for other files.

---

## Migration Guide: Old SDK → New SDK

### 1. Package Installation

**OLD:**

```bash
pip install google-generativeai>=0.8.3
```

**NEW:**

```bash
pip install google-genai
```

**Update `requirements.txt`:**

```diff
- google-generativeai>=0.8.3
+ google-genai>=1.33.0
```

---

### 2. Import Statements

**OLD:**

```python
import google.generativeai as genai
import google.generativeai.types as genai_types
from google.generativeai.types import HarmBlockThreshold, HarmCategory, content_types
```

**NEW:**

```python
from google import genai
from google.genai import types
```

---

### 3. Client Initialization

**OLD (Global Configuration):**

```python
# Module-level configuration (problematic for testing)
GOOGLE_API_KEY = os.getenv("GOOGLE_GENAI_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

# Later in code:
model = genai.GenerativeModel('gemini-2.0-flash')
```

**NEW (Client-Based):**

```python
# Client instance (better for DI and testing)
client = genai.Client(api_key=os.getenv("GOOGLE_GENAI_API_KEY"))

# Or using environment variable:
# Set GEMINI_API_KEY or GOOGLE_API_KEY first
client = genai.Client()

# For Vertex AI:
client = genai.Client(
    vertexai=True,
    project='your-project-id',
    location='us-central1'
)
```

---

### 4. Content Generation

#### Basic Generation

**OLD:**

```python
model = genai.GenerativeModel('gemini-2.0-flash')
response = await model.generate_content_async(
    contents,
    generation_config=genai_types.GenerationConfig(
        max_output_tokens=2048,
        temperature=0.7
    ),
    safety_settings=safety_settings
)
text = response.text
```

**NEW:**

```python
response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents='Your prompt here',
    config=types.GenerateContentConfig(
        max_output_tokens=2048,
        temperature=0.7
    )
)
text = response.text
```

**Key Changes:**

- ✅ `client.models.generate_content()` is **async by default** (no `_async` suffix needed)
- ✅ Model name passed as parameter, not in constructor
- ✅ Use `types.GenerateContentConfig` instead of `GenerationConfig`
- ✅ Safety settings integrated into config

---

#### With System Prompt

**OLD:**

```python
model = genai.GenerativeModel(
    model_name='gemini-2.0-flash',
    system_instruction=system_prompt  # Not standard
)
```

**NEW:**

```python
response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents='Your prompt',
    config=types.GenerateContentConfig(
        system_instruction='Your system prompt',
        max_output_tokens=2048,
        temperature=0.7
    )
)
```

---

### 5. Chat Sessions / History Management

**OLD (start_chat API):**

```python
model = genai.GenerativeModel('gemini-2.0-flash')

# Convert history to Gemini format
gemini_history = [
    {"role": "user", "parts": [{"text": "Hello"}]},
    {"role": "model", "parts": [{"text": "Hi there!"}]}
]

chat_session = model.start_chat(history=gemini_history)
response = await chat_session.send_message_async(
    {"role": "user", "parts": [{"text": "How are you?"}]}
)
```

**NEW (Contents Array):**

```python
# Include full conversation in contents array
contents = [
    types.Content(
        role='user',
        parts=[types.Part.from_text('Hello')]
    ),
    types.Content(
        role='model',
        parts=[types.Part.from_text('Hi there!')]
    ),
    types.Content(
        role='user',
        parts=[types.Part.from_text('How are you?')]
    )
]

response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents=contents
)
```

**Key Changes:**

- ❌ `start_chat()` no longer exists
- ✅ Pass entire conversation history in `contents` parameter
- ✅ Use `types.Content` and `types.Part` for structure

---

### 6. Streaming Responses

**OLD:**

```python
model = genai.GenerativeModel('gemini-2.0-flash')
stream = model.generate_content_async(contents, stream=True)

async for chunk in stream:
    if hasattr(chunk, 'text') and chunk.text:
        yield chunk.text
```

**NEW:**

```python
stream = client.models.generate_content_stream(
    model='gemini-2.0-flash',
    contents='Your prompt',
    config=types.GenerateContentConfig(
        temperature=0.7
    )
)

async for chunk in stream:
    if chunk.text:
        yield chunk.text
```

**Key Changes:**

- ✅ Use `generate_content_stream()` method (no `stream=True` parameter)
- ✅ Cleaner chunk handling

---

### 7. Tool Calling / Function Calling

This is the **most complex** migration area.

#### OLD (Tools in Model Constructor)

```python
tools = [
    {
        "function_declarations": [
            {
                "name": "search_knowledge",
                "description": "Search knowledge base",
                "parameters": {
                    "type": "OBJECT",  # Uppercase
                    "properties": {
                        "query": {"type": "STRING"}
                    },
                    "required": ["query"]
                }
            }
        ]
    }
]

model = genai.GenerativeModel(
    model_name='gemini-2.0-flash',
    tools=tools
)

response = await model.generate_content_async(contents)

# Check for function call
if response.candidates[0].content.parts[0].function_call:
    func_call = response.candidates[0].content.parts[0].function_call
    
    # Send function response back
    function_response = {
        "function_response": {
            "name": func_call.name,
            "response": {"result": "..."}
        }
    }
    
    chat = model.start_chat(history=history)
    response = await chat.send_message_async(function_response)
```

#### NEW (Tools in Config)

```python
# Define tools (lowercase types)
tools = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name='search_knowledge',
                description='Search knowledge base',
                parameters={
                    "type": "object",  # Lowercase
                    "properties": {
                        "query": {"type": "string"}
                    },
                    "required": ["query"]
                }
            )
        ]
    )
]

# Generate with tools
response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents='Your prompt',
    config=types.GenerateContentConfig(
        tools=tools,
        temperature=0.7
    )
)

# Check for function call
if response.candidates[0].content.parts:
    for part in response.candidates[0].content.parts:
        if part.function_call:
            func_call = part.function_call
            
            # Execute function...
            result = execute_function(func_call.name, func_call.args)
            
            # Send function response back
            contents_with_response = [
                # ... previous conversation ...
                types.Content(
                    role='model',
                    parts=[types.Part.from_function_call(
                        name=func_call.name,
                        args=func_call.args
                    )]
                ),
                types.Content(
                    role='user',
                    parts=[types.Part.from_function_response(
                        name=func_call.name,
                        response={"result": result}
                    )]
                )
            ]
            
            # Continue conversation
            final_response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=contents_with_response,
                config=types.GenerateContentConfig(tools=tools)
            )
```

**Key Changes:**

- ✅ Use `types.Tool` and `types.FunctionDeclaration` (typed)
- ✅ Tools in `config` parameter, not model constructor
- ✅ Use `Part.from_function_call()` and `Part.from_function_response()`
- ❌ No `start_chat()` - use contents array
- ✅ Type names are **lowercase** (`"object"`, `"string"`) not uppercase

---

### 8. Safety Settings

**OLD:**

```python
from google.generativeai.types import HarmBlockThreshold, HarmCategory

safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
}

model = genai.GenerativeModel('gemini-2.0-flash')
response = await model.generate_content_async(
    contents,
    safety_settings=safety_settings
)
```

**NEW:**

```python
response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents='Your prompt',
    config=types.GenerateContentConfig(
        safety_settings=[
            types.SafetySetting(
                category='HARM_CATEGORY_HARASSMENT',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
            types.SafetySetting(
                category='HARM_CATEGORY_HATE_SPEECH',
                threshold='BLOCK_MEDIUM_AND_ABOVE'
            ),
        ]
    )
)
```

**Key Changes:**

- ✅ Use `types.SafetySetting` list
- ✅ String-based categories and thresholds
- ✅ Integrated into `GenerateContentConfig`

---

### 9. Multimodal (Images, Files)

**OLD:**

```python
# Upload file
uploaded_file = genai.upload_file(path='image.jpg')

# Generate with file
model = genai.GenerativeModel('gemini-2.0-flash')
response = await model.generate_content_async([
    "What is in this image?",
    uploaded_file
])
```

**NEW:**

```python
# Upload file
uploaded_file = client.files.upload(file='image.jpg')

# Generate with file
response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents=[
        'What is in this image?',
        uploaded_file
    ]
)

# Or use Part.from_uri for GCS files
response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents=[
        'What is in this image?',
        types.Part.from_uri(
            file_uri='gs://bucket/image.jpg',
            mime_type='image/jpeg'
        )
    ]
)
```

---

### 10. Error Handling

**OLD:**

```python
try:
    response = await model.generate_content_async(contents)
    text = response.text
except ValueError as e:
    # Blocked or empty response
    if response.prompt_feedback and response.prompt_feedback.block_reason:
        reason = response.prompt_feedback.block_reason.name
except Exception as e:
    # Other errors
    pass
```

**NEW:**

```python
from google.genai import errors

try:
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents='Your prompt'
    )
    text = response.text
except errors.ClientError as e:
    # API errors (4xx)
    logger.error(f"Client error: {e}")
except errors.ServerError as e:
    # Server errors (5xx)
    logger.error(f"Server error: {e}")
except Exception as e:
    # Other errors
    logger.error(f"Unexpected error: {e}")
```

---

## File-Specific Migration Plans

### 1. `backend/requirements.txt`

**Changes:**

```diff
- google-generativeai>=0.8.3
+ google-genai>=1.33.0

# Keep these (compatible with new SDK)
  google-api-core>=2.19.0,<3.0.0
  protobuf>=3.20.3,<5.0.0
  
- langchain-google-genai>=2.0.0,<3.0.0  # May need update
+ langchain-google-genai>=2.0.0,<3.0.0  # Check compatibility
```

**Action Items:**

- ✅ Update `google-generativeai` to `google-genai`
- ⚠️ Verify LangChain compatibility with new SDK
- ✅ Test all dependencies resolve without conflicts

---

### 2. `backend/app/core/llm.py` (562 lines) 🔴 CRITICAL

**Current Issues:**

- Uses `genai.configure()` (global state)
- Uses `genai.GenerativeModel()` class
- Uses `start_chat()` for history
- Complex tool calling with `start_chat`

**Migration Strategy:**

#### Phase 1: Create Client Singleton

```python
# backend/app/core/llm.py

import os
from typing import Any, AsyncIterator, Optional, List, Dict
from google import genai
from google.genai import types
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# --- Configuration ---
GOOGLE_API_KEY = os.environ.get("GOOGLE_GENAI_API_KEY")
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"

# --- Client Singleton ---
_gemini_client: Optional[genai.Client] = None

def get_gemini_client() -> genai.Client:
    """Get or create Gemini client instance."""
    global _gemini_client
    if _gemini_client is None:
        if not GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY not configured")
        _gemini_client = genai.Client(api_key=GOOGLE_API_KEY)
        logger.info("Gemini client initialized")
    return _gemini_client
```

#### Phase 2: Update `generate_gemini_response()`

```python
async def generate_gemini_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    tools: Optional[List[Any]] = None,
    return_full_response: bool = False,
) -> str | Any:
    """Generate response using new google-genai SDK."""
    client = get_gemini_client()
    
    # Build contents array from history
    contents = []
    
    # Add system prompt if provided
    if system_prompt:
        # System instruction via config, not in contents
        pass
    
    # Convert history to contents
    for msg in history:
        role = 'user' if msg['role'] == 'user' else 'model'
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(msg['content'])]
            )
        )
    
    # Build config
    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
        system_instruction=system_prompt if system_prompt else None,
    )
    
    # Add tools if provided
    if tools:
        # Convert tool schemas to new format
        converted_tools = _convert_tools_for_new_sdk(tools)
        config.tools = converted_tools
    
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
    
    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config
        )
        
        if return_full_response:
            return response
        
        return response.text.strip()
        
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}", exc_info=True)
        raise
```

#### Phase 3: Update Tool Schema Converter

```python
def _convert_tools_for_new_sdk(tool_wrappers: List[Dict[str, Any]]) -> List[types.Tool]:
    """Convert tool schemas from old format to new SDK format.
    
    Old format: [{"function_declarations": [{"name": ..., "parameters": {"type": "OBJECT"}}]}]
    New format: [types.Tool(function_declarations=[types.FunctionDeclaration(...)])]
    """
    result = []
    
    for wrapper in tool_wrappers:
        if "function_declarations" not in wrapper:
            continue
        
        function_decls = []
        for decl in wrapper["function_declarations"]:
            # Convert type strings to lowercase
            parameters = _convert_schema_types_to_lowercase(decl.get("parameters", {}))
            
            func_decl = types.FunctionDeclaration(
                name=decl["name"],
                description=decl.get("description", ""),
                parameters=parameters
            )
            function_decls.append(func_decl)
        
        result.append(types.Tool(function_declarations=function_decls))
    
    return result

def _convert_schema_types_to_lowercase(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively convert type strings from UPPERCASE to lowercase."""
    if isinstance(schema, dict):
        result = {}
        for key, value in schema.items():
            if key == "type" and isinstance(value, str):
                result[key] = value.lower()
            else:
                result[key] = _convert_schema_types_to_lowercase(value)
        return result
    elif isinstance(schema, list):
        return [_convert_schema_types_to_lowercase(item) for item in schema]
    else:
        return schema
```

#### Phase 4: Update Streaming

```python
async def stream_gemini_response(
    history: List[Dict[str, str]],
    model: str = DEFAULT_GEMINI_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
    tools: Optional[List[Any]] = None,
) -> AsyncIterator[str]:
    """Stream response chunks from Gemini API."""
    client = get_gemini_client()
    
    # Build contents (same as generate_gemini_response)
    contents = []
    for msg in history:
        role = 'user' if msg['role'] == 'user' else 'model'
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(msg['content'])]
            )
        )
    
    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
        system_instruction=system_prompt if system_prompt else None,
    )
    
    if tools:
        config.tools = _convert_tools_for_new_sdk(tools)
    
    try:
        stream = client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config
        )
        
        async for chunk in stream:
            if chunk.text:
                yield chunk.text
                
    except Exception as e:
        logger.error(f"Error streaming from Gemini: {e}", exc_info=True)
        yield f"Error: {e}"
```

---

### 3. `backend/app/domains/mental_health/services/tool_calling.py` (482 lines) 🔴 CRITICAL

**Current Issues:**

- Uses `import google.generativeai as genai` (old import)
- Uses `genai.GenerativeModel()` class
- Uses `start_chat()` for tool calling loop
- Complex multi-iteration tool calling

**Migration Strategy:**

The tool calling loop needs significant refactoring because:

1. No more `start_chat()` API
2. Must manage conversation state manually in contents array
3. Tool responses must be added as `Part.from_function_response()`

**Key Changes:**

```python
# OLD
chat = gemini_model.start_chat(history=gemini_history)
response = await chat.send_message_async(function_response_parts)

# NEW
contents_with_tool_responses = [
    *previous_contents,
    types.Content(
        role='model',
        parts=[types.Part.from_function_call(name=..., args=...)]
    ),
    types.Content(
        role='user',
        parts=[types.Part.from_function_response(name=..., response=...)]
    )
]
response = client.models.generate_content(
    model=model,
    contents=contents_with_tool_responses,
    config=config
)
```

**Action Items:**

- ✅ Replace `import google.generativeai` with `from google import genai`
- ✅ Replace `GenerativeModel` with `client.models.generate_content`
- ✅ Remove all `start_chat()` usage
- ✅ Build contents array manually for each iteration
- ✅ Use `Part.from_function_call()` and `Part.from_function_response()`
- ✅ Update tool schema format (lowercase types)

---

### 4. `backend/app/domains/mental_health/services/ai_campaign_generator.py` (253 lines) 🟡 HIGH

**Current Issues:**

- Uses `import google.generativeai as genai` (old import)
- Uses `genai.GenerativeModel('gemini-2.0-flash-exp')` (old API)

**Migration Strategy:**

This is simpler because it doesn't use chat sessions or tools.

**Changes:**

```python
# OLD
import google.generativeai as genai

model = genai.GenerativeModel('gemini-2.0-flash-exp')
result = model.generate_content(prompt)
response_text = result.text

# NEW
from google import genai
from google.genai import types

# Initialize client (could be passed from dependency injection)
client = genai.Client(api_key=os.getenv("GOOGLE_GENAI_API_KEY"))

response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=prompt,
    config=types.GenerateContentConfig(
        temperature=0.7,  # Can tune
        max_output_tokens=2048
    )
)
response_text = response.text
```

**Action Items:**

- ✅ Update imports
- ✅ Initialize client (use singleton from `llm.py`)
- ✅ Replace `GenerativeModel` with `client.models.generate_content`
- ✅ Test campaign generation still works

---

### 5. `backend/app/agents/aika/tools.py.backup` 🟢 LOW PRIORITY

**Status:** This appears to be a backup file. If it's not used in production, consider deleting it after migration.

**Action Items:**

- ⚠️ Verify if this file is actually used
- ✅ If used, apply same migration as `tool_calling.py`
- ✅ If not used, delete after migration complete

---

## Testing Strategy

### 1. Unit Tests

Create new unit tests for migrated code:

```python
# tests/test_llm_migration.py

import pytest
from app.core.llm import generate_gemini_response, stream_gemini_response

@pytest.mark.asyncio
async def test_basic_generation():
    """Test basic content generation with new SDK."""
    history = [
        {"role": "user", "content": "Say hello"}
    ]
    
    response = await generate_gemini_response(
        history=history,
        model="gemini-2.0-flash"
    )
    
    assert isinstance(response, str)
    assert len(response) > 0

@pytest.mark.asyncio
async def test_with_system_prompt():
    """Test generation with system prompt."""
    history = [
        {"role": "user", "content": "high"}
    ]
    
    response = await generate_gemini_response(
        history=history,
        system_prompt="I say high, you say low"
    )
    
    assert "low" in response.lower()

@pytest.mark.asyncio
async def test_tool_calling():
    """Test tool calling with new SDK."""
    from app.agents.aika.tools import get_aika_tools
    
    tools = get_aika_tools()
    history = [
        {"role": "user", "content": "Search for depression information"}
    ]
    
    response = await generate_gemini_response(
        history=history,
        tools=tools,
        return_full_response=True
    )
    
    # Check if tool call is present
    assert response.candidates
    # ... additional assertions
```

### 2. Integration Tests

Test full workflows:

```python
# tests/integration/test_aika_chat_migration.py

@pytest.mark.asyncio
async def test_full_chat_conversation():
    """Test complete chat conversation with new SDK."""
    # Simulate real chat flow
    history = [
        {"role": "user", "content": "Saya merasa cemas"}
    ]
    
    response = await generate_gemini_response(history=history)
    
    # Add response to history
    history.append({"role": "assistant", "content": response})
    history.append({"role": "user", "content": "Apa yang harus saya lakukan?"})
    
    response2 = await generate_gemini_response(history=history)
    
    assert isinstance(response2, str)
    assert len(response2) > 0
```

### 3. Manual Testing Checklist

- [ ] Basic chat conversation (no tools)
- [ ] Chat with system prompt
- [ ] Multi-turn conversation with history
- [ ] Streaming responses
- [ ] Tool calling (single iteration)
- [ ] Tool calling (multiple iterations)
- [ ] Tool calling with multiple tools
- [ ] Safety filter triggering
- [ ] Error handling (rate limits, network errors)
- [ ] Campaign generation
- [ ] Image/file upload (if used)

---

## Migration Timeline

### Phase 1: Preparation (Week 1) ✅

- [x] Research and document migration requirements (THIS DOCUMENT)
- [ ] Set up test environment
- [ ] Create unit test suite
- [ ] Back up current codebase

### Phase 2: Core Migration (Week 2)

**Day 1-2: Requirements and Client Setup**

- [ ] Update `requirements.txt`
- [ ] Install new SDK: `pip install google-genai`
- [ ] Create client singleton in `llm.py`
- [ ] Test client initialization

**Day 3-4: Basic Functions**

- [ ] Migrate `generate_gemini_response()` in `llm.py`
- [ ] Migrate `stream_gemini_response()` in `llm.py`
- [ ] Update tool schema converter
- [ ] Run unit tests

**Day 5-7: Complex Features**

- [ ] Migrate `tool_calling.py` (most complex)
- [ ] Migrate `ai_campaign_generator.py`
- [ ] Update all tool calling logic
- [ ] Run integration tests

### Phase 3: Testing (Week 3)

**Day 1-3: Comprehensive Testing**

- [ ] Run full test suite
- [ ] Manual testing of all features
- [ ] Test with real Gemini API (staging)
- [ ] Performance benchmarking (compare old vs new)

**Day 4-5: Bug Fixes**

- [ ] Fix any issues found during testing
- [ ] Refine error handling
- [ ] Optimize performance

### Phase 4: Deployment (Week 4)

**Day 1-2: Staging Deployment**

- [ ] Deploy to staging environment
- [ ] Smoke test all features
- [ ] Monitor logs for errors

**Day 3: Production Deployment**

- [ ] Deploy to production (off-peak hours)
- [ ] Monitor for 24 hours
- [ ] Have rollback plan ready

**Day 4-5: Post-Deployment**

- [ ] Verify all features working
- [ ] Monitor API usage and costs
- [ ] Document lessons learned
- [ ] Clean up old code and comments

---

## Rollback Plan

If critical issues occur after migration:

### Immediate Rollback (< 1 hour)

1. Revert `requirements.txt`:

   ```bash
   git checkout main -- backend/requirements.txt
   pip install -r backend/requirements.txt
   ```

2. Revert code changes:

   ```bash
   git revert <migration-commit-hash>
   ```

3. Restart services:

   ```bash
   systemctl restart ugm-aicare-backend
   ```

### Partial Rollback (Feature Flags)

Consider adding feature flags to enable/disable new SDK:

```python
# backend/app/core/config.py
USE_NEW_GEMINI_SDK = os.getenv("USE_NEW_GEMINI_SDK", "true").lower() == "true"

# backend/app/core/llm.py
if USE_NEW_GEMINI_SDK:
    # Use new SDK
    client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    # Fall back to old SDK
    import google.generativeai as old_genai
    old_genai.configure(api_key=GOOGLE_API_KEY)
```

---

## Risks and Mitigation

### Risk 1: Breaking Changes in Tool Calling

**Probability:** HIGH  
**Impact:** CRITICAL  
**Mitigation:**

- Extensive unit and integration tests
- Test tool calling loop with 5+ iterations
- Verify all tool schemas work correctly

### Risk 2: Performance Regression

**Probability:** MEDIUM  
**Impact:** HIGH  
**Mitigation:**

- Benchmark before/after migration
- Monitor API response times in production
- Optimize if needed (caching, batching)

### Risk 3: LangChain Compatibility Issues

**Probability:** MEDIUM  
**Impact:** MEDIUM  
**Mitigation:**

- Check `langchain-google-genai` compatibility with new SDK
- Test LangGraph orchestration after migration
- May need to update LangChain package

### Risk 4: Unexpected API Differences

**Probability:** LOW  
**Impact:** HIGH  
**Mitigation:**

- Thorough testing of edge cases
- Review new SDK documentation carefully
- Have support contacts at Google if needed

---

## Resources

### Official Documentation

- **New SDK Docs:** <https://googleapis.github.io/python-genai/>
- **Migration Guide:** <https://ai.google.dev/gemini-api/docs/libraries>
- **GitHub Repo:** <https://github.com/googleapis/python-genai>
- **PyPI Package:** <https://pypi.org/project/google-genai/>

### Code Examples

- **Official Examples:** <https://github.com/googleapis/python-genai/tree/main/samples>
- **Context7 Code Samples:** 308+ snippets available (used in this doc)

### Internal References

- ✅ **Already Migrated:** `ai/src/service/llm.py` (use as reference)
- **Tool Definitions:** `backend/app/agents/aika/tools.py`
- **Chat Logic:** `backend/app/domains/mental_health/services/tool_calling.py`

---

## Success Criteria

Migration is considered successful when:

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Manual testing confirms all features work
- ✅ No increase in API errors or latency
- ✅ Tool calling works for all Aika features
- ✅ Streaming responses work correctly
- ✅ Campaign generation works
- ✅ Production deployment stable for 1 week
- ✅ Zero critical bugs related to migration

---

## Next Steps

1. **Review this document** with the team
2. **Create GitHub issue** for migration tracking
3. **Assign tasks** to developers
4. **Set up test environment** with new SDK
5. **Begin Phase 1** (Preparation)

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Author:** GitHub Copilot + Development Team  
**Status:** ⚠️ READY FOR IMPLEMENTATION

---

## Appendix: Quick Reference

### Import Cheat Sheet

| Old SDK | New SDK |
|---------|---------|
| `import google.generativeai as genai` | `from google import genai` |
| `import google.generativeai.types as genai_types` | `from google.genai import types` |
| `from google.generativeai.types import HarmCategory` | Use `types.SafetySetting` with strings |

### API Cheat Sheet

| Operation | Old SDK | New SDK |
|-----------|---------|---------|
| Configure | `genai.configure(api_key=key)` | `client = genai.Client(api_key=key)` |
| Create Model | `model = genai.GenerativeModel('model-name')` | Use `client.models.generate_content(model='...')` |
| Generate | `model.generate_content_async(...)` | `client.models.generate_content(...)` (async by default) |
| Stream | `model.generate_content_async(..., stream=True)` | `client.models.generate_content_stream(...)` |
| Chat | `model.start_chat(history=...)` | Use `contents` array with full history |
| Upload File | `genai.upload_file(path='...')` | `client.files.upload(file='...')` |
| Tools | `GenerativeModel(tools=...)` | `GenerateContentConfig(tools=...)` |

### Type Cheat Sheet

| Old Type | New Type |
|----------|----------|
| `GenerationConfig` | `types.GenerateContentConfig` |
| `{"text": "..."}` | `types.Part.from_text("...")` |
| `{"role": "user", "parts": [...]}` | `types.Content(role='user', parts=[...])` |
| `HarmCategory.HARM_CATEGORY_*` | `types.SafetySetting(category='HARM_CATEGORY_*', ...)` |
| Parameter types: `"STRING"`, `"OBJECT"` | Parameter types: `"string"`, `"object"` (lowercase) |

---

**END OF DOCUMENT**
