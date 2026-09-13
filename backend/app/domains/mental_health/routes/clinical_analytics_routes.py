"""Clinical Analytics API Routes — real, privacy-protected aggregates.

Backed by the ``intervention_assignments`` ledger via
``intervention_effectiveness_service``. Population numbers are k-anonymized
(k >= ``settings.k_anon``) and, for the effectiveness aggregates, additionally
differentially privatized (charged to the shared DP budget).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.database import get_async_db
from app.dependencies import get_admin_user
from app.domains.mental_health.models import InterventionAssignment
from app.models import User
from app.services.intervention_effectiveness_service import (
    compute_intervention_effectiveness,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/clinical-analytics", tags=["Clinical Analytics"])


@router.get("/treatment-outcomes")
async def get_treatment_outcomes(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
    intervention_types: Optional[List[str]] = Query(None, description="Filter by intervention keys"),
    assessment_instruments: Optional[List[str]] = Query(None, description="Reserved (instrument filter)"),
    time_period_days: int = Query(90, ge=1, le=365, description="Analysis period in days"),
    privacy_level: str = Query("medium", description="Privacy protection level: low, medium, high"),
):
    """Real treatment-outcome analysis from the assignment ledger."""
    result = await compute_intervention_effectiveness(
        db, days=time_period_days, requested_by=f"admin:{admin_user.id}"
    )

    interventions = result["interventions"]
    if intervention_types:
        wanted = set(intervention_types)
        interventions = [i for i in interventions if i["intervention_key"] in wanted]

    data = {
        item["intervention_key"]: {
            "intervention_key": item["intervention_key"],
            "sample_size": item["n"],
            "counts": {
                "improved": item["improved"],
                "unchanged": item["unchanged"],
                "worsened": item["worsened"],
                "mcid_met": item["mcid_met"],
            },
            "clinical_significance": {
                "improvement_rate": item["improvement_rate"],
                "worsening_rate": item["worsening_rate"],
                "mcid_rate": item["mcid_rate"],
                "mean_improvement_magnitude": item["mean_improvement_magnitude"],
                "rating": (
                    "high" if item["improvement_rate"] >= 60
                    else "moderate" if item["improvement_rate"] >= 40
                    else "low"
                ),
            },
        }
        for item in interventions
    }

    return {
        "success": True,
        "data": data,
        "metadata": {
            "analysis_period_days": time_period_days,
            "privacy_level": privacy_level,
            "k_anonymity": result["k_anonymity"],
            "dp_applied": result["dp_applied"],
            "dp_epsilon": result["dp_epsilon"],
            "suppressed_groups": result["suppressed"],
            "total_assignments": result["total_assignments"],
            "generated_at": result["generated_at"],
            "note": "Real data from intervention assignments; instrument filter reserved.",
        },
    }


@router.get("/service-utilization")
async def get_service_utilization_metrics(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
    time_period_days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    privacy_level: str = Query("medium"),
):
    """Real utilization counts from the assignment ledger (k-anonymized)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=time_period_days)

    total = (
        await db.execute(
            select(func.count())
            .select_from(InterventionAssignment)
            .where(InterventionAssignment.assigned_at >= cutoff)
        )
    ).scalar() or 0

    unique_users = (
        await db.execute(
            select(func.count(func.distinct(InterventionAssignment.user_id))).where(
                InterventionAssignment.assigned_at >= cutoff
            )
        )
    ).scalar() or 0

    k = int(settings.k_anon)
    if unique_users < k:
        return {
            "success": True,
            "data": {},
            "metadata": {
                "analysis_period_days": time_period_days,
                "privacy_level": privacy_level,
                "suppressed": True,
                "reason": "below_k_anonymity",
                "k_anonymity": k,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    return {
        "success": True,
        "data": {
            "total_assignments": int(total),
            "unique_users": int(unique_users),
            "assignments_per_user": round(total / unique_users, 2) if unique_users else 0.0,
        },
        "metadata": {
            "analysis_period_days": time_period_days,
            "privacy_level": privacy_level,
            "k_anonymity": k,
            "suppressed": False,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.get("/clinical-intelligence-report")
async def get_clinical_intelligence_report(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
    analysis_period_days: int = Query(90, ge=1, le=365),
    include_forecasting: bool = Query(False),
    privacy_level: str = Query("medium"),
):
    """Compose a real summary + recommendations from effectiveness data."""
    result = await compute_intervention_effectiveness(
        db, days=analysis_period_days, requested_by=f"admin:{admin_user.id}"
    )
    interventions = result["interventions"]

    high = sum(1 for i in interventions if i["improvement_rate"] >= 60)
    moderate = sum(1 for i in interventions if 40 <= i["improvement_rate"] < 60)
    low = sum(1 for i in interventions if i["improvement_rate"] < 40)

    recommendations: List[str] = []
    if high:
        recommendations.append("Expand interventions with high improvement rates")
    if low:
        recommendations.append("Review or retire interventions with low improvement rates")
    if not interventions:
        recommendations.append("Collect more measured outcomes before drawing conclusions")

    return {
        "success": True,
        "data": {
            "report_id": f"report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "analysis_period_days": analysis_period_days,
            "privacy_level": privacy_level.upper(),
            "treatment_outcomes_summary": {
                "total_assignments": result["total_assignments"],
                "interventions_analyzed": len(interventions),
                "high_effectiveness_count": high,
                "moderate_effectiveness_count": moderate,
                "low_effectiveness_count": low,
                "suppressed_groups": len(result["suppressed"]),
            },
            "interventions": interventions,
            "service_optimization": {"recommendations": recommendations, "priority_level": "medium"},
            "privacy_audit": {
                "k_anonymity": result["k_anonymity"],
                "dp_applied": result["dp_applied"],
                "dp_epsilon": result["dp_epsilon"],
            },
        },
        "metadata": {
            "report_type": "clinical_intelligence",
            "forecasting_included": include_forecasting,
            "privacy_protected": True,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.get("/intervention-effectiveness")
async def get_intervention_effectiveness(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
    time_period_days: int = Query(180, ge=1, le=365),
    privacy_level: str = Query("medium"),
):
    """Analyze effectiveness per intervention (real, DP + k-anonymized)."""
    try:
        result = await compute_intervention_effectiveness(
            db, days=time_period_days, requested_by=f"admin:{admin_user.id}"
        )
    except Exception as exc:  # includes DP budget exhaustion (fail-closed)
        logger.warning("Intervention effectiveness unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))

    return {
        "success": True,
        "data": {item["intervention_key"]: item for item in result["interventions"]},
        "metadata": {
            "analysis_period_days": time_period_days,
            "privacy_level": privacy_level,
            "k_anonymity": result["k_anonymity"],
            "dp_applied": result["dp_applied"],
            "dp_epsilon": result["dp_epsilon"],
            "suppressed_groups": result["suppressed"],
            "generated_at": result["generated_at"],
        },
    }


@router.get("/privacy-audit")
async def get_privacy_audit_status(
    admin_user: User = Depends(get_admin_user),
):
    """Current differential-privacy budget status."""
    from app.agents.ia.dp_accountant import DPBudgetAccountant

    accountant = DPBudgetAccountant()
    spent = await accountant.current_spend()
    budget = float(settings.dp_budget_limit)
    remaining = max(0.0, budget - spent)

    return {
        "success": True,
        "data": {
            "budget_status": {
                "total_budget": budget,
                "used_budget": round(spent, 2),
                "remaining_budget": round(remaining, 2),
                "budget_used_percentage": round((spent / budget * 100) if budget else 0.0, 2),
                "budget_status": "healthy" if remaining > 0 else "exhausted",
            },
            "compliance_indicators": {
                "dp_enabled": bool(settings.dp_enabled),
                "k_anonymity": int(settings.k_anon),
                "budget_healthy": remaining > 0,
            },
        },
        "metadata": {
            "audit_timestamp": datetime.now(timezone.utc).isoformat(),
            "privacy_framework": "Differential Privacy + k-Anonymity",
            "window_hours": int(settings.dp_budget_window_hours),
        },
    }


@router.post("/validate-clinical-insight")
async def validate_clinical_insight(
    insight_id: int,
    validation_data: Dict[str, Any],
    admin_user: User = Depends(get_admin_user),
):
    """Acknowledge a clinician's validation (not persisted in this deployment)."""
    return {
        "success": True,
        "persisted": False,
        "message": "Clinical insight validation acknowledged but not persisted.",
        "data": {
            "insight_id": insight_id,
            "validated_by": admin_user.id,
            "validation_status": validation_data.get("status", "approved"),
            "validation_timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
