"""
Case Management Tools - Clinical Case Coordination

This module provides tools for managing clinical cases, counselor coordination,
and case notes. Used primarily by SDA agent.

Tools:
- get_case_details: Get details of a specific case
- get_user_cases: Get all cases for a user

Privacy: Case data is HIGHLY SENSITIVE - clinical information.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import (
    Case,
    CaseStatusEnum,
    CaseSeverityEnum
)
from app.agents.shared.tools.registry import register_tool

import logging

logger = logging.getLogger(__name__)

MAX_CASES = 20


@register_tool(
    name="get_case_details",
    description="Get details of a specific clinical case including severity, status, and timeline. HIGHLY SENSITIVE.",
    parameters={
        "type": "object",
        "properties": {
            "case_id": {
                "type": "string",
                "description": "Case ID"
            }
        },
        "required": ["case_id"]
    },
    category="case_management",
    requires_db=True,
    requires_user_id=False
)
async def get_case_details(
    db: AsyncSession,
    case_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Get details of a specific case.
    
    Returns case information, status, severity, and timeline.
    HIGHLY SENSITIVE - clinical case data.
    """
    try:
        # Get case
        query = select(Case).where(Case.id == case_id)
        result = await db.execute(query)
        case = result.scalar_one_or_none()
        
        if not case:
            logger.warning(f"⚠️ Case {case_id} not found")
            return {
                "success": False,
                "error": f"Case {case_id} not found",
                "case_id": case_id
            }
        
        logger.info(f"✅ Retrieved case details for {case_id}")
        
        return {
            "success": True,
            "case_id": case_id,
            "user_id": str(case.user_id),
            "assessment_id": str(case.assessment_id) if case.assessment_id else None,
            "severity": case.severity,
            "status": case.status,
            "description": case.description,
            "assigned_to": str(case.assigned_to) if case.assigned_to else None,
            "priority": case.priority,
            "resolution": case.resolution,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat() if hasattr(case.updated_at, 'isoformat') else None,
            "resolved_at": case.resolved_at.isoformat() if hasattr(case.resolved_at, 'isoformat') else None
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting case details for {case_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "case_id": case_id
        }


@register_tool(
    name="get_user_cases",
    description="Get all cases for a user with optional status filter. Returns case history. HIGHLY SENSITIVE.",
    parameters={
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "User ID"
            },
            "status": {
                "type": "string",
                "description": "Optional status filter (OPEN, IN_PROGRESS, RESOLVED, CLOSED)",
                "enum": ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of cases to return (default 20, max 20)",
                "default": 20
            }
        },
        "required": ["user_id"]
    },
    category="case_management",
    requires_db=True,
    requires_user_id=False
)
async def get_user_cases(
    db: AsyncSession,
    user_id: str,
    status: Optional[str] = None,
    limit: int = MAX_CASES,
    **kwargs
) -> Dict[str, Any]:
    """
    Get all cases for a user.
    
    Returns list of cases with optional status filter.
    HIGHLY SENSITIVE - clinical case history.
    """
    try:
        if limit > MAX_CASES:
            limit = MAX_CASES
            
        # Query cases
        query = select(Case).where(Case.user_id == user_id)
        if status:
            query = query.where(Case.status == status)
        query = query.order_by(desc(Case.created_at)).limit(limit)
        
        result = await db.execute(query)
        cases = result.scalars().all()
        
        case_list = []
        for case in cases:
            updated_at_value = None
            if case.updated_at is not None:
                updated_at_value = case.updated_at.isoformat()
                
            case_list.append({
                "case_id": str(case.id),
                "severity": case.severity,
                "status": case.status,
                "description": case.description,
                "priority": case.priority,
                "created_at": case.created_at.isoformat(),
                "updated_at": updated_at_value
            })
        
        logger.info(f"✅ Retrieved {len(case_list)} cases for user {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "status_filter": status,
            "total_cases": len(case_list),
            "cases": case_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting cases for user {user_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_id": user_id
        }
