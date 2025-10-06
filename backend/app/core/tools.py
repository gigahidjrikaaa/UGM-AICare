"""Tool definitions and handlers for Aika's function calling capabilities.

This module provides:
1. Tool schema definitions for Google Gemini function calling
2. Tool execution functions that query the database
3. A unified tool execution dispatcher

Best practices:
- All tool functions are async for database operations
- Comprehensive error handling with graceful fallbacks
- Logging for observability and debugging
- Input validation and sanitization
- Rate limiting and result size limits
"""
from __future__ import annotations

import logging
from datetime import date as Date, datetime, timedelta
from typing import Any, Dict, List, Optional

from google.generativeai.types import FunctionDeclaration, Tool
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, JournalEntry, UserSummary

logger = logging.getLogger(__name__)

# Constants
MAX_SUMMARIES = 10
MAX_JOURNAL_ENTRIES = 10
MAX_CONVERSATION_MESSAGES = 20
MAX_JOURNAL_CONTENT_LENGTH = 300


def get_aika_tools() -> List[Tool]:
    """Return list of tools available to Aika.
    
    Returns:
        List[Tool]: Tools configured for Gemini function calling
    """
    
    get_conversation_summaries = FunctionDeclaration(
        name="get_conversation_summaries",
        description=(
            "Retrieve conversation summaries from previous chat sessions. "
            "Use this when the user asks about past conversations, wants to recall "
            "previous discussions, or references something they talked about before. "
            "Returns a list of conversation summaries ordered by recency."
        ),
        parameters={
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of summaries to retrieve (defaults to 5 if not specified, max: {MAX_SUMMARIES})",
                },
            },
            "required": [],
        },
    )
    
    get_journal_entries = FunctionDeclaration(
        name="get_journal_entries",
        description=(
            "Search and retrieve user's journal entries. Use this when the user "
            "asks about their journals, wants to see what they wrote, or references "
            "feelings/events they might have journaled about. Can search by keywords "
            "or retrieve recent entries."
        ),
        parameters={
            "type": "object",
            "properties": {
                "keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Keywords to search for in journal entries (optional)",
                },
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of entries to retrieve (defaults to 5 if not specified, max: {MAX_JOURNAL_ENTRIES})",
                },
                "days_ago": {
                    "type": "integer",
                    "description": "Only retrieve entries from the last N days (optional)",
                },
            },
            "required": [],
        },
    )
    
    get_conversation_context = FunctionDeclaration(
        name="get_conversation_context",
        description=(
            "Get detailed context about a specific conversation session. "
            "Use this when you need to recall specific details from a previous "
            "conversation or understand the full context of past interactions."
        ),
        parameters={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "The session ID to retrieve context for (optional, uses latest if not provided)",
                },
                "message_limit": {
                    "type": "integer",
                    "description": f"Maximum number of messages to retrieve from the session (defaults to 10 if not specified, max: {MAX_CONVERSATION_MESSAGES})",
                },
            },
            "required": [],
        },
    )
    
    # Create tool with all function declarations
    memory_tool = Tool(
        function_declarations=[
            get_conversation_summaries,
            get_journal_entries,
            get_conversation_context,
        ]
    )
    
    return [memory_tool]


