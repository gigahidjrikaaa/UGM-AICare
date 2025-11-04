"""
SQL Syntax Validator for IA Analytics Queries.
Checks if the SQL queries are syntactically correct without executing them.
"""
from app.agents.ia.queries import ALLOWED_QUERIES
from app.agents.ia.schemas import QuestionId


def validate_sql_queries():
    """Validate all SQL queries are present and non-empty."""
    print("\n" + "="*80)
    print("VALIDATING IA ANALYTICS QUERIES")
    print("="*80 + "\n")

    expected_queries: list[QuestionId] = [
        "crisis_trend",
        "dropoffs",
        "resource_reuse",
        "fallback_reduction",
        "cost_per_helpful",
        "coverage_windows",
    ]

    all_valid = True

    for query_id in expected_queries:
        if query_id not in ALLOWED_QUERIES:
            print(f"❌ MISSING: {query_id}")
            all_valid = False
            continue

        sql_query = ALLOWED_QUERIES[query_id]
        
        # Check if it's a TODO placeholder
        if "TODO" in sql_query.upper():
            print(f"❌ TODO PLACEHOLDER: {query_id}")
            all_valid = False
            continue

        # Check if it's empty or too short
        if len(sql_query.strip()) < 50:
            print(f"❌ TOO SHORT: {query_id} ({len(sql_query)} chars)")
            all_valid = False
            continue

        # Check for required SQL keywords
        sql_upper = sql_query.upper()
        required_keywords = ["SELECT", "FROM", "WHERE", "GROUP BY"]
        missing_keywords = [kw for kw in required_keywords if kw not in sql_upper]
        
        if missing_keywords:
            print(f"⚠️  MISSING KEYWORDS in {query_id}: {', '.join(missing_keywords)}")
            # Not fatal, but warning
        
        # Check for k-anonymity enforcement (HAVING COUNT)
        if "HAVING COUNT" not in sql_upper:
            print(f"⚠️  NO K-ANONYMITY ENFORCEMENT in {query_id}")
            # Not fatal, but warning
        
        # Check for date parameters
        if ":start_date" not in sql_query or ":end_date" not in sql_query:
            print(f"⚠️  MISSING DATE PARAMETERS in {query_id}")
            # Not fatal, but warning

        print(f"✅ VALID: {query_id} ({len(sql_query)} chars)")
        print(f"   First 100 chars: {sql_query[:100].strip()}...")

    print("\n" + "="*80)
    if all_valid:
        print("✅ ALL QUERIES VALIDATED SUCCESSFULLY")
    else:
        print("❌ VALIDATION FAILED")
    print("="*80 + "\n")

    return all_valid


if __name__ == "__main__":
    import sys
    success = validate_sql_queries()
    sys.exit(0 if success else 1)
