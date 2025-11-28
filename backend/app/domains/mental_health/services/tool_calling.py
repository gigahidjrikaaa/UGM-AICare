"""Tool calling integration for Aika's chat system.

This module handles the tool calling loop:
1. Send request to LLM with tools
2. If LLM requests tool calls, execute them
3. Send tool results back to LLM
4. Repeat until LLM provides final response

Best practices:
- Async/await for all operations
- Comprehensive error handling
- Tool call iteration limits to prevent infinite loops
- Proper logging for debugging and monitoring

MIGRATION NOTE: Migrated from google-generativeai to google-genai SDK
- No more start_chat() API
- Conversation state managed manually in contents array
- Function responses use Part.from_function_call() and Part.from_function_response()
"""
from __future__ import annotations

import json
import logging
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

# New SDK imports
from google import genai
from google.genai import types

from app.agents.aika.tools import execute_tool_call, get_aika_tools
from app.core import llm
from app.domains.mental_health.schemas.chat import ChatRequest

logger = logging.getLogger(__name__)

# Type alias for stream callback
StreamCallback = Callable[[str], Any]

# Constants
MAX_TOOL_ITERATIONS = 5
DEFAULT_TOOL_TIMEOUT = 30  # seconds


async def generate_with_tools(
    history: List[Dict[str, str]],
    system_prompt: Optional[str],
    request: ChatRequest,
    db: AsyncSession,
    user_id: int,
    stream_callback: Optional[StreamCallback] = None,
    max_tool_iterations: int = MAX_TOOL_ITERATIONS,
) -> tuple[str, List[Dict[str, Any]]]:
    """Generate response with tool calling support.
    
    Implements the tool calling loop where the LLM can request tool executions,
    receive the results, and use them to formulate better responses.
    
    Args:
        history: Conversation history
        system_prompt: System instruction for the LLM
        request: Chat request configuration
        db: Database session for tool execution
        user_id: User ID for scoping tool queries
        stream_callback: Optional callback for streaming responses
        max_tool_iterations: Maximum number of tool calling iterations
        
    Returns:
        Tuple of (final_response_text, list_of_tool_calls_executed)
    """
    model_name = request.model or "gemini_google"
    if model_name == "gemini_google":
        # Use Gemini 2.5 Flash as default (or use GEMINI_FLASH_MODEL from llm.py)
        model_name = getattr(llm, "GEMINI_FLASH_MODEL", "gemini-2.5-flash")
    
    conversation_history = list(history)
    iterations = 0
    tool_calls_executed: List[Dict[str, Any]] = []
    
    # Get available tools
    tools = get_aika_tools()
    logger.info(f"Tool calling enabled with {len(tools)} tool(s) available")
    
    while iterations < max_tool_iterations:
        iterations += 1
        logger.info(f"Tool calling iteration {iterations}/{max_tool_iterations}")
        
        try:
            # For streaming mode
            if stream_callback:
                response_text = await _generate_streaming_with_tools(
                    conversation_history=conversation_history,
                    system_prompt=system_prompt,
                    request=request,
                    model_name=model_name,
                    tools=tools,
                    db=db,
                    user_id=user_id,
                    stream_callback=stream_callback,
                )
                # Note: Gemini's streaming mode with tools is complex
                # For now, we return after first iteration for streaming
                logger.info("Streaming response completed")
                return response_text, tool_calls_executed
            
            # For non-streaming mode
            else:
                # Get full response object for tool calling
                response_obj = await llm.generate_gemini_response(
                    history=conversation_history,
                    model=model_name,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                    system_prompt=system_prompt,
                    tools=tools,
                    return_full_response=True,  # Get full response to check for function calls
                )
                
                # Check if response contains tool call requests
                tool_results = await _check_and_execute_tool_calls(
                    response=response_obj,  # Pass full response object
                    db=db,
                    user_id=user_id,
                )
                
                if not tool_results:
                    # No tool calls detected, return final response
                    try:
                        response_text = response_obj.text  # type: ignore
                        if response_text is None:
                            response_text = "I've processed your request."
                    except (ValueError, AttributeError):
                        # Fallback if can't extract text
                        response_text = "I've processed your request."
                    
                    # If we used tools in previous iterations, add indicator
                    if tool_calls_executed:
                        tool_names = [tc["tool_name"] for tc in tool_calls_executed]
                        tool_indicator = f"_🔧 Menggunakan: {', '.join(tool_names)}_\n\n"
                        response_text = tool_indicator + response_text
                    
                    logger.info("No tool calls detected, returning final response")
                    return response_text, tool_calls_executed
                
                # Tool calls were executed, add to tracking
                tool_calls_executed.extend(tool_results)
                logger.info(f"✓ Executed {len(tool_results)} tool(s): {', '.join([r['tool_name'] for r in tool_results])}")
                
                # NEW SDK: Build contents array with function call and response
                # This replaces the old chat.send_message_async pattern
                
                # Start with conversation history
                contents = llm._convert_history_to_contents(conversation_history)
                
                # Add the model's function call parts from the response
                if hasattr(response_obj, 'candidates') and response_obj.candidates:
                    candidate = response_obj.candidates[0]
                    if hasattr(candidate, 'content') and candidate.content:
                        # Add all function call parts from model
                        function_call_parts = []
                        for part in candidate.content.parts:
                            if hasattr(part, 'function_call') and part.function_call:
                                function_call_parts.append(
                                    types.Part.from_function_call(
                                        name=part.function_call.name,
                                        args=dict(part.function_call.args) if hasattr(part.function_call, 'args') else {}
                                    )
                                )
                        
                        if function_call_parts:
                            contents.append(types.Content(role='model', parts=function_call_parts))
                
                # Add function responses from tool execution
                function_response_parts = []
                for result in tool_results:
                    function_response_parts.append(
                        types.Part.from_function_response(
                            name=result["tool_name"],
                            response=result["result"]
                        )
                    )
                
                if function_response_parts:
                    contents.append(types.Content(role='user', parts=function_response_parts))
                
                # Update conversation history for the next iteration
                # This is CRITICAL: We must append the tool interactions to the history
                # so that the next generate_content call sees them.
                
                # 1. Add model's tool call request
                # We can't easily reconstruct the exact protobuf, so we use a representation
                tool_names = [r['tool_name'] for r in tool_results]
                conversation_history.append({
                    "role": "assistant",
                    "content": "", # Content is empty for tool calls in some models, or we can add a description
                    "tool_calls": tool_results # Store for debugging/tracking
                })
                
                # 2. Add tool results (simulated as user message for history tracking, 
                # but for the API call we use the structured contents above)
                # Note: The 'contents' variable is what actually gets sent to Gemini.
                # The 'conversation_history' is just for our internal state tracking.
                
                # Make another API call with the updated contents to get final response
                logger.info(f"Sending tool results back to LLM (iteration {iterations})")
                client = llm.get_gemini_client()
                final_response_obj = await client.aio.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=request.temperature,
                        max_output_tokens=request.max_tokens,
                        system_instruction=system_prompt if system_prompt else None,
                        tools=tools,  # Keep tools available for nested calls
                    )
                )
                
                # Check if there are more function calls (nested tool calling)
                # For safety, limit to max_iterations
                response_obj = final_response_obj
                
                # Check if the new response has tool calls
                new_tool_results = await _check_and_execute_tool_calls(
                    response=response_obj,
                    db=db,
                    user_id=user_id,
                )
                
                if new_tool_results:
                    logger.info(f"🔄 Nested tool calls detected: {len(new_tool_results)}")
                    # Loop will continue and handle these new calls
                    continue
                else:
                    # No more tool calls, we have the final response
                    try:
                        response_text = response_obj.text
                        if response_text is None:
                            response_text = "I've processed your request."
                    except (ValueError, AttributeError):
                        response_text = "I've processed your request."
                        
                    # If we used tools, add indicator
                    if tool_calls_executed:
                        tool_names = [tc["tool_name"] for tc in tool_calls_executed]
                        tool_indicator = f"_🔧 Menggunakan: {', '.join(tool_names)}_\n\n"
                        response_text = tool_indicator + response_text
                        
                    return response_text, tool_calls_executed
                
        except Exception as e:
            logger.error(f"Error in tool calling iteration {iterations}: {e}", exc_info=True)
            if iterations == 1:
                raise
            else:
                error_msg = f"Tool calling encountered an error: {str(e)}"
                return error_msg, tool_calls_executed
    
    # Reached max iterations
    logger.warning(f"Reached max tool calling iterations ({max_tool_iterations})")
    final_msg = (
        "I've gathered information but need to stop here. "
        "The information I found might help answer your question."
    )
    return final_msg, tool_calls_executed


