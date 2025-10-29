"""Progress and activity tracking tools for agent system.

Provides tools for tracking user engagement across platform features:
journals, appointments, quests, achievements, streaks, and intervention completion.

Tools:
- get_journal_entries: Recent journal entries
- get_appointment_history: Counseling appointments
- get_active_quests: Ongoing gamification quests
- get_completed_quests: Quest achievements
- get_quest_progress: Specific quest status
- get_achievement_badges: Earned NFT badges
- get_activity_streak: Daily engagement streak
- get_intervention_plan_progress: CBT/intervention module completion
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Appointment,
    InterventionPlanRecord,
    InterventionPlanStepCompletion,
    JournalEntry,
    QuestInstance,
    QuestStatusEnum,
    UserBadge,
)

from . import tool_registry

logger = logging.getLogger(__name__)

# Constants
MAX_JOURNAL_ENTRIES = 20
MAX_APPOINTMENTS = 10
MAX_QUESTS = 20
MAX_BADGES = 50
MAX_JOURNAL_CONTENT_LENGTH = 300


async def get_journal_entries(
    db: AsyncSession,
    user_id: int,
    days: int = 30,
    keywords: Optional[str] = None,
    limit: int = MAX_JOURNAL_ENTRIES
) -> Dict[str, Any]:
    """Get user's recent journal entries.
    
    Args:
        db: Database session
        user_id: User ID
        days: Number of days to look back (default 30)
        keywords: Optional keywords to search for in content
        limit: Maximum entries to return
    
    Returns:
        Dict with journal entries or error
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        query = select(JournalEntry).where(
            JournalEntry.user_id == user_id,
            JournalEntry.created_at >= cutoff_date
        )
        
        # Add keyword search if provided
        if keywords:
            query = query.where(
                JournalEntry.content.ilike(f"%{keywords}%")
            )
        
        query = query.order_by(desc(JournalEntry.created_at)).limit(limit)
        
        result = await db.execute(query)
        entries = result.scalars().all()
        
        return {
            "user_id": user_id,
            "total_entries": len(entries),
            "days_searched": days,
            "keywords": keywords,
            "entries": [
                {
                    "id": entry.id,
                    "content": entry.content[:MAX_JOURNAL_CONTENT_LENGTH] if entry.content else "",
                    "content_truncated": len(entry.content or "") > MAX_JOURNAL_CONTENT_LENGTH,
                    "mood": entry.mood,
                    "created_at": entry.created_at.isoformat() if entry.created_at else None,
                }
                for entry in entries
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching journal entries for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_appointment_history(
    db: AsyncSession,
    user_id: int,
    status: str = "all",
    limit: int = MAX_APPOINTMENTS
) -> Dict[str, Any]:
    """Get user's counseling appointment history.
    
    Args:
        db: Database session
        user_id: User ID
        status: Filter by status ("all", "pending", "completed", "cancelled")
        limit: Maximum appointments to return
    
    Returns:
        Dict with appointments or error
    """
    try:
        query = select(Appointment).where(Appointment.user_id == user_id)
        
        # Filter by status if specified
        if status != "all":
            query = query.where(Appointment.status == status)
        
        query = query.order_by(desc(Appointment.scheduled_at)).limit(limit)
        
        result = await db.execute(query)
        appointments = result.scalars().all()
        
        return {
            "user_id": user_id,
            "total_appointments": len(appointments),
            "status_filter": status,
            "appointments": [
                {
                    "id": apt.id,
                    "psychologist_id": apt.psychologist_id,
                    "scheduled_at": apt.scheduled_at.isoformat() if apt.scheduled_at else None,
                    "status": apt.status,
                    "notes": apt.notes,
                    "created_at": apt.created_at.isoformat() if apt.created_at else None,
                }
                for apt in appointments
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching appointments for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_active_quests(
    db: AsyncSession,
    user_id: int,
    limit: int = MAX_QUESTS
) -> Dict[str, Any]:
    """Get user's active quests.
    
    Args:
        db: Database session
        user_id: User ID
        limit: Maximum quests to return
    
    Returns:
        Dict with active quests or error
    """
    try:
        # Use string literal "in_progress" instead of enum
        result = await db.execute(
            select(QuestInstance)
            .where(
                QuestInstance.user_id == user_id,
                QuestInstance.status == "in_progress"
            )
            .order_by(desc(QuestInstance.started_at))
            .limit(limit)
        )
        quests = result.scalars().all()
        
        return {
            "user_id": user_id,
            "total_active_quests": len(quests),
            "quests": [
                {
                    "id": quest.id,
                    "template_id": quest.template_id,
                    "title": quest.title,
                    "description": quest.description,
                    "progress": quest.progress,
                    "target": quest.target,
                    "progress_percentage": (quest.progress / quest.target * 100) if quest.target > 0 else 0,
                    "started_at": quest.started_at.isoformat() if quest.started_at else None,
                    "expires_at": quest.expires_at.isoformat() if quest.expires_at else None,
                }
                for quest in quests
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching active quests for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_completed_quests(
    db: AsyncSession,
    user_id: int,
    limit: int = MAX_QUESTS
) -> Dict[str, Any]:
    """Get user's completed quests.
    
    Args:
        db: Database session
        user_id: User ID
        limit: Maximum quests to return
    
    Returns:
        Dict with completed quests or error
    """
    try:
        result = await db.execute(
            select(QuestInstance)
            .where(
                QuestInstance.user_id == user_id,
                QuestInstance.status == QuestStatusEnum.COMPLETED
            )
            .order_by(desc(QuestInstance.completed_at))
            .limit(limit)
        )
        quests = result.scalars().all()
        
        return {
            "user_id": user_id,
            "total_completed_quests": len(quests),
            "quests": [
                {
                    "id": quest.id,
                    "template_id": quest.template_id,
                    "title": quest.title,
                    "description": quest.description,
                    "completed_at": quest.completed_at.isoformat() if quest.completed_at else None,
                    "reward_tokens": quest.reward_tokens,
                    "reward_xp": quest.reward_xp,
                }
                for quest in quests
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching completed quests for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_quest_progress(
    db: AsyncSession,
    user_id: int,
    quest_id: int
) -> Dict[str, Any]:
    """Get specific quest progress details.
    
    Args:
        db: Database session
        user_id: User ID
        quest_id: Quest instance ID
    
    Returns:
        Dict with quest progress or error
    """
    try:
        result = await db.execute(
            select(QuestInstance).where(
                QuestInstance.id == quest_id,
                QuestInstance.user_id == user_id
            )
        )
        quest = result.scalar_one_or_none()
        
        if not quest:
            return {
                "error": "Quest not found",
                "user_id": user_id,
                "quest_id": quest_id
            }
        
        progress_pct = (quest.progress / quest.target * 100) if quest.target > 0 else 0
        
        return {
            "user_id": user_id,
            "quest_id": quest.id,
            "title": quest.title,
            "description": quest.description,
            "status": quest.status.value if quest.status else None,
            "progress": quest.progress,
            "target": quest.target,
            "progress_percentage": progress_pct,
            "is_complete": progress_pct >= 100,
            "started_at": quest.started_at.isoformat() if quest.started_at else None,
            "completed_at": quest.completed_at.isoformat() if quest.completed_at else None,
            "expires_at": quest.expires_at.isoformat() if quest.expires_at else None,
        }
    except Exception as e:
        logger.error(f"Error fetching quest progress for user {user_id}, quest {quest_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id,
            "quest_id": quest_id
        }


async def get_achievement_badges(
    db: AsyncSession,
    user_id: int,
    limit: int = MAX_BADGES
) -> Dict[str, Any]:
    """Get user's earned achievement badges (NFTs).
    
    Args:
        db: Database session
        user_id: User ID
        limit: Maximum badges to return
    
    Returns:
        Dict with badges or error
    """
    try:
        result = await db.execute(
            select(UserBadge)
            .where(UserBadge.user_id == user_id)
            .order_by(desc(UserBadge.earned_at))
            .limit(limit)
        )
        badges = result.scalars().all()
        
        return {
            "user_id": user_id,
            "total_badges": len(badges),
            "badges": [
                {
                    "id": badge.id,
                    "badge_id": badge.badge_id,
                    "name": badge.name,
                    "description": badge.description,
                    "earned_at": badge.earned_at.isoformat() if badge.earned_at else None,
                    "nft_token_id": badge.nft_token_id,
                    "nft_minted": badge.nft_token_id is not None,
                }
                for badge in badges
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching badges for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_activity_streak(
    db: AsyncSession,
    user_id: int
) -> Dict[str, Any]:
    """Get user's daily engagement streak.
    
    Calculates streak based on journal entries (for now).
    TODO: Expand to include other activities (quests, appointments, etc.)
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Dict with streak info or error
    """
    try:
        # Get journal entries for last 90 days
        cutoff = datetime.utcnow() - timedelta(days=90)
        result = await db.execute(
            select(
                func.date(JournalEntry.created_at).label("activity_date")
            )
            .where(
                JournalEntry.user_id == user_id,
                JournalEntry.created_at >= cutoff
            )
            .group_by(func.date(JournalEntry.created_at))
            .order_by(desc("activity_date"))
        )
        activity_dates = [row[0] for row in result.all()]
        
        # Calculate streak
        streak = 0
        today = datetime.utcnow().date()
        
        for i, date in enumerate(activity_dates):
            expected_date = today - timedelta(days=i)
            if date == expected_date:
                streak += 1
            else:
                break
        
        return {
            "user_id": user_id,
            "current_streak": streak,
            "last_activity": activity_dates[0].isoformat() if activity_dates else None,
            "total_active_days": len(activity_dates),
            "streak_calculation_method": "journal_entries",
        }
    except Exception as e:
        logger.error(f"Error calculating streak for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_intervention_plan_progress(
    db: AsyncSession,
    user_id: int,
    plan_id: Optional[int] = None
) -> Dict[str, Any]:
    """Get intervention plan completion progress.
    
    Args:
        db: Database session
        user_id: User ID
        plan_id: Optional specific plan ID (if None, returns active plans)
    
    Returns:
        Dict with intervention progress or error
    """
    try:
        if plan_id:
            # Get specific plan
            result = await db.execute(
                select(InterventionPlanRecord).where(
                    InterventionPlanRecord.id == plan_id,
                    InterventionPlanRecord.user_id == user_id
                )
            )
            plans = [result.scalar_one_or_none()]
            if plans[0] is None:
                return {
                    "error": "Plan not found",
                    "user_id": user_id,
                    "plan_id": plan_id
                }
        else:
            # Get all active plans
            result = await db.execute(
                select(InterventionPlanRecord)
                .where(
                    InterventionPlanRecord.user_id == user_id,
                    InterventionPlanRecord.completed_at.is_(None)
                )
                .order_by(desc(InterventionPlanRecord.created_at))
            )
            plans = result.scalars().all()
        
        plan_data = []
        for plan in plans:
            # Type guard to ensure plan is not None
            if plan is None:
                continue
                
            # Get step completions
            completions_result = await db.execute(
                select(InterventionPlanStepCompletion)
                .where(InterventionPlanStepCompletion.plan_record_id == plan.id)
            )
            completions = completions_result.scalars().all()
            
            total_steps = len(plan.plan_steps) if plan.plan_steps else 0
            completed_steps = len(completions)
            progress_pct = (completed_steps / total_steps * 100) if total_steps > 0 else 0
            
            # Safe datetime checks
            created_at_str = plan.created_at.isoformat() if plan.created_at else None
            completed_at_str = plan.completed_at.isoformat() if plan.completed_at else None
            
            plan_data.append({
                "plan_id": plan.id,
                "plan_type": plan.plan_type,
                "total_steps": total_steps,
                "completed_steps": completed_steps,
                "progress_percentage": progress_pct,
                "is_complete": plan.completed_at is not None,
                "created_at": created_at_str,
                "completed_at": completed_at_str,
            })
        
        return {
            "user_id": user_id,
            "total_plans": len(plan_data),
            "plans": plan_data
        }
    except Exception as e:
        logger.error(f"Error fetching intervention progress for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


# Tool schemas for Gemini function calling

GET_JOURNAL_ENTRIES_SCHEMA = {
    "name": "get_journal_entries",
    "description": (
        "Get user's recent journal entries. Use to understand user's mood patterns, "
        "recent experiences, and emotional state. Can search by keywords."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "days": {
                "type": "integer",
                "description": f"Number of days to look back (default 30, max 90)"
            },
            "keywords": {
                "type": "string",
                "description": "Optional keywords to search for in journal content"
            },
            "limit": {
                "type": "integer",
                "description": f"Maximum entries to return (default {MAX_JOURNAL_ENTRIES})"
            }
        },
        "required": ["user_id"]
    }
}

GET_APPOINTMENT_HISTORY_SCHEMA = {
    "name": "get_appointment_history",
    "description": (
        "Get user's counseling appointment history. Shows scheduled, completed, "
        "and cancelled appointments with psychologists."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "status": {
                "type": "string",
                "description": "Filter by status: all, pending, completed, cancelled (default: all)",
                "enum": ["all", "pending", "completed", "cancelled"]
            },
            "limit": {
                "type": "integer",
                "description": f"Maximum appointments to return (default {MAX_APPOINTMENTS})"
            }
        },
        "required": ["user_id"]
    }
}

GET_ACTIVE_QUESTS_SCHEMA = {
    "name": "get_active_quests",
    "description": (
        "Get user's currently active gamification quests. Shows progress, targets, "
        "and expiration dates. Use to encourage quest completion."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "limit": {
                "type": "integer",
                "description": f"Maximum quests to return (default {MAX_QUESTS})"
            }
        },
        "required": ["user_id"]
    }
}

GET_COMPLETED_QUESTS_SCHEMA = {
    "name": "get_completed_quests",
    "description": (
        "Get user's completed quests and achievements. Use to celebrate accomplishments "
        "and motivate continued engagement."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "limit": {
                "type": "integer",
                "description": f"Maximum quests to return (default {MAX_QUESTS})"
            }
        },
        "required": ["user_id"]
    }
}

GET_QUEST_PROGRESS_SCHEMA = {
    "name": "get_quest_progress",
    "description": (
        "Get detailed progress for a specific quest. Shows current progress, "
        "target, percentage complete, and time remaining."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "quest_id": {
                "type": "integer",
                "description": "The quest instance ID to check"
            }
        },
        "required": ["user_id", "quest_id"]
    }
}

GET_ACHIEVEMENT_BADGES_SCHEMA = {
    "name": "get_achievement_badges",
    "description": (
        "Get user's earned achievement badges (NFTs). Use to acknowledge accomplishments "
        "and encourage continued progress."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "limit": {
                "type": "integer",
                "description": f"Maximum badges to return (default {MAX_BADGES})"
            }
        },
        "required": ["user_id"]
    }
}

GET_ACTIVITY_STREAK_SCHEMA = {
    "name": "get_activity_streak",
    "description": (
        "Get user's daily engagement streak. Shows how many consecutive days "
        "the user has been active. Use to motivate continued engagement."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            }
        },
        "required": ["user_id"]
    }
}

GET_INTERVENTION_PLAN_PROGRESS_SCHEMA = {
    "name": "get_intervention_plan_progress",
    "description": (
        "Get progress on intervention plans (CBT modules, coping strategies). "
        "Shows step completion status and overall progress percentage."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "plan_id": {
                "type": "integer",
                "description": "Optional specific plan ID (if omitted, returns all active plans)"
            }
        },
        "required": ["user_id"]
    }
}


# Register tools with the global registry
tool_registry.register(
    "get_journal_entries",
    get_journal_entries,
    GET_JOURNAL_ENTRIES_SCHEMA,
    "progress_tracking"
)

tool_registry.register(
    "get_appointment_history",
    get_appointment_history,
    GET_APPOINTMENT_HISTORY_SCHEMA,
    "progress_tracking"
)

tool_registry.register(
    "get_active_quests",
    get_active_quests,
    GET_ACTIVE_QUESTS_SCHEMA,
    "progress_tracking"
)

tool_registry.register(
    "get_completed_quests",
    get_completed_quests,
    GET_COMPLETED_QUESTS_SCHEMA,
    "progress_tracking"
)

tool_registry.register(
    "get_quest_progress",
    get_quest_progress,
    GET_QUEST_PROGRESS_SCHEMA,
    "progress_tracking"
)

tool_registry.register(
    "get_achievement_badges",
    get_achievement_badges,
    GET_ACHIEVEMENT_BADGES_SCHEMA,
    "progress_tracking"
)

tool_registry.register(
    "get_activity_streak",
    get_activity_streak,
    GET_ACTIVITY_STREAK_SCHEMA,
    "progress_tracking"
)

tool_registry.register(
    "get_intervention_plan_progress",
    get_intervention_plan_progress,
    GET_INTERVENTION_PLAN_PROGRESS_SCHEMA,
    "progress_tracking"
)


logger.info("✅ Progress tracking tools registered (8 tools)")
