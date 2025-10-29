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
from uuid import UUID

import google.generativeai as genai
from sqlalchemy import desc, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Conversation, 
    JournalEntry, 
    UserSummary,
    # Safety Agent Suite models
    TriageAssessment,
    Case,
    CaseNote,
    CaseStatusEnum,
    CaseSeverityEnum,
    InterventionPlanRecord,
    InterventionPlanStepCompletion,
    ContentResource,
    AgentUser,
    AgentRoleEnum,
    Consent,
    ConsentScopeEnum,
    User,
)

logger = logging.getLogger(__name__)

# Constants - Existing
MAX_SUMMARIES = 10
MAX_JOURNAL_ENTRIES = 10
MAX_CONVERSATION_MESSAGES = 20
MAX_JOURNAL_CONTENT_LENGTH = 300

# Constants - New tools
MAX_RISK_HISTORY = 10
MAX_ACTIVE_CASES = 5
MAX_CRISIS_RESOURCES = 5
MAX_INTERVENTION_HISTORY = 10
MAX_EXERCISES = 10
MAX_CASE_NOTES = 20
MAX_COUNSELORS = 10
MAX_SLA_PREDICTIONS = 20


def get_aika_tools() -> List[Dict[str, Any]]:
    """Return list of tools available to Aika.
    
    Returns:
        List[Dict]: Tools configured for Gemini function calling
    """
    
    get_conversation_summaries = {
        "name": "get_conversation_summaries",
        "description": (
            "Retrieve conversation summaries from previous chat sessions. "
            "Use this when the user asks about past conversations, wants to recall "
            "previous discussions, or references something they talked about before. "
            "Returns a list of conversation summaries ordered by recency."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of summaries to retrieve (defaults to 5 if not specified, max: {MAX_SUMMARIES})",
                },
            },
            "required": [],
        },
    }
    
    get_journal_entries = {
        "name": "get_journal_entries",
        "description": (
            "Search and retrieve user's journal entries. Use this when the user "
            "asks about their journals, wants to see what they wrote, or references "
            "feelings/events they might have journaled about. Can search by keywords "
            "or retrieve recent entries."
        ),
        "parameters": {
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
    }
    
    get_conversation_context = {
        "name": "get_conversation_context",
        "description": (
            "Get detailed context about a specific conversation session. "
            "Use this when you need to recall specific details from a previous "
            "conversation or understand the full context of past interactions."
        ),
        "parameters": {
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
    }
    
    # === NEW TOOLS FOR SAFETY AGENT SUITE ===
    
    # STA (Safety Triage Agent) Tools
    get_recent_risk_history = {
        "name": "get_recent_risk_history",
        "description": (
            "Retrieve recent risk assessment history for a user to detect escalating patterns. "
            "Use this to identify if a user has had multiple moderate/high risk assessments recently, "
            "which may indicate increasing distress requiring immediate attention."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of assessments to retrieve (defaults to 5, max: {MAX_RISK_HISTORY})",
                },
                "days_ago": {
                    "type": "integer",
                    "description": "Only retrieve assessments from the last N days (optional, defaults to 7)",
                },
                "severity_filter": {
                    "type": "string",
                    "description": "Filter by severity level: 'low', 'moderate', 'high', 'critical' (optional)",
                },
            },
            "required": [],
        },
    }
    
    get_user_consent_status = {
        "name": "get_user_consent_status",
        "description": (
            "Check user's consent status for various operations before escalation or data sharing. "
            "Use this before creating cases, sharing data, or enabling analytics to ensure compliance."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "description": "Consent scope to check: 'ops' (operations), 'followup' (follow-up check-ins), 'research' (analytics/research) (optional, returns all if not specified)",
                },
            },
            "required": [],
        },
    }
    
    get_active_cases_for_user = {
        "name": "get_active_cases_for_user",
        "description": (
            "Check if user has any active/open cases to prevent duplicate case creation. "
            "Use this before escalating to Service Desk to see existing case status."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "status_filter": {
                    "type": "string",
                    "description": "Filter by status: 'new', 'in_progress', 'waiting' (optional, defaults to active statuses)",
                },
            },
            "required": [],
        },
    }
    
    get_crisis_resources = {
        "name": "get_crisis_resources",
        "description": (
            "Fetch crisis hotlines and emergency resources based on severity level. "
            "Use this to provide immediate resources in crisis situations or when displaying crisis banners."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "description": "Severity level: 'high' or 'critical' to filter appropriate resources",
                },
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of resources to return (defaults to 3, max: {MAX_CRISIS_RESOURCES})",
                },
            },
            "required": ["severity"],
        },
    }
    
    # SCA (Support Coach Agent) Tools
    get_intervention_history = {
        "name": "get_intervention_history",
        "description": (
            "Retrieve past intervention plans and their completion status. "
            "Use this to avoid repeating similar interventions and to understand what has worked before."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of interventions to retrieve (defaults to 5, max: {MAX_INTERVENTION_HISTORY})",
                },
                "days_ago": {
                    "type": "integer",
                    "description": "Only retrieve interventions from the last N days (optional)",
                },
            },
            "required": [],
        },
    }
    
    get_user_preferences = {
        "name": "get_user_preferences",
        "description": (
            "Fetch user's therapeutic preferences, comfort settings, and known triggers. "
            "Use this to personalize coaching approach and avoid sensitive topics."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    }
    
    search_therapeutic_exercises = {
        "name": "search_therapeutic_exercises",
        "description": (
            "Find therapeutic exercises and coping techniques by intent, mood, or type. "
            "Use this to provide evidence-based exercises matching the user's current emotional state."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "intent": {
                    "type": "string",
                    "description": "Intent or mood: 'anxiety', 'stress', 'breathing', 'grounding', 'relaxation', etc.",
                },
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of exercises to return (defaults to 5, max: {MAX_EXERCISES})",
                },
            },
            "required": ["intent"],
        },
    }
    
    # SDA (Service Desk Agent) Tools
    get_case_assignment_recommendations = {
        "name": "get_case_assignment_recommendations",
        "description": (
            "Get counselor recommendations for case assignment based on workload and availability. "
            "Use this to intelligently assign cases to counselors with capacity."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "case_severity": {
                    "type": "string",
                    "description": "Case severity to help match expertise: 'low', 'med', 'high', 'critical'",
                },
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of recommendations (defaults to 5, max: {MAX_COUNSELORS})",
                },
            },
            "required": [],
        },
    }
    
    get_sla_breach_predictions = {
        "name": "get_sla_breach_predictions",
        "description": (
            "Identify cases at risk of SLA breach to enable proactive intervention. "
            "Use this to prioritize cases that need urgent attention before deadlines are missed."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "hours_threshold": {
                    "type": "integer",
                    "description": "Predict breaches within next N hours (defaults to 24)",
                },
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of predictions (defaults to 10, max: {MAX_SLA_PREDICTIONS})",
                },
            },
            "required": [],
        },
    }
    
    get_case_notes_summary = {
        "name": "get_case_notes_summary",
        "description": (
            "Retrieve case history and notes for context before counselor response. "
            "Use this to quickly understand case background and previous actions taken."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "case_id": {
                    "type": "string",
                    "description": "UUID of the case to retrieve notes for",
                },
                "limit": {
                    "type": "integer",
                    "description": f"Maximum number of notes (defaults to 10, max: {MAX_CASE_NOTES})",
                },
            },
            "required": ["case_id"],
        },
    }
    
    get_counselor_workload = {
        "name": "get_counselor_workload",
        "description": (
            "Check current case load per counselor for load balancing. "
            "Use this to distribute cases evenly and identify counselors with capacity."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "include_waiting": {
                    "type": "boolean",
                    "description": "Include cases in 'waiting' status (defaults to false)",
                },
            },
            "required": [],
        },
    }
    
    # Return list of function declarations
    return [
        # Existing tools
        get_conversation_summaries,
        get_journal_entries,
        get_conversation_context,
        # STA tools
        get_recent_risk_history,
        get_user_consent_status,
        get_active_cases_for_user,
        get_crisis_resources,
        # SCA tools
        get_intervention_history,
        get_user_preferences,
        search_therapeutic_exercises,
        # SDA tools
        get_case_assignment_recommendations,
        get_sla_breach_predictions,
        get_case_notes_summary,
        get_counselor_workload,
    ]


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