async def _generate_streaming_with_tools(
    conversation_history: List[Dict[str, str]],
    system_prompt: Optional[str],
    request: ChatRequest,
    model_name: str,
    tools: List[Any],
    db: AsyncSession,
    user_id: int,
    stream_callback: StreamCallback,
) -> str:
    """Generate streaming response with tool calling support.
    
    Handles both streaming text and function calls. When a function call
    is detected, executes it and continues the conversation.
    
    Args:
        conversation_history: Conversation history
        system_prompt: System instruction
        request: Chat request
        model_name: Model to use
        tools: Available tools
        db: Database session
        user_id: User ID
        stream_callback: Callback for streaming chunks
        
    Returns:
        Complete response text
    """
    # For streaming with tools, we need to use non-streaming mode first
    # to check if there's a function call, then stream the final response
    
    try:
        # First, get the response to check for function calls
        response_obj = await llm.generate_gemini_response(
            history=conversation_history,
            model=model_name,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system_prompt=system_prompt,
            tools=tools,
            return_full_response=True,
        )
        
        # Check if response contains tool call requests
        tool_results = await _check_and_execute_tool_calls(
            response=response_obj,
            db=db,
            user_id=user_id,
        )
        
        if tool_results:
            # Function calls detected, execute them and get final response
            logger.info(f"Streaming: Detected {len(tool_results)} tool call(s), executing...")
            
            # Send tool indicator as a special event (not regular text)
            # The frontend should handle this specially
            tool_names = [result["tool_name"] for result in tool_results]
            tool_indicator_msg = f"🔧 _Menggunakan: {', '.join(tool_names)}_\n\n"
            await stream_callback(tool_indicator_msg)
            
            # NEW SDK: Build contents array with function call and response
            # This replaces the old chat.send_message_async pattern
            
            # Start with conversation history
            contents = llm._convert_history_to_contents(conversation_history)
            
            # Add the model's function call parts from the response
            if hasattr(response_obj, 'candidates') and response_obj.candidates:
                candidate = response_obj.candidates[0]
                if hasattr(candidate, 'content') and candidate.content:
                    function_call_parts = []
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            function_call_parts.append(
                                types.Part.from_function_call(
                                    name=part.function_call.name,
                                    args=dict(part.function_call.args) if hasattr(part.function_call, 'args') else {}
                                )
                            )
                    
                    if function_call_parts:
                        contents.append(types.Content(role='model', parts=function_call_parts))
            
            # Add function responses from tool execution
            function_response_parts = []
            for result in tool_results:
                function_response_parts.append(
                    types.Part.from_function_response(
                        name=result["tool_name"],
                        response=result["result"]
                    )
                )
                logger.info(f"✓ Tool {result['tool_name']} executed in streaming mode")
            
            if function_response_parts:
                contents.append(types.Content(role='user', parts=function_response_parts))
            
            # Make API call to get final response (non-streaming for now after tool execution)
            # Streaming after tool execution is complex and may not work well
            client = llm.get_gemini_client()
            final_response_obj = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=request.temperature,
                    max_output_tokens=request.max_tokens,
                    system_instruction=system_prompt if system_prompt else None,
                )
            )
            
            # Extract final text
            final_response = final_response_obj.text
            
            # Stream the final response character by character for smooth UX
            full_text = tool_indicator_msg
            for char in final_response:
                full_text += char
                await stream_callback(char)
            
            return full_text
        
        else:
            # No function calls, extract and stream text normally
            try:
                response_text = response_obj.text  # type: ignore
            except (ValueError, AttributeError):
                response_text = "I've processed your request."
            
            # Stream the response
            full_text = ""
            for char in response_text:
                full_text += char
                await stream_callback(char)
            
            return full_text
    
    except Exception as e:
        logger.error(f"Error in streaming with tools: {e}", exc_info=True)
        error_chunk = f"\n\n[Error: {str(e)}]"
        try:
            await stream_callback(error_chunk)
        except:
            pass
        return error_chunk