async def execute_get_conversation_summaries(
    db: AsyncSession,
    user_id: int,
    limit: int = 5,
) -> Dict[str, Any]:
    """Retrieve conversation summaries for the user.
    
    Args:
        db: Database session
        user_id: User ID to retrieve summaries for
        limit: Maximum number of summaries to retrieve
        
    Returns:
        Dict containing success status, summaries list, and metadata
    """
    try:
        # Validate and cap limit
        limit = min(max(1, limit), MAX_SUMMARIES)
        
        logger.info(f"Tool call: get_conversation_summaries for user {user_id}, limit={limit}")
        
        stmt = (
            select(UserSummary)
            .where(UserSummary.user_id == user_id)
            .order_by(desc(UserSummary.timestamp))
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        summaries = result.scalars().all()
        
        if not summaries:
            logger.info(f"No conversation summaries found for user {user_id}")
            return {
                "success": True,
                "summaries": [],
                "count": 0,
                "message": "No previous conversation summaries found.",
            }
        
        summary_list = []
        for summary in summaries:
            summary_list.append({
                "summary_text": summary.summary_text,
                "timestamp": summary.timestamp.isoformat() if summary.timestamp else None,
                "session_id": summary.summarized_session_id,
            })
        
        logger.info(f"✓ Retrieved {len(summary_list)} conversation summaries for user {user_id}")
        
        return {
            "success": True,
            "summaries": summary_list,
            "count": len(summary_list),
        }
        
    except Exception as e:
        logger.error(f"Error retrieving conversation summaries: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "summaries": [],
            "count": 0,
        }


async def execute_get_journal_entries(
    db: AsyncSession,
    user_id: int,
    keywords: Optional[List[str]] = None,
    limit: int = 5,
    days_ago: Optional[int] = None,
) -> Dict[str, Any]:
    """Search and retrieve journal entries for the user.
    
    Args:
        db: Database session
        user_id: User ID to retrieve journal entries for
        keywords: Optional list of keywords to search for
        limit: Maximum number of entries to retrieve
        days_ago: Optional filter to only get entries from last N days
        
    Returns:
        Dict containing success status, entries list, and metadata
    """
    try:
        # Validate and cap limit
        limit = min(max(1, limit), MAX_JOURNAL_ENTRIES)
        
        logger.info(
            f"Tool call: get_journal_entries for user {user_id}, "
            f"keywords={keywords}, limit={limit}, days_ago={days_ago}"
        )
        
        stmt = (
            select(JournalEntry)
            .where(JournalEntry.user_id == user_id)
        )
        
        # Filter by date if specified
        if days_ago and days_ago > 0:
            cutoff_date = datetime.utcnow() - timedelta(days=days_ago)
            stmt = stmt.where(JournalEntry.entry_date >= cutoff_date)
            logger.debug(f"Filtering journals from last {days_ago} days (since {cutoff_date})")
        
        # Filter by keywords if provided
        if keywords and len(keywords) > 0:
            # Use case-insensitive search
            like_clauses = [
                JournalEntry.content.ilike(f"%{keyword}%")
                for keyword in keywords
            ]
            stmt = stmt.where(or_(*like_clauses))
            logger.debug(f"Searching journals with keywords: {keywords}")
        
        stmt = stmt.order_by(desc(JournalEntry.entry_date)).limit(limit)
        
        result = await db.execute(stmt)
        entries = result.scalars().all()
        
        if not entries:
            logger.info(f"No journal entries found for user {user_id} matching criteria")
            return {
                "success": True,
                "entries": [],
                "count": 0,
                "message": "No journal entries found matching the criteria.",
            }
        
        entry_list = []
        for entry in entries:
            # Truncate long entries for context efficiency
            content = entry.content or ""
            if len(content) > MAX_JOURNAL_CONTENT_LENGTH:
                content = content[:MAX_JOURNAL_CONTENT_LENGTH - 3] + "..."
            
            # Handle date serialization - convert Date to string
            entry_date_str = None
            if entry.entry_date:
                if isinstance(entry.entry_date, datetime):
                    entry_date_str = entry.entry_date.isoformat()
                elif isinstance(entry.entry_date, Date):
                    # Convert date to datetime then to ISO string
                    entry_date_str = datetime.combine(entry.entry_date, datetime.min.time()).isoformat()
                else:
                    # Fallback to string conversion
                    entry_date_str = str(entry.entry_date)
            
            entry_list.append({
                "entry_date": entry_date_str,
                "content": content,
                "created_at": entry.created_at.isoformat() if hasattr(entry, 'created_at') and entry.created_at else None,
            })
        
        logger.info(f"✓ Retrieved {len(entry_list)} journal entries for user {user_id}")
        
        return {
            "success": True,
            "entries": entry_list,
            "count": len(entry_list),
        }
        
    except Exception as e:
        logger.error(f"Error retrieving journal entries: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "entries": [],
            "count": 0,
        }


async def execute_get_conversation_context(
    db: AsyncSession,
    user_id: int,
    session_id: Optional[str] = None,
    message_limit: int = 10,
) -> Dict[str, Any]:
    """Get detailed conversation context from a specific session.
    
    Args:
        db: Database session
        user_id: User ID to retrieve conversations for
        session_id: Optional session ID (uses latest if not provided)
        message_limit: Maximum number of messages to retrieve
        
    Returns:
        Dict containing success status, messages list, and metadata
    """
    try:
        # Validate and cap limit
        message_limit = min(max(1, message_limit), MAX_CONVERSATION_MESSAGES)
        
        logger.info(
            f"Tool call: get_conversation_context for user {user_id}, "
            f"session_id={session_id or 'latest'}, message_limit={message_limit}"
        )
        
        stmt = select(Conversation).where(Conversation.user_id == user_id)
        
        if session_id:
            stmt = stmt.where(Conversation.session_id == session_id)
        else:
            # Get latest session if not specified
            latest_stmt = (
                select(Conversation.session_id)
                .where(Conversation.user_id == user_id)
                .order_by(desc(Conversation.timestamp))
                .limit(1)
            )
            latest_result = await db.execute(latest_stmt)
            latest_session = latest_result.scalar_one_or_none()
            
            if not latest_session:
                logger.info(f"No previous conversations found for user {user_id}")
                return {
                    "success": True,
                    "messages": [],
                    "count": 0,
                    "message": "No previous conversations found.",
                }
            
            session_id = latest_session
            stmt = stmt.where(Conversation.session_id == latest_session)
            logger.debug(f"Using latest session: {latest_session}")
        
        stmt = stmt.order_by(desc(Conversation.timestamp)).limit(message_limit)
        
        result = await db.execute(stmt)
        conversations = result.scalars().all()
        
        if not conversations:
            logger.info(f"No conversations found for session {session_id}")
            return {
                "success": True,
                "messages": [],
                "count": 0,
                "message": f"No conversations found for session {session_id}.",
            }
        
        # Reverse to get chronological order (oldest first)
        conversations = list(reversed(conversations))
        
        message_list = []
        for conv in conversations:
            message_list.append({
                "timestamp": conv.timestamp.isoformat() if conv.timestamp else None,
                "user_message": conv.message,
                "assistant_response": conv.response,
            })
        
        logger.info(
            f"✓ Retrieved {len(message_list)} messages from session {session_id} "
            f"for user {user_id}"
        )
        
        return {
            "success": True,
            "session_id": session_id,
            "messages": message_list,
            "count": len(message_list),
        }
        
    except Exception as e:
        logger.error(f"Error retrieving conversation context: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "messages": [],
            "count": 0,
        }


async def execute_tool_call(
    tool_name: str,
    tool_args: Dict[str, Any],
    db: AsyncSession,
    user_id: int,
) -> Dict[str, Any]:
    """Execute a tool call and return the result.
    
    Central dispatcher for all tool executions. Handles routing to the
    appropriate tool function and provides consistent error handling.
    
    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments to pass to the tool
        db: Database session
        user_id: User ID for the tool execution
        
    Returns:
        Dict containing the tool execution result
    """
    logger.info(f"Executing tool: {tool_name} with args: {tool_args} for user {user_id}")
    
    try:
        if tool_name == "get_conversation_summaries":
            return await execute_get_conversation_summaries(
                db=db,
                user_id=user_id,
                limit=tool_args.get("limit", 5),
            )
        
        elif tool_name == "get_journal_entries":
            return await execute_get_journal_entries(
                db=db,
                user_id=user_id,
                keywords=tool_args.get("keywords"),
                limit=tool_args.get("limit", 5),
                days_ago=tool_args.get("days_ago"),
            )
        
        elif tool_name == "get_conversation_context":
            return await execute_get_conversation_context(
                db=db,
                user_id=user_id,
                session_id=tool_args.get("session_id"),
                message_limit=tool_args.get("message_limit", 10),
            )
        
        else:
            logger.error(f"Unknown tool requested: {tool_name}")
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}",
            }
            
    except Exception as e:
        logger.error(f"Unexpected error executing tool {tool_name}: {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Tool execution failed: {str(e)}",
        }
