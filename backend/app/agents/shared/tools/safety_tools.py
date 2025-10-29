"""
Safety Tools - Risk Assessment and Crisis Management

This module provides tools for monitoring user safety, tracking risk levels,
and accessing crisis intervention resources. Used primarily by STA and SCA agents.

Tools:
- get_risk_assessment_history: Get user's past risk assessments from STA
- get_active_safety_cases: Get open crisis cases for user
- get_crisis_resources: Get emergency hotlines and resources
- check_risk_level: Get current risk status
- get_escalation_protocol: Get action steps for risk level

Privacy: All risk data is HIGHLY SENSITIVE and requires consent.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    TriageAssessment,
    Case,
    CaseStatusEnum,
    CaseSeverityEnum,
    ContentResource,
    User
)
from app.agents.shared.tools import tool_registry

import logging

logger = logging.getLogger(__name__)

# Constants
MAX_ASSESSMENTS = 10
MAX_CASES = 5
MAX_RESOURCES = 10


async def get_risk_assessment_history(
    db: AsyncSession,
    user_id: str,
    limit: int = MAX_ASSESSMENTS
) -> Dict[str, Any]:
    """
    Get user's risk assessment history from Safety Triage Agent.
    
    Returns recent risk classifications, concerns detected, and timestamps.
    SENSITIVE DATA - requires consent check.
    
    Args:
        user_id: User ID
        limit: Max number of assessments (default 10)
        
    Returns:
        Dict with assessments list or error
    """
    try:
        if limit > MAX_ASSESSMENTS:
            limit = MAX_ASSESSMENTS
            
        # Query recent assessments
        query = (
            select(TriageAssessment)
            .where(TriageAssessment.user_id == user_id)
            .order_by(desc(TriageAssessment.created_at))
            .limit(limit)
        )
        
        result = await db.execute(query)
        assessments = result.scalars().all()
        
        assessment_list = []
        for assessment in assessments:
            assessment_list.append({
                "assessment_id": str(assessment.id),
                "conversation_id": str(assessment.conversation_id),
                "risk_level": assessment.risk_level,
                "concerns": assessment.concerns or [],
                "needs_intervention": assessment.needs_intervention,
                "recommended_actions": assessment.recommended_actions or [],
                "created_at": assessment.created_at.isoformat(),
            })
            
        logger.info(f"✅ Retrieved {len(assessment_list)} risk assessments for user {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "total_assessments": len(assessment_list),
            "assessments": assessment_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting risk assessment history for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id
        }


async def get_active_safety_cases(
    db: AsyncSession,
    user_id: str,
    limit: int = MAX_CASES
) -> Dict[str, Any]:
    """
    Get user's active crisis cases managed by Service Desk Agent.
    
    Returns open cases requiring follow-up or intervention.
    HIGHLY SENSITIVE - safety-critical data.
    
    Args:
        user_id: User ID
        limit: Max number of cases (default 5)
        
    Returns:
        Dict with cases list or error
    """
    try:
        if limit > MAX_CASES:
            limit = MAX_CASES
            
        # Query open cases (use string literals instead of enum)
        query = (
            select(Case)
            .where(
                and_(
                    Case.user_id == user_id,
                    Case.status.in_(["open", "in_progress"])
                )
            )
            .order_by(desc(Case.created_at))
            .limit(limit)
        )
        
        result = await db.execute(query)
        cases = result.scalars().all()
        
        case_list = []
        for case in cases:
            # Safe datetime checks
            updated_at_str = None
            if case.updated_at is not None:
                updated_at_str = case.updated_at.isoformat()
                
            case_list.append({
                "case_id": str(case.id),
                "assessment_id": str(case.assessment_id) if case.assessment_id else None,
                "severity": case.severity,
                "status": case.status,
                "description": case.description,
                "assigned_to": str(case.assigned_to) if case.assigned_to else None,
                "priority": case.priority,
                "created_at": case.created_at.isoformat(),
                "updated_at": updated_at_str,
            })
            
        logger.info(f"✅ Retrieved {len(case_list)} active safety cases for user {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "total_cases": len(case_list),
            "cases": case_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting active safety cases for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id
        }


async def get_crisis_resources(
    db: AsyncSession,
    location: str = "Indonesia",
    limit: int = MAX_RESOURCES
) -> Dict[str, Any]:
    """
    Get emergency mental health resources (hotlines, clinics).
    
    Returns crisis hotlines and professional resources for immediate help.
    This is PUBLIC DATA for safety.
    
    Args:
        location: Geographic location (default "Indonesia")
        limit: Max number of resources (default 10)
        
    Returns:
        Dict with resources list or error
    """
    try:
        if limit > MAX_RESOURCES:
            limit = MAX_RESOURCES
            
        # Query crisis resources filtered by location
        # Note: Using string literal since ResourceTypeEnum not available
        query = (
            select(ContentResource)
            .where(
                and_(
                    ContentResource.resource_type == "crisis_hotline",  # Use string instead of enum
                    ContentResource.metadata.contains({"location": location})
                )
            )
            .limit(limit)
        )
        
        result = await db.execute(query)
        resources = result.scalars().all()
        
        resource_list = []
        for resource in resources:
            resource_list.append({
                "resource_id": str(resource.id),
                "title": resource.title,
                "description": resource.description,
                "content": resource.content,  # Hotline numbers, clinic addresses
                "url": resource.url,
                "resource_type": resource.resource_type,
                "metadata": resource.metadata,
            })
            
        logger.info(f"✅ Retrieved {len(resource_list)} crisis resources for {location}")
        
        return {
            "success": True,
            "location": location,
            "total_resources": len(resource_list),
            "resources": resource_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting crisis resources for {location}: {e}")
        return {
            "success": False,
            "error": str(e),
            "location": location
        }


async def check_risk_level(
    db: AsyncSession,
    user_id: str
) -> Dict[str, Any]:
    """
    Get user's current risk level from most recent assessment.
    
    Returns latest risk classification and whether intervention is needed.
    SENSITIVE DATA - safety monitoring.
    
    Args:
        user_id: User ID
        
    Returns:
        Dict with current risk level or error
    """
    try:
        # Get most recent assessment
        query = (
            select(TriageAssessment)
            .where(TriageAssessment.user_id == user_id)
            .order_by(desc(TriageAssessment.created_at))
            .limit(1)
        )
        
        result = await db.execute(query)
        latest_assessment = result.scalar_one_or_none()
        
        if not latest_assessment:
            logger.info(f"ℹ️ No risk assessments found for user {user_id}")
            return {
                "success": True,
                "user_id": user_id,
                "has_assessment": False,
                "risk_level": None,
                "message": "No risk assessments available"
            }
        
        # Check how recent the assessment is
        age_hours = (datetime.utcnow() - latest_assessment.created_at).total_seconds() / 3600
        is_recent = age_hours < 24  # Consider recent if within 24 hours
        
        logger.info(f"✅ Current risk level for user {user_id}: {latest_assessment.risk_level}")
        
        return {
            "success": True,
            "user_id": user_id,
            "has_assessment": True,
            "risk_level": latest_assessment.risk_level,
            "concerns": latest_assessment.concerns or [],
            "needs_intervention": latest_assessment.needs_intervention,
            "recommended_actions": latest_assessment.recommended_actions or [],
            "assessment_age_hours": round(age_hours, 1),
            "is_recent": is_recent,
            "assessed_at": latest_assessment.created_at.isoformat(),
        }
        
    except Exception as e:
        logger.error(f"❌ Error checking risk level for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id
        }


async def get_escalation_protocol(
    db: AsyncSession,
    risk_level: str
) -> Dict[str, Any]:
    """
    Get recommended actions for a given risk level.
    
    Returns escalation steps, timelines, and who should be involved.
    This is PROTOCOL DATA for safety decision-making.
    
    Args:
        risk_level: Risk level (LOW, MODERATE, HIGH, CRITICAL)
        
    Returns:
        Dict with protocol steps or error
    """
    try:
        # Define escalation protocols (could be from database in future)
        protocols = {
            "LOW": {
                "risk_level": "LOW",
                "description": "User shows no significant risk indicators",
                "actions": [
                    "Continue normal supportive conversation",
                    "Monitor for changes in mood or behavior",
                    "Encourage healthy coping strategies"
                ],
                "response_time": "No immediate action required",
                "escalate_to": None,
                "resources_needed": ["General mental health tips", "Self-care guides"]
            },
            "MODERATE": {
                "risk_level": "MODERATE",
                "description": "User shows some concerning patterns",
                "actions": [
                    "Provide targeted coping strategies",
                    "Suggest professional consultation",
                    "Check in more frequently",
                    "Monitor for escalation to HIGH risk"
                ],
                "response_time": "Within 24 hours",
                "escalate_to": "Support Coach Agent (SCA)",
                "resources_needed": ["CBT exercises", "Professional referral list"]
            },
            "HIGH": {
                "risk_level": "HIGH",
                "description": "User shows significant risk indicators",
                "actions": [
                    "Immediately create safety case (SDA)",
                    "Provide crisis resources",
                    "Strongly recommend professional help",
                    "Notify counselor if consent given",
                    "Daily check-ins required"
                ],
                "response_time": "Within 2 hours",
                "escalate_to": "Service Desk Agent (SDA)",
                "resources_needed": ["Crisis hotlines", "Emergency contacts", "Counseling services"]
            },
            "CRITICAL": {
                "risk_level": "CRITICAL",
                "description": "User shows immediate danger signs",
                "actions": [
                    "IMMEDIATE escalation to human counselor",
                    "Create urgent safety case (SDA)",
                    "Provide emergency hotline numbers",
                    "Consider emergency contact notification",
                    "Continuous monitoring required"
                ],
                "response_time": "IMMEDIATE (within 30 minutes)",
                "escalate_to": "Emergency Response Team",
                "resources_needed": [
                    "Emergency hotlines (119, suicide prevention)",
                    "Campus security contact",
                    "Hospital emergency numbers"
                ]
            }
        }
        
        protocol = protocols.get(risk_level.upper())
        
        if not protocol:
            logger.warning(f"⚠️ Unknown risk level requested: {risk_level}")
            return {
                "success": False,
                "error": f"Unknown risk level: {risk_level}",
                "valid_levels": list(protocols.keys())
            }
        
        logger.info(f"✅ Retrieved escalation protocol for risk level: {risk_level}")
        
        return {
            "success": True,
            "protocol": protocol
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting escalation protocol for {risk_level}: {e}")
        return {
            "success": False,
            "error": str(e),
            "risk_level": risk_level
        }


# ============================================================================
# GEMINI FUNCTION CALLING SCHEMAS
# ============================================================================

get_risk_assessment_history_schema = {
    "name": "get_risk_assessment_history",
    "description": "Get user's risk assessment history from Safety Triage Agent. Returns recent risk classifications and concerns. SENSITIVE DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID to get risk history for"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of assessments to return (default 10, max 10)",
                "default": 10
            }
        },
        "required": ["user_id"]
    }
}

get_active_safety_cases_schema = {
    "name": "get_active_safety_cases",
    "description": "Get user's active crisis cases managed by Service Desk Agent. Returns open cases requiring follow-up. HIGHLY SENSITIVE.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID to get active cases for"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of cases to return (default 5, max 5)",
                "default": 5
            }
        },
        "required": ["user_id"]
    }
}

get_crisis_resources_schema = {
    "name": "get_crisis_resources",
    "description": "Get emergency mental health resources like hotlines and clinics. Returns PUBLIC safety resources for immediate help.",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "Geographic location for resources (default 'Indonesia')",
                "default": "Indonesia"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of resources to return (default 10, max 10)",
                "default": 10
            }
        },
        "required": []
    }
}

check_risk_level_schema = {
    "name": "check_risk_level",
    "description": "Get user's current risk level from most recent assessment. Returns latest risk classification. SENSITIVE DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID to check risk level for"
            }
        },
        "required": ["user_id"]
    }
}

get_escalation_protocol_schema = {
    "name": "get_escalation_protocol",
    "description": "Get recommended actions for a given risk level. Returns escalation steps and timelines. PROTOCOL DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "risk_level": {
                "type": "string",
                "description": "Risk level to get protocol for (LOW, MODERATE, HIGH, CRITICAL)",
                "enum": ["LOW", "MODERATE", "HIGH", "CRITICAL"]
            }
        },
        "required": ["risk_level"]
    }
}


# ============================================================================
# REGISTER TOOLS WITH CENTRAL REGISTRY
# ============================================================================

tool_registry.register(
    name="get_risk_assessment_history",
    func=get_risk_assessment_history,
    schema=get_risk_assessment_history_schema,
    category="safety"
)

tool_registry.register(
    name="get_active_safety_cases",
    func=get_active_safety_cases,
    schema=get_active_safety_cases_schema,
    category="safety"
)

tool_registry.register(
    name="get_crisis_resources",
    func=get_crisis_resources,
    schema=get_crisis_resources_schema,
    category="safety"
)

tool_registry.register(
    name="check_risk_level",
    func=check_risk_level,
    schema=check_risk_level_schema,
    category="safety"
)

tool_registry.register(
    name="get_escalation_protocol",
    func=get_escalation_protocol,
    schema=get_escalation_protocol_schema,
    category="safety"
)

logger.info("🔧 Registered 5 safety tools in 'safety' category")
