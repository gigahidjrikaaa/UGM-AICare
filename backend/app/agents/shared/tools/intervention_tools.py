"""
Intervention Tools - CBT and Treatment Plans

This module provides tools for managing intervention plans, CBT modules,
and treatment recommendations. Used primarily by SCA agent.

Tools:
- get_available_cbt_modules: List available CBT modules
- get_intervention_plan_details: Get details of a specific plan
- create_intervention_plan: Create new intervention plan for user

Privacy: Treatment data is SENSITIVE and requires consent.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models import (
    InterventionPlanRecord,
    InterventionPlanStepCompletion,
    CbtModule,
    CbtModuleStep
)
from app.agents.shared.tools import tool_registry

import logging

logger = logging.getLogger(__name__)

MAX_MODULES = 20
MAX_STEPS = 50


async def get_available_cbt_modules(
    db: AsyncSession,
    category: Optional[str] = None,
    limit: int = MAX_MODULES
) -> Dict[str, Any]:
    """
    Get list of available CBT modules.
    
    Returns CBT modules with descriptions, categories, and step counts.
    PUBLIC DATA - module catalog.
    
    Args:
        category: Filter by category (optional)
        limit: Maximum number of modules (default 20, max 20)
        
    Returns:
        Dict with modules list or error
    """
    try:
        if limit > MAX_MODULES:
            limit = MAX_MODULES
            
        # Query modules
        query = select(CbtModule).limit(limit)
        if category:
            query = query.where(CbtModule.category == category)
            
        result = await db.execute(query)
        modules = result.scalars().all()
        
        module_list = []
        for module in modules:
            # Count steps
            step_query = select(CbtModuleStep).where(CbtModuleStep.module_id == module.id)
            step_result = await db.execute(step_query)
            steps = step_result.scalars().all()
            
            module_list.append({
                "module_id": str(module.id),
                "name": module.name,
                "description": module.description,
                "category": module.category,
                "difficulty_level": module.difficulty_level,
                "estimated_duration_minutes": module.estimated_duration_minutes,
                "total_steps": len(steps),
                "is_active": module.is_active
            })
            
        logger.info(f"✅ Retrieved {len(module_list)} CBT modules")
        
        return {
            "success": True,
            "total_modules": len(module_list),
            "category_filter": category,
            "modules": module_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting CBT modules: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def get_intervention_plan_details(
    db: AsyncSession,
    plan_id: str
) -> Dict[str, Any]:
    """
    Get details of a specific intervention plan.
    
    Returns plan info, assigned modules, completion status.
    SENSITIVE DATA - treatment information.
    
    Args:
        plan_id: Intervention plan ID
        
    Returns:
        Dict with plan details or error
    """
    try:
        # Get plan
        query = select(InterventionPlanRecord).where(InterventionPlanRecord.id == plan_id)
        result = await db.execute(query)
        plan = result.scalar_one_or_none()
        
        if not plan:
            logger.warning(f"⚠️ Intervention plan {plan_id} not found")
            return {
                "success": False,
                "error": f"Intervention plan {plan_id} not found",
                "plan_id": plan_id
            }
        
        # Get completions
        comp_query = (
            select(InterventionPlanStepCompletion)
            .where(InterventionPlanStepCompletion.plan_id == plan_id)
        )
        comp_result = await db.execute(comp_query)
        completions = comp_result.scalars().all()
        
        completion_list = []
        for comp in completions:
            completion_list.append({
                "step_number": comp.step_number,
                "completed": comp.completed,
                "completed_at": comp.completed_at.isoformat() if comp.completed_at else None,
                "response": comp.response
            })
        
        logger.info(f"✅ Retrieved intervention plan details for {plan_id}")
        
        return {
            "success": True,
            "plan_id": plan_id,
            "user_id": str(plan.user_id),
            "module_type": plan.module_type,
            "status": plan.status,
            "current_step": plan.current_step,
            "total_steps": plan.total_steps,
            "progress_percentage": round((plan.current_step / plan.total_steps * 100) if plan.total_steps > 0 else 0, 1),
            "started_at": plan.started_at.isoformat() if plan.started_at else None,
            "completed_at": plan.completed_at.isoformat() if plan.completed_at else None,
            "completions": completion_list
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting intervention plan details for {plan_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "plan_id": plan_id
        }


# ============================================================================
# GEMINI FUNCTION CALLING SCHEMAS
# ============================================================================

get_available_cbt_modules_schema = {
    "name": "get_available_cbt_modules",
    "description": "Get list of available CBT modules with descriptions and difficulty levels. PUBLIC DATA - module catalog.",
    "parameters": {
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "description": "Optional category filter (e.g., 'anxiety', 'depression', 'stress')"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of modules to return (default 20, max 20)",
                "default": 20
            }
        },
        "required": []
    }
}

get_intervention_plan_details_schema = {
    "name": "get_intervention_plan_details",
    "description": "Get details of a specific intervention plan including progress and completions. SENSITIVE DATA.",
    "parameters": {
        "type": "object",
        "properties": {
            "plan_id": {
                "type": "string",
                "description": "Intervention plan ID"
            }
        },
        "required": ["plan_id"]
    }
}


# ============================================================================
# REGISTER TOOLS WITH CENTRAL REGISTRY
# ============================================================================

tool_registry.register(
    name="get_available_cbt_modules",
    func=get_available_cbt_modules,
    schema=get_available_cbt_modules_schema,
    category="intervention"
)

tool_registry.register(
    name="get_intervention_plan_details",
    func=get_intervention_plan_details,
    schema=get_intervention_plan_details_schema,
    category="intervention"
)

logger.info("🔧 Registered 2 intervention tools in 'intervention' category")
