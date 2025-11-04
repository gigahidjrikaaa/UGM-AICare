"""
Test script for IA Analytics Queries implementation.
Verifies SQL syntax and integration with InsightsAgentService.
"""
import asyncio
import sys
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.agents.ia.service import InsightsAgentService
from app.agents.ia.schemas import IAQueryRequest, QueryParams


# Database connection
DATABASE_URL = "postgresql+asyncpg://giga:aicare123@localhost:5432/aicare_db"


async def test_ia_queries():
    """Test all 6 IA analytics queries."""
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Date range: last 30 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)

    queries_to_test = [
        "crisis_trend",
        "dropoffs",
        "resource_reuse",
        "fallback_reduction",
        "cost_per_helpful",
        "coverage_windows",
    ]

    print("\n" + "="*80)
    print("TESTING IA ANALYTICS QUERIES")
    print("="*80)
    print(f"Date range: {start_date.date()} to {end_date.date()}")
    print("="*80 + "\n")

    results = {}
    async with async_session() as session:
        service = InsightsAgentService(session)

        for query_id in queries_to_test:
            print(f"\n{'='*80}")
            print(f"Testing: {query_id}")
            print('='*80)
            
            try:
                # Create request
                request = IAQueryRequest(
                    question_id=query_id,
                    params=QueryParams(
                        start=start_date,
                        end=end_date
                    )
                )

                # Execute query
                response = await service.query(request)

                # Print results
                print(f"✅ SUCCESS: {query_id}")
                print(f"\nChart type: {response.chart.get('type', 'N/A')}")
                print(f"Table rows: {len(response.table)}")
                print(f"\nNotes:")
                for note in response.notes:
                    print(f"  - {note}")

                if response.table:
                    print(f"\nSample data (first 3 rows):")
                    for i, row in enumerate(response.table[:3]):
                        print(f"  {i+1}. {row}")

                results[query_id] = {
                    "status": "SUCCESS",
                    "rows": len(response.table),
                    "chart_type": response.chart.get('type', 'N/A')
                }

            except Exception as e:
                print(f"❌ FAILED: {query_id}")
                print(f"Error: {str(e)}")
                results[query_id] = {
                    "status": "FAILED",
                    "error": str(e)
                }

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    success_count = sum(1 for r in results.values() if r["status"] == "SUCCESS")
    total_count = len(results)
    
    for query_id, result in results.items():
        status_icon = "✅" if result["status"] == "SUCCESS" else "❌"
        print(f"{status_icon} {query_id:25} {result['status']}")
        if result["status"] == "SUCCESS":
            print(f"   → {result['rows']} rows, chart type: {result['chart_type']}")
        else:
            print(f"   → Error: {result.get('error', 'Unknown')}")

    print(f"\n{'='*80}")
    print(f"OVERALL: {success_count}/{total_count} queries passed")
    print("="*80 + "\n")

    await engine.dispose()

    return success_count == total_count


if __name__ == "__main__":
    try:
        success = asyncio.run(test_ia_queries())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
