"""User context tools for agent system.

Provides tools for retrieving user profile, preferences, mental health summaries,
and consent status. Essential for all agents to understand who they're supporting.

Tools:
- get_user_profile: Basic demographics and profile info
- get_user_mental_health_summary: Mental health context (risk, diagnoses)
- get_user_preferences: Communication preferences
- get_user_consent_status: Check consent for specific operations
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Consent, ConsentScopeEnum, User, UserSummary

from . import tool_registry

logger = logging.getLogger(__name__)


async def get_user_profile(
    db: AsyncSession,
    user_id: int
) -> Dict[str, Any]:
    """Get user profile information.
    
    Returns demographics, faculty, year of study, and basic info.
    Does NOT include sensitive mental health data.
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Dict with user profile data or error
    """
    try:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return {
                "error": "User not found",
                "user_id": user_id
            }
        
        return {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "age": user.age,
            "gender": user.gender,
            "faculty": user.faculty,
            "year_of_study": user.year_of_study,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "is_active": user.is_active,
        }
    except Exception as e:
        logger.error(f"Error fetching user profile for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_user_mental_health_summary(
    db: AsyncSession,
    user_id: int
) -> Dict[str, Any]:
    """Get user's mental health summary.
    
    Includes risk level, diagnoses, current mental state.
    SENSITIVE DATA - check consent before using.
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Dict with mental health summary or error
    """
    try:
        result = await db.execute(
            select(UserSummary)
            .where(UserSummary.user_id == user_id)
            .order_by(UserSummary.created_at.desc())
            .limit(1)
        )
        summary = result.scalar_one_or_none()
        
        if not summary:
            return {
                "user_id": user_id,
                "has_summary": False,
                "message": "No mental health summary available"
            }
        
        return {
            "user_id": user_id,
            "has_summary": True,
            "summary_text": summary.summary_text,
            "key_concerns": summary.key_concerns or [],
            "created_at": summary.created_at.isoformat() if summary.created_at else None,
            "updated_at": summary.updated_at.isoformat() if summary.updated_at else None,
        }
    except Exception as e:
        logger.error(f"Error fetching mental health summary for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_user_preferences(
    db: AsyncSession,
    user_id: int
) -> Dict[str, Any]:
    """Get user's communication preferences.
    
    Returns preferred language, communication style, notification settings.
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Dict with user preferences
    """
    try:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return {
                "error": "User not found",
                "user_id": user_id
            }
        
        # Return basic preferences
        # TODO: Expand when UserPreferences model is implemented
        return {
            "user_id": user.id,
            "language": "id",  # Default to Indonesian
            "timezone": "Asia/Jakarta",  # Default for UGM
            "has_preferences": False,
            "message": "Using default preferences (preferences model not yet implemented)"
        }
    except Exception as e:
        logger.error(f"Error fetching preferences for user {user_id}: {e}")
        return {
            "error": str(e),
            "user_id": user_id
        }


async def get_user_consent_status(
    db: AsyncSession,
    user_id: int,
    scope: str
) -> Dict[str, Any]:
    """Check user's consent status for a specific operation.
    
    IMPORTANT: Always check consent before sensitive operations
    (analytics, data sharing, intervention tracking).
    
    Args:
        db: Database session
        user_id: User ID
        scope: Consent scope (e.g., "analytics", "data_sharing", "intervention_tracking")
    
    Returns:
        Dict with consent status
    """
    try:
        # Convert string to enum
        try:
            scope_enum = ConsentScopeEnum[scope.upper()]
        except KeyError:
            return {
                "error": f"Invalid consent scope: {scope}",
                "user_id": user_id,
                "valid_scopes": [s.name for s in ConsentScopeEnum]
            }
        
        result = await db.execute(
            select(Consent)
            .where(
                Consent.user_id == user_id,
                Consent.scope == scope_enum
            )
            .order_by(Consent.timestamp.desc())
            .limit(1)
        )
        consent = result.scalar_one_or_none()
        
        if not consent:
            return {
                "user_id": user_id,
                "scope": scope,
                "granted": False,
                "message": "No consent record found"
            }
        
        return {
            "user_id": user_id,
            "scope": scope,
            "granted": consent.granted,
            "timestamp": consent.timestamp.isoformat() if consent.timestamp else None,
            "withdrawn": consent.withdrawn,
            "withdrawn_at": consent.withdrawn_at.isoformat() if consent.withdrawn_at else None,
        }
    except Exception as e:
        logger.error(f"Error checking consent for user {user_id}, scope {scope}: {e}")
        return {
            "error": str(e),
            "user_id": user_id,
            "scope": scope
        }


# Tool schemas for Gemini function calling

GET_USER_PROFILE_SCHEMA = {
    "name": "get_user_profile",
    "description": (
        "Get user's profile information including demographics, faculty, year of study. "
        "Use when you need to understand who the user is for personalized support. "
        "Does NOT include sensitive mental health data."
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

GET_USER_MENTAL_HEALTH_SUMMARY_SCHEMA = {
    "name": "get_user_mental_health_summary",
    "description": (
        "Get user's mental health summary including key concerns and current state. "
        "SENSITIVE DATA - only use when necessary for safety assessment or intervention planning. "
        "Check consent before using."
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

GET_USER_PREFERENCES_SCHEMA = {
    "name": "get_user_preferences",
    "description": (
        "Get user's communication preferences including language, timezone, "
        "and notification settings. Use for personalizing communication style."
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

GET_USER_CONSENT_STATUS_SCHEMA = {
    "name": "get_user_consent_status",
    "description": (
        "Check if user has granted consent for a specific operation. "
        "IMPORTANT: Always check before analytics, data sharing, or intervention tracking. "
        "Valid scopes: analytics, data_sharing, intervention_tracking."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "The user's ID"
            },
            "scope": {
                "type": "string",
                "description": "Consent scope to check (analytics, data_sharing, intervention_tracking)",
                "enum": ["analytics", "data_sharing", "intervention_tracking"]
            }
        },
        "required": ["user_id", "scope"]
    }
}


# Register tools with the global registry
tool_registry.register(
    "get_user_profile",
    get_user_profile,
    GET_USER_PROFILE_SCHEMA,
    "user_context"
)

tool_registry.register(
    "get_user_mental_health_summary",
    get_user_mental_health_summary,
    GET_USER_MENTAL_HEALTH_SUMMARY_SCHEMA,
    "user_context"
)

tool_registry.register(
    "get_user_preferences",
    get_user_preferences,
    GET_USER_PREFERENCES_SCHEMA,
    "user_context"
)

tool_registry.register(
    "get_user_consent_status",
    get_user_consent_status,
    GET_USER_CONSENT_STATUS_SCHEMA,
    "user_context"
)


logger.info("✅ User context tools registered (4 tools)")
