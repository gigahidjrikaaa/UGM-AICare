"""
Analytics Tools - Platform Insights

This module provides tools for accessing anonymized platform analytics
and insights. Used primarily by IA (Insights Agent).

Tools:
- get_platform_stats: Get overall platform statistics
- get_user_engagement_metrics: Get engagement metrics for a user

Privacy: All analytics are anonymized and aggregated per differential privacy.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    User,
    Conversation,
    Message,
    JournalEntry,
    QuestInstance,
    Appointment
)
from app.agents.shared.tools import tool_registry

import logging

logger = logging.getLogger(__name__)


async def get_platform_stats(
    db: AsyncSession,
    days: int = 30
) -> Dict[str, Any]:
    """
    Get overall platform statistics.
    
    Returns anonymized aggregate metrics for the platform.
    ANONYMIZED DATA - no PII.
    
    Args:
        days: Number of days to analyze (default 30)
        
    Returns:
        Dict with platform statistics or error
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Count active users (users who logged in)
        user_query = select(func.count(User.id)).where(User.last_login >= start_date)
        user_result = await db.execute(user_query)
        active_users = user_result.scalar()
        
        # Count conversations
        conv_query = select(func.count(Conversation.id)).where(Conversation.created_at >= start_date)
        conv_result = await db.execute(conv_query)
        conversations = conv_result.scalar()
        
        # Count journal entries
        journal_query = select(func.count(JournalEntry.id)).where(JournalEntry.created_at >= start_date)
        journal_result = await db.execute(journal_query)
        journal_entries = journal_result.scalar()
        
        # Count appointments
        appt_query = select(func.count(Appointment.id)).where(Appointment.created_at >= start_date)
        appt_result = await db.execute(appt_query)
        appointments = appt_result.scalar()
        
        logger.info(f"✅ Retrieved platform stats for last {days} days")
        
        return {
            "success": True,
            "period_days": days,
            "active_users": active_users or 0,
            "total_conversations": conversations or 0,
            "total_journal_entries": journal_entries or 0,
            "total_appointments": appointments or 0,
            "avg_conversations_per_user": round((conversations or 0) / (active_users or 1), 1) if (active_users or 0) > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting platform stats: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def get_user_engagement_metrics(
    db: AsyncSession,
    user_id: str,
    days: int = 30
) -> Dict[str, Any]:
    """
    Get engagement metrics for a user.
    
    Returns user's activity levels and engagement patterns.
    SENSITIVE DATA - individual user metrics.
    
    Args:
        user_id: User ID
        days: Number of days to analyze (default 30)
        
    Returns:
        Dict with engagement metrics or error
    """
    try:
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
        conversations = conv_result.scalar()
        
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
        messages = msg_result.scalar()
        
        # Count journals
        journal_query = (
            select(func.count(JournalEntry.id))
            .where(
                and_(
                    JournalEntry.user_id == user_id,
                    JournalEntry.created_at >= start_date
                )
            )
        )
        journal_result = await db.execute(journal_query)
        journals = journal_result.scalar()
        
        # Count active quests
        quest_query = (
            select(func.count(QuestInstance.id))
            .where(
                and_(
                    QuestInstance.user_id == user_id,
                    QuestInstance.started_at >= start_date
                )
            )
        )
        quest_result = await db.execute(quest_query)
        quests = quest_result.scalar()
        
        # Calculate engagement score (simple formula)
        engagement_score = (conversations or 0) + (journals or 0) + ((quests or 0) * 2)
        
        logger.info(f"✅ Retrieved engagement metrics for user {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "period_days": days,
            "conversations": conversations,
            "messages": messages,
            "journal_entries": journals,
            "active_quests": quests,
            "engagement_score": engagement_score
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting engagement metrics for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id
        }


# ============================================================================
# GEMINI FUNCTION CALLING SCHEMAS
# ============================================================================

get_platform_stats_schema = {
    "name": "get_platform_stats",
    "description": "Get overall platform statistics (anonymized aggregates). Returns active users, conversations, journals, etc.",
    "parameters": {
        "type": "object",
        "properties": {
            "days": {
                "type": "integer",
                "description": "Number of days to analyze (default 30)",
                "default": 30
            }
        },
        "required": []
    }
}

get_user_engagement_metrics_schema = {
    "name": "get_user_engagement_metrics",
    "description": "Get engagement metrics for a specific user. Returns activity levels and patterns. SENSITIVE DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID"
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
    name="get_platform_stats",
    func=get_platform_stats,
    schema=get_platform_stats_schema,
    category="analytics"
)

tool_registry.register(
    name="get_user_engagement_metrics",
    func=get_user_engagement_metrics,
    schema=get_user_engagement_metrics_schema,
    category="analytics"
)

logger.info("🔧 Registered 2 analytics tools in 'analytics' category")
