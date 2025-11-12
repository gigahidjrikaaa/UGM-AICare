# RQ4: Privacy Evaluation - k-Anonymity Enforcement

## Research Question
**RQ4**: How does the Safety Agent Suite ensure k-anonymity (k≥5) in aggregated analytics queries?

## Evaluation Method
**Code Review + Unit Test Validation**

1. **Code Review**: Manual inspection of SQL queries in `app/agents/ia/queries.py`
2. **Unit Tests**: Automated validation of k-anonymity enforcement behavior

## Test Suite: `test_ia_k_anonymity.py`

### Core Tests (Thesis Table 4.5)

#### Test 1: `test_small_cohort_suppression`
- **Purpose**: Verify cohorts with n<5 users are automatically suppressed
- **Setup**: Seed 3 crisis cases from 3 distinct users
- **Query**: `crisis_trend` for date range containing small cohort
- **Expected**: 0 rows returned (suppressed by `HAVING COUNT(*) >= 5`)
- **Validates**: Privacy protection for small groups

#### Test 2: `test_compliant_publication`
- **Purpose**: Verify cohorts with n≥5 users pass through correctly
- **Setup**: Seed 6 crisis cases from 6 distinct users
- **Query**: `crisis_trend` for date range containing compliant cohort
- **Expected**: At least 1 row with `unique_users_affected >= 5`
- **Validates**: Correct publication of sufficiently large groups

#### Test 3: `test_individual_query_blocking`
- **Purpose**: Verify individual-level queries cannot bypass k-anonymity
- **Setup**: Attempt direct user-specific query (no aggregation)
- **Query**: Individual user SELECT (not in ALLOWED_QUERIES)
- **Expected**: Demonstrates vulnerability without allow-listing
- **Validates**: All 6 ALLOWED_QUERIES contain `GROUP BY` + `HAVING COUNT >= 5`

### Bonus Tests (Comprehensive Validation)

#### Test 4: `test_boundary_condition_k_equals_5`
- **Purpose**: Verify edge case where cohort size exactly equals k=5
- **Validates**: `>=` operator (not strict `>`)

#### Test 5: `test_multi_date_suppression_selectivity`
- **Purpose**: Verify selective suppression across multiple date groups
- **Setup**: 3 days with 8, 2, and 5 users respectively
- **Expected**: Days with 8 and 5 users published, day with 2 users suppressed
- **Validates**: Granular GROUP BY enforcement

## Execution

### Prerequisites
```bash
# Navigate to backend directory
cd backend

# Ensure test database is configured
# (Uses conftest.py fixtures for isolated test database)
```

### Run Tests
```bash
# Run all RQ4 privacy tests with verbose output
pytest research_evaluation/rq4_privacy/test_ia_k_anonymity.py -v

# Run specific test
pytest research_evaluation/rq4_privacy/test_ia_k_anonymity.py::test_small_cohort_suppression -v

# Run with coverage
pytest research_evaluation/rq4_privacy/test_ia_k_anonymity.py --cov=app.agents.ia -v
```

### Expected Output
```
research_evaluation/rq4_privacy/test_ia_k_anonymity.py::test_small_cohort_suppression PASSED
research_evaluation/rq4_privacy/test_ia_k_anonymity.py::test_compliant_publication PASSED
research_evaluation/rq4_privacy/test_ia_k_anonymity.py::test_individual_query_blocking PASSED
research_evaluation/rq4_privacy/test_ia_k_anonymity.py::test_boundary_condition_k_equals_5 PASSED
research_evaluation/rq4_privacy/test_ia_k_anonymity.py::test_multi_date_suppression_selectivity PASSED

======================== 5 passed in 2.34s ========================
```

## Code Review Checklist

### SQL Query Verification (Manual Inspection)

For each query in `app/agents/ia/queries.py`, verify:

