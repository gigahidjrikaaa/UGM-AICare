"""Insights analytics service for generating IA reports.

Provides automated analysis of triage data, trending topics, and sentiment.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InsightsReport, TriageAssessment
from app.services.event_bus import publish_event, EventType

logger = logging.getLogger(__name__)


class InsightsService:
    """Service for generating and managing IA insights reports."""
    
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
    
    async def generate_weekly_report(
        self,
        period_start: datetime | None = None,
        period_end: datetime | None = None
    ) -> InsightsReport:
        """Generate weekly insights report for admin dashboard.
        
        Args:
            period_start: Start of reporting period (defaults to 7 days ago)
            period_end: End of reporting period (defaults to now)
            
        Returns:
            Created InsightsReport object
        """
        if not period_end:
            period_end = datetime.utcnow()
        if not period_start:
            period_start = period_end - timedelta(days=7)
        
        logger.info(f"Generating weekly IA report: {period_start} to {period_end}")
        
        # Query assessments for the period
        stmt = select(TriageAssessment).where(
            TriageAssessment.created_at >= period_start,
            TriageAssessment.created_at <= period_end
        )
        result = await self.db.execute(stmt)
        assessments = result.scalars().all()
        
        logger.info(f"Found {len(assessments)} assessments in period")
        
        # Calculate trending topics
        trending_topics = await self._extract_trending_topics(assessments)
        
        # Calculate sentiment trend (1 - avg_risk represents positive sentiment)
        sentiment_data = await self._calculate_sentiment_trend(
            period_start, period_end
        )
        
        # Count high/critical risk assessments
        high_risk_count = sum(
            1 for a in assessments
            if a.severity_level and a.severity_level.lower() in ('high', 'critical')
        )
        
        # Generate summary text
        summary = self._generate_summary(
            total_count=len(assessments),
            high_risk_count=high_risk_count,
            trending_topics=trending_topics,
            sentiment_data=sentiment_data
        )
        
        # Create report
        report = InsightsReport(
            id=uuid4(),
            report_type='weekly',
            period_start=period_start,
            period_end=period_end,
            summary=summary,
            trending_topics=trending_topics,
            sentiment_data=sentiment_data,
            high_risk_count=high_risk_count,
            assessment_count=len(assessments),
            generated_at=datetime.utcnow()
        )
        
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        
        logger.info(f"Generated IA report {report.id}")
        
        # Emit event for orchestrator and SSE broadcasting
        await publish_event(
            event_type=EventType.IA_REPORT_GENERATED,
            source_agent='ia',
            data={
                'report_id': str(report.id),
                'report_type': report.report_type,
                'period_start': period_start.isoformat() if period_start else None,
                'period_end': period_end.isoformat() if period_end else None,
                'trending_topics': trending_topics[:5] if trending_topics else [],
                'high_risk_count': high_risk_count,
                'assessment_count': len(assessments)
            }
        )
        
        return report
    
    async def generate_monthly_report(
        self,
        period_start: datetime | None = None,
        period_end: datetime | None = None
    ) -> InsightsReport:
        """Generate monthly insights report.
        
        Args:
            period_start: Start of reporting period (defaults to 30 days ago)
            period_end: End of reporting period (defaults to now)
            
        Returns:
            Created InsightsReport object
        """
        if not period_end:
            period_end = datetime.utcnow()
        if not period_start:
            period_start = period_end - timedelta(days=30)
        
        # Reuse weekly logic with different period
        report = await self.generate_weekly_report(period_start, period_end)
        
        # Update report type
        report.report_type = 'monthly'
        await self.db.commit()
        await self.db.refresh(report)
        
        return report
    
    async def get_latest_report(
        self,
        report_type: str = 'weekly'
    ) -> InsightsReport | None:
        """Get the most recent report of given type.
        
        Args:
            report_type: Type of report ('weekly', 'monthly', 'ad_hoc')
            
        Returns:
            Latest InsightsReport or None
        """
        stmt = (
            select(InsightsReport)
            .where(InsightsReport.report_type == report_type)
            .order_by(InsightsReport.generated_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_report_by_id(self, report_id: UUID) -> InsightsReport | None:
        """Get specific report by ID.
        
        Args:
            report_id: Report UUID
            
        Returns:
            InsightsReport or None
        """
        stmt = select(InsightsReport).where(InsightsReport.id == report_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_reports(
        self,
        report_type: str | None = None,
        limit: int = 10,
        offset: int = 0
    ) -> list[InsightsReport]:
        """List reports with pagination.
        
        Args:
            report_type: Optional filter by report type
            limit: Max results to return
            offset: Offset for pagination
            
        Returns:
            List of InsightsReport objects
        """
        stmt = select(InsightsReport).order_by(
            InsightsReport.generated_at.desc()
        )
        
        if report_type:
            stmt = stmt.where(InsightsReport.report_type == report_type)
        
        stmt = stmt.limit(limit).offset(offset)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def _extract_trending_topics(
        self,
        assessments: list[TriageAssessment]
    ) -> list[dict[str, Any]]:
        """Extract trending topics from risk factors.
        
        Args:
            assessments: List of triage assessments
            
        Returns:
            List of topic dicts with counts
        """
        topic_counts: dict[str, int] = {}
        
        for assessment in assessments:
            if not assessment.risk_factors:
                continue
            
            # Extract topics from risk factors
            factors = assessment.risk_factors
            if isinstance(factors, list):
                for factor in factors:
                    if isinstance(factor, str):
                        # Parse risk factors (e.g., "pii::email:2" -> "email")
                        topic = self._parse_risk_factor(factor)
                        if topic:
                            topic_counts[topic] = topic_counts.get(topic, 0) + 1
        
        # Sort by count descending
        sorted_topics = sorted(
            topic_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Format as list of dicts
        trending = [
            {'topic': topic, 'count': count}
            for topic, count in sorted_topics[:10]  # Top 10
        ]
        
        return trending
    
    async def _calculate_sentiment_trend(
        self,
        period_start: datetime,
        period_end: datetime
    ) -> dict[str, Any]:
        """Calculate sentiment trend over time.
        
        Args:
            period_start: Start of period
            period_end: End of period
            
        Returns:
            Dict with sentiment metrics
        """
        # Query average risk score (inverse of sentiment)
        stmt = select(
            func.avg(TriageAssessment.risk_score).label('avg_risk')
        ).where(
            TriageAssessment.created_at >= period_start,
            TriageAssessment.created_at <= period_end
        )
        result = await self.db.execute(stmt)
        avg_risk = result.scalar() or 0.0
        
        # Convert risk to sentiment (1.0 - risk_score)
        avg_sentiment = 1.0 - float(avg_risk)
        
        return {
            'avg_sentiment': round(avg_sentiment, 4),
            'avg_risk': round(float(avg_risk), 4),
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat()
        }
    
    @staticmethod
    def _parse_risk_factor(factor: str) -> str | None:
        """Parse risk factor string to extract topic.
        
        Args:
            factor: Risk factor string (e.g., "pii::email:2", "anxiety")
            
        Returns:
            Extracted topic or None
        """
        # Handle PII format (pii::type:count)
        if factor.startswith('pii::'):
            parts = factor.split(':')
            if len(parts) >= 3:
                return parts[2]  # Extract the PII type
        
        # Handle plain text factors
        if factor and not factor.startswith('pii::'):
            return factor.lower()
        
        return None
    
    @staticmethod
    def _generate_summary(
        total_count: int,
        high_risk_count: int,
        trending_topics: list[dict[str, Any]],
        sentiment_data: dict[str, Any]
    ) -> str:
        """Generate human-readable summary text.
        
        Args:
            total_count: Total assessments
            high_risk_count: High/critical risk count
            trending_topics: List of trending topics
            sentiment_data: Sentiment metrics
            
        Returns:
            Summary text
        """
        high_risk_pct = (
            (high_risk_count / total_count * 100)
            if total_count > 0 else 0
        )
        
        top_topics = ', '.join([
            t['topic'] for t in trending_topics[:3]
        ]) if trending_topics else 'none'
        
        avg_sentiment = sentiment_data.get('avg_sentiment', 0.0)
        sentiment_label = (
            'positive' if avg_sentiment >= 0.7
            else 'neutral' if avg_sentiment >= 0.4
            else 'concerning'
        )
        
        summary = (
            f"Weekly report: {total_count} assessments, "
            f"{high_risk_count} ({high_risk_pct:.1f}%) high/critical risk. "
            f"Top topics: {top_topics}. "
            f"Overall sentiment: {sentiment_label} ({avg_sentiment:.2f})."
        )
        
        return summary


def get_insights_service(db: AsyncSession) -> InsightsService:
    """Dependency to get insights service instance."""
    return InsightsService(db)
