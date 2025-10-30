"""
Conversation Tools - Chat History and Context Management

This module provides tools for accessing conversation history, summaries,
and message search capabilities. Used by all agents to understand context.

Tools:
- get_conversation_history: Get recent messages from a conversation
- get_conversation_summary: Get AI-generated summary of conversation
- search_conversations: Search across user's conversation history
- get_conversation_stats: Get conversation metrics (count, duration, etc.)

Privacy: Conversation data is SENSITIVE and requires consent.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy import select, desc, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User  # Core model
from app.domains.mental_health.models import Conversation, Message
from app.agents.shared.tools import tool_registry

import logging

logger = logging.getLogger(__name__)

# Constants
MAX_MESSAGES = 50
MAX_CONVERSATIONS = 20
MAX_SEARCH_RESULTS = 20
MESSAGE_PREVIEW_LENGTH = 200


async def get_conversation_history(
    db: AsyncSession,
    conversation_id: str,
    limit: int = MAX_MESSAGES
) -> Dict[str, Any]:
    """
    Get recent messages from a conversation.
    
    Returns messages in chronological order with sender info.
    SENSITIVE DATA - contains user messages.
    
    Args:
        conversation_id: Conversation ID
        limit: Maximum number of messages (default 50, max 50)
        
    Returns:
        Dict with messages list or error
    """
    try:
        if limit > MAX_MESSAGES:
            limit = MAX_MESSAGES
            
        # Query messages
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(desc(Message.created_at))
            .limit(limit)
        )
        
        result = await db.execute(query)
        messages = result.scalars().all()
        
        # Reverse to chronological order (oldest first)
        messages = list(reversed(messages))
        
        message_list = []
        for msg in messages:
            message_list.append({
                "message_id": str(msg.id),
                "sender": msg.sender,  # "user" or "assistant"
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "metadata": msg.metadata or {}
            })
        
        # Get conversation info
        conv_query = select(Conversation).where(Conversation.id == conversation_id)
        conv_result = await db.execute(conv_query)
        conversation = conv_result.scalar_one_or_none()
        
        logger.info(f"✅ Retrieved {len(message_list)} messages from conversation {conversation_id}")
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "conversation_title": conversation.title if conversation else None,
            "total_messages": len(message_list),
            "messages": message_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting conversation history for {conversation_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversation_id": conversation_id
        }


async def get_conversation_summary(
    db: AsyncSession,
    conversation_id: str
) -> Dict[str, Any]:
    """
    Get AI-generated summary of a conversation.
    
    Returns summary stored in conversation metadata, or generates one
    from recent messages if not available.
    SENSITIVE DATA - conversation content.
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        Dict with summary or error
    """
    try:
        # Get conversation
        query = select(Conversation).where(Conversation.id == conversation_id)
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            logger.warning(f"⚠️ Conversation {conversation_id} not found")
            return {
                "success": False,
                "error": f"Conversation {conversation_id} not found",
                "conversation_id": conversation_id
            }
        
        # Check for existing summary in metadata
        summary = conversation.metadata.get("summary") if conversation.metadata else None
        
        if not summary:
            # Generate basic summary from message count
            msg_query = select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
            msg_result = await db.execute(msg_query)
            message_count = msg_result.scalar()
            
            summary = f"Conversation with {message_count} messages"
        
        logger.info(f"✅ Retrieved summary for conversation {conversation_id}")
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "title": conversation.title,
            "summary": summary,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
            "has_detailed_summary": bool(conversation.metadata and conversation.metadata.get("summary"))
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting conversation summary for {conversation_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "conversation_id": conversation_id
        }


async def search_conversations(
    db: AsyncSession,
    user_id: str,
    query: str,
    limit: int = MAX_SEARCH_RESULTS
) -> Dict[str, Any]:
    """
    Search across user's conversation history.
    
    Searches message content for keywords and returns matching conversations.
    SENSITIVE DATA - searches user messages.
    
    Args:
        user_id: User ID
        query: Search query string
        limit: Maximum number of results (default 20, max 20)
        
    Returns:
        Dict with search results or error
    """
    try:
        if limit > MAX_SEARCH_RESULTS:
            limit = MAX_SEARCH_RESULTS
            
        # Search messages by content (case-insensitive)
        search_pattern = f"%{query}%"
        
        # Find conversations with matching messages
        msg_query = (
            select(Message.conversation_id, func.count(Message.id).label("match_count"))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                and_(
                    Conversation.user_id == user_id,
                    Message.content.ilike(search_pattern)
                )
            )
            .group_by(Message.conversation_id)
            .order_by(desc("match_count"))
            .limit(limit)
        )
        
        result = await db.execute(msg_query)
        conversation_matches = result.all()
        
        search_results = []
        for conv_id, match_count in conversation_matches:
            # Get conversation details
            conv_query = select(Conversation).where(Conversation.id == conv_id)
            conv_result = await db.execute(conv_query)
            conversation = conv_result.scalar_one_or_none()
            
            if conversation:
                # Get a sample matching message
                sample_query = (
                    select(Message)
                    .where(
                        and_(
                            Message.conversation_id == conv_id,
                            Message.content.ilike(search_pattern)
                        )
                    )
                    .limit(1)
                )
                sample_result = await db.execute(sample_query)
                sample_message = sample_result.scalar_one_or_none()
                
                # Truncate message for preview
                preview = sample_message.content[:MESSAGE_PREVIEW_LENGTH] if sample_message else ""
                if len(sample_message.content) > MESSAGE_PREVIEW_LENGTH if sample_message else False:
                    preview += "..."
                
                search_results.append({
                    "conversation_id": str(conversation.id),
                    "title": conversation.title,
                    "match_count": match_count,
                    "preview": preview,
                    "created_at": conversation.created_at.isoformat()
                })
        
        logger.info(f"✅ Found {len(search_results)} conversations matching '{query}' for user {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "query": query,
            "total_results": len(search_results),
            "results": search_results
        }
        
    except Exception as e:
        logger.error(f"❌ Error searching conversations for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id,
            "query": query
        }


async def get_conversation_stats(
    db: AsyncSession,
    user_id: str,
    days: int = 30
) -> Dict[str, Any]:
    """
    Get conversation statistics for user.
    
    Returns metrics like total conversations, message count, avg length, etc.
    Used for engagement tracking.
    
    Args:
        user_id: User ID
        days: Number of days to analyze (default 30)
        
    Returns:
        Dict with statistics or error
    """
    try:
        # Calculate date range
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Count conversations
        conv_query = (
            select(func.count(Conversation.id))
            .where(
                and_(
                    Conversation.user_id == user_id,
                    Conversation.created_at >= start_date
                )
            )
        )
        conv_result = await db.execute(conv_query)
        conversation_count = conv_result.scalar()
        
        # Count messages
        msg_query = (
            select(func.count(Message.id))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                and_(
                    Conversation.user_id == user_id,
                    Message.created_at >= start_date
                )
            )
        )
        msg_result = await db.execute(msg_query)
        message_count = msg_result.scalar()
        
        # Get user messages only (exclude assistant)
        user_msg_query = (
            select(func.count(Message.id))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                and_(
                    Conversation.user_id == user_id,
                    Message.sender == "user",
                    Message.created_at >= start_date
                )
            )
        )
        user_msg_result = await db.execute(user_msg_query)
        user_message_count = user_msg_result.scalar()
        
        # Calculate averages (handle None values)
        conversation_count = conversation_count or 0
        message_count = message_count or 0
        user_message_count = user_message_count or 0
        
        avg_messages_per_conversation = (
            message_count / conversation_count if conversation_count > 0 else 0
        )
        
        logger.info(f"✅ Retrieved conversation stats for user {user_id}: {conversation_count} conversations, {message_count} messages")
        
        return {
            "success": True,
            "user_id": user_id,
            "period_days": days,
            "total_conversations": conversation_count,
            "total_messages": message_count,
            "user_messages": user_message_count,
            "assistant_messages": message_count - user_message_count,
            "avg_messages_per_conversation": round(avg_messages_per_conversation, 1)
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting conversation stats for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id
        }


# ============================================================================
# GEMINI FUNCTION CALLING SCHEMAS
# ============================================================================

get_conversation_history_schema = {
    "name": "get_conversation_history",
    "description": "Get recent messages from a conversation in chronological order. Returns sender info and message content. SENSITIVE DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "conversation_id": {
                "type": "string",
                "description": "Conversation ID to retrieve messages from"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of messages to return (default 50, max 50)",
                "default": 50
            }
        },
        "required": ["conversation_id"]
    }
}

get_conversation_summary_schema = {
    "name": "get_conversation_summary",
    "description": "Get AI-generated summary of a conversation. Returns overview of conversation topics and key points. SENSITIVE DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "conversation_id": {
                "type": "string",
                "description": "Conversation ID to get summary for"
            }
        },
        "required": ["conversation_id"]
    }
}

search_conversations_schema = {
    "name": "search_conversations",
    "description": "Search across user's conversation history by keywords. Returns matching conversations with previews. SENSITIVE DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID to search conversations for"
            },
            "query": {
                "type": "string",
                "description": "Search query string to look for in messages"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results to return (default 20, max 20)",
                "default": 20
            }
        },
        "required": ["user_id", "query"]
    }
}

get_conversation_stats_schema = {
    "name": "get_conversation_stats",
    "description": "Get conversation statistics for user (total conversations, message count, averages). Used for engagement tracking.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID to get conversation stats for"
            },
            "days": {
                "type": "integer",
                "description": "Number of days to analyze (default 30)",
                "default": 30
            }
        },
        "required": ["user_id"]
    }
}


# ============================================================================
# REGISTER TOOLS WITH CENTRAL REGISTRY
# ============================================================================

tool_registry.register(
    name="get_conversation_history",
    func=get_conversation_history,
    schema=get_conversation_history_schema,
    category="conversation"
)

tool_registry.register(
    name="get_conversation_summary",
    func=get_conversation_summary,
    schema=get_conversation_summary_schema,
    category="conversation"
)

tool_registry.register(
    name="search_conversations",
    func=search_conversations,
    schema=search_conversations_schema,
    category="conversation"
)

tool_registry.register(
    name="get_conversation_stats",
    func=get_conversation_stats,
    schema=get_conversation_stats_schema,
    category="conversation"
)

logger.info("🔧 Registered 4 conversation tools in 'conversation' category")