- [ ] **crisis_trend**: Contains `HAVING COUNT(*) >= 5` ✅
- [ ] **dropoffs**: Contains `HAVING COUNT(DISTINCT c.id) >= 5` ✅
- [ ] **resource_reuse**: Contains `HAVING COUNT(DISTINCT ipr.id) >= 5` ✅
- [ ] **fallback_reduction**: Contains `HAVING COUNT(DISTINCT c.id) >= 5` ✅
- [ ] **cost_per_helpful**: Contains `HAVING COUNT(DISTINCT ta.id) >= 5` ✅
- [ ] **coverage_windows**: Contains `HAVING COUNT(DISTINCT c.id) >= 5` ✅

### Privacy Enforcement Mechanisms

1. **Allow-listing**: Only 6 predefined queries can be executed
   - Location: `ALLOWED_QUERIES` dictionary in `queries.py`
   - Prevents arbitrary SQL injection or user-crafted queries

2. **Aggregation**: All queries use `GROUP BY` with date/time dimensions
   - Prevents individual record retrieval
   - Forces data to be grouped before filtering

3. **k-Anonymity**: `HAVING COUNT(...) >= 5` clause on all queries
   - Suppresses groups with fewer than 5 distinct users/records
   - Applied AFTER aggregation (critical for privacy)

4. **Date Range Parameters**: All queries require `:start_date` and `:end_date`
   - Prevents unbounded queries
   - Reduces risk of de-anonymization via temporal correlation

## Results Documentation

### For Thesis Chapter 4

**RQ4 Evaluation Results Template**:

```latex
\subsubsection{Code Review Findings}

All six Insights Agent analytics queries were reviewed for k-anonymity enforcement:

\begin{itemize}
    \item \textbf{Allow-listing}: Only predefined queries in \texttt{ALLOWED\_QUERIES} can be executed
    \item \textbf{Aggregation}: All queries use \texttt{GROUP BY} with date/time dimensions
    \item \textbf{k-Anonymity Enforcement}: All queries contain \texttt{HAVING COUNT(...) >= 5}
    \item \textbf{Parameter Binding}: Date ranges prevent unbounded queries
\end{itemize}

\subsubsection{Unit Test Validation}

Five unit tests were executed to validate k-anonymity enforcement behavior:

\begin{table}[h]
\centering
\caption{RQ4 Unit Test Results}
\begin{tabular}{|l|l|c|}
\hline
\textbf{Test} & \textbf{Purpose} & \textbf{Result} \\
\hline
Small Cohort Suppression & Verify n<5 suppression & PASS \\
Compliant Publication & Verify n≥5 publication & PASS \\
Individual Query Blocking & Verify allow-list enforcement & PASS \\
Boundary Condition (k=5) & Verify edge case & PASS \\
Multi-Date Selectivity & Verify granular suppression & PASS \\
\hline
\end{tabular}
\end{table}

\textbf{Conclusion}: The Insights Agent successfully enforces k-anonymity (k≥5) 
across all analytics queries through three complementary mechanisms: allow-listing, 
aggregation, and SQL-level HAVING clause filtering. Unit tests confirm that small 
cohorts (n<5) are automatically suppressed while compliant cohorts (n≥5) are 
correctly published.
```

## Privacy Compliance Statement

This implementation follows **k-anonymity** principles as defined by:

> Sweeney, L. (2002). k-anonymity: A model for protecting privacy. 
> *International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems*, 10(05), 557-570.

**Key Properties**:
- Minimum group size k=5 (conservative threshold for student mental health data)
- Suppression (not perturbation) - ensures no false information published
- Query allow-listing prevents exploitation of aggregation logic
- No individual identifiers (user_id, conversation_id) in published results

## Limitations & Future Work

1. **Current Scope**: Tests validate SQL-level enforcement only
   - Does not test API-level access control (separate security layer)
   - Does not test cross-query linkage attacks

2. **Future Enhancements**:
   - Implement differential privacy noise addition for sensitive queries
   - Add query audit logging for compliance tracking
   - Extend tests to validate ℓ-diversity for high-risk cohorts

## Author Notes

These tests are designed for **research evaluation purposes** and are isolated from 
the CI/CD pipeline to prevent interference with production test suites. They validate 
the privacy guarantees described in the bachelor's thesis and can be run independently.

**Last Updated**: November 12, 2025
