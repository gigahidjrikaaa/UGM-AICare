"""
Intervention Plan Analytics Service

Provides comprehensive analytics for intervention plans:
- Completion rates and progress tracking
- Effectiveness metrics by plan type
- Step-by-step analysis
- Symptom improvement tracking
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy import func, select, and_, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    InterventionPlanRecord,
    InterventionPlanStepCompletion,
    User
)


class InterventionPlanAnalyticsService:
    """Service for intervention plan analytics and insights"""

    @staticmethod
    async def get_overview_metrics(
        db: AsyncSession,
        time_period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get overview metrics for intervention plans
        
        Returns:
        - Total plans
        - Active plans
        - Completed plans
        - Average completion rate
        - Average days to complete
        """
        start_date = datetime.utcnow() - timedelta(days=time_period_days)
        
        # Total plans
        total_stmt = select(func.count(InterventionPlanRecord.id)).where(
            InterventionPlanRecord.created_at >= start_date
        )
        total_result = await db.execute(total_stmt)
        total_plans = total_result.scalar() or 0
        
        # Active plans (in progress)
        active_stmt = select(func.count(InterventionPlanRecord.id)).where(
            and_(
                InterventionPlanRecord.created_at >= start_date,
                InterventionPlanRecord.completion_percentage > 0,
                InterventionPlanRecord.completion_percentage < 100
            )
        )
        active_result = await db.execute(active_stmt)
        active_plans = active_result.scalar() or 0
        
        # Completed plans
        completed_stmt = select(func.count(InterventionPlanRecord.id)).where(
            and_(
                InterventionPlanRecord.created_at >= start_date,
                InterventionPlanRecord.completion_percentage >= 100
            )
        )
        completed_result = await db.execute(completed_stmt)
        completed_plans = completed_result.scalar() or 0
        
        # Not started
        not_started = total_plans - active_plans - completed_plans
        
        # Average completion percentage
        avg_completion_stmt = select(
            func.avg(InterventionPlanRecord.completion_percentage)
        ).where(
            InterventionPlanRecord.created_at >= start_date
        )
        avg_completion_result = await db.execute(avg_completion_stmt)
        avg_completion = avg_completion_result.scalar() or 0
        
        # Average days to complete (for completed plans)
        avg_days_stmt = select(
            func.avg(
                func.extract('epoch', InterventionPlanRecord.updated_at - InterventionPlanRecord.created_at) / 86400
            )
        ).where(
            and_(
                InterventionPlanRecord.created_at >= start_date,
                InterventionPlanRecord.completion_percentage >= 100
            )
        )
        avg_days_result = await db.execute(avg_days_stmt)
        avg_days_to_complete = avg_days_result.scalar() or 0
        
        return {
            "total_plans": total_plans,
            "active_plans": active_plans,
            "completed_plans": completed_plans,
            "not_started_plans": not_started,
            "avg_completion_percentage": round(float(avg_completion), 2),
            "avg_days_to_complete": round(float(avg_days_to_complete), 1),
            "completion_rate_percentage": round((completed_plans / total_plans * 100) if total_plans > 0 else 0, 2),
            "time_period_days": time_period_days,
            "last_updated": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def get_plan_type_analytics(
        db: AsyncSession,
        time_period_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get analytics broken down by plan type
        
        Returns list of plan types with:
        - Total count
        - Completion rate
        - Average steps
        - Average completion time
        - Effectiveness score
        """
        start_date = datetime.utcnow() - timedelta(days=time_period_days)
        
        # Get all plan types with counts and metrics
        plan_type_stmt = select(
            InterventionPlanRecord.plan_type,
            func.count(InterventionPlanRecord.id).label('total_count'),
            func.sum(
                case((InterventionPlanRecord.completion_percentage >= 100, 1), else_=0)
            ).label('completed_count'),
            func.avg(InterventionPlanRecord.completion_percentage).label('avg_completion'),
            func.avg(
                func.json_array_length(InterventionPlanRecord.steps)
            ).label('avg_steps'),
            func.avg(
                case(
                    (InterventionPlanRecord.completion_percentage >= 100,
                     func.extract('epoch', InterventionPlanRecord.updated_at - InterventionPlanRecord.created_at) / 86400),
                    else_=None
                )
            ).label('avg_days_to_complete')
        ).where(
            InterventionPlanRecord.created_at >= start_date
        ).group_by(
            InterventionPlanRecord.plan_type
        ).order_by(
            desc('total_count')
        )
        
        result = await db.execute(plan_type_stmt)
        rows = result.all()
        
        plan_type_analytics = []
        for row in rows:
            total = row.total_count or 0
            completed = row.completed_count or 0
            completion_rate = (completed / total * 100) if total > 0 else 0
            
            # Effectiveness score (weighted: 50% completion rate, 30% speed, 20% engagement)
            completion_factor = completion_rate / 100 * 0.5
            
            # Speed factor (faster is better, normalized)
            avg_days = float(row.avg_days_to_complete or 14)
            speed_factor = max(0, 1 - (avg_days / 30)) * 0.3
            
            # Engagement factor (based on average completion percentage)
            engagement_factor = (float(row.avg_completion or 0) / 100) * 0.2
            
            effectiveness_score = (completion_factor + speed_factor + engagement_factor) * 100
            
            plan_type_analytics.append({
                "plan_type": row.plan_type,
                "total_count": total,
                "completed_count": completed,
                "completion_rate_percentage": round(completion_rate, 2),
                "avg_completion_percentage": round(float(row.avg_completion or 0), 2),
                "avg_steps": round(float(row.avg_steps or 0), 1),
                "avg_days_to_complete": round(avg_days, 1),
                "effectiveness_score": round(effectiveness_score, 2)
            })
        
        return plan_type_analytics
    
    @staticmethod
    async def get_progress_distribution(
        db: AsyncSession,
        time_period_days: int = 30
    ) -> Dict[str, int]:
        """
        Get distribution of plans by progress status
        
        Returns:
        - not_started (0%)
        - early_progress (1-25%)
        - mid_progress (26-50%)
        - good_progress (51-75%)
        - near_complete (76-99%)
        - completed (100%)
        """
        start_date = datetime.utcnow() - timedelta(days=time_period_days)
        
        # Count plans in each progress bucket
        progress_stmt = select(
            func.sum(case((InterventionPlanRecord.completion_percentage == 0, 1), else_=0)).label('not_started'),
            func.sum(case((and_(InterventionPlanRecord.completion_percentage > 0, InterventionPlanRecord.completion_percentage <= 25), 1), else_=0)).label('early_progress'),
            func.sum(case((and_(InterventionPlanRecord.completion_percentage > 25, InterventionPlanRecord.completion_percentage <= 50), 1), else_=0)).label('mid_progress'),
            func.sum(case((and_(InterventionPlanRecord.completion_percentage > 50, InterventionPlanRecord.completion_percentage <= 75), 1), else_=0)).label('good_progress'),
            func.sum(case((and_(InterventionPlanRecord.completion_percentage > 75, InterventionPlanRecord.completion_percentage < 100), 1), else_=0)).label('near_complete'),
            func.sum(case((InterventionPlanRecord.completion_percentage >= 100, 1), else_=0)).label('completed')
        ).where(
            InterventionPlanRecord.created_at >= start_date
        )
        
        result = await db.execute(progress_stmt)
        row = result.first()
        
        # Provide default values if row is None
        if row is None:
            return {
                "not_started": 0,
                "early_progress": 0,
                "mid_progress": 0,
                "good_progress": 0,
                "near_complete": 0,
                "completed": 0
            }
        
        return {
            "not_started": int(row.not_started or 0),
            "early_progress": int(row.early_progress or 0),
            "mid_progress": int(row.mid_progress or 0),
            "good_progress": int(row.good_progress or 0),
            "near_complete": int(row.near_complete or 0),
            "completed": int(row.completed or 0)
        }
    
    @staticmethod
    async def get_step_completion_analytics(
        db: AsyncSession,
        time_period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get analytics on step-by-step completion
        
        Returns:
        - Total steps completed
        - Average steps per plan
        - Most common step count
        - Completion patterns
        """
        start_date = datetime.utcnow() - timedelta(days=time_period_days)
        
        # Total step completions
        total_steps_stmt = select(
            func.count(InterventionPlanStepCompletion.id)
        ).where(
            InterventionPlanStepCompletion.completed_at >= start_date
        )
        total_steps_result = await db.execute(total_steps_stmt)
        total_steps_completed = total_steps_result.scalar() or 0
        
        # Average completion percentage per step
        avg_step_completion_stmt = select(
            func.avg(InterventionPlanStepCompletion.completion_percentage)
        ).where(
            InterventionPlanStepCompletion.completed_at >= start_date
        )
        avg_step_result = await db.execute(avg_step_completion_stmt)
        avg_step_completion = avg_step_result.scalar() or 0
        
        return {
            "total_steps_completed": total_steps_completed,
            "avg_step_completion_percentage": round(float(avg_step_completion), 2),
            "time_period_days": time_period_days
        }
    
    @staticmethod
    async def get_recent_completions(
        db: AsyncSession,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get recently completed plans"""
        
        stmt = select(
            InterventionPlanRecord.id,
            InterventionPlanRecord.plan_type,
            InterventionPlanRecord.title,
            InterventionPlanRecord.created_at,
            InterventionPlanRecord.updated_at,
            InterventionPlanRecord.completion_percentage,
            User.email
        ).join(
            User, InterventionPlanRecord.user_id == User.id
        ).where(
            InterventionPlanRecord.completion_percentage >= 100
        ).order_by(
            desc(InterventionPlanRecord.updated_at)
        ).limit(limit)
        
        result = await db.execute(stmt)
        rows = result.all()
        
        return [
            {
                "id": row.id,
                "plan_type": row.plan_type,
                "title": row.title,
                "user_email": row.email,
                "started_at": row.created_at.isoformat(),
                "completed_at": row.updated_at.isoformat(),
                "days_to_complete": (row.updated_at - row.created_at).days
            }
            for row in rows
        ]
    
    @staticmethod
    async def get_comprehensive_analytics(
        db: AsyncSession,
        time_period_days: int = 30
    ) -> Dict[str, Any]:
        """Get all intervention plan analytics in one call"""
        
        overview = await InterventionPlanAnalyticsService.get_overview_metrics(db, time_period_days)
        by_type = await InterventionPlanAnalyticsService.get_plan_type_analytics(db, time_period_days)
        progress_dist = await InterventionPlanAnalyticsService.get_progress_distribution(db, time_period_days)
        step_analytics = await InterventionPlanAnalyticsService.get_step_completion_analytics(db, time_period_days)
        recent = await InterventionPlanAnalyticsService.get_recent_completions(db, 10)
        
        return {
            "overview": overview,
            "by_plan_type": by_type,
            "progress_distribution": progress_dist,
            "step_analytics": step_analytics,
            "recent_completions": recent,
            "time_period_days": time_period_days,
            "generated_at": datetime.utcnow().isoformat()
        }