# ============================================================================
# NEW TOOL EXECUTION FUNCTIONS FOR SAFETY AGENT SUITE
# ============================================================================

# === STA (Safety Triage Agent) Tools ===

async def execute_get_recent_risk_history(
    db: AsyncSession,
    user_id: int,
    limit: int = 5,
    days_ago: int = 7,
    severity_filter: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve recent risk assessment history for escalation pattern detection.
    
    Args:
        db: Database session
        user_id: User ID to retrieve assessments for
        limit: Maximum number of assessments to retrieve
        days_ago: Only get assessments from last N days
        severity_filter: Optional severity filter ('low', 'moderate', 'high', 'critical')
        
    Returns:
        Dict containing success status, assessments list, and pattern indicators
    """
    try:
        limit = min(max(1, limit), MAX_RISK_HISTORY)
        
        logger.info(
            f"Tool call: get_recent_risk_history for user {user_id}, "
            f"limit={limit}, days_ago={days_ago}, severity={severity_filter}"
        )
        
        stmt = (
            select(TriageAssessment)
            .where(TriageAssessment.user_id == user_id)
        )
        
        # Filter by date range
        if days_ago > 0:
            cutoff_date = datetime.utcnow() - timedelta(days=days_ago)
            stmt = stmt.where(TriageAssessment.created_at >= cutoff_date)
        
        # Filter by severity if specified
        if severity_filter:
            stmt = stmt.where(TriageAssessment.severity_level == severity_filter.lower())
        
        stmt = stmt.order_by(desc(TriageAssessment.created_at)).limit(limit)
        
        result = await db.execute(stmt)
        assessments = result.scalars().all()
        
        if not assessments:
            return {
                "success": True,
                "assessments": [],
                "count": 0,
                "escalation_detected": False,
                "message": "No risk assessments found in the specified timeframe.",
            }
        
        assessment_list = []
        high_risk_count = 0
        
        for assessment in assessments:
            assessment_list.append({
                "id": assessment.id,
                "risk_score": assessment.risk_score,
                "severity_level": assessment.severity_level,
                "confidence_score": assessment.confidence_score,
                "recommended_action": assessment.recommended_action,
                "created_at": assessment.created_at.isoformat() if assessment.created_at else None,
                "risk_factors": assessment.risk_factors,
            })
            
            if assessment.severity_level in ["high", "critical"]:
                high_risk_count += 1
        
        # Pattern detection: Multiple high-risk assessments indicate escalation
        escalation_detected = high_risk_count >= 2
        
        logger.info(
            f"✓ Retrieved {len(assessment_list)} risk assessments for user {user_id}, "
            f"high_risk_count={high_risk_count}, escalation_detected={escalation_detected}"
        )
        
        return {
            "success": True,
            "assessments": assessment_list,
            "count": len(assessment_list),
            "high_risk_count": high_risk_count,
            "escalation_detected": escalation_detected,
            "timeframe_days": days_ago,
        }
        
    except Exception as e:
        logger.error(f"Error retrieving risk history: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "assessments": [],
            "count": 0,
            "escalation_detected": False,
        }


async def execute_get_user_consent_status(
    db: AsyncSession,
    user_id: int,
    scope: Optional[str] = None,
) -> Dict[str, Any]:
    """Check user consent status for operations, follow-ups, and research.
    
    Args:
        db: Database session
        user_id: User ID to check consent for
        scope: Optional consent scope filter ('ops', 'followup', 'research')
        
    Returns:
        Dict containing consent status for requested scopes
    """
    try:
        logger.info(f"Tool call: get_user_consent_status for user {user_id}, scope={scope}")
        
        # TODO: Check if User model has user_hash field, otherwise generate hash
        # For now, using user_id as subject_id (needs alignment with consent tracking)
        subject_id = str(user_id)
        
        stmt = (
            select(Consent)
            .where(Consent.subject_id == subject_id)
            .where(Consent.revoked_at.is_(None))  # Only active consents
        )
        
        if scope:
            try:
                scope_enum = ConsentScopeEnum(scope.lower())
                stmt = stmt.where(Consent.scope == scope_enum)
            except ValueError:
                logger.warning(f"Invalid consent scope: {scope}")
                return {
                    "success": False,
                    "error": f"Invalid scope: {scope}. Must be 'ops', 'followup', or 'research'.",
                }
        
        result = await db.execute(stmt)
        consents = result.scalars().all()
        
        # Build consent status map
        consent_status = {
            "ops": False,
            "followup": False,
            "research": False,
        }
        
        for consent in consents:
            consent_status[consent.scope.value] = True
        
        logger.info(f"✓ Consent status for user {user_id}: {consent_status}")
        
        return {
            "success": True,
            "subject_id": subject_id,
            "consents": consent_status,
            "has_any_consent": any(consent_status.values()),
        }
        
    except Exception as e:
        logger.error(f"Error checking consent status: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "consents": {"ops": False, "followup": False, "research": False},
        }


async def execute_get_active_cases_for_user(
    db: AsyncSession,
    user_id: int,
    status_filter: Optional[str] = None,
) -> Dict[str, Any]:
    """Check for active cases to prevent duplicate escalations.
    
    Args:
        db: Database session
        user_id: User ID to check cases for
        status_filter: Optional status filter ('new', 'in_progress', 'waiting')
        
    Returns:
        Dict containing active cases list
    """
    try:
        logger.info(f"Tool call: get_active_cases_for_user for user {user_id}, status={status_filter}")
        
        # TODO: Cases use user_hash, need to generate hash from user_id
        # For now, using user_id as user_hash (needs alignment with case creation logic)
        user_hash = str(user_id)
        
        stmt = (
            select(Case)
            .where(Case.user_hash == user_hash)
        )
        
        # Filter by status (default to active statuses)
        if status_filter:
            try:
                status_enum = CaseStatusEnum(status_filter.lower())
                stmt = stmt.where(Case.status == status_enum)
            except ValueError:
                logger.warning(f"Invalid case status: {status_filter}")
        else:
            # Default: only active cases (not resolved/closed)
            stmt = stmt.where(
                Case.status.in_([
                    CaseStatusEnum.new,
                    CaseStatusEnum.in_progress,
                    CaseStatusEnum.waiting,
                ])
            )
        
        stmt = stmt.order_by(desc(Case.created_at)).limit(MAX_ACTIVE_CASES)
        
        result = await db.execute(stmt)
        cases = result.scalars().all()
        
        if not cases:
            return {
                "success": True,
                "cases": [],
                "count": 0,
                "has_active_cases": False,
                "message": "No active cases found for this user.",
            }
        
        case_list = []
        for case in cases:
            case_list.append({
                "case_id": str(case.id),
                "status": case.status.value if isinstance(case.status, CaseStatusEnum) else case.status,
                "severity": case.severity.value if isinstance(case.severity, CaseSeverityEnum) else case.severity,
                "assigned_to": case.assigned_to,
                "created_at": case.created_at.isoformat() if case.created_at is not None else None,
                "sla_breach_at": case.sla_breach_at.isoformat() if case.sla_breach_at is not None else None,
            })
        
        logger.info(f"✓ Found {len(case_list)} active cases for user {user_id}")
        
        return {
            "success": True,
            "cases": case_list,
            "count": len(case_list),
            "has_active_cases": True,
        }
        
    except Exception as e:
        logger.error(f"Error retrieving active cases: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "cases": [],
            "count": 0,
            "has_active_cases": False,
        }


async def execute_get_crisis_resources(
    db: AsyncSession,
    user_id: int,  # For consistency with other tools
    severity: str,
    limit: int = 3,
) -> Dict[str, Any]:
    """Fetch crisis hotlines and emergency resources by severity.
    
    Args:
        db: Database session
        user_id: User ID (for logging/tracking)
        severity: Severity level ('high' or 'critical')
        limit: Maximum number of resources to return
        
    Returns:
        Dict containing crisis resources list
    """
    try:
        limit = min(max(1, limit), MAX_CRISIS_RESOURCES)
        
        logger.info(
            f"Tool call: get_crisis_resources for user {user_id}, "
            f"severity={severity}, limit={limit}"
        )
        
        # TODO: Need to add classification/severity field to ContentResource model
        # For now, search by tags containing 'crisis', 'hotline', 'emergency'
        
        stmt = select(ContentResource)
        
        # Filter by type and tags for crisis resources
        if severity.lower() in ["high", "critical"]:
            # Search for crisis-related resources
            stmt = stmt.where(
                or_(
                    ContentResource.type == "hotline",
                    ContentResource.tags.contains(["crisis"]),
                    ContentResource.tags.contains(["emergency"]),
                    ContentResource.tags.contains(["hotline"]),
                )
            )
        
        stmt = stmt.limit(limit)
        
        result = await db.execute(stmt)
        resources = result.scalars().all()
        
        if not resources:
            # Return hardcoded emergency resources as fallback
            fallback_resources = [
                {
                    "title": "UGM Crisis Line",
                    "description": "24/7 crisis support for UGM students",
                    "contact": "+62 812-2877-3800",
                    "type": "hotline",
                },
                {
                    "title": "Kemenkes SEJIWA",
                    "description": "National mental health counseling service",
                    "contact": "119 ext. 8",
                    "type": "hotline",
                },
                {
                    "title": "Emergency Services",
                    "description": "General emergency hotline",
                    "contact": "112",
                    "type": "emergency",
                },
            ]
            
            logger.warning(
                f"No crisis resources found in database for severity={severity}, "
                f"returning hardcoded fallback resources"
            )
            
            return {
                "success": True,
                "resources": fallback_resources[:limit],
                "count": min(len(fallback_resources), limit),
                "source": "fallback",
            }
        
        resource_list = []
        for resource in resources:
            resource_list.append({
                "id": resource.id,
                "title": resource.title,
                "description": resource.description,
                "content": resource.content[:200] if resource.content else None,  # Truncate
                "source": resource.source,
                "type": resource.type,
                "tags": resource.tags,
            })
        
        logger.info(f"✓ Retrieved {len(resource_list)} crisis resources for user {user_id}")
        
        return {
            "success": True,
            "resources": resource_list,
            "count": len(resource_list),
            "source": "database",
        }
        
    except Exception as e:
        logger.error(f"Error retrieving crisis resources: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "resources": [],
            "count": 0,
        }


# === SCA (Support Coach Agent) Tools ===

async def execute_get_intervention_history(
    db: AsyncSession,
    user_id: int,
    limit: int = 5,
    days_ago: Optional[int] = None,
) -> Dict[str, Any]:
    """Retrieve past intervention plans and completion status.
    
    Args:
        db: Database session
        user_id: User ID to retrieve interventions for
        limit: Maximum number of interventions to retrieve
        days_ago: Only get interventions from last N days
        
    Returns:
        Dict containing intervention history with completion stats
    """
    try:
        limit = min(max(1, limit), MAX_INTERVENTION_HISTORY)
        
        logger.info(
            f"Tool call: get_intervention_history for user {user_id}, "
            f"limit={limit}, days_ago={days_ago}"
        )
        
        stmt = (
            select(InterventionPlanRecord)
            .where(InterventionPlanRecord.user_id == user_id)
        )
        
        # Filter by date if specified
        if days_ago and days_ago > 0:
            cutoff_date = datetime.utcnow() - timedelta(days=days_ago)
            stmt = stmt.where(InterventionPlanRecord.created_at >= cutoff_date)
        
        stmt = stmt.order_by(desc(InterventionPlanRecord.created_at)).limit(limit)
        
        result = await db.execute(stmt)
        interventions = result.scalars().all()
        
        if not interventions:
            return {
                "success": True,
                "interventions": [],
                "count": 0,
                "message": "No intervention history found for this user.",
            }
        
        intervention_list = []
        for intervention in interventions:
            # Calculate completion stats
            plan_data = intervention.plan_data or {}
            plan_steps = plan_data.get("plan_steps", [])
            total_steps = len(plan_steps)
            completed_steps = sum(1 for step in plan_steps if step.get("completed", False))
            completion_rate = (completed_steps / total_steps * 100) if total_steps > 0 else 0
            
            intervention_list.append({
                "id": intervention.id,
                "plan_title": intervention.plan_title,
                "risk_level": intervention.risk_level,
                "total_steps": total_steps,
                "completed_steps": completed_steps,
                "completion_rate": round(completion_rate, 1),
                "created_at": intervention.created_at.isoformat() if intervention.created_at else None,
                "session_id": intervention.session_id,
            })
        
        logger.info(f"✓ Retrieved {len(intervention_list)} interventions for user {user_id}")
        
        return {
            "success": True,
            "interventions": intervention_list,
            "count": len(intervention_list),
        }
        
    except Exception as e:
        logger.error(f"Error retrieving intervention history: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "interventions": [],
            "count": 0,
        }


async def execute_get_user_preferences(
    db: AsyncSession,
    user_id: int,
) -> Dict[str, Any]:
    """Fetch user therapeutic preferences and comfort settings.
    
    Args:
        db: Database session
        user_id: User ID to retrieve preferences for
        
    Returns:
        Dict containing user preferences
    """
    try:
        logger.info(f"Tool call: get_user_preferences for user {user_id}")
        
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return {
                "success": False,
                "error": "User not found",
                "preferences": {},
            }
        
        # TODO: Check if User model has dedicated preferences fields
        # For now, return basic profile info that affects personalization
        preferences = {
            "name": user.name or user.first_name,
            "university": user.university,
            "major": user.major,
            "year_of_study": user.year_of_study,
            "allow_email_checkins": user.allow_email_checkins,
            # TODO: Add these fields to User model if not present:
            # "preferred_language": user.preferred_language,
            # "communication_style": user.communication_style,
            # "sensitive_topics": user.sensitive_topics,
            # "preferred_exercises": user.preferred_exercises,
        }
        
        logger.info(f"✓ Retrieved preferences for user {user_id}")
        
        return {
            "success": True,
            "preferences": preferences,
            "user_id": user_id,
        }
        
    except Exception as e:
        logger.error(f"Error retrieving user preferences: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "preferences": {},
        }


async def execute_search_therapeutic_exercises(
    db: AsyncSession,
    user_id: int,  # For logging/tracking
    intent: str,
    limit: int = 5,
) -> Dict[str, Any]:
    """Search for therapeutic exercises by intent or mood.
    
    Args:
        db: Database session
        user_id: User ID (for logging/tracking)
        intent: Intent or mood ('anxiety', 'stress', 'breathing', 'grounding', etc.)
        limit: Maximum number of exercises to return
        
    Returns:
        Dict containing matching exercises
    """
    try:
        limit = min(max(1, limit), MAX_EXERCISES)
        
        logger.info(
            f"Tool call: search_therapeutic_exercises for user {user_id}, "
            f"intent={intent}, limit={limit}"
        )
        
        # Search ContentResource for exercises matching intent
        intent_lower = intent.lower()
        
        stmt = (
            select(ContentResource)
            .where(
                or_(
                    ContentResource.type == "exercise",
                    ContentResource.type == "technique",
                    ContentResource.tags.contains([intent_lower]),
                    ContentResource.title.ilike(f"%{intent_lower}%"),
                    ContentResource.description.ilike(f"%{intent_lower}%"),
                )
            )
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        exercises = result.scalars().all()
        
        if not exercises:
            return {
                "success": True,
                "exercises": [],
                "count": 0,
                "message": f"No exercises found matching intent: {intent}",
            }
        
        exercise_list = []
        for exercise in exercises:
            exercise_list.append({
                "id": exercise.id,
                "title": exercise.title,
                "description": exercise.description,
                "type": exercise.type,
                "content": exercise.content[:500] if exercise.content else None,  # Truncate
                "tags": exercise.tags,
            })
        
        logger.info(
            f"✓ Retrieved {len(exercise_list)} exercises for intent '{intent}' "
            f"(user {user_id})"
        )
        
        return {
            "success": True,
            "exercises": exercise_list,
            "count": len(exercise_list),
            "intent": intent,
        }
        
    except Exception as e:
        logger.error(f"Error searching therapeutic exercises: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "exercises": [],
            "count": 0,
        }


# === SDA (Service Desk Agent) Tools ===

async def execute_get_case_assignment_recommendations(
    db: AsyncSession,
    user_id: int,  # For logging/tracking
    case_severity: Optional[str] = None,
    limit: int = 5,
) -> Dict[str, Any]:
    """Get counselor recommendations for case assignment.
    
    Args:
        db: Database session
        user_id: User ID (for logging/tracking)
        case_severity: Case severity to help match expertise
        limit: Maximum number of recommendations
        
    Returns:
        Dict containing counselor recommendations ranked by workload
    """
    try:
        limit = min(max(1, limit), MAX_COUNSELORS)
        
        logger.info(
            f"Tool call: get_case_assignment_recommendations for severity={case_severity}, "
            f"limit={limit}"
        )
        
        # Get all counselors
        counselors_stmt = (
            select(AgentUser)
            .where(AgentUser.role == AgentRoleEnum.counselor)
        )
        
        result = await db.execute(counselors_stmt)
        counselors = result.scalars().all()
        
        if not counselors:
            return {
                "success": True,
                "recommendations": [],
                "count": 0,
                "message": "No counselors available for assignment.",
            }
        
        # Get workload for each counselor
        recommendations = []
        for counselor in counselors:
            # Count active cases assigned to this counselor
            workload_stmt = (
                select(func.count(Case.id))
                .where(Case.assigned_to == counselor.id)
                .where(
                    Case.status.in_([
                        CaseStatusEnum.new,
                        CaseStatusEnum.in_progress,
                        CaseStatusEnum.waiting,
                    ])
                )
            )
            
            workload_result = await db.execute(workload_stmt)
            active_cases = workload_result.scalar() or 0
            
            # Calculate availability score (inverse of workload)
            # Lower workload = higher score
            availability_score = 100 - min(active_cases * 10, 90)  # Cap at 10 cases
            
            recommendations.append({
                "counselor_id": counselor.id,
                "active_cases": active_cases,
                "availability_score": availability_score,
                "role": counselor.role.value,
            })
        
        # Sort by availability score (highest first)
        recommendations.sort(key=lambda x: x["availability_score"], reverse=True)
        recommendations = recommendations[:limit]
        
        logger.info(
            f"✓ Generated {len(recommendations)} counselor recommendations "
            f"for severity={case_severity}"
        )
        
        return {
            "success": True,
            "recommendations": recommendations,
            "count": len(recommendations),
            "case_severity": case_severity,
        }
        
    except Exception as e:
        logger.error(f"Error getting assignment recommendations: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "recommendations": [],
            "count": 0,
        }


async def execute_get_sla_breach_predictions(
    db: AsyncSession,
    user_id: int,  # For logging/tracking
    hours_threshold: int = 24,
    limit: int = 10,
) -> Dict[str, Any]:
    """Identify cases at risk of SLA breach.
    
    Args:
        db: Database session
        user_id: User ID (for logging/tracking)
        hours_threshold: Predict breaches within next N hours
        limit: Maximum number of predictions
        
    Returns:
        Dict containing at-risk cases
    """
    try:
        limit = min(max(1, limit), MAX_SLA_PREDICTIONS)
        
        logger.info(
            f"Tool call: get_sla_breach_predictions, hours_threshold={hours_threshold}, "
            f"limit={limit}"
        )
        
        # Calculate threshold timestamp
        threshold_time = datetime.utcnow() + timedelta(hours=hours_threshold)
        
        stmt = (
            select(Case)
            .where(Case.sla_breach_at.isnot(None))
            .where(Case.sla_breach_at <= threshold_time)
            .where(
                Case.status.in_([
                    CaseStatusEnum.new,
                    CaseStatusEnum.in_progress,
                    CaseStatusEnum.waiting,
                ])
            )
            .order_by(Case.sla_breach_at.asc())  # Most urgent first
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        at_risk_cases = result.scalars().all()
        
        if not at_risk_cases:
            return {
                "success": True,
                "at_risk_cases": [],
                "count": 0,
                "message": f"No SLA breaches predicted within {hours_threshold} hours.",
            }
        
        case_list = []
        for case in at_risk_cases:
            # Calculate hours until breach
            if case.sla_breach_at is not None:
                hours_until_breach = (case.sla_breach_at - datetime.utcnow()).total_seconds() / 3600
            else:
                hours_until_breach = None
            
            case_list.append({
                "case_id": str(case.id),
                "status": case.status.value if isinstance(case.status, CaseStatusEnum) else case.status,
                "severity": case.severity.value if isinstance(case.severity, CaseSeverityEnum) else case.severity,
                "assigned_to": case.assigned_to,
                "sla_breach_at": case.sla_breach_at.isoformat() if case.sla_breach_at is not None else None,
                "hours_until_breach": round(hours_until_breach, 1) if hours_until_breach is not None else None,
                "created_at": case.created_at.isoformat() if case.created_at is not None else None,
            })
        
        logger.info(
            f"✓ Found {len(case_list)} cases at risk of SLA breach within "
            f"{hours_threshold} hours"
        )
        
        return {
            "success": True,
            "at_risk_cases": case_list,
            "count": len(case_list),
            "hours_threshold": hours_threshold,
        }
        
    except Exception as e:
        logger.error(f"Error predicting SLA breaches: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "at_risk_cases": [],
            "count": 0,
        }


async def execute_get_case_notes_summary(
    db: AsyncSession,
    user_id: int,  # For logging/tracking
    case_id: str,
    limit: int = 10,
) -> Dict[str, Any]:
    """Retrieve case notes summary for context.
    
    Args:
        db: Database session
        user_id: User ID (for logging/tracking)
        case_id: UUID of the case
        limit: Maximum number of notes to retrieve
        
    Returns:
        Dict containing case notes summary
    """
    try:
        limit = min(max(1, limit), MAX_CASE_NOTES)
        
        logger.info(
            f"Tool call: get_case_notes_summary for case_id={case_id}, limit={limit}"
        )
        
        # Validate and parse UUID
        try:
            case_uuid = UUID(case_id)
        except ValueError:
            return {
                "success": False,
                "error": f"Invalid case_id format: {case_id}",
                "notes": [],
            }
        
        # Get case info
        case_stmt = select(Case).where(Case.id == case_uuid)
        case_result = await db.execute(case_stmt)
        case = case_result.scalar_one_or_none()
        
        if not case:
            return {
                "success": False,
                "error": f"Case not found: {case_id}",
                "notes": [],
            }
        
        # Get case notes
        notes_stmt = (
            select(CaseNote)
            .where(CaseNote.case_id == case_uuid)
            .order_by(desc(CaseNote.created_at))
            .limit(limit)
        )
        
        notes_result = await db.execute(notes_stmt)
        notes = notes_result.scalars().all()
        
        note_list = []
        for note in reversed(list(notes)):  # Chronological order
            note_list.append({
                "id": note.id,
                "note": note.note,
                "author_id": note.author_id,
                "created_at": note.created_at.isoformat() if note.created_at else None,
            })
        
        logger.info(
            f"✓ Retrieved {len(note_list)} notes for case {case_id}"
        )
        
        return {
            "success": True,
            "case_id": case_id,
            "case_status": case.status.value if isinstance(case.status, CaseStatusEnum) else case.status,
            "case_severity": case.severity.value if isinstance(case.severity, CaseSeverityEnum) else case.severity,
            "notes": note_list,
            "count": len(note_list),
        }
        
    except Exception as e:
        logger.error(f"Error retrieving case notes: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "notes": [],
            "count": 0,
        }


async def execute_get_counselor_workload(
    db: AsyncSession,
    user_id: int,  # For logging/tracking
    include_waiting: bool = False,
) -> Dict[str, Any]:
    """Check current case load per counselor for load balancing.
    
    Args:
        db: Database session
        user_id: User ID (for logging/tracking)
        include_waiting: Include cases in 'waiting' status
        
    Returns:
        Dict containing workload stats per counselor
    """
    try:
        logger.info(
            f"Tool call: get_counselor_workload, include_waiting={include_waiting}"
        )
        
        # Get all counselors
        counselors_stmt = (
            select(AgentUser)
            .where(AgentUser.role == AgentRoleEnum.counselor)
        )
        
        result = await db.execute(counselors_stmt)
        counselors = result.scalars().all()
        
        if not counselors:
            return {
                "success": True,
                "workload": [],
                "count": 0,
                "message": "No counselors found.",
            }
        
        workload_list = []
        for counselor in counselors:
            # Count active cases
            status_filter = [CaseStatusEnum.new, CaseStatusEnum.in_progress]
            if include_waiting:
                status_filter.append(CaseStatusEnum.waiting)
            
            active_stmt = (
                select(func.count(Case.id))
                .where(Case.assigned_to == counselor.id)
                .where(Case.status.in_(status_filter))
            )
            
            active_result = await db.execute(active_stmt)
            active_cases = active_result.scalar() or 0
            
            # Count by severity
            high_stmt = (
                select(func.count(Case.id))
                .where(Case.assigned_to == counselor.id)
                .where(Case.status.in_(status_filter))
                .where(Case.severity.in_([CaseSeverityEnum.high, CaseSeverityEnum.critical]))
            )
            
            high_result = await db.execute(high_stmt)
            high_priority_cases = high_result.scalar() or 0
            
            workload_list.append({
                "counselor_id": counselor.id,
                "role": counselor.role.value,
                "active_cases": active_cases,
                "high_priority_cases": high_priority_cases,
                "capacity_status": "available" if active_cases < 5 else "busy" if active_cases < 10 else "overloaded",
            })
        
        # Sort by workload (lowest first for easy assignment)
        workload_list.sort(key=lambda x: x["active_cases"])
        
        logger.info(f"✓ Retrieved workload for {len(workload_list)} counselors")
        
        return {
            "success": True,
            "workload": workload_list,
            "count": len(workload_list),
            "include_waiting": include_waiting,
        }
        
    except Exception as e:
        logger.error(f"Error retrieving counselor workload: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "workload": [],
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
        
        # === STA (Safety Triage Agent) Tools ===
        elif tool_name == "get_recent_risk_history":
            return await execute_get_recent_risk_history(
                db=db,
                user_id=user_id,
                limit=tool_args.get("limit", 5),
                days_ago=tool_args.get("days_ago", 7),
                severity_filter=tool_args.get("severity_filter"),
            )
        
        elif tool_name == "get_user_consent_status":
            return await execute_get_user_consent_status(
                db=db,
                user_id=user_id,
                scope=tool_args.get("scope"),
            )
        
        elif tool_name == "get_active_cases_for_user":
            return await execute_get_active_cases_for_user(
                db=db,
                user_id=user_id,
                status_filter=tool_args.get("status_filter"),
            )
        
        elif tool_name == "get_crisis_resources":
            severity = tool_args.get("severity")
            if not severity:
                return {
                    "success": False,
                    "error": "Missing required parameter: severity",
                }
            return await execute_get_crisis_resources(
                db=db,
                user_id=user_id,
                severity=str(severity),
                limit=tool_args.get("limit", 3),
            )
        
        # === SCA (Support Coach Agent) Tools ===
        elif tool_name == "get_intervention_history":
            return await execute_get_intervention_history(
                db=db,
                user_id=user_id,
                limit=tool_args.get("limit", 5),
                days_ago=tool_args.get("days_ago"),
            )
        
        elif tool_name == "get_user_preferences":
            return await execute_get_user_preferences(
                db=db,
                user_id=user_id,
            )
        
        elif tool_name == "search_therapeutic_exercises":
            intent = tool_args.get("intent")
            if not intent:
                return {
                    "success": False,
                    "error": "Missing required parameter: intent",
                }
            return await execute_search_therapeutic_exercises(
                db=db,
                user_id=user_id,
                intent=str(intent),
                limit=tool_args.get("limit", 5),
            )
        
        # === SDA (Service Desk Agent) Tools ===
        elif tool_name == "get_case_assignment_recommendations":
            return await execute_get_case_assignment_recommendations(
                db=db,
                user_id=user_id,
                case_severity=tool_args.get("case_severity"),
                limit=tool_args.get("limit", 5),
            )
        
        elif tool_name == "get_sla_breach_predictions":
            return await execute_get_sla_breach_predictions(
                db=db,
                user_id=user_id,
                hours_threshold=tool_args.get("hours_threshold", 24),
                limit=tool_args.get("limit", 10),
            )
        
        elif tool_name == "get_case_notes_summary":
            case_id = tool_args.get("case_id")
            if not case_id:
                return {
                    "success": False,
                    "error": "Missing required parameter: case_id",
                }
            return await execute_get_case_notes_summary(
                db=db,
                user_id=user_id,
                case_id=str(case_id),
                limit=tool_args.get("limit", 10),
            )
        
        elif tool_name == "get_counselor_workload":
            return await execute_get_counselor_workload(
                db=db,
                user_id=user_id,
                include_waiting=tool_args.get("include_waiting", False),
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
