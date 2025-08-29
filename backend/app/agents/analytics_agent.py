from typing import List, Dict, Any
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Conversation, JournalEntry, AnalyticsReport as AnalyticsReportModel
from datetime import datetime, timedelta

class Insight(BaseModel):
    title: str
    description: str
    severity: str
    data: Dict[str, Any]

class Pattern(BaseModel):
    name: str
    description: str
    count: int

class AnalyticsReport(BaseModel):
    report_period: str
    insights: List[Insight]
    patterns: List[Pattern]
    recommendations: List[str]

class AnalyticsAgent:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_trends(self, timeframe_days: int) -> AnalyticsReport:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=timeframe_days)

        # Fetch data
        conversations = await self._get_conversations(start_date, end_date)
        journal_entries = await self._get_journal_entries(start_date, end_date)

        # Identify patterns
        all_text = [c.message for c in conversations] + [j.content for j in journal_entries]
        patterns = self._identify_patterns(all_text)

        # Generate insights
        insights = self._generate_insights(patterns)

        # Generate recommendations
        recommendations = self._generate_recommendations(insights)

        report = AnalyticsReport(
            report_period=f"{timeframe_days} days",
            insights=insights,
            patterns=patterns,
            recommendations=recommendations
        )

        # Store report in DB
        await self._store_report(report)

        return report

    async def _get_conversations(self, start_date: datetime, end_date: datetime) -> List[Conversation]:
        stmt = select(Conversation).where(Conversation.timestamp.between(start_date, end_date))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def _get_journal_entries(self, start_date: datetime, end_date: datetime) -> List[JournalEntry]:
        stmt = select(JournalEntry).where(JournalEntry.created_at.between(start_date, end_date))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    def _identify_patterns(self, texts: List[str]) -> List[Pattern]:
        keyword_patterns = {
            "Anxiety": ["anxiety", "panic", "worried", "nervous"],
            "Depression": ["depressed", "sad", "empty", "hopeless"],
            "Stress": ["stress", "overwhelmed", "pressure"],
        }

        patterns = []
        for name, keywords in keyword_patterns.items():
            count = sum(text.lower().count(keyword) for text in texts for keyword in keywords)
            if count > 0:
                patterns.append(Pattern(name=name, description=f"Mentions of {name}-related keywords.", count=count))
        
        return patterns

    def _generate_insights(self, patterns: List[Pattern]) -> List[Insight]:
        insights = []
        for pattern in patterns:
            if pattern.count > 10: # Arbitrary threshold for high severity
                severity = "High"
            elif pattern.count > 5:
                severity = "Medium"
            else:
                severity = "Low"
            
            insights.append(Insight(
                title=f"Elevated mentions of {pattern.name}",
                description=f"There have been {pattern.count} mentions of {pattern.name}-related keywords in the last period.",
                severity=severity,
                data=pattern.dict()
            ))
        return insights

    def _generate_recommendations(self, insights: List[Insight]) -> List[str]:
        recommendations = []
        for insight in insights:
            if insight.severity == "High":
                recommendations.append(f"Consider creating an intervention campaign for {insight.title.lower()}.")
        return recommendations

    async def _store_report(self, report: AnalyticsReport):
        report_model = AnalyticsReportModel(
            report_period=report.report_period,
            insights=report.dict()['insights'],
            trends={"patterns": [p.dict() for p in report.patterns]},
            recommendations=report.recommendations,
            intervention_triggers=[] # Placeholder
        )
        self.db.add(report_model)
        await self.db.commit()