async def _check_and_execute_tool_calls(
    response: Any,  # Full Gemini response object
    db: AsyncSession,
    user_id: int,
) -> List[Dict[str, Any]]:
    """Check if response contains tool calls and execute them.
    
    Parses Gemini's function_call objects from the response and executes them.
    
    Args:
        response: Full response object from Gemini
        db: Database session
        user_id: User ID
        
    Returns:
        List of executed tool calls with their results
    """
    tool_results = []
    
    try:
        # Check if response has candidates
        if not hasattr(response, 'candidates') or not response.candidates:
            return tool_results
        
        # Check first candidate for function calls
        candidate = response.candidates[0]
        if not hasattr(candidate, 'content') or not candidate.content:
            return tool_results
        
        content = candidate.content
        if not hasattr(content, 'parts') or not content.parts:
            return tool_results
        
        # Look for function calls in parts
        for part in content.parts:
            if hasattr(part, 'function_call') and part.function_call:
                function_call = part.function_call
                tool_name = function_call.name
                
                # Extract arguments
                tool_args = {}
                if hasattr(function_call, 'args') and function_call.args:
                    # Convert protobuf Struct to dict
                    tool_args = dict(function_call.args)
                
                logger.info(f"Executing tool call: {tool_name} with args: {tool_args}")
                
                # Execute the tool
                try:
                    result = await execute_tool_call(
                        tool_name=tool_name,
                        args=tool_args,  # Correct parameter name is 'args'
                        db=db,
                        user_id=str(user_id),  # Convert to string as expected by execute_tool_call
                    )
                    
                    tool_results.append({
                        "tool_name": tool_name,
                        "arguments": tool_args,
                        "result": result,
                    })
                    
                    logger.info(f"✓ Tool {tool_name} executed successfully")
                    
                except Exception as tool_error:
                    logger.error(f"Error executing tool {tool_name}: {tool_error}", exc_info=True)
                    tool_results.append({
                        "tool_name": tool_name,
                        "arguments": tool_args,
                        "result": {"error": str(tool_error)},
                    })
    
    except Exception as e:
        logger.error(f"Error parsing function calls from response: {e}", exc_info=True)
    
    return tool_results


async def execute_manual_tool_call(
    tool_name: str,
    tool_args: Dict[str, Any],
    db: AsyncSession,
    user_id: int,
) -> Dict[str, Any]:
    """Execute a tool call manually (for testing or explicit invocation).
    
    This function allows direct tool execution without going through
    the LLM tool calling loop. Useful for testing and debugging.
    
    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments for the tool
        db: Database session
        user_id: User ID
        
    Returns:
        Tool execution result
    """
    logger.info(f"Manual tool execution: {tool_name} for user {user_id}")
    
    try:
        result = await execute_tool_call(
            tool_name=tool_name,
            args=tool_args,  # Correct parameter name is 'args'
            db=db,
            user_id=str(user_id),  # Convert to string as expected by execute_tool_call
        )
        
        logger.info(f"✓ Manual tool execution completed: {tool_name}")
        return result
        
    except Exception as e:
        logger.error(f"Error in manual tool execution: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
        }
