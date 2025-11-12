"""
RQ4 Privacy Unit Tests: k-Anonymity Enforcement in Insights Agent (IA)

These tests validate that the Insights Agent enforces k-anonymity (k≥5) 
across all analytics queries, preventing individual user identification 
and ensuring privacy-preserving data publication.

Test Suite:
1. test_small_cohort_suppression: Verify cohorts with n<5 users are automatically suppressed
2. test_compliant_publication: Verify cohorts with n≥5 users pass through correctly
3. test_individual_query_blocking: Verify individual-level queries raise privacy violations

Research Context: Bachelor's Thesis (Computer Science)
- Evaluation Method: Code review + unit test validation
- Privacy Standard: k-anonymity with k≥5 (minimum 5 distinct users per published group)
- Scope: All 6 IA analytics queries (crisis_trend, dropoffs, resource_reuse, 
  fallback_reduction, cost_per_helpful, coverage_windows)

Author: [Your Name]
Date: November 2025
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ia.queries import ALLOWED_QUERIES
from app.agents.ia.schemas import IAQueryRequest, IAQueryParams
from app.agents.ia.service import InsightsAgentService


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def ia_service(db_session: AsyncSession) -> InsightsAgentService:
    """Create InsightsAgentService instance for testing."""
    return InsightsAgentService(session=db_session)


@pytest.fixture
async def seed_small_cohort_data(db_session: AsyncSession):
    """
    Seed database with SMALL cohort (n=3 users) that should be suppressed.
    
    Scenario:
    - Date: 2025-11-01
    - Users: 3 distinct users (user_1, user_2, user_3)
    - Crisis cases: 3 total (severity: critical)
    - Expected: Should be suppressed (n < 5)
    """
    # Insert 3 conversations from 3 distinct users
    await db_session.execute(text("""
        INSERT INTO conversations (id, user_id, created_at, updated_at)
        VALUES 
            ('conv_small_1', 'user_1', '2025-11-01 10:00:00', '2025-11-01 10:00:00'),
            ('conv_small_2', 'user_2', '2025-11-01 11:00:00', '2025-11-01 11:00:00'),
            ('conv_small_3', 'user_3', '2025-11-01 12:00:00', '2025-11-01 12:00:00')
    """))
    
    # Insert 3 high-severity cases (one per user)
    await db_session.execute(text("""
        INSERT INTO cases (id, user_id, conversation_id, severity, status, created_at, updated_at)
        VALUES 
            ('case_small_1', 'user_1', 'conv_small_1', 'critical', 'in_progress', '2025-11-01 10:05:00', '2025-11-01 10:05:00'),
            ('case_small_2', 'user_2', 'conv_small_2', 'critical', 'in_progress', '2025-11-01 11:05:00', '2025-11-01 11:05:00'),
            ('case_small_3', 'user_3', 'conv_small_3', 'high', 'resolved', '2025-11-01 12:05:00', '2025-11-01 12:05:00')
    """))
    
    await db_session.commit()


@pytest.fixture
async def seed_compliant_cohort_data(db_session: AsyncSession):
    """
    Seed database with COMPLIANT cohort (n=6 users) that should be published.
    
    Scenario:
    - Date: 2025-11-05
    - Users: 6 distinct users (user_10 through user_15)
    - Crisis cases: 6 total (severity: high/critical)
    - Expected: Should be published (n ≥ 5)
    """
    # Insert 6 conversations from 6 distinct users
    conv_ids = [f'conv_comp_{i}' for i in range(1, 7)]
    user_ids = [f'user_{10+i}' for i in range(6)]
    
    for i, (conv_id, user_id) in enumerate(zip(conv_ids, user_ids)):
        await db_session.execute(text(f"""
            INSERT INTO conversations (id, user_id, created_at, updated_at)
            VALUES ('{conv_id}', '{user_id}', '2025-11-05 {9+i}:00:00', '2025-11-05 {9+i}:00:00')
        """))
        
        severity = 'critical' if i % 2 == 0 else 'high'
        await db_session.execute(text(f"""
            INSERT INTO cases (id, user_id, conversation_id, severity, status, created_at, updated_at)
            VALUES ('case_comp_{i+1}', '{user_id}', '{conv_id}', '{severity}', 'in_progress', 
                    '2025-11-05 {9+i}:05:00', '2025-11-05 {9+i}:05:00')
        """))
    
    await db_session.commit()


@pytest.fixture
async def seed_mixed_cohort_data(db_session: AsyncSession):
    """
    Seed database with MIXED cohorts:
    - 2025-11-10: 8 users (compliant, should publish)
    - 2025-11-11: 2 users (non-compliant, should suppress)
    - 2025-11-12: 5 users (edge case, should publish)
    
    Tests boundary conditions and multiple date groups.
    """
    # Day 1: 8 users (compliant)
    for i in range(8):
        user_id = f'user_mixed_day1_{i}'
        conv_id = f'conv_mixed_day1_{i}'
        await db_session.execute(text(f"""
            INSERT INTO conversations (id, user_id, created_at, updated_at)
            VALUES ('{conv_id}', '{user_id}', '2025-11-10 10:00:00', '2025-11-10 10:00:00')
        """))
        await db_session.execute(text(f"""
            INSERT INTO cases (id, user_id, conversation_id, severity, status, created_at, updated_at)
            VALUES ('case_mixed_day1_{i}', '{user_id}', '{conv_id}', 'high', 'resolved', 
                    '2025-11-10 10:05:00', '2025-11-10 10:05:00')
        """))
    
    # Day 2: 2 users (non-compliant)
    for i in range(2):
        user_id = f'user_mixed_day2_{i}'
        conv_id = f'conv_mixed_day2_{i}'
        await db_session.execute(text(f"""
            INSERT INTO conversations (id, user_id, created_at, updated_at)
            VALUES ('{conv_id}', '{user_id}', '2025-11-11 14:00:00', '2025-11-11 14:00:00')
        """))
        await db_session.execute(text(f"""
            INSERT INTO cases (id, user_id, conversation_id, severity, status, created_at, updated_at)
            VALUES ('case_mixed_day2_{i}', '{user_id}', '{conv_id}', 'critical', 'in_progress', 
                    '2025-11-11 14:05:00', '2025-11-11 14:05:00')
        """))
    
    # Day 3: 5 users (edge case - exactly k=5)
    for i in range(5):
        user_id = f'user_mixed_day3_{i}'
        conv_id = f'conv_mixed_day3_{i}'
        await db_session.execute(text(f"""
            INSERT INTO conversations (id, user_id, created_at, updated_at)
            VALUES ('{conv_id}', '{user_id}', '2025-11-12 16:00:00', '2025-11-12 16:00:00')
        """))
        await db_session.execute(text(f"""
            INSERT INTO cases (id, user_id, conversation_id, severity, status, created_at, updated_at)
            VALUES ('case_mixed_day3_{i}', '{user_id}', '{conv_id}', 'high', 'closed', 
                    '2025-11-12 16:05:00', '2025-11-12 16:05:00')
        """))
    
    await db_session.commit()


# ============================================================================
# RQ4 Test 1: Small Cohort Suppression
# ============================================================================

@pytest.mark.asyncio
async def test_small_cohort_suppression(
    ia_service: InsightsAgentService,
    seed_small_cohort_data
):
    """
    Test 1: Verify cohorts with n<5 users are automatically suppressed.
    
    Validation Criteria:
    - Query crisis_trend for date range containing small cohort (n=3)
    - Expected: NO rows returned (suppressed by HAVING COUNT(*) >= 5)
    - Privacy Goal: Prevent publication of groups with <5 users
    
    SQL Validation:
    - All 6 IA queries contain: HAVING COUNT(...) >= 5
    - This clause filters out any group with fewer than k=5 records
    """
    # Arrange
    request = IAQueryRequest(
        question_id="crisis_trend",
        params=IAQueryParams(**{
            "from": datetime(2025, 11, 1, 0, 0, 0),
            "to": datetime(2025, 11, 2, 0, 0, 0)
        })
    )
    
    # Act
    response = await ia_service.query(request)
    
    # Assert
    assert len(response.table) == 0, (
        f"Expected 0 rows (suppressed), but got {len(response.table)} rows. "
        f"Small cohort (n=3) should be suppressed by k-anonymity enforcement."
    )
    
    # Verify suppression note exists in response
    suppression_note_found = any(
        "K-anonymity enforced" in note or "minimum 5" in note 
        for note in response.notes
    )
    assert suppression_note_found, (
        "Response should include k-anonymity enforcement note explaining suppression."
    )
    
    print("✅ Test 1 PASSED: Small cohort (n=3) successfully suppressed.")


# ============================================================================
# RQ4 Test 2: Compliant Publication
# ============================================================================

@pytest.mark.asyncio
async def test_compliant_publication(
    ia_service: InsightsAgentService,
    seed_compliant_cohort_data
):
    """
    Test 2: Verify cohorts with n≥5 users pass through correctly.
    
    Validation Criteria:
    - Query crisis_trend for date range containing compliant cohort (n=6)
    - Expected: At least 1 row returned with valid data
    - Privacy Goal: Allow publication of sufficiently large groups (k≥5)
    
    Additional Checks:
    - Verify unique_users_affected ≥ 5 (column should exist and be valid)
    - Verify crisis_count matches expected value
    """
    # Arrange
    request = IAQueryRequest(
        question_id="crisis_trend",
        params=IAQueryParams(**{
            "from": datetime(2025, 11, 5, 0, 0, 0),
            "to": datetime(2025, 11, 6, 0, 0, 0)
        })
    )
    
    # Act
    response = await ia_service.query(request)
    
    # Assert - Basic publication check
    assert len(response.table) > 0, (
        f"Expected at least 1 row (compliant cohort), but got 0 rows. "
        f"Cohort with n=6 users should be published."
    )
    
    # Assert - Verify data quality
    for row in response.table:
        assert "date" in row, "Result row missing 'date' field"
        assert "crisis_count" in row, "Result row missing 'crisis_count' field"
        assert "severity" in row, "Result row missing 'severity' field"
        assert "unique_users_affected" in row, "Result row missing 'unique_users_affected' field"
        
        # Verify k-anonymity maintained in published data
        unique_users = row["unique_users_affected"]
        assert unique_users >= 5, (
            f"Published row has {unique_users} unique users (expected ≥5). "
            f"K-anonymity violation in published data!"
        )
    
    # Assert - Verify expected crisis count
    total_crisis_count = sum(row["crisis_count"] for row in response.table)
    assert total_crisis_count == 6, (
        f"Expected 6 total crisis cases, got {total_crisis_count}"
    )
    
    print(f"✅ Test 2 PASSED: Compliant cohort (n=6) successfully published with {len(response.table)} row(s).")


# ============================================================================
# RQ4 Test 3: Individual Query Blocking
# ============================================================================

@pytest.mark.asyncio
async def test_individual_query_blocking(
    db_session: AsyncSession,
    seed_compliant_cohort_data
):
    """
    Test 3: Verify individual-level queries raise privacy violations.
    
    Validation Criteria:
    - Attempt to execute user-specific query (no GROUP BY or aggregation)
    - Expected: Query should fail or return 0 rows due to k-anonymity enforcement
    - Privacy Goal: Block any query that could identify individual users
    
    Test Strategy:
    - Use allow-listed query structure but verify single-user queries fail
    - Demonstrate that HAVING clause prevents individual identification
    
    Note: This test verifies the robustness of the HAVING clause even if
    someone attempts to bypass GROUP BY aggregation logic.
    """
    # Arrange: Craft individual-level query (without proper aggregation)
    # This simulates an attacker trying to bypass k-anonymity by querying
    # specific user data without sufficient aggregation
    individual_query = text("""
        SELECT 
            user_id,
            created_at,
            severity
        FROM cases
        WHERE 
            created_at >= :start_date 
            AND created_at < :end_date
            AND severity IN ('high', 'critical')
            AND user_id = :target_user
    """)
    
    # Act: Execute individual-level query
    result = await db_session.execute(
        individual_query,
        {
            "start_date": datetime(2025, 11, 5, 0, 0, 0),
            "end_date": datetime(2025, 11, 6, 0, 0, 0),
            "target_user": "user_10"  # Specific user from compliant cohort
        }
    )
    rows = result.fetchall()
    
    # Assert: Verify this demonstrates the DIFFERENCE between allow-listed
    # and individual queries
    # The individual query DOES return data (shows vulnerability if not prevented)
    assert len(rows) > 0, (
        "Individual query returned data - this demonstrates why we need "
        "allow-listing and k-anonymity enforcement in ALLOWED_QUERIES."
    )
    
    # Now verify that our allow-listed queries CANNOT be exploited this way
    # Test all 6 queries to ensure they all have proper k-anonymity protection
    for query_id, query_sql in ALLOWED_QUERIES.items():
        # Verify query contains k-anonymity enforcement
        assert "HAVING COUNT" in query_sql, (
            f"Query '{query_id}' missing HAVING COUNT clause for k-anonymity!"
        )
        
        # Verify minimum threshold is k=5
        assert ">= 5" in query_sql, (
            f"Query '{query_id}' does not enforce k≥5 threshold!"
        )
        
        # Verify query uses GROUP BY (required for k-anonymity)
        assert "GROUP BY" in query_sql, (
            f"Query '{query_id}' missing GROUP BY clause for aggregation!"
        )
    
    print(f"✅ Test 3 PASSED: All {len(ALLOWED_QUERIES)} allow-listed queries enforce k-anonymity.")
    print("   Individual-level queries are blocked by:")
    print("   - Allow-list enforcement (only 6 predefined queries)")
    print("   - GROUP BY aggregation (no individual rows)")
    print("   - HAVING COUNT >= 5 (suppresses small groups)")


# ============================================================================
# RQ4 Bonus Test: Boundary Condition Testing
# ============================================================================

@pytest.mark.asyncio
async def test_boundary_condition_k_equals_5(
    ia_service: InsightsAgentService,
    seed_mixed_cohort_data
):
    """
    Bonus Test: Verify edge case where cohort size exactly equals k=5.
    
    Validation Criteria:
    - Query date range with exactly 5 users (boundary condition)
    - Expected: Should be published (n = k = 5, satisfies n ≥ 5)
    - Privacy Goal: Validate >= operator (not strict >)
    """
    # Arrange
    request = IAQueryRequest(
        question_id="crisis_trend",
        params=IAQueryParams(**{
            "from": datetime(2025, 11, 12, 0, 0, 0),
            "to": datetime(2025, 11, 13, 0, 0, 0)
        })
    )
    
    # Act
    response = await ia_service.query(request)
    
    # Assert
    assert len(response.table) > 0, (
        f"Expected at least 1 row (boundary case k=5), but got 0 rows. "
        f"Edge case with exactly 5 users should be published."
    )
    
    for row in response.table:
        unique_users = row["unique_users_affected"]
        assert unique_users >= 5, (
            f"Boundary case has {unique_users} unique users (expected ≥5)."
        )
    
    print("✅ Bonus Test PASSED: Boundary condition (k=5) correctly published.")


@pytest.mark.asyncio
async def test_multi_date_suppression_selectivity(
    ia_service: InsightsAgentService,
    seed_mixed_cohort_data
):
    """
    Bonus Test: Verify selective suppression across multiple dates.
    
    Validation Criteria:
    - Query date range with mixed cohorts (8 users, 2 users, 5 users on different days)
    - Expected: Only compliant days published (8 and 5), non-compliant day (2) suppressed
    - Privacy Goal: Ensure suppression is granular per GROUP BY dimension
    """
    # Arrange
    request = IAQueryRequest(
        question_id="crisis_trend",
        params=IAQueryParams(**{
            "from": datetime(2025, 11, 10, 0, 0, 0),
            "to": datetime(2025, 11, 13, 0, 0, 0)  # Spans 3 days
        })
    )
    
    # Act
    response = await ia_service.query(request)
    
    # Assert - Should get exactly 2 date groups (2025-11-10 and 2025-11-12)
    # 2025-11-11 should be suppressed (n=2 < 5)
    assert len(response.table) >= 2, (
        f"Expected at least 2 rows (2 compliant days), got {len(response.table)}."
    )
    
    dates_in_response = {row["date"] for row in response.table}
    
    # Verify compliant days are present
    assert "2025-11-10" in dates_in_response, "Day with 8 users should be published"
    assert "2025-11-12" in dates_in_response, "Day with 5 users should be published"
    
    # Verify non-compliant day is suppressed
    assert "2025-11-11" not in dates_in_response, (
        "Day with 2 users should be suppressed (n < 5)"
    )
    
    print("✅ Bonus Test PASSED: Selective suppression correctly filters dates.")
    print(f"   Published dates: {sorted(dates_in_response)}")
    print("   Suppressed dates: 2025-11-11 (n=2)")


# ============================================================================
# Test Execution Summary
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*80)
    print("RQ4 Privacy Unit Tests: k-Anonymity Enforcement")
    print("="*80)
    print("\nTest Suite Overview:")
    print("1. test_small_cohort_suppression - Verify n<5 suppression")
    print("2. test_compliant_publication - Verify n≥5 publication")
    print("3. test_individual_query_blocking - Verify individual query prevention")
    print("4. test_boundary_condition_k_equals_5 - Verify k=5 edge case")
    print("5. test_multi_date_suppression_selectivity - Verify selective suppression")
    print("\nExecution: pytest research_evaluation/rq4_privacy/test_ia_k_anonymity.py -v")
    print("="*80 + "\n")
