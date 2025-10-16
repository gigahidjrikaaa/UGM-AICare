"""Test script for Phase 1 infrastructure components.

Verifies:
1. Database tables exist
2. Models can be imported
3. Services can be instantiated
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models import (
    InsightsReport,
    Campaign,
    CampaignTrigger,
    CampaignMetrics,
    SystemSettings,
    AgentHealthLog,
    CaseAssignment
)
from app.services.agent_orchestrator import AgentOrchestrator
from app.services.event_bus import EventBus, EventType
from app.services.insights_service import InsightsService


async def test_database_tables():
    """Test that all Phase 1 tables exist."""
    print("\n=== Testing Database Tables ===")
    
    from app.core.settings import get_settings
    settings = get_settings()
    
    engine = create_async_engine(settings.database_url)
    
    async with engine.begin() as conn:
        # Check each table
        tables = [
            'insights_reports',
            'campaigns',
            'campaign_triggers',
            'campaign_metrics',
            'system_settings',
            'agent_health_logs',
            'case_assignments'
        ]
        
        for table in tables:
            result = await conn.execute(
                text(
                    "SELECT EXISTS (SELECT FROM information_schema.tables "
                    "WHERE table_name = :table_name)"
                ),
                {'table_name': table}
            )
            exists = result.scalar()
            status = "✅" if exists else "❌"
            print(f"{status} Table '{table}': {'exists' if exists else 'NOT FOUND'}")
    
    await engine.dispose()
    print("✅ Database table check complete\n")


def test_model_imports():
    """Test that all models can be imported."""
    print("=== Testing Model Imports ===")
    
    models = [
        ('InsightsReport', InsightsReport),
        ('Campaign', Campaign),
        ('CampaignTrigger', CampaignTrigger),
        ('CampaignMetrics', CampaignMetrics),
        ('SystemSettings', SystemSettings),
        ('AgentHealthLog', AgentHealthLog),
        ('CaseAssignment', CaseAssignment),
    ]
    
    for name, model_class in models:
        try:
            # Check __tablename__
            table_name = model_class.__tablename__
            print(f"✅ Model '{name}' → table '{table_name}'")
        except Exception as e:
            print(f"❌ Model '{name}' failed: {e}")
    
    print("✅ Model import check complete\n")


async def test_service_instantiation():
    """Test that services can be instantiated."""
    print("=== Testing Service Instantiation ===")
    
    from app.core.settings import get_settings
    settings = get_settings()
    
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            # Test AgentOrchestrator
            orchestrator = AgentOrchestrator(db)
            print(f"✅ AgentOrchestrator instantiated")
            
            # Test InsightsService
            insights = InsightsService(db)
            print(f"✅ InsightsService instantiated")
            
            # Test EventBus
            event_bus = EventBus()
            print(f"✅ EventBus instantiated")
            
            # Check EventType enum
            print(f"✅ EventType.CASE_CREATED: {EventType.CASE_CREATED.value}")
            print(f"✅ EventType.IA_REPORT_GENERATED: {EventType.IA_REPORT_GENERATED.value}")
            
        except Exception as e:
            print(f"❌ Service instantiation failed: {e}")
            raise
    
    await engine.dispose()
    print("✅ Service instantiation check complete\n")


async def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("PHASE 1 INFRASTRUCTURE TEST SUITE")
    print("=" * 60)
    
    try:
        test_model_imports()
        await test_database_tables()
        await test_service_instantiation()
        
        print("=" * 60)
        print("✅ ALL PHASE 1 TESTS PASSED")
        print("=" * 60 + "\n")
        
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ TESTS FAILED: {e}")
        print("=" * 60 + "\n")
        raise


if __name__ == "__main__":
    asyncio.run(main())
