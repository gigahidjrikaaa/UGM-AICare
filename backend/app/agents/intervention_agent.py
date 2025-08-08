"""
Intervention Agent Implementation

This agent creates and manages targeted intervention campaigns based on
analytics insights and real-time mental health indicators.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from .base_agent import BaseAgent, AgentType
from app.models.agents import InterventionCampaign, CampaignExecution
from app.models.user import User
from app.models.conversation import Conversation
from app.schemas.agents import TriageClassification
from app.core.chains import create_intervention_content_chain

logger = logging.getLogger(__name__)


class InterventionAgent(BaseAgent):
    """
    Intervention Agent for creating and managing mental health campaigns.
    
    Capabilities:
    - Campaign creation based on analytics insights
    - Target audience selection
    - Campaign execution and monitoring
    - Effectiveness tracking
    - Automated intervention triggers
    """

    def __init__(self, db: Session, redis_client=None):
        super().__init__(AgentType.INTERVENTION, db, redis_client)
        self.campaign_types = [
            "wellness_check",
            "resource_sharing",
            "educational_content",
            "peer_support",
            "crisis_intervention",
            "engagement_boost"
        ]
        self.target_criteria = [
            "risk_level",
            "engagement_level", 
            "sentiment_trend",
            "usage_pattern",
            "demographic"
        ]

    async def _generate_campaign_content(self, campaign_type: str, target_criteria: Dict[str, Any]) -> Dict[str, str]:
        """Generate campaign content using the Langchain intervention content chain."""
        content_chain = create_intervention_content_chain()

        # Create a description of the target audience for the LLM
        target_audience_description = json.dumps(target_criteria)

        # Invoke the chain
        content = await content_chain.ainvoke({
            "campaign_type": campaign_type,
            "target_audience_description": target_audience_description
        })

        return content

    async def _identify_target_audience(self, target_criteria: Dict[str, Any]) -> List[int]:
        # Placeholder for audience identification
        users = self.db.query(User).limit(20).all()
        return [user.id for user in users]

    async def _deliver_intervention(self, campaign: InterventionCampaign, execution: CampaignExecution) -> Dict[str, bool]:
        # Placeholder for intervention delivery
        print(f"Delivering intervention for campaign {campaign.id} to user {execution.user_id}")
        return {"success": True}

    async def _monitor_campaigns(self, **kwargs) -> Dict[str, Any]:
        # Placeholder for campaign monitoring
        return {"active_campaigns": 1, "status": "monitoring"}

    async def _analyze_effectiveness(self, **kwargs) -> Dict[str, Any]:
        # Placeholder for effectiveness analysis
        return {"campaign_id": kwargs.get("campaign_id"), "effectiveness_score": 0.85}

    async def _auto_trigger_intervention(self, **kwargs) -> Dict[str, Any]:
        # Placeholder for auto-trigger
        return {"triggered": False, "reason": "No trigger conditions met."}

    def validate_input(self, **kwargs) -> bool:
        """Validate intervention request parameters"""
        try:
            campaign_type = kwargs.get("campaign_type")
            if campaign_type and campaign_type not in self.campaign_types:
                logger.error(f"Invalid campaign type: {campaign_type}")
                return False
            
            target_criteria = kwargs.get("target_criteria", {})
            if not isinstance(target_criteria, dict):
                logger.error("Target criteria must be a dictionary")
                return False
            
            # Validate campaign content if provided
            content = kwargs.get("content")
            if content and not isinstance(content, dict):
                logger.error("Campaign content must be a dictionary")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Input validation failed: {e}")
            return False

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute intervention campaign creation or management"""
        action = kwargs.get("action", "create_campaign")
        
        logger.info(f"Starting intervention action: {action}")
        
        if action == "create_campaign":
            result = await self._create_campaign(**kwargs)
        elif action == "execute_campaign":
            result = await self._execute_campaign(**kwargs)
        elif action == "monitor_campaigns":
            result = await self._monitor_campaigns(**kwargs)
        elif action == "analyze_effectiveness":
            result = await self._analyze_effectiveness(**kwargs)
        elif action == "auto_trigger":
            result = await self._auto_trigger_intervention(**kwargs)
        else:
            raise ValueError(f"Unknown intervention action: {action}")
        
        return result

    async def _create_campaign(self, **kwargs) -> Dict[str, Any]:
        """Create a new intervention campaign"""
        try:
            campaign_type = kwargs.get("campaign_type", "wellness_check")
            target_criteria = kwargs.get("target_criteria", {})
            content = kwargs.get("content", {})
            priority = kwargs.get("priority", "medium")
            duration_days = kwargs.get("duration_days", 7)
            
            # Generate campaign content if not provided
            if not content:
                content = await self._generate_campaign_content(campaign_type)
            
            # Identify target audience
            target_users = await self._identify_target_audience(target_criteria)
            
            # Create campaign record
            campaign = InterventionCampaign(
                campaign_type=campaign_type,
                title=content.get("title", f"{campaign_type.replace('_', ' ').title()} Campaign"),
                description=content.get("description", "Automated intervention campaign"),
                content=content,
                target_criteria=target_criteria,
                target_audience_size=len(target_users),
                priority=priority,
                status="created",
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=duration_days)
            )
            
            self.db.add(campaign)
            self.db.commit()
            self.db.refresh(campaign)
            
            # Schedule campaign executions for target users
            executions_created = 0
            for user_id in target_users[:100]:  # Limit to 100 users per campaign
                execution = CampaignExecution(
                    campaign_id=campaign.id,
                    user_id=user_id,
                    status="scheduled",
                    scheduled_at=datetime.utcnow()
                )
                self.db.add(execution)
                executions_created += 1
            
            self.db.commit()
            
            logger.info(f"Campaign created with {executions_created} scheduled executions")
            
            return {
                "campaign_id": campaign.id,
                "campaign_type": campaign_type,
                "title": campaign.title,
                "target_audience_size": len(target_users),
                "executions_scheduled": executions_created,
                "status": "created",
                "start_date": campaign.start_date.isoformat(),
                "end_date": campaign.end_date.isoformat(),
                "content_preview": {
                    "title": content.get("title", ""),
                    "message_preview": content.get("message", "")[:100] + "..."
                }
            }
            
        except Exception as e:
            logger.error(f"Campaign creation failed: {e}")
            raise

    async def _execute_campaign(self, **kwargs) -> Dict[str, Any]:
        """Execute a scheduled campaign"""
        try:
            campaign_id = kwargs.get("campaign_id")
            if not campaign_id:
                raise ValueError("Campaign ID is required for execution")
            
            campaign = self.db.query(InterventionCampaign).filter(
                InterventionCampaign.id == campaign_id
            ).first()
            
            if not campaign:
                raise ValueError(f"Campaign {campaign_id} not found")
            
            # Get scheduled executions
            executions = self.db.query(CampaignExecution).filter(
                and_(
                    CampaignExecution.campaign_id == campaign_id,
                    CampaignExecution.status == "scheduled"
                )
            ).all()
            
            executed_count = 0
            failed_count = 0
            
            # Execute campaign for each target user
            for execution in executions:
                try:
                    # Simulate intervention delivery (would integrate with notification system)
                    delivery_result = await self._deliver_intervention(campaign, execution)
                    
                    if delivery_result["success"]:
                        execution.status = "delivered"
                        execution.executed_at = datetime.utcnow()
                        execution.delivery_method = delivery_result.get("method", "notification")
                        executed_count += 1
                    else:
                        execution.status = "failed"
                        execution.error_message = delivery_result.get("error", "Unknown error")
                        failed_count += 1
                        
                except Exception as e:
                    execution.status = "failed"
                    execution.error_message = str(e)
                    failed_count += 1
                    logger.error(f"Execution failed for user {execution.user_id}: {e}")
            
            # Update campaign status
            campaign.status = "active"
            campaign.executions_delivered = executed_count
            campaign.executions_failed = failed_count
            
            self.db.commit()
            
            logger.info(f"Campaign executed: {executed_count} delivered, {failed_count} failed")
            
            return {
                "campaign_id": campaign_id,
                "execution_summary": {
                    "total_scheduled": len(executions),
                    "successfully_delivered": executed_count,
                    "failed": failed_count,
                    "success_rate": round(executed_count / max(len(executions), 1) * 100, 2)
                },
                "campaign_status": campaign.status,
                "next_steps": self._generate_next_steps(campaign, executed_count, failed_count)
            }
            
        except Exception as e:
            logger.error(f"Campaign execution failed: {e}")
            raise

    async def _monitor_campaigns(self, **kwargs) -> Dict[str, Any]:
        """Monitor active campaigns and their performance"""
        try:
            # Get active campaigns
            active_campaigns = self.db.query(InterventionCampaign).filter(
                InterventionCampaign.status.in_(["active", "created"])
            ).all()
            
            campaign_stats = []
            total_delivered = 0
            total_engaged = 0
            
            for campaign in active_campaigns:
                # Get execution statistics
                executions = self.db.query(CampaignExecution).filter(
                    CampaignExecution.campaign_id == campaign.id
                ).all()
                
                delivered = len([e for e in executions if e.status == "delivered"])
                engaged = len([e for e in executions if e.engagement_score and e.engagement_score > 0.5])
                
                total_delivered += delivered
                total_engaged += engaged
                
                campaign_stats.append({
                    "campaign_id": campaign.id,
                    "title": campaign.title,
                    "type": campaign.campaign_type,
                    "status": campaign.status,
                    "target_audience_size": campaign.target_audience_size,
                    "delivered": delivered,
                    "engaged": engaged,
                    "engagement_rate": round(engaged / max(delivered, 1) * 100, 2),
                    "start_date": campaign.start_date.isoformat(),
                    "days_active": (datetime.utcnow() - campaign.start_date).days
                })
            
            # Generate insights
            insights = []
            if total_delivered > 0:
                overall_engagement = round(total_engaged / total_delivered * 100, 2)
                insights.append(f"Overall engagement rate: {overall_engagement}%")
                
                if overall_engagement > 70:
                    insights.append("High engagement rates indicate effective campaign content")
                elif overall_engagement < 30:
                    insights.append("Low engagement rates suggest need for content optimization")
            
            return {
                "monitoring_summary": {
                    "active_campaigns": len(active_campaigns),
                    "total_delivered": total_delivered,
                    "total_engaged": total_engaged,
                    "overall_engagement_rate": round(total_engaged / max(total_delivered, 1) * 100, 2)
                },
                "campaign_details": campaign_stats,
                "insights": insights,
                "recommendations": self._generate_monitoring_recommendations(campaign_stats)
            }
            
        except Exception as e:
            logger.error(f"Campaign monitoring failed: {e}")
            raise

    async def _analyze_effectiveness(self, **kwargs) -> Dict[str, Any]:
        """Analyze the effectiveness of completed campaigns"""
        try:
            time_period = kwargs.get("time_period", 30)  # Days
            campaign_type = kwargs.get("campaign_type")
            
            # Query completed campaigns
            query = self.db.query(InterventionCampaign).filter(
                and_(
                    InterventionCampaign.status == "completed",
                    InterventionCampaign.end_date >= datetime.utcnow() - timedelta(days=time_period)
                )
            )
            
            if campaign_type:
                query = query.filter(InterventionCampaign.campaign_type == campaign_type)
            
            completed_campaigns = query.all()
            
            # Analyze effectiveness metrics
            effectiveness_data = []
            total_campaigns = len(completed_campaigns)
            total_reach = 0
            total_engagement = 0
            
            for campaign in completed_campaigns:
                executions = self.db.query(CampaignExecution).filter(
                    CampaignExecution.campaign_id == campaign.id
                ).all()
                
                delivered = len([e for e in executions if e.status == "delivered"])
                engaged = len([e for e in executions if e.engagement_score and e.engagement_score > 0.5])
                
                total_reach += delivered
                total_engagement += engaged
                
                # Calculate follow-up conversation increase (simplified metric)
                follow_up_conversations = await self._measure_follow_up_impact(campaign, executions)
                
                effectiveness_data.append({
                    "campaign_id": campaign.id,
                    "title": campaign.title,
                    "type": campaign.campaign_type,
                    "reach": delivered,
                    "engagement": engaged,
                    "engagement_rate": round(engaged / max(delivered, 1) * 100, 2),
                    "follow_up_conversations": follow_up_conversations,
                    "effectiveness_score": self._calculate_effectiveness_score(
                        delivered, engaged, follow_up_conversations, campaign.target_audience_size
                    )
                })
            
            # Calculate overall metrics
            overall_metrics = {
                "total_campaigns_analyzed": total_campaigns,
                "total_reach": total_reach,
                "total_engagement": total_engagement,
                "average_engagement_rate": round(total_engagement / max(total_reach, 1) * 100, 2),
                "most_effective_type": self._find_most_effective_type(effectiveness_data),
                "least_effective_type": self._find_least_effective_type(effectiveness_data)
            }
            
            return {
                "effectiveness_analysis": {
                    "time_period_days": time_period,
                    "overall_metrics": overall_metrics,
                    "campaign_details": effectiveness_data,
                    "insights": self._generate_effectiveness_insights(effectiveness_data),
                    "recommendations": self._generate_effectiveness_recommendations(effectiveness_data)
                }
            }
            
        except Exception as e:
            logger.error(f"Effectiveness analysis failed: {e}")
            raise

    async def _auto_trigger_intervention(self, **kwargs) -> Dict[str, Any]:
        """Automatically trigger interventions based on real-time indicators"""
        try:
            trigger_type = kwargs.get("trigger_type", "risk_detection")
            user_id = kwargs.get("user_id")
            risk_score = kwargs.get("risk_score", 0.0)
            
            logger.info(f"Auto-triggering intervention: {trigger_type} for user {user_id}")
            
            # Determine intervention type based on trigger
            if trigger_type == "risk_detection" and risk_score > 0.7:
                campaign_type = "crisis_intervention"
                priority = "high"
            elif trigger_type == "low_engagement":
                campaign_type = "engagement_boost"
                priority = "medium"
            elif trigger_type == "negative_sentiment":
                campaign_type = "wellness_check"
                priority = "medium"
            else:
                campaign_type = "resource_sharing"
                priority = "low"
            
            # Create targeted intervention
            intervention_result = await self._create_targeted_intervention(
                user_id, campaign_type, priority, trigger_type, risk_score
            )
            
            # Execute immediately for high-priority interventions
            if priority == "high":
                execution_result = await self._execute_immediate_intervention(
                    intervention_result["campaign_id"], user_id
                )
                intervention_result.update({"immediate_execution": execution_result})
            
            return {
                "auto_trigger_result": intervention_result,
                "trigger_details": {
                    "trigger_type": trigger_type,
                    "user_id": user_id,
                    "risk_score": risk_score,
                    "intervention_type": campaign_type,
                    "priority": priority
                }
            }
            
        except Exception as e:
            logger.error(f"Auto-trigger intervention failed: {e}")
            raise

    # Helper methods
    async def _generate_campaign_content(self, campaign_type: str) -> Dict[str, Any]:
        """Generate appropriate content for campaign type"""
        content_templates = {
            "wellness_check": {
                "title": "Mental Health Check-In",
                "message": "Hi! We hope you're doing well. How have you been feeling lately? Remember, it's okay to not be okay, and support is always available.",
                "action_button": "Talk to Someone",
                "resources": ["Crisis Hotline", "Campus Counseling", "Peer Support Groups"]
            },
            "resource_sharing": {
                "title": "Mental Health Resources",
                "message": "Here are some helpful resources for managing stress and maintaining mental wellness during your academic journey.",
                "action_button": "Explore Resources",
                "resources": ["Stress Management Guide", "Mindfulness Exercises", "Study-Life Balance Tips"]
            },
            "educational_content": {
                "title": "Mental Health Awareness",
                "message": "Understanding mental health is the first step toward wellness. Learn about common challenges and coping strategies.",
                "action_button": "Learn More",
                "resources": ["Mental Health Basics", "Recognizing Warning Signs", "Self-Care Strategies"]
            },
            "peer_support": {
                "title": "Connect with Peers",
                "message": "You're not alone in your journey. Connect with other students who understand what you're going through.",
                "action_button": "Join Community",
                "resources": ["Student Support Groups", "Peer Mentoring", "Study Buddy Program"]
            },
            "crisis_intervention": {
                "title": "Immediate Support Available",
                "message": "We're here for you right now. If you're experiencing a crisis, please reach out immediately for support.",
                "action_button": "Get Help Now",
                "resources": ["Crisis Hotline", "Emergency Services", "24/7 Support Chat"],
                "urgent": True
            },
            "engagement_boost": {
                "title": "We Miss You!",
                "message": "It's been a while since we connected. How are you doing? We're here when you need us.",
                "action_button": "Check In",
                "resources": ["Quick Mood Check", "Virtual Counseling", "Wellness Activities"]
            }
        }
        
        return content_templates.get(campaign_type, content_templates["wellness_check"])

    async def _identify_target_audience(self, criteria: Dict[str, Any]) -> List[int]:
        """Identify target users based on criteria"""
        try:
            # Start with all active users
            query = self.db.query(User.id).filter(User.is_active == True)
            
            # Apply filters based on criteria
            if "risk_level" in criteria:
                # This would integrate with risk assessment data
                # For now, return a subset based on recent activity
                pass
            
            if "engagement_level" in criteria:
                engagement_level = criteria["engagement_level"]
                # Filter based on recent conversation activity
                if engagement_level == "low":
                    # Users with no conversations in last 14 days
                    recent_users = self.db.query(Conversation.user_id).filter(
                        Conversation.created_at >= datetime.utcnow() - timedelta(days=14)
                    ).distinct().subquery()
                    query = query.filter(~User.id.in_(recent_users))
                elif engagement_level == "high":
                    # Users with 5+ conversations in last 7 days
                    active_users = self.db.query(Conversation.user_id).filter(
                        Conversation.created_at >= datetime.utcnow() - timedelta(days=7)
                    ).group_by(Conversation.user_id).having(func.count(Conversation.id) >= 5).subquery()
                    query = query.filter(User.id.in_(active_users))
            
            if "demographic" in criteria:
                # Apply demographic filters if available
                # This would depend on user profile data
                pass
            
            # Execute query and return user IDs
            user_ids = [user.id for user in query.limit(1000).all()]  # Limit to 1000 users
            
            logger.info(f"Identified {len(user_ids)} users matching criteria: {criteria}")
            return user_ids
            
        except Exception as e:
            logger.error(f"Target audience identification failed: {e}")
            return []

    async def _deliver_intervention(self, campaign: InterventionCampaign, execution: CampaignExecution) -> Dict[str, Any]:
        """Deliver intervention to user (simulated)"""
        try:
            # In a real implementation, this would integrate with:
            # - Push notification service
            # - Email service
            # - In-app messaging system
            # - SMS service
            
            # Simulate delivery based on campaign type
            if campaign.campaign_type == "crisis_intervention":
                # High-priority delivery via multiple channels
                delivery_method = "push_notification_email_sms"
                success_rate = 0.95
            elif campaign.priority == "high":
                delivery_method = "push_notification_email"
                success_rate = 0.90
            else:
                delivery_method = "push_notification"
                success_rate = 0.85
            
            # Simulate delivery success/failure
            import random
            success = random.random() < success_rate
            
            if success:
                return {
                    "success": True,
                    "method": delivery_method,
                    "delivery_time": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": "Delivery failed - user unreachable",
                    "method": delivery_method
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "method": "unknown"
            }

    async def _create_targeted_intervention(self, user_id: int, campaign_type: str, priority: str, trigger_type: str, risk_score: float) -> Dict[str, Any]:
        """Create a targeted intervention for a specific user"""
        try:
            content = await self._generate_campaign_content(campaign_type)
            
            # Customize content based on trigger
            if trigger_type == "risk_detection":
                content["message"] = f"We noticed you might be going through a difficult time. {content['message']}"
            elif trigger_type == "low_engagement":
                content["message"] = f"We haven't heard from you in a while. {content['message']}"
            
            # Create single-user campaign
            campaign = InterventionCampaign(
                campaign_type=campaign_type,
                title=f"Targeted {content['title']}",
                description=f"Auto-triggered intervention for {trigger_type}",
                content=content,
                target_criteria={"user_id": user_id, "trigger_type": trigger_type},
                target_audience_size=1,
                priority=priority,
                status="created"
            )
            
            self.db.add(campaign)
            self.db.commit()
            self.db.refresh(campaign)
            
            # Create execution
            execution = CampaignExecution(
                campaign_id=campaign.id,
                user_id=user_id,
                status="scheduled",
                scheduled_at=datetime.utcnow(),
                trigger_data={"risk_score": risk_score, "trigger_type": trigger_type}
            )
            
            self.db.add(execution)
            self.db.commit()
            
            return {
                "campaign_id": campaign.id,
                "user_id": user_id,
                "campaign_type": campaign_type,
                "priority": priority,
                "status": "created"
            }
            
        except Exception as e:
            logger.error(f"Targeted intervention creation failed: {e}")
            raise

    async def _execute_immediate_intervention(self, campaign_id: int, user_id: int) -> Dict[str, Any]:
        """Execute intervention immediately for high-priority cases"""
        try:
            campaign = self.db.query(InterventionCampaign).filter(
                InterventionCampaign.id == campaign_id
            ).first()
            
            execution = self.db.query(CampaignExecution).filter(
                and_(
                    CampaignExecution.campaign_id == campaign_id,
                    CampaignExecution.user_id == user_id
                )
            ).first()
            
            if not campaign or not execution:
                raise ValueError("Campaign or execution not found")
            
            # Deliver intervention
            delivery_result = await self._deliver_intervention(campaign, execution)
            
            if delivery_result["success"]:
                execution.status = "delivered"
                execution.executed_at = datetime.utcnow()
                execution.delivery_method = delivery_result["method"]
                campaign.status = "active"
            else:
                execution.status = "failed"
                execution.error_message = delivery_result["error"]
            
            self.db.commit()
            
            return {
                "execution_status": execution.status,
                "delivery_method": delivery_result.get("method"),
                "executed_at": datetime.utcnow().isoformat(),
                "success": delivery_result["success"]
            }
            
        except Exception as e:
            logger.error(f"Immediate intervention execution failed: {e}")
            raise

    def _generate_next_steps(self, campaign: InterventionCampaign, executed_count: int, failed_count: int) -> List[str]:
        """Generate next steps for campaign management"""
        next_steps = []
        
        if failed_count > executed_count * 0.2:  # More than 20% failure rate
            next_steps.append("Review delivery methods and user contact information")
            next_steps.append("Consider alternative communication channels")
        
        if campaign.priority == "high":
            next_steps.append("Monitor user responses closely for next 24 hours")
            next_steps.append("Prepare follow-up interventions if needed")
        
        next_steps.append("Track engagement metrics for effectiveness analysis")
        
        return next_steps

    def _generate_monitoring_recommendations(self, campaign_stats: List[Dict]) -> List[str]:
        """Generate recommendations based on campaign monitoring"""
        recommendations = []
        
        low_engagement_campaigns = [c for c in campaign_stats if c["engagement_rate"] < 30]
        if low_engagement_campaigns:
            recommendations.append("Review content strategy for low-engagement campaigns")
            recommendations.append("Consider A/B testing different message formats")
        
        high_engagement_campaigns = [c for c in campaign_stats if c["engagement_rate"] > 70]
        if high_engagement_campaigns:
            recommendations.append("Analyze successful campaigns to replicate best practices")
        
        return recommendations

    async def _measure_follow_up_impact(self, campaign: InterventionCampaign, executions: List[CampaignExecution]) -> int:
        """Measure follow-up conversations after campaign delivery"""
        try:
            delivered_executions = [e for e in executions if e.status == "delivered" and e.executed_at]
            if not delivered_executions:
                return 0
            
            # Count conversations in 7 days after campaign delivery
            follow_up_count = 0
            for execution in delivered_executions:
                follow_up_convs = self.db.query(Conversation).filter(
                    and_(
                        Conversation.user_id == execution.user_id,
                        Conversation.created_at >= execution.executed_at,
                        Conversation.created_at <= execution.executed_at + timedelta(days=7)
                    )
                ).count()
                
                if follow_up_convs > 0:
                    follow_up_count += 1
            
            return follow_up_count
            
        except Exception as e:
            logger.error(f"Follow-up impact measurement failed: {e}")
            return 0

    def _calculate_effectiveness_score(self, delivered: int, engaged: int, follow_up: int, target_size: int) -> float:
        """Calculate overall effectiveness score for a campaign"""
        if delivered == 0:
            return 0.0
        
        # Weighted scoring: 40% delivery, 40% engagement, 20% follow-up
        delivery_score = delivered / max(target_size, 1)
        engagement_score = engaged / delivered
        follow_up_score = follow_up / delivered
        
        overall_score = (delivery_score * 0.4) + (engagement_score * 0.4) + (follow_up_score * 0.2)
        return round(min(overall_score, 1.0), 3)

    def _find_most_effective_type(self, effectiveness_data: List[Dict]) -> str:
        """Find the most effective campaign type"""
        if not effectiveness_data:
            return "N/A"
        
        type_scores = {}
        for data in effectiveness_data:
            campaign_type = data["type"]
            score = data["effectiveness_score"]
            
            if campaign_type not in type_scores:
                type_scores[campaign_type] = []
            type_scores[campaign_type].append(score)
        
        # Calculate average scores by type
        avg_scores = {
            t: sum(scores) / len(scores)
            for t, scores in type_scores.items()
        }
        
        return max(avg_scores.items(), key=lambda x: x[1])[0] if avg_scores else "N/A"

    def _find_least_effective_type(self, effectiveness_data: List[Dict]) -> str:
        """Find the least effective campaign type"""
        if not effectiveness_data:
            return "N/A"
        
        type_scores = {}
        for data in effectiveness_data:
            campaign_type = data["type"]
            score = data["effectiveness_score"]
            
            if campaign_type not in type_scores:
                type_scores[campaign_type] = []
            type_scores[campaign_type].append(score)
        
        # Calculate average scores by type
        avg_scores = {
            t: sum(scores) / len(scores)
            for t, scores in type_scores.items()
        }
        
        return min(avg_scores.items(), key=lambda x: x[1])[0] if avg_scores else "N/A"

    def _generate_effectiveness_insights(self, effectiveness_data: List[Dict]) -> List[str]:
        """Generate insights from effectiveness analysis"""
        insights = []
        
        if not effectiveness_data:
            insights.append("No campaign data available for analysis")
            return insights
        
        avg_effectiveness = sum(d["effectiveness_score"] for d in effectiveness_data) / len(effectiveness_data)
        
        if avg_effectiveness > 0.7:
            insights.append("Campaigns show high effectiveness overall")
        elif avg_effectiveness < 0.3:
            insights.append("Campaign effectiveness is below optimal levels")
        
        # Analyze by campaign type
        type_performance = {}
        for data in effectiveness_data:
            t = data["type"]
            if t not in type_performance:
                type_performance[t] = []
            type_performance[t].append(data["effectiveness_score"])
        
        best_type = max(type_performance.items(), key=lambda x: sum(x[1])/len(x[1]))
        insights.append(f"'{best_type[0]}' campaigns show the highest effectiveness")
        
        return insights

    def _generate_effectiveness_recommendations(self, effectiveness_data: List[Dict]) -> List[str]:
        """Generate recommendations for improving campaign effectiveness"""
        recommendations = []
        
        if not effectiveness_data:
            recommendations.append("Increase campaign volume to enable meaningful analysis")
            return recommendations
        
        low_performing = [d for d in effectiveness_data if d["effectiveness_score"] < 0.4]
        if low_performing:
            recommendations.append("Review and optimize content for low-performing campaigns")
            recommendations.append("Consider adjusting targeting criteria for better audience selection")
        
        high_performing = [d for d in effectiveness_data if d["effectiveness_score"] > 0.7]
        if high_performing:
            recommendations.append("Scale successful campaign strategies across other intervention types")
        
        recommendations.append("Implement A/B testing for continuous improvement")
        recommendations.append("Collect user feedback to enhance content relevance")
        
        return recommendations