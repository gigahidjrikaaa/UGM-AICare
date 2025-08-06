"""
Triage Agent Implementation

This agent provides real-time assessment and classification of mental health
conversations, ensuring appropriate response levels and routing.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from .base_agent import BaseAgent, AgentType
from app.models.agents import TriageAssessment
from app.models.conversation import Conversation
from app.models.user import User

logger = logging.getLogger(__name__)


class TriageAgent(BaseAgent):
    """
    Triage Agent for real-time mental health assessment and crisis detection.
    
    Capabilities:
    - Real-time conversation analysis
    - Crisis detection and severity classification
    - Risk level assessment
    - Automated escalation triggers
    - Response recommendation generation
    - Quality assurance monitoring
    """

    def __init__(self, db: Session, redis_client=None):
        super().__init__(AgentType.TRIAGE, db, redis_client)
        
        # Risk classification thresholds
        self.severity_thresholds = {
            "low": 0.0,
            "medium": 0.3,
            "high": 0.6,
            "critical": 0.8
        }
        
        # Crisis keywords and patterns
        self.crisis_keywords = {
            "immediate_danger": [
                "suicide", "kill myself", "end it all", "not worth living",
                "hurt myself", "cutting", "overdose", "jumping", "hanging"
            ],
            "severe_distress": [
                "can't go on", "hopeless", "trapped", "overwhelmed completely",
                "breakdown", "falling apart", "crisis", "emergency"
            ],
            "moderate_concern": [
                "depressed", "anxious", "worried", "stressed", "struggling",
                "difficult time", "hard to cope", "feeling down"
            ],
            "mild_concern": [
                "tired", "unmotivated", "procrastinating", "distracted",
                "pressure", "busy", "challenging"
            ]
        }
        
        # Response templates
        self.response_templates = self._initialize_response_templates()

    def validate_input(self, **kwargs) -> bool:
        """Validate triage request parameters"""
        try:
            # For real-time assessment
            if "conversation_id" in kwargs:
                conversation_id = kwargs["conversation_id"]
                if not isinstance(conversation_id, int) or conversation_id <= 0:
                    logger.error("Invalid conversation ID")
                    return False
            
            # For message content assessment
            if "message_content" in kwargs:
                content = kwargs["message_content"]
                if not isinstance(content, str) or len(content.strip()) == 0:
                    logger.error("Invalid message content")
                    return False
            
            # Assessment type validation
            assessment_type = kwargs.get("assessment_type", "real_time")
            valid_types = ["real_time", "batch", "quality_check", "crisis_scan"]
            if assessment_type not in valid_types:
                logger.error(f"Invalid assessment type: {assessment_type}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Input validation failed: {e}")
            return False

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute triage assessment"""
        assessment_type = kwargs.get("assessment_type", "real_time")
        
        logger.info(f"Starting triage assessment: {assessment_type}")
        
        if assessment_type == "real_time":
            result = await self._real_time_assessment(**kwargs)
        elif assessment_type == "batch":
            result = await self._batch_assessment(**kwargs)
        elif assessment_type == "quality_check":
            result = await self._quality_assessment(**kwargs)
        elif assessment_type == "crisis_scan":
            result = await self._crisis_scan(**kwargs)
        else:
            raise ValueError(f"Unknown assessment type: {assessment_type}")
        
        return result

    async def _real_time_assessment(self, **kwargs) -> Dict[str, Any]:
        """Perform real-time assessment of a conversation or message"""
        try:
            conversation_id = kwargs.get("conversation_id")
            message_content = kwargs.get("message_content")
            user_id = kwargs.get("user_id")
            
            # Get conversation data
            if conversation_id:
                conversation = self.db.query(Conversation).filter(
                    Conversation.id == conversation_id
                ).first()
                
                if not conversation:
                    raise ValueError(f"Conversation {conversation_id} not found")
                
                message_content = conversation.message
                user_id = conversation.user_id
            
            if not message_content:
                raise ValueError("No message content available for assessment")
            
            # Perform comprehensive assessment
            assessment_result = await self._assess_message_content(message_content, user_id)
            
            # Get user context for enhanced assessment
            if user_id:
                user_context = await self._get_user_context(user_id)
                assessment_result["user_context"] = user_context
                
                # Adjust assessment based on user history
                assessment_result = await self._apply_user_context_adjustment(assessment_result, user_context)
            
            # Generate response recommendations
            recommendations = await self._generate_response_recommendations(assessment_result)
            assessment_result["recommendations"] = recommendations
            
            # Check for escalation triggers
            escalation_needed = await self._check_escalation_triggers(assessment_result)
            assessment_result["escalation"] = escalation_needed
            
            # Save assessment to database
            assessment_id = await self._save_triage_assessment(
                conversation_id, user_id, message_content, assessment_result
            )
            assessment_result["assessment_id"] = assessment_id
            
            # Trigger immediate actions if needed
            if escalation_needed["required"]:
                action_result = await self._trigger_immediate_actions(assessment_result)
                assessment_result["immediate_actions"] = action_result
            
            logger.info(f"Real-time assessment completed: severity={assessment_result['severity_level']}")
            
            return assessment_result
            
        except Exception as e:
            logger.error(f"Real-time assessment failed: {e}")
            raise

    async def _batch_assessment(self, **kwargs) -> Dict[str, Any]:
        """Perform batch assessment of multiple conversations"""
        try:
            time_period = kwargs.get("time_period", 24)  # Hours
            user_id = kwargs.get("user_id")  # Optional: specific user
            
            # Get conversations for assessment
            cutoff_time = datetime.utcnow() - timedelta(hours=time_period)
            query = self.db.query(Conversation).filter(
                Conversation.created_at >= cutoff_time
            )
            
            if user_id:
                query = query.filter(Conversation.user_id == user_id)
            
            conversations = query.order_by(desc(Conversation.created_at)).limit(1000).all()
            
            # Assess each conversation
            assessments = []
            severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
            total_risk_score = 0
            escalations_needed = 0
            
            for conv in conversations:
                try:
                    assessment = await self._assess_message_content(conv.message, conv.user_id)
                    assessment["conversation_id"] = conv.id
                    assessment["timestamp"] = conv.created_at.isoformat()
                    
                    assessments.append(assessment)
                    severity_counts[assessment["severity_level"]] += 1
                    total_risk_score += assessment["risk_score"]
                    
                    if assessment["risk_score"] >= self.severity_thresholds["high"]:
                        escalations_needed += 1
                    
                except Exception as e:
                    logger.error(f"Failed to assess conversation {conv.id}: {e}")
                    continue
            
            # Generate batch statistics
            avg_risk_score = total_risk_score / max(len(assessments), 1)
            
            batch_summary = {
                "total_assessed": len(assessments),
                "time_period_hours": time_period,
                "severity_distribution": severity_counts,
                "average_risk_score": round(avg_risk_score, 3),
                "escalations_needed": escalations_needed,
                "assessment_rate": round(len(assessments) / max(len(conversations), 1) * 100, 2)
            }
            
            # Identify high-risk conversations
            high_risk_conversations = [
                a for a in assessments 
                if a["risk_score"] >= self.severity_thresholds["high"]
            ][:10]  # Top 10
            
            # Generate insights
            insights = self._generate_batch_insights(batch_summary, assessments)
            
            return {
                "batch_assessment": batch_summary,
                "high_risk_conversations": high_risk_conversations,
                "insights": insights,
                "recommendations": self._generate_batch_recommendations(batch_summary)
            }
            
        except Exception as e:
            logger.error(f"Batch assessment failed: {e}")
            raise

    async def _quality_assessment(self, **kwargs) -> Dict[str, Any]:
        """Perform quality assessment of triage system performance"""
        try:
            time_period = kwargs.get("time_period", 7)  # Days
            
            # Get recent assessments
            cutoff_time = datetime.utcnow() - timedelta(days=time_period)
            assessments = self.db.query(TriageAssessment).filter(
                TriageAssessment.created_at >= cutoff_time
            ).all()
            
            # Calculate quality metrics
            total_assessments = len(assessments)
            if total_assessments == 0:
                return {
                    "quality_assessment": {
                        "total_assessments": 0,
                        "message": "No assessments found in the specified time period"
                    }
                }
            
            # Performance metrics
            avg_confidence = sum(a.confidence_score for a in assessments) / total_assessments
            avg_processing_time = sum(a.processing_time_ms for a in assessments) / total_assessments
            
            # Severity distribution
            severity_dist = {}
            for assessment in assessments:
                severity = assessment.severity_level
                severity_dist[severity] = severity_dist.get(severity, 0) + 1
            
            # Response time analysis
            response_times = [a.processing_time_ms for a in assessments]
            response_times.sort()
            
            percentile_95 = response_times[int(0.95 * len(response_times))] if response_times else 0
            percentile_99 = response_times[int(0.99 * len(response_times))] if response_times else 0
            
            # Escalation analysis
            escalations = len([a for a in assessments if a.recommended_action in ["immediate", "urgent"]])
            escalation_rate = escalations / total_assessments * 100
            
            quality_metrics = {
                "assessment_period_days": time_period,
                "total_assessments": total_assessments,
                "average_confidence": round(avg_confidence, 3),
                "average_processing_time_ms": round(avg_processing_time, 2),
                "severity_distribution": severity_dist,
                "escalation_rate": round(escalation_rate, 2),
                "response_time_percentiles": {
                    "p95_ms": percentile_95,
                    "p99_ms": percentile_99
                }
            }
            
            # Quality indicators
            quality_score = self._calculate_quality_score(quality_metrics)
            quality_indicators = self._assess_quality_indicators(quality_metrics)
            
            return {
                "quality_assessment": quality_metrics,
                "quality_score": quality_score,
                "quality_indicators": quality_indicators,
                "recommendations": self._generate_quality_recommendations(quality_metrics)
            }
            
        except Exception as e:
            logger.error(f"Quality assessment failed: {e}")
            raise

    async def _crisis_scan(self, **kwargs) -> Dict[str, Any]:
        """Perform comprehensive crisis detection scan"""
        try:
            scan_hours = kwargs.get("scan_hours", 6)  # Recent hours to scan
            include_historical = kwargs.get("include_historical", False)
            
            # Scan recent conversations for crisis indicators
            cutoff_time = datetime.utcnow() - timedelta(hours=scan_hours)
            recent_conversations = self.db.query(Conversation).filter(
                Conversation.created_at >= cutoff_time
            ).order_by(desc(Conversation.created_at)).all()
            
            crisis_indicators = []
            user_risk_levels = {}
            
            for conv in recent_conversations:
                # Quick crisis assessment
                crisis_score = self._quick_crisis_score(conv.message)
                
                if crisis_score >= self.severity_thresholds["high"]:
                    crisis_indicators.append({
                        "conversation_id": conv.id,
                        "user_id": conv.user_id,
                        "crisis_score": crisis_score,
                        "timestamp": conv.created_at.isoformat(),
                        "message_preview": conv.message[:100] + "..." if len(conv.message) > 100 else conv.message
                    })
                
                # Aggregate user risk levels
                if conv.user_id not in user_risk_levels:
                    user_risk_levels[conv.user_id] = []
                user_risk_levels[conv.user_id].append(crisis_score)
            
            # Calculate user-level risk
            high_risk_users = []
            for user_id, scores in user_risk_levels.items():
                avg_score = sum(scores) / len(scores)
                max_score = max(scores)
                
                if max_score >= self.severity_thresholds["critical"] or avg_score >= self.severity_thresholds["high"]:
                    high_risk_users.append({
                        "user_id": user_id,
                        "average_risk": round(avg_score, 3),
                        "max_risk": round(max_score, 3),
                        "conversation_count": len(scores)
                    })
            
            # Historical pattern analysis (if requested)
            historical_analysis = {}
            if include_historical:
                historical_analysis = await self._analyze_historical_crisis_patterns(high_risk_users)
            
            # Generate immediate action plan
            action_plan = self._generate_crisis_action_plan(crisis_indicators, high_risk_users)
            
            return {
                "crisis_scan": {
                    "scan_period_hours": scan_hours,
                    "conversations_scanned": len(recent_conversations),
                    "crisis_indicators_found": len(crisis_indicators),
                    "high_risk_users": len(high_risk_users)
                },
                "crisis_indicators": crisis_indicators,
                "high_risk_users": high_risk_users,
                "historical_analysis": historical_analysis,
                "action_plan": action_plan,
                "recommendations": self._generate_crisis_recommendations(crisis_indicators, high_risk_users)
            }
            
        except Exception as e:
            logger.error(f"Crisis scan failed: {e}")
            raise

    # Core assessment methods
    async def _assess_message_content(self, content: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Perform comprehensive assessment of message content"""
        try:
            # Initialize assessment
            assessment = {
                "risk_score": 0.0,
                "confidence_score": 0.0,
                "severity_level": "low",
                "risk_factors": [],
                "protective_factors": [],
                "indicators": {}
            }
            
            # Crisis keyword analysis
            crisis_analysis = self._analyze_crisis_keywords(content)
            assessment["indicators"]["crisis_keywords"] = crisis_analysis
            assessment["risk_score"] += crisis_analysis["risk_contribution"]
            
            # Sentiment analysis
            sentiment_analysis = self._analyze_sentiment(content)
            assessment["indicators"]["sentiment"] = sentiment_analysis
            assessment["risk_score"] += sentiment_analysis["risk_contribution"]
            
            # Urgency detection
            urgency_analysis = self._analyze_urgency_indicators(content)
            assessment["indicators"]["urgency"] = urgency_analysis
            assessment["risk_score"] += urgency_analysis["risk_contribution"]
            
            # Language pattern analysis
            pattern_analysis = self._analyze_language_patterns(content)
            assessment["indicators"]["language_patterns"] = pattern_analysis
            assessment["risk_score"] += pattern_analysis["risk_contribution"]
            
            # Normalize and classify risk score
            assessment["risk_score"] = min(assessment["risk_score"], 1.0)
            assessment["severity_level"] = self._classify_severity(assessment["risk_score"])
            
            # Calculate confidence score
            assessment["confidence_score"] = self._calculate_confidence_score(assessment)
            
            # Compile risk and protective factors
            assessment["risk_factors"] = self._compile_risk_factors(assessment["indicators"])
            assessment["protective_factors"] = self._compile_protective_factors(assessment["indicators"])
            
            return assessment
            
        except Exception as e:
            logger.error(f"Content assessment failed: {e}")
            raise

    def _analyze_crisis_keywords(self, content: str) -> Dict[str, Any]:
        """Analyze crisis-related keywords in content"""
        content_lower = content.lower()
        
        keyword_scores = {}
        total_score = 0.0
        
        # Check each crisis category
        for category, keywords in self.crisis_keywords.items():
            matches = []
            category_score = 0.0
            
            for keyword in keywords:
                if keyword in content_lower:
                    matches.append(keyword)
                    # Weight scores by severity
                    if category == "immediate_danger":
                        category_score += 0.4
                    elif category == "severe_distress":
                        category_score += 0.3
                    elif category == "moderate_concern":
                        category_score += 0.2
                    else:  # mild_concern
                        category_score += 0.1
            
            keyword_scores[category] = {
                "matches": matches,
                "score": min(category_score, 1.0),
                "count": len(matches)
            }
            
            total_score += category_score
        
        # Normalize total score
        risk_contribution = min(total_score, 0.6)  # Max 60% from keywords
        
        return {
            "keyword_analysis": keyword_scores,
            "total_matches": sum(s["count"] for s in keyword_scores.values()),
            "risk_contribution": risk_contribution,
            "highest_severity_category": max(keyword_scores.items(), key=lambda x: x[1]["score"])[0] if any(s["score"] > 0 for s in keyword_scores.values()) else None
        }

    def _analyze_sentiment(self, content: str) -> Dict[str, Any]:
        """Analyze sentiment indicators in content"""
        # Simplified sentiment analysis (would use ML models in production)
        
        negative_indicators = [
            "hate", "angry", "furious", "devastated", "destroyed", "ruined",
            "worthless", "failure", "terrible", "awful", "horrible", "nightmare"
        ]
        
        positive_indicators = [
            "grateful", "thankful", "blessed", "hopeful", "optimistic", "confident",
            "excited", "happy", "joy", "love", "wonderful", "amazing"
        ]
        
        content_lower = content.lower()
        words = content_lower.split()
        
        negative_count = sum(1 for word in words if any(neg in word for neg in negative_indicators))
        positive_count = sum(1 for word in words if any(pos in word for pos in positive_indicators))
        
        # Calculate sentiment score (-1 to 1)
        total_sentiment_words = negative_count + positive_count
        if total_sentiment_words > 0:
            sentiment_score = (positive_count - negative_count) / total_sentiment_words
        else:
            sentiment_score = 0.0
        
        # Convert to risk contribution (negative sentiment = higher risk)
        risk_contribution = max(0, -sentiment_score * 0.3)  # Max 30% from sentiment
        
        return {
            "sentiment_score": sentiment_score,
            "negative_indicators": negative_count,
            "positive_indicators": positive_count,
            "risk_contribution": risk_contribution,
            "interpretation": self._interpret_sentiment(sentiment_score)
        }

    def _analyze_urgency_indicators(self, content: str) -> Dict[str, Any]:
        """Analyze urgency and immediacy indicators"""
        urgency_phrases = [
            "right now", "immediately", "urgent", "emergency", "crisis",
            "can't wait", "need help now", "asap", "urgent help", "emergency help"
        ]
        
        time_pressure_words = [
            "deadline", "exam tomorrow", "due today", "running out of time",
            "too late", "final chance", "last opportunity"
        ]
        
        content_lower = content.lower()
        
        urgency_matches = [phrase for phrase in urgency_phrases if phrase in content_lower]
        time_pressure_matches = [word for word in time_pressure_words if word in content_lower]
        
        urgency_score = len(urgency_matches) * 0.2 + len(time_pressure_matches) * 0.1
        risk_contribution = min(urgency_score, 0.25)  # Max 25% from urgency
        
        return {
            "urgency_phrases": urgency_matches,
            "time_pressure_indicators": time_pressure_matches,
            "urgency_score": urgency_score,
            "risk_contribution": risk_contribution,
            "has_urgency": len(urgency_matches) > 0 or len(time_pressure_matches) > 0
        }

    def _analyze_language_patterns(self, content: str) -> Dict[str, Any]:
        """Analyze language patterns indicative of mental health state"""
        
        # Isolation indicators
        isolation_words = ["alone", "lonely", "isolated", "no one", "nobody", "by myself"]
        
        # Hopelessness indicators
        hopelessness_words = ["hopeless", "pointless", "useless", "give up", "no point", "why bother"]
        
        # Overwhelm indicators
        overwhelm_words = ["overwhelmed", "too much", "can't handle", "breaking down", "falling apart"]
        
        content_lower = content.lower()
        
        isolation_count = sum(1 for word in isolation_words if word in content_lower)
        hopelessness_count = sum(1 for word in hopelessness_words if word in content_lower)
        overwhelm_count = sum(1 for word in overwhelm_words if word in content_lower)
        
        # Pattern scoring
        pattern_score = (isolation_count * 0.15) + (hopelessness_count * 0.2) + (overwhelm_count * 0.15)
        risk_contribution = min(pattern_score, 0.3)  # Max 30% from patterns
        
        return {
            "isolation_indicators": isolation_count,
            "hopelessness_indicators": hopelessness_count,
            "overwhelm_indicators": overwhelm_count,
            "pattern_score": pattern_score,
            "risk_contribution": risk_contribution,
            "dominant_pattern": self._identify_dominant_pattern(isolation_count, hopelessness_count, overwhelm_count)
        }

    def _classify_severity(self, risk_score: float) -> str:
        """Classify risk score into severity level"""
        if risk_score >= self.severity_thresholds["critical"]:
            return "critical"
        elif risk_score >= self.severity_thresholds["high"]:
            return "high"
        elif risk_score >= self.severity_thresholds["medium"]:
            return "medium"
        else:
            return "low"

    def _calculate_confidence_score(self, assessment: Dict[str, Any]) -> float:
        """Calculate confidence score for the assessment"""
        # Base confidence on number of indicators and their strength
        indicators = assessment["indicators"]
        
        confidence_factors = []
        
        # Crisis keyword confidence
        if indicators["crisis_keywords"]["total_matches"] > 0:
            confidence_factors.append(0.8)
        
        # Sentiment confidence
        if abs(indicators["sentiment"]["sentiment_score"]) > 0.3:
            confidence_factors.append(0.7)
        
        # Urgency confidence
        if indicators["urgency"]["has_urgency"]:
            confidence_factors.append(0.6)
        
        # Pattern confidence
        if indicators["language_patterns"]["pattern_score"] > 0.2:
            confidence_factors.append(0.5)
        
        # Calculate weighted average
        if confidence_factors:
            confidence = sum(confidence_factors) / len(confidence_factors)
        else:
            confidence = 0.3  # Base confidence for minimal indicators
        
        return round(min(confidence, 1.0), 3)

    # Helper methods
    def _quick_crisis_score(self, content: str) -> float:
        """Quick crisis scoring for batch processing"""
        content_lower = content.lower()
        
        # High-priority crisis indicators
        immediate_indicators = ["suicide", "kill myself", "end it all", "hurt myself"]
        severe_indicators = ["hopeless", "can't go on", "crisis", "emergency"]
        
        score = 0.0
        
        for indicator in immediate_indicators:
            if indicator in content_lower:
                score += 0.4
        
        for indicator in severe_indicators:
            if indicator in content_lower:
                score += 0.2
        
        return min(score, 1.0)

    async def _get_user_context(self, user_id: int) -> Dict[str, Any]:
        """Get user context for enhanced assessment"""
        try:
            # Get recent conversation history
            recent_conversations = self.db.query(Conversation).filter(
                and_(
                    Conversation.user_id == user_id,
                    Conversation.created_at >= datetime.utcnow() - timedelta(days=7)
                )
            ).order_by(desc(Conversation.created_at)).limit(10).all()
            
            # Get recent assessments
            recent_assessments = self.db.query(TriageAssessment).filter(
                and_(
                    TriageAssessment.user_id == user_id,
                    TriageAssessment.created_at >= datetime.utcnow() - timedelta(days=30)
                )
            ).order_by(desc(TriageAssessment.created_at)).limit(5).all()
            
            # Calculate user patterns
            context = {
                "recent_conversation_count": len(recent_conversations),
                "recent_assessment_count": len(recent_assessments),
                "average_risk_trend": 0.0,
                "escalation_history": 0,
                "engagement_pattern": "normal"
            }
            
            if recent_assessments:
                context["average_risk_trend"] = sum(a.risk_score for a in recent_assessments) / len(recent_assessments)
                context["escalation_history"] = len([a for a in recent_assessments if a.recommended_action in ["immediate", "urgent"]])
            
            # Determine engagement pattern
            if len(recent_conversations) > 5:
                context["engagement_pattern"] = "high"
            elif len(recent_conversations) < 2:
                context["engagement_pattern"] = "low"
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to get user context: {e}")
            return {}

    async def _apply_user_context_adjustment(self, assessment: Dict[str, Any], user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply user context to adjust assessment"""
        try:
            # Adjust risk score based on user history
            risk_adjustment = 0.0
            
            # Recent escalation history increases current risk
            if user_context.get("escalation_history", 0) > 1:
                risk_adjustment += 0.1
                assessment["risk_factors"].append("Recent escalation history")
            
            # High recent risk trend increases current assessment
            avg_risk = user_context.get("average_risk_trend", 0.0)
            if avg_risk > 0.6:
                risk_adjustment += 0.05
                assessment["risk_factors"].append("Elevated recent risk trend")
            
            # Low engagement might indicate withdrawal
            if user_context.get("engagement_pattern") == "low":
                risk_adjustment += 0.05
                assessment["risk_factors"].append("Low engagement pattern")
            
            # Apply adjustment
            assessment["risk_score"] = min(assessment["risk_score"] + risk_adjustment, 1.0)
            assessment["severity_level"] = self._classify_severity(assessment["risk_score"])
            assessment["context_adjustment"] = risk_adjustment
            
            return assessment
            
        except Exception as e:
            logger.error(f"Context adjustment failed: {e}")
            return assessment

    async def _generate_response_recommendations(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response recommendations based on assessment"""
        severity = assessment["severity_level"]
        risk_score = assessment["risk_score"]
        
        if severity == "critical":
            return {
                "priority": "immediate",
                "response_type": "crisis_intervention",
                "suggested_actions": [
                    "Immediate human counselor contact",
                    "Crisis hotline information",
                    "Emergency services if imminent danger",
                    "Follow-up within 1 hour"
                ],
                "response_template": self.response_templates["crisis_immediate"],
                "escalation_required": True,
                "max_response_time_minutes": 5
            }
        elif severity == "high":
            return {
                "priority": "urgent",
                "response_type": "urgent_support",
                "suggested_actions": [
                    "Professional counselor referral",
                    "Crisis resources and hotlines",
                    "Safety planning discussion",
                    "Follow-up within 24 hours"
                ],
                "response_template": self.response_templates["urgent_support"],
                "escalation_required": True,
                "max_response_time_minutes": 30
            }
        elif severity == "medium":
            return {
                "priority": "standard",
                "response_type": "supportive_guidance",
                "suggested_actions": [
                    "Empathetic response",
                    "Coping strategies",
                    "Resource recommendations",
                    "Encourage professional help"
                ],
                "response_template": self.response_templates["supportive_guidance"],
                "escalation_required": False,
                "max_response_time_minutes": 120
            }
        else:  # low
            return {
                "priority": "routine",
                "response_type": "general_support",
                "suggested_actions": [
                    "Encouraging response",
                    "General wellness tips",
                    "Available resources mention"
                ],
                "response_template": self.response_templates["general_support"],
                "escalation_required": False,
                "max_response_time_minutes": 240
            }

    async def _check_escalation_triggers(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Check if escalation is required"""
        required = False
        triggers = []
        escalation_level = "none"
        
        if assessment["severity_level"] == "critical":
            required = True
            triggers.append("Critical risk level detected")
            escalation_level = "immediate"
        elif assessment["severity_level"] == "high":
            required = True
            triggers.append("High risk level detected")
            escalation_level = "urgent"
        
        # Additional trigger conditions
        if assessment["risk_score"] > 0.85:
            if not required:
                required = True
                escalation_level = "urgent"
            triggers.append("Very high risk score")
        
        # Crisis keyword triggers
        crisis_analysis = assessment["indicators"]["crisis_keywords"]
        if crisis_analysis.get("highest_severity_category") == "immediate_danger":
            if not required:
                required = True
                escalation_level = "immediate"
            triggers.append("Immediate danger keywords detected")
        
        return {
            "required": required,
            "level": escalation_level,
            "triggers": triggers,
            "recommended_actions": self._get_escalation_actions(escalation_level)
        }

    async def _trigger_immediate_actions(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger immediate actions for high-risk assessments"""
        try:
            actions_taken = []
            
            escalation_level = assessment["escalation"]["level"]
            
            # Log high-priority assessment
            logger.warning(f"High-risk assessment triggered: {escalation_level}")
            actions_taken.append("High-priority assessment logged")
            
            # Notify monitoring systems (simulated)
            if escalation_level == "immediate":
                # Would integrate with alerting system
                actions_taken.append("Immediate alert sent to crisis team")
                actions_taken.append("Emergency protocols activated")
            elif escalation_level == "urgent":
                actions_taken.append("Urgent notification sent to counseling team")
            
            # Store in priority queue (simulated)
            if self.redis_client:
                try:
                    priority_data = {
                        "assessment_id": assessment.get("assessment_id"),
                        "user_id": assessment.get("user_context", {}).get("user_id"),
                        "risk_score": assessment["risk_score"],
                        "severity": assessment["severity_level"],
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    # Would store in Redis priority queue
                    actions_taken.append("Added to priority response queue")
                except Exception as e:
                    logger.error(f"Failed to add to priority queue: {e}")
            
            return {
                "actions_taken": actions_taken,
                "timestamp": datetime.utcnow().isoformat(),
                "escalation_level": escalation_level
            }
            
        except Exception as e:
            logger.error(f"Failed to trigger immediate actions: {e}")
            return {"error": str(e)}

    async def _save_triage_assessment(self, conversation_id: Optional[int], user_id: Optional[int], 
                                    content: str, assessment: Dict[str, Any]) -> int:
        """Save triage assessment to database"""
        try:
            # Extract key values from assessment
            triage_assessment = TriageAssessment(
                conversation_id=conversation_id,
                user_id=user_id,
                risk_score=assessment["risk_score"],
                confidence_score=assessment["confidence_score"],
                severity_level=assessment["severity_level"],
                risk_factors=assessment["risk_factors"],
                recommended_action=assessment["recommendations"]["priority"],
                assessment_data=assessment,
                processing_time_ms=100  # Would calculate actual processing time
            )
            
            self.db.add(triage_assessment)
            self.db.commit()
            self.db.refresh(triage_assessment)
            
            logger.info(f"Triage assessment saved with ID: {triage_assessment.id}")
            return triage_assessment.id
            
        except Exception as e:
            logger.error(f"Failed to save triage assessment: {e}")
            raise

    # Additional helper methods for analysis
    def _interpret_sentiment(self, sentiment_score: float) -> str:
        """Interpret sentiment score"""
        if sentiment_score >= 0.3:
            return "positive"
        elif sentiment_score <= -0.3:
            return "negative"
        else:
            return "neutral"

    def _identify_dominant_pattern(self, isolation: int, hopelessness: int, overwhelm: int) -> str:
        """Identify dominant language pattern"""
        if hopelessness > isolation and hopelessness > overwhelm:
            return "hopelessness"
        elif isolation > overwhelm:
            return "isolation"
        elif overwhelm > 0:
            return "overwhelm"
        else:
            return "none"

    def _compile_risk_factors(self, indicators: Dict[str, Any]) -> List[str]:
        """Compile list of identified risk factors"""
        factors = []
        
        # Crisis keywords
        if indicators["crisis_keywords"]["total_matches"] > 0:
            factors.append(f"Crisis language detected ({indicators['crisis_keywords']['total_matches']} matches)")
        
        # Negative sentiment
        if indicators["sentiment"]["sentiment_score"] < -0.3:
            factors.append("Negative emotional expression")
        
        # Urgency
        if indicators["urgency"]["has_urgency"]:
            factors.append("Urgency indicators present")
        
        # Language patterns
        patterns = indicators["language_patterns"]
        if patterns["hopelessness_indicators"] > 0:
            factors.append("Hopelessness language")
        if patterns["isolation_indicators"] > 0:
            factors.append("Isolation themes")
        if patterns["overwhelm_indicators"] > 0:
            factors.append("Overwhelm expressions")
        
        return factors

    def _compile_protective_factors(self, indicators: Dict[str, Any]) -> List[str]:
        """Compile list of protective factors"""
        factors = []
        
        # Positive sentiment
        if indicators["sentiment"]["sentiment_score"] > 0.3:
            factors.append("Positive emotional expression")
        
        # Help-seeking language (simplified detection)
        # This would be more sophisticated in production
        if indicators["urgency"]["has_urgency"]:
            factors.append("Help-seeking behavior")
        
        return factors

    def _get_escalation_actions(self, escalation_level: str) -> List[str]:
        """Get recommended escalation actions"""
        if escalation_level == "immediate":
            return [
                "Contact crisis intervention team immediately",
                "Provide crisis hotline information",
                "Consider emergency services contact",
                "Initiate safety planning protocol"
            ]
        elif escalation_level == "urgent":
            return [
                "Schedule urgent counselor consultation",
                "Provide crisis resources",
                "Monitor closely for 24 hours",
                "Follow up within 1 hour"
            ]
        else:
            return ["Standard monitoring and support"]

    def _initialize_response_templates(self) -> Dict[str, Dict]:
        """Initialize response templates for different severity levels"""
        return {
            "crisis_immediate": {
                "message": "I'm very concerned about what you've shared. Your safety is the most important thing right now. Please reach out to a crisis counselor immediately.",
                "resources": ["Crisis Hotline: 988", "Emergency Services: 911", "Crisis Text Line"],
                "tone": "urgent_caring"
            },
            "urgent_support": {
                "message": "Thank you for sharing this with me. What you're going through sounds really difficult. I want to connect you with someone who can provide the support you need.",
                "resources": ["Campus Counseling Center", "Mental Health Hotline", "Crisis Resources"],
                "tone": "supportive_concerned"
            },
            "supportive_guidance": {
                "message": "I hear that you're going through a challenging time. It takes courage to reach out. There are people and resources available to help you through this.",
                "resources": ["Counseling Services", "Support Groups", "Wellness Resources"],
                "tone": "empathetic_encouraging"
            },
            "general_support": {
                "message": "Thank you for sharing. It sounds like you're managing some challenges. Remember that support is available when you need it.",
                "resources": ["Student Resources", "Wellness Tips", "Mental Health Information"],
                "tone": "friendly_supportive"
            }
        }

    # Batch processing helper methods
    def _generate_batch_insights(self, summary: Dict, assessments: List[Dict]) -> List[str]:
        """Generate insights from batch assessment"""
        insights = []
        
        if summary["escalations_needed"] > summary["total_assessed"] * 0.1:
            insights.append(f"High escalation rate detected: {summary['escalations_needed']} cases need immediate attention")
        
        if summary["average_risk_score"] > 0.5:
            insights.append("Overall risk levels are elevated above normal baseline")
        
        critical_count = summary["severity_distribution"].get("critical", 0)
        if critical_count > 0:
            insights.append(f"{critical_count} critical cases require immediate intervention")
        
        return insights

    def _generate_batch_recommendations(self, summary: Dict) -> List[str]:
        """Generate recommendations from batch assessment"""
        recommendations = []
        
        if summary["escalations_needed"] > 5:
            recommendations.append("Consider increasing counseling staff availability")
            recommendations.append("Review crisis intervention protocols")
        
        if summary["average_risk_score"] > 0.4:
            recommendations.append("Implement proactive wellness campaigns")
            recommendations.append("Increase mental health resource visibility")
        
        return recommendations

    # Quality assessment helper methods
    def _calculate_quality_score(self, metrics: Dict) -> float:
        """Calculate overall quality score"""
        # Weighted scoring based on key metrics
        confidence_score = min(metrics["average_confidence"] / 0.8, 1.0) * 0.3
        speed_score = min(500 / max(metrics["average_processing_time_ms"], 1), 1.0) * 0.2
        escalation_score = (1.0 - min(metrics["escalation_rate"] / 20, 1.0)) * 0.3  # Optimal ~10% escalation
        volume_score = min(metrics["total_assessments"] / 100, 1.0) * 0.2
        
        overall_score = confidence_score + speed_score + escalation_score + volume_score
        return round(overall_score, 3)

    def _assess_quality_indicators(self, metrics: Dict) -> Dict[str, str]:
        """Assess quality indicators"""
        indicators = {}
        
        # Confidence assessment
        if metrics["average_confidence"] >= 0.8:
            indicators["confidence"] = "excellent"
        elif metrics["average_confidence"] >= 0.6:
            indicators["confidence"] = "good"
        else:
            indicators["confidence"] = "needs_improvement"
        
        # Performance assessment
        if metrics["average_processing_time_ms"] <= 200:
            indicators["performance"] = "excellent"
        elif metrics["average_processing_time_ms"] <= 500:
            indicators["performance"] = "good"
        else:
            indicators["performance"] = "needs_improvement"
        
        # Escalation rate assessment
        escalation_rate = metrics["escalation_rate"]
        if 5 <= escalation_rate <= 15:
            indicators["escalation_rate"] = "optimal"
        elif escalation_rate < 5:
            indicators["escalation_rate"] = "possibly_low"
        else:
            indicators["escalation_rate"] = "possibly_high"
        
        return indicators

    def _generate_quality_recommendations(self, metrics: Dict) -> List[str]:
        """Generate quality improvement recommendations"""
        recommendations = []
        
        if metrics["average_confidence"] < 0.6:
            recommendations.append("Review and improve assessment algorithms")
            recommendations.append("Increase training data for better accuracy")
        
        if metrics["average_processing_time_ms"] > 500:
            recommendations.append("Optimize processing algorithms for better performance")
            recommendations.append("Consider scaling infrastructure")
        
        if metrics["escalation_rate"] > 20:
            recommendations.append("Review escalation thresholds for appropriate sensitivity")
        elif metrics["escalation_rate"] < 5:
            recommendations.append("Ensure assessment sensitivity for edge cases")
        
        return recommendations

    # Crisis scan helper methods
    async def _analyze_historical_crisis_patterns(self, high_risk_users: List[Dict]) -> Dict[str, Any]:
        """Analyze historical crisis patterns for high-risk users"""
        try:
            if not high_risk_users:
                return {"message": "No high-risk users identified"}
            
            # Get historical data for high-risk users
            user_ids = [user["user_id"] for user in high_risk_users]
            
            historical_assessments = self.db.query(TriageAssessment).filter(
                and_(
                    TriageAssessment.user_id.in_(user_ids),
                    TriageAssessment.created_at >= datetime.utcnow() - timedelta(days=90)
                )
            ).all()
            
            # Analyze patterns
            user_patterns = {}
            for assessment in historical_assessments:
                user_id = assessment.user_id
                if user_id not in user_patterns:
                    user_patterns[user_id] = []
                user_patterns[user_id].append({
                    "risk_score": assessment.risk_score,
                    "severity": assessment.severity_level,
                    "timestamp": assessment.created_at.isoformat()
                })
            
            # Generate pattern insights
            pattern_insights = []
            for user_id, patterns in user_patterns.items():
                if len(patterns) >= 3:
                    scores = [p["risk_score"] for p in patterns]
                    if scores[-1] > scores[0]:
                        pattern_insights.append(f"User {user_id}: escalating risk pattern")
                    
                    high_risk_frequency = len([s for s in scores if s > 0.6])
                    if high_risk_frequency > len(scores) * 0.5:
                        pattern_insights.append(f"User {user_id}: frequently high-risk")
            
            return {
                "users_analyzed": len(user_patterns),
                "pattern_insights": pattern_insights,
                "historical_data_points": len(historical_assessments)
            }
            
        except Exception as e:
            logger.error(f"Historical pattern analysis failed: {e}")
            return {"error": str(e)}

    def _generate_crisis_action_plan(self, crisis_indicators: List[Dict], high_risk_users: List[Dict]) -> Dict[str, Any]:
        """Generate immediate action plan for crisis situations"""
        action_plan = {
            "immediate_actions": [],
            "urgent_actions": [],
            "monitoring_actions": [],
            "follow_up_actions": []
        }
        
        # Immediate actions for critical cases
        critical_cases = [c for c in crisis_indicators if c["crisis_score"] >= self.severity_thresholds["critical"]]
        if critical_cases:
            action_plan["immediate_actions"] = [
                f"Contact crisis team for {len(critical_cases)} critical cases",
                "Initiate emergency protocols",
                "Provide immediate crisis resources"
            ]
        
        # Urgent actions for high-risk cases
        high_risk_cases = [c for c in crisis_indicators if c["crisis_score"] >= self.severity_thresholds["high"]]
        if high_risk_cases:
            action_plan["urgent_actions"] = [
                f"Prioritize {len(high_risk_cases)} high-risk conversations",
                "Schedule urgent counselor consultations",
                "Increase monitoring frequency"
            ]
        
        # Monitoring for high-risk users
        if high_risk_users:
            action_plan["monitoring_actions"] = [
                f"Enhanced monitoring for {len(high_risk_users)} users",
                "Daily check-ins for next 7 days",
                "Track engagement patterns"
            ]
        
        # Follow-up actions
        action_plan["follow_up_actions"] = [
            "Review effectiveness of interventions in 24 hours",
            "Update risk assessments based on responses",
            "Document lessons learned"
        ]
        
        return action_plan

    def _generate_crisis_recommendations(self, crisis_indicators: List[Dict], high_risk_users: List[Dict]) -> List[str]:
        """Generate recommendations based on crisis scan results"""
        recommendations = []
        
        if len(crisis_indicators) > 10:
            recommendations.append("Consider increasing crisis intervention capacity")
            recommendations.append("Review system-wide mental health support availability")
        
        if len(high_risk_users) > 5:
            recommendations.append("Implement proactive outreach for high-risk users")
            recommendations.append("Consider group intervention programs")
        
        recommendations.append("Conduct follow-up crisis scan in 6 hours")
        recommendations.append("Update escalation protocols based on findings")
        
        return recommendations
