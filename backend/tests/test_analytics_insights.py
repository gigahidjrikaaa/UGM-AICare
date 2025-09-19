import os
import sys
from pathlib import Path
from datetime import datetime, timedelta, date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.database import Base
from app.models import CampaignExecution, InterventionCampaign, TriageAssessment, User
from app.services.analytics_insights import (
    compute_cohort_hotspots,
    compute_intervention_summary,
    compute_triage_insights,
)


@pytest.mark.asyncio
async def test_compute_triage_insights_severity_delta():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            today = datetime(2025, 2, 20, 12, 0, 0)
            users = [User(email=f"user{i}@example.com", role="user") for i in range(3)]
            session.add_all(users)
            await session.flush()

            assessments = [
                TriageAssessment(
                    user_id=users[0].id,
                    severity_level="high",
                    risk_score=0.9,
                    confidence_score=0.7,
                    created_at=today - timedelta(days=0),
                ),
                TriageAssessment(
                    user_id=users[1].id,
                    severity_level="medium",
                    risk_score=0.6,
                    confidence_score=0.7,
                    created_at=today - timedelta(days=1),
                ),
                TriageAssessment(
                    user_id=users[2].id,
                    severity_level="low",
                    risk_score=0.3,
                    confidence_score=0.7,
                    created_at=today - timedelta(days=8),
                ),
            ]
            session.add_all(assessments)
            await session.commit()

            insight = await compute_triage_insights(
                session,
                timeframe_days=7,
                reference_date=date(2025, 2, 20),
            )

            assert insight.timeframe_days == 7
            assert insight.severity_delta.current.get("high", 0) == 1
            assert insight.severity_delta.previous.get("low", 0) == 1
            assert len(insight.risk_trend) == 7
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_compute_cohort_hotspots_filters_and_sorting():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            today = datetime(2025, 3, 10, 10, 0, 0)
            users = [
                User(email="psych1@example.com", role="user", major="Psychology"),
                User(email="psych2@example.com", role="user", major="Psychology"),
                User(email="psych3@example.com", role="user", major="Psychology"),
                User(email="med1@example.com", role="user", major="Medicine"),
                User(email="med2@example.com", role="user", major="Medicine"),
            ]
            session.add_all(users)
            await session.flush()

            def add_assessment(user, days_offset, severity):
                session.add(
                    TriageAssessment(
                        user_id=user.id,
                        severity_level=severity,
                        risk_score=0.85 if severity.lower() in {"high", "critical"} else 0.5,
                        confidence_score=0.6,
                        created_at=today - timedelta(days=days_offset),
                    )
                )

            # Current window high severity spike for Psychology
            add_assessment(users[0], 0, "high")
            add_assessment(users[1], 1, "critical")
            add_assessment(users[2], 2, "high")
            # Previous window counts for Medicine
            add_assessment(users[3], 8, "high")
            add_assessment(users[4], 9, "high")
            await session.commit()

            hotspots = await compute_cohort_hotspots(
                session,
                timeframe_days=7,
                reference_date=date(2025, 3, 10),
                dimension="major",
                limit=5,
            )

            assert hotspots.dimension == "major"
            assert hotspots.items
            top = hotspots.items[0]
            assert top.label == "Psychology"
            assert top.current_high == 3
            assert top.previous_high == 0
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_compute_intervention_summary_rollup():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with session_factory() as session:
            users = [
                User(email="exec1@example.com", role="user"),
                User(email="exec2@example.com", role="user"),
                User(email="exec3@example.com", role="user"),
            ]
            session.add_all(users)
            await session.flush()

            campaign = InterventionCampaign(
                campaign_type="outreach",
                title="Check-in",
                description="",
                content={},
            )
            session.add(campaign)
            await session.flush()

            now = datetime(2025, 4, 15, 9, 0, 0)
            executions = [
                CampaignExecution(
                    campaign_id=campaign.id,
                    user_id=users[0].id,
                    status="completed",
                    created_at=now - timedelta(days=1),
                ),
                CampaignExecution(
                    campaign_id=campaign.id,
                    user_id=users[1].id,
                    status="failed",
                    created_at=now - timedelta(days=2),
                ),
                CampaignExecution(
                    campaign_id=campaign.id,
                    user_id=users[2].id,
                    status="sent",
                    engagement_score=0.8,
                    created_at=now - timedelta(days=1),
                ),
            ]
            session.add_all(executions)
            await session.commit()

            summary = await compute_intervention_summary(
                session,
                timeframe_days=7,
                reference_date=date(2025, 4, 15),
                campaign_type=None,
                limit=5,
            )

            assert summary.totals.overall == 3
            assert summary.totals.by_status.get("completed") == 1
            assert summary.totals.success_rate is not None
            assert summary.top_campaigns
    finally:
        await engine.dispose()
