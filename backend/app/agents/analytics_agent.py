"""
Analytics Agent for UGM-AICare Three-Agent Framework

This agent periodically analyzes anonymized student interaction data to identify
emerging mental health trends and patterns, providing insights for proactive interventions.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import json

from .base_agent import BaseAgent, AgentType, AgentStatus
from ..models import User, Message, JournalEntry
from ..database.database import get_db


logger = logging.getLogger(__name__)


class AnalyticsAgent(BaseAgent):
    """
    Analytics Agent - Identifies emerging mental health trends and patterns
    
    Responsibilities:
    - Analyze anonymized conversation data
    - Detect sentiment trends over time
    - Identify pattern changes (exam periods, seasonal effects)
    - Generate insights for intervention triggers
    - Create weekly/monthly trend reports
    """

    def __init__(self, db: Session, redis_client=None):
        super().__init__(AgentType.ANALYTICS, redis_client)
        self.db = db
        
        # Analysis configuration
        self.min_conversations_for_trend = 10
        self.sentiment_threshold_change = 0.15  # 15% change threshold
        self.pattern_detection_window_days = 30
        
        self.logger.info("Analytics Agent initialized")

    async def execute(self, timeframe: str = "weekly", **kwargs) -> Dict[str, Any]:
        """
        Main execution method for analytics agent
        
        Args:
            timeframe: Analysis timeframe ('weekly', 'monthly', 'daily')
        
        Returns:
            Dict containing analysis results and insights
        """
        self.logger.info(f"Starting analytics execution for {timeframe} timeframe")
        
        # Calculate date range based on timeframe
        end_date = datetime.now(timezone.utc)
        if timeframe == "daily":
            start_date = end_date - timedelta(days=1)
        elif timeframe == "weekly":
            start_date = end_date - timedelta(weeks=1)
        elif timeframe == "monthly":
            start_date = end_date - timedelta(days=30)
        else:
            raise ValueError(f"Invalid timeframe: {timeframe}")
        
        # Perform analysis
        conversation_data = await self._fetch_conversation_data(start_date, end_date)
        journal_data = await self._fetch_journal_data(start_date, end_date)
        user_activity = await self._fetch_user_activity(start_date, end_date)
        
        # Analyze patterns
        sentiment_trends = await self._analyze_sentiment_trends(conversation_data)
        topic_patterns = await self._analyze_topic_patterns(conversation_data)
        temporal_patterns = await self._analyze_temporal_patterns(conversation_data, journal_data)
        engagement_metrics = await self._analyze_engagement_metrics(user_activity)
        
        # Generate insights
        insights = await self._generate_insights(
            sentiment_trends, topic_patterns, temporal_patterns, engagement_metrics
        )
        
        # Compile final report
        report = {
            "timeframe": timeframe,
            "analysis_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "data_summary": {
                "total_conversations": len(conversation_data),
                "total_journal_entries": len(journal_data),
                "active_users": len(user_activity)
            },
            "sentiment_trends": sentiment_trends,
            "topic_patterns": topic_patterns,
            "temporal_patterns": temporal_patterns,
            "engagement_metrics": engagement_metrics,
            "insights": insights,
            "intervention_triggers": await self._identify_intervention_triggers(insights)
        }
        
        # Store report in database (you'll need to create analytics_reports table)
        await self._store_analytics_report(report)
        
        self.logger.info(f"Analytics execution completed. Generated {len(insights)} insights")
        
        return report

    async def validate_input(self, timeframe: str = "weekly", **kwargs) -> bool:
        """Validate input parameters"""
        valid_timeframes = ["daily", "weekly", "monthly"]
        if timeframe not in valid_timeframes:
            self.logger.error(f"Invalid timeframe: {timeframe}. Must be one of {valid_timeframes}")
            return False
        
        if not self.db:
            self.logger.error("Database session not available")
            return False
        
        return True

    async def _fetch_conversation_data(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Fetch anonymized conversation data for analysis"""
        try:
            # Fetch messages within date range
            messages = self.db.query(Message).filter(
                and_(
                    Message.timestamp >= start_date,
                    Message.timestamp <= end_date,
                    Message.role == 'user'  # Only analyze user messages
                )
            ).all()
            
            # Anonymize and structure data
            conversation_data = []
            for message in messages:
                # Basic anonymization - remove any personal identifiers
                anonymized_content = self._anonymize_content(message.content)
                
                conversation_data.append({
                    "user_hash": self._generate_user_hash(message.user_id),
                    "content": anonymized_content,
                    "timestamp": message.timestamp.isoformat(),
                    "session_id": message.session_id,
                    "content_length": len(message.content),
                    "hour_of_day": message.timestamp.hour,
                    "day_of_week": message.timestamp.weekday()
                })
            
            self.logger.info(f"Fetched {len(conversation_data)} conversation records")
            return conversation_data
            
        except Exception as e:
            self.logger.error(f"Error fetching conversation data: {e}")
            return []

    async def _fetch_journal_data(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Fetch anonymized journal data for analysis"""
        try:
            journal_entries = self.db.query(JournalEntry).filter(
                and_(
                    JournalEntry.created_at >= start_date,
                    JournalEntry.created_at <= end_date
                )
            ).all()
            
            journal_data = []
            for entry in journal_entries:
                journal_data.append({
                    "user_hash": self._generate_user_hash(entry.user_id),
                    "mood_rating": entry.mood_rating,
                    "content_length": len(entry.content) if entry.content else 0,
                    "timestamp": entry.created_at.isoformat(),
                    "tags": entry.tags or [],
                    "day_of_week": entry.created_at.weekday()
                })
            
            self.logger.info(f"Fetched {len(journal_data)} journal records")
            return journal_data
            
        except Exception as e:
            self.logger.error(f"Error fetching journal data: {e}")
            return []

    async def _fetch_user_activity(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Fetch user activity metrics"""
        try:
            # Get active users and their activity
            user_activity = self.db.query(
                Message.user_id,
                func.count(Message.id).label('message_count'),
                func.min(Message.timestamp).label('first_activity'),
                func.max(Message.timestamp).label('last_activity')
            ).filter(
                and_(
                    Message.timestamp >= start_date,
                    Message.timestamp <= end_date
                )
            ).group_by(Message.user_id).all()
            
            activity_data = []
            for activity in user_activity:
                activity_data.append({
                    "user_hash": self._generate_user_hash(activity.user_id),
                    "message_count": activity.message_count,
                    "first_activity": activity.first_activity.isoformat(),
                    "last_activity": activity.last_activity.isoformat(),
                    "session_duration_hours": (activity.last_activity - activity.first_activity).total_seconds() / 3600
                })
            
            self.logger.info(f"Fetched activity data for {len(activity_data)} users")
            return activity_data
            
        except Exception as e:
            self.logger.error(f"Error fetching user activity: {e}")
            return []

    async def _analyze_sentiment_trends(self, conversation_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze sentiment trends in conversations"""
        if not conversation_data:
            return {"error": "No conversation data available"}
        
        # Simple sentiment analysis based on keywords (in production, use proper NLP)
        positive_keywords = ["happy", "good", "great", "better", "excited", "grateful", "thanks", "helpful"]
        negative_keywords = ["sad", "depressed", "anxious", "worried", "stressed", "tired", "upset", "angry"]
        crisis_keywords = ["suicide", "kill myself", "end it all", "can't go on", "worthless", "hopeless"]
        
        sentiment_scores = []
        daily_sentiment = {}
        crisis_indicators = 0
        
        for conv in conversation_data:
            content_lower = conv["content"].lower()
            score = 0
            
            # Check for crisis indicators
            if any(keyword in content_lower for keyword in crisis_keywords):
                crisis_indicators += 1
                score -= 2  # Strong negative weight for crisis content
            
            # Calculate basic sentiment score
            positive_count = sum(1 for keyword in positive_keywords if keyword in content_lower)
            negative_count = sum(1 for keyword in negative_keywords if keyword in content_lower)
            
            score += positive_count * 1
            score -= negative_count * 1
            
            sentiment_scores.append(score)
            
            # Group by day for trend analysis
            date_key = conv["timestamp"][:10]  # YYYY-MM-DD
            if date_key not in daily_sentiment:
                daily_sentiment[date_key] = []
            daily_sentiment[date_key].append(score)
        
        # Calculate overall metrics
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        
        # Calculate daily averages
        daily_averages = {}
        for date, scores in daily_sentiment.items():
            daily_averages[date] = sum(scores) / len(scores) if scores else 0
        
        return {
            "overall_sentiment": round(avg_sentiment, 3),
            "total_conversations": len(conversation_data),
            "crisis_indicators": crisis_indicators,
            "crisis_rate": round((crisis_indicators / len(conversation_data)) * 100, 2) if conversation_data else 0,
            "daily_sentiment_trend": daily_averages,
            "sentiment_distribution": {
                "positive": sum(1 for score in sentiment_scores if score > 0),
                "neutral": sum(1 for score in sentiment_scores if score == 0),
                "negative": sum(1 for score in sentiment_scores if score < 0)
            }
        }

    async def _analyze_topic_patterns(self, conversation_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze common topics and themes in conversations"""
        if not conversation_data:
            return {"error": "No conversation data available"}
        
        # Define topic keywords (in production, use proper topic modeling)
        topic_keywords = {
            "academic_stress": ["exam", "test", "study", "assignment", "grade", "academic", "school", "university"],
            "social_anxiety": ["friends", "social", "awkward", "embarrassed", "lonely", "isolated", "shy"],
            "depression": ["sad", "empty", "hopeless", "meaningless", "depressed", "down", "low"],
            "anxiety": ["anxious", "worried", "panic", "nervous", "fear", "stress", "overwhelmed"],
            "relationships": ["relationship", "boyfriend", "girlfriend", "family", "parents", "love", "breakup"],
            "sleep_issues": ["sleep", "insomnia", "tired", "exhausted", "can't sleep", "nightmares"],
            "self_esteem": ["worthless", "useless", "failure", "confidence", "self-worth", "ugly", "stupid"]
        }
        
        topic_counts = {topic: 0 for topic in topic_keywords.keys()}
        hourly_patterns = {}
        
        for conv in conversation_data:
            content_lower = conv["content"].lower()
            hour = conv["hour_of_day"]
            
            # Count topic occurrences
            for topic, keywords in topic_keywords.items():
                if any(keyword in content_lower for keyword in keywords):
                    topic_counts[topic] += 1
            
            # Track hourly patterns
            if hour not in hourly_patterns:
                hourly_patterns[hour] = 0
            hourly_patterns[hour] += 1
        
        # Calculate percentages
        total_conversations = len(conversation_data)
        topic_percentages = {
            topic: round((count / total_conversations) * 100, 2) 
            for topic, count in topic_counts.items()
        }
        
        return {
            "topic_distribution": topic_counts,
            "topic_percentages": topic_percentages,
            "most_common_topics": sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:5],
            "hourly_activity_pattern": hourly_patterns,
            "peak_activity_hours": sorted(hourly_patterns.items(), key=lambda x: x[1], reverse=True)[:3]
        }

    async def _analyze_temporal_patterns(self, conversation_data: List[Dict[str, Any]], journal_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze temporal patterns in user activity and mood"""
        if not conversation_data and not journal_data:
            return {"error": "No data available for temporal analysis"}
        
        # Analyze conversation patterns by day of week
        conversation_by_day = {}
        for conv in conversation_data:
            day = conv["day_of_week"]  # 0=Monday, 6=Sunday
            if day not in conversation_by_day:
                conversation_by_day[day] = 0
            conversation_by_day[day] += 1
        
        # Analyze journal mood patterns
        mood_by_day = {}
        if journal_data:
            for entry in journal_data:
                if entry["mood_rating"]:
                    day = entry["day_of_week"]
                    if day not in mood_by_day:
                        mood_by_day[day] = []
                    mood_by_day[day].append(entry["mood_rating"])
        
        # Calculate average mood by day
        avg_mood_by_day = {}
        for day, moods in mood_by_day.items():
            avg_mood_by_day[day] = round(sum(moods) / len(moods), 2) if moods else 0
        
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        return {
            "conversation_patterns": {
                "by_day_of_week": {day_names[day]: count for day, count in conversation_by_day.items()},
                "busiest_days": sorted(conversation_by_day.items(), key=lambda x: x[1], reverse=True)[:3]
            },
            "mood_patterns": {
                "average_mood_by_day": {day_names[day]: mood for day, mood in avg_mood_by_day.items()},
                "mood_trend": "stable"  # Would need more sophisticated analysis for actual trend
            },
            "recommendations": self._generate_temporal_recommendations(conversation_by_day, avg_mood_by_day)
        }

    async def _analyze_engagement_metrics(self, user_activity: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze user engagement patterns"""
        if not user_activity:
            return {"error": "No user activity data available"}
        
        message_counts = [activity["message_count"] for activity in user_activity]
        session_durations = [activity["session_duration_hours"] for activity in user_activity]
        
        # Calculate engagement metrics
        avg_messages_per_user = sum(message_counts) / len(message_counts) if message_counts else 0
        avg_session_duration = sum(session_durations) / len(session_durations) if session_durations else 0
        
        # Categorize users by engagement level
        high_engagement = sum(1 for count in message_counts if count >= 10)
        medium_engagement = sum(1 for count in message_counts if 3 <= count < 10)
        low_engagement = sum(1 for count in message_counts if count < 3)
        
        return {
            "total_active_users": len(user_activity),
            "average_messages_per_user": round(avg_messages_per_user, 2),
            "average_session_duration_hours": round(avg_session_duration, 2),
            "engagement_distribution": {
                "high_engagement": high_engagement,
                "medium_engagement": medium_engagement,
                "low_engagement": low_engagement
            },
            "engagement_rate": round((high_engagement / len(user_activity)) * 100, 2) if user_activity else 0
        }

    async def _generate_insights(self, sentiment_trends: Dict, topic_patterns: Dict, 
                                temporal_patterns: Dict, engagement_metrics: Dict) -> List[Dict[str, Any]]:
        """Generate actionable insights from analysis results"""
        insights = []
        
        # Sentiment insights
        if sentiment_trends.get("crisis_rate", 0) > 5:  # More than 5% crisis indicators
            insights.append({
                "type": "crisis_alert",
                "severity": "high",
                "title": "Elevated Crisis Indicators Detected",
                "description": f"Crisis indicators found in {sentiment_trends['crisis_rate']}% of conversations",
                "recommendation": "Immediate review of crisis intervention protocols recommended",
                "data": {"crisis_rate": sentiment_trends["crisis_rate"]},
                "priority": 1
            })
        
        if sentiment_trends.get("overall_sentiment", 0) < -0.5:
            insights.append({
                "type": "sentiment_decline",
                "severity": "medium",
                "title": "Overall Sentiment Decline",
                "description": "Average sentiment has decreased significantly",
                "recommendation": "Consider proactive outreach campaign for mood support",
                "data": {"sentiment_score": sentiment_trends["overall_sentiment"]},
                "priority": 2
            })
        
        # Topic insights
        if topic_patterns.get("topic_percentages", {}).get("academic_stress", 0) > 30:
            insights.append({
                "type": "academic_stress",
                "severity": "medium",
                "title": "High Academic Stress Levels",
                "description": f"Academic stress mentioned in {topic_patterns['topic_percentages']['academic_stress']}% of conversations",
                "recommendation": "Deploy study skills and stress management resources",
                "data": {"stress_percentage": topic_patterns["topic_percentages"]["academic_stress"]},
                "priority": 2
            })
        
        # Engagement insights
        if engagement_metrics.get("engagement_rate", 0) < 20:
            insights.append({
                "type": "low_engagement",
                "severity": "low",
                "title": "Low User Engagement",
                "description": f"Only {engagement_metrics['engagement_rate']}% of users show high engagement",
                "recommendation": "Review user experience and implement engagement strategies",
                "data": {"engagement_rate": engagement_metrics["engagement_rate"]},
                "priority": 3
            })
        
        return sorted(insights, key=lambda x: x["priority"])

    async def _identify_intervention_triggers(self, insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify which insights should trigger automated interventions"""
        triggers = []
        
        for insight in insights:
            if insight["severity"] in ["high", "medium"]:
                trigger = {
                    "insight_id": insight["type"],
                    "trigger_type": self._map_insight_to_intervention(insight["type"]),
                    "target_criteria": self._generate_target_criteria(insight),
                    "recommended_action": insight["recommendation"],
                    "priority": insight["priority"],
                    "data": insight["data"]
                }
                triggers.append(trigger)
        
        return triggers

    def _map_insight_to_intervention(self, insight_type: str) -> str:
        """Map insight types to intervention types"""
        mapping = {
            "crisis_alert": "crisis_intervention",
            "sentiment_decline": "mood_support_campaign",
            "academic_stress": "academic_support_campaign",
            "low_engagement": "engagement_campaign"
        }
        return mapping.get(insight_type, "general_support")

    def _generate_target_criteria(self, insight: Dict[str, Any]) -> Dict[str, Any]:
        """Generate targeting criteria for interventions based on insights"""
        # This would be more sophisticated in production
        return {
            "all_users": True,  # For now, target all users
            "minimum_activity": 1,  # Users with at least 1 conversation
            "timeframe": "last_7_days"
        }

    def _generate_temporal_recommendations(self, conversation_patterns: Dict, mood_patterns: Dict) -> List[str]:
        """Generate recommendations based on temporal patterns"""
        recommendations = []
        
        # Find busiest conversation days
        if conversation_patterns:
            busiest_day = max(conversation_patterns.items(), key=lambda x: x[1])[0]
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            recommendations.append(f"Peak activity on {day_names[busiest_day]} - consider additional support staff")
        
        # Find lowest mood days
        if mood_patterns:
            lowest_mood_day = min(mood_patterns.items(), key=lambda x: x[1])[0]
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            recommendations.append(f"Lowest mood typically on {day_names[lowest_mood_day]} - proactive interventions recommended")
        
        return recommendations

    async def _store_analytics_report(self, report: Dict[str, Any]):
        """Store analytics report (placeholder - implement database storage)"""
        # In production, store in analytics_reports table
        self.logger.info("Analytics report generated successfully")
        
        # Store in Redis for immediate access
        if self.redis_client:
            try:
                report_key = f"analytics_report:{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
                await self.redis_client.set(report_key, json.dumps(report), ex=604800)  # 7 days
                self.logger.info(f"Stored analytics report in Redis: {report_key}")
            except Exception as e:
                self.logger.warning(f"Failed to store report in Redis: {e}")

    def _anonymize_content(self, content: str) -> str:
        """Basic content anonymization (remove personal info)"""
        # In production, implement proper anonymization
        # For now, just return content length and basic sentiment indicators
        return f"[CONTENT_LENGTH:{len(content)}]"

    def _generate_user_hash(self, user_id: int) -> str:
        """Generate anonymized user hash"""
        import hashlib
        return hashlib.sha256(f"user_{user_id}_salt".encode()).hexdigest()[:16]
