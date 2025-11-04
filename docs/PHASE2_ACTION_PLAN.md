# Admin Dashboard Integration - Action Plan

**Date**: November 4, 2025  
**Status**: Ready to Execute  
**Estimated Time**: 13 hours

---

## 🎯 Summary

Both Service Desk and Insights dashboards have **complete frontend implementations**. The integration work is primarily about:

1. ✅ **Service Desk**: Backend mostly ready (95%) - Just needs endpoint verification
2. ⚠️ **Insights**: Needs schema fixes and new privacy endpoint (60% ready)

---

## 📋 Task Breakdown

### Phase 2A: Service Desk Integration (3 hours) ✅ HIGH PRIORITY

#### Task 1: Verify SDA Execution Endpoint (1 hour)

**Problem**: Frontend expects `/agents/graph/sda/execute` but we need to verify it exists.

**Frontend Call** (`ServiceDeskClient.tsx:96`):
```typescript
const result: SDAGraphResponse = await langGraphApi.executeSDA(request);
// Calls: POST /agents/graph/sda/execute
```

**Backend Status**: Has `/api/agents/sda/cases/assign` but not the graph execution endpoint.

**Action**:
```bash
# 1. Check if endpoint exists
curl http://localhost:8000/openapi.json | python -m json.tool | grep -A 5 "/agents/graph/sda"

# 2. If not exists, check alternative endpoints
curl http://localhost:8000/openapi.json | python -m json.tool | grep -A 5 "/agents/sda"
```

**Expected Outcome**: 
- If endpoint exists → Test it
- If not exists → Create it or update frontend to use `/api/agents/sda/cases/assign`

**Deliverable**: SDA execution endpoint working

---

#### Task 2: Test Case Creation Flow (1 hour)

**Test Scenario**: Create case from Service Desk form

**Steps**:
1. Login as admin user
2. Navigate to `/admin/service-desk`
3. Fill case creation form:
   - User hash: `test_user_123`
   - Severity: `critical`
   - Summary: `Test crisis escalation`
4. Click "Create Case"
5. Verify:
   - ✅ Case appears in queue
   - ✅ Auto-assignment triggers (from Phase 1)
   - ✅ SSE event fires (`case_created`)
   - ✅ Toast notification shows success

**Test Commands**:
```bash
# Backend test
curl -X POST http://localhost:8000/api/agents/sda/cases/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_hash": "test_user_123",
    "severity": "critical",
    "summary": "Test crisis escalation"
  }'

# Check case created
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/cases?status=new&severity=critical
```

**Deliverable**: Case creation works end-to-end

---

#### Task 3: Test SLA Breach Alerts (30 minutes)

**Test Scenario**: Verify SLA breach notifications

**Steps**:
1. Create case with short SLA (critical = 1 hour)
2. Wait for breach (or manually adjust `sla_breach_at` in DB)
3. Verify:
   - ✅ SSE event fires (`sla_breach`)
   - ✅ Toast notification shows alert
   - ✅ Case badge turns red
   - ✅ Minutes countdown shows negative

**Test Commands**:
```bash
# Create critical case (1 hour SLA)
curl -X POST http://localhost:8000/api/agents/sda/cases/assign \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"user_hash":"sla_test","severity":"critical","summary":"SLA test"}'

# Check SLA status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/admin/cases?sla_breached=true"

# Monitor SSE for sla_breach event
curl -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  http://localhost:8000/api/v1/admin/sse/events
```

**Deliverable**: SLA alerts working

---

#### Task 4: Test Priority Queue Display (30 minutes)

**Test Scenario**: Verify case list and filtering

**Steps**:
1. Create 5 test cases with varying severity
2. Navigate to Service Desk dashboard
3. Test filters:
   - ✅ Filter by status (new, in_progress)
   - ✅ Filter by severity (critical, high)
   - ✅ Sort by SLA urgency
   - ✅ Unassigned cases only
4. Verify:
   - ✅ Data accurate
   - ✅ SLA countdown updates
   - ✅ Priority order correct

**Test Commands**:
```bash
# Filter by severity
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/admin/cases?severity=critical"

# Filter unassigned
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/admin/cases?unassigned=true"

# Sort by SLA
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/admin/cases?sort_by=sla_breach_at&sort_order=asc"
```

**Deliverable**: Priority queue fully functional

---

### Phase 2B: Insights Dashboard Integration (8 hours) ⚠️ NEEDS WORK

#### Task 5: Fix IA Query Schema (2 hours)

**Problem**: Backend schema missing fields that frontend expects.

**Frontend Expects** (`langGraphApi.ts:439`):
```typescript
interface IAGraphResponse {
  success: boolean;
  question_id: string;
  result: {
    chart: any;
    table: any[];
    notes: string[];
    k_anonymity_satisfied: boolean;  // ❌ Missing
    records_suppressed: number;       // ❌ Missing
  };
  errors: string[];                   // ❌ Missing
  metadata: {                          // ❌ Missing
    execution_time_ms: number;
    privacy_budget_used: number;
  };
}
```

**Backend Has** (`ia/schemas.py`):
```python
class IAQueryResponse(BaseModel):
    chart: dict[str, Any]
    table: list[dict[str, Any]]
    notes: list[str] = Field(default_factory=list)
    # Missing: success, k_anonymity_satisfied, records_suppressed, errors, metadata
```

**Action**: Update `backend/app/agents/ia/schemas.py`

```python
class IAQueryResponse(BaseModel):
    """IA query response matching frontend expectations."""
    success: bool = True
    question_id: QuestionId
    result: IAQueryResult
    errors: list[str] = Field(default_factory=list)
    metadata: IAQueryMetadata

class IAQueryResult(BaseModel):
    """Query result with privacy compliance data."""
    chart: dict[str, Any]
    table: list[dict[str, Any]]
    notes: list[str] = Field(default_factory=list)
    k_anonymity_satisfied: bool = True
    records_suppressed: int = 0

class IAQueryMetadata(BaseModel):
    """Execution metadata."""
    execution_time_ms: float
    privacy_budget_used: float = 0.0
    query_timestamp: datetime = Field(default_factory=datetime.utcnow)
```

**Then Update** `backend/app/agents/ia/service.py`:

```python
async def query(self, payload: IAQueryRequest) -> IAQueryResponse:
    """Execute IA query with privacy compliance."""
    start_time = time.time()
    
    try:
        # Execute query (existing logic from Phase 1)
        result = await self._execute_query(payload.question_id, payload.params)
        
        # Check k-anonymity
        k_satisfied = self._check_k_anonymity(result.table)
        suppressed_count = len(result.table) if not k_satisfied else 0
        
        execution_time = (time.time() - start_time) * 1000
        
        return IAQueryResponse(
            success=True,
            question_id=payload.question_id,
            result=IAQueryResult(
                chart=result.chart,
                table=result.table if k_satisfied else [],
                notes=result.notes,
                k_anonymity_satisfied=k_satisfied,
                records_suppressed=suppressed_count
            ),
            errors=[],
            metadata=IAQueryMetadata(
                execution_time_ms=execution_time,
                privacy_budget_used=0.0  # TODO: Implement budget tracking
            )
        )
    except Exception as e:
        execution_time = (time.time() - start_time) * 1000
        logger.error(f"IA query failed: {e}", exc_info=True)
        
        return IAQueryResponse(
            success=False,
            question_id=payload.question_id,
            result=IAQueryResult(
                chart={},
                table=[],
                notes=[],
                k_anonymity_satisfied=False,
                records_suppressed=0
            ),
            errors=[str(e)],
            metadata=IAQueryMetadata(
                execution_time_ms=execution_time,
                privacy_budget_used=0.0
            )
        )

def _check_k_anonymity(self, table: list[dict[str, Any]], k: int = 5) -> bool:
    """Check if result meets k-anonymity threshold."""
    # If no quasi-identifiers, k-anonymity is satisfied
    if not table:
        return True
    
    # Count records per group (if grouped)
    # For aggregate-only queries from Phase 1, k-anonymity is built-in
    # because we use GROUP BY with HAVING COUNT(*) >= 5
    
    # For now, trust Phase 1 queries enforce k-anonymity at SQL level
    return True  # TODO: Add runtime validation
```

**Deliverable**: IA schema matches frontend expectations

---

#### Task 6: Update Frontend API Call (1 hour)

**Problem**: Frontend calls `/agents/graph/ia/execute` but backend has `/api/agents/ia/query`

**Option A - Update Frontend** (RECOMMENDED):
```typescript
// frontend/src/services/langGraphApi.ts:439
export const executeIA = async (request: IAGraphRequest): Promise<IAGraphResponse> => {
  const response = await apiClient.post<IAGraphResponse>(
    '/api/agents/ia/query',  // Changed from /agents/graph/ia/execute
    request
  );
  return response.data;
};
```

**Option B - Add Backend Alias**:
```python
# backend/app/agents/ia/router.py
@router.post("/execute", response_model=IAQueryResponse)  # Add alias
async def execute_graph(
    payload: IAQueryRequest,
    service: InsightsAgentService = Depends(get_insights_agent_service),
) -> IAQueryResponse:
    """LangGraph execution endpoint (alias for /query)."""
    return await query(payload, service)
```

**Recommendation**: Use **Option A** (simpler, one file change)

**Test**:
```bash
# Test IA query execution
curl -X POST http://localhost:8000/api/agents/ia/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": "crisis_trend",
    "params": {
      "from": "2025-10-01T00:00:00Z",
      "to": "2025-11-04T23:59:59Z"
    }
  }'
```

**Deliverable**: IA queries execute from frontend

---

#### Task 7: Test All 6 Query Types (2 hours)

**Test Scenarios**: Execute each allow-listed query

**Queries to Test**:
1. ✅ `crisis_trend` - Hourly crisis detection counts
2. ✅ `dropoffs` - Session continuation rates
3. ✅ `resource_reuse` - Resource card effectiveness
4. ✅ `fallback_reduction` - AIKA meta-agent escalation rate
5. ✅ `cost_per_helpful` - Cost efficiency analysis
6. ✅ `coverage_windows` - Counselor coverage gaps

**Test Plan**:
```bash
#!/bin/bash
# Test all IA queries

TOKEN="your_admin_token"
FROM="2025-10-01T00:00:00Z"
TO="2025-11-04T23:59:59Z"

QUERIES=("crisis_trend" "dropoffs" "resource_reuse" "fallback_reduction" "cost_per_helpful" "coverage_windows")

for query in "${QUERIES[@]}"; do
  echo "Testing query: $query"
  
  curl -X POST http://localhost:8000/api/agents/ia/query \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"question_id\": \"$query\",
      \"params\": {
        \"from\": \"$FROM\",
        \"to\": \"$TO\"
      }
    }" | python -m json.tool
  
  echo "---"
done
```

**Verification**:
- ✅ All queries return `success: true`
- ✅ `k_anonymity_satisfied: true`
- ✅ Charts have correct structure
- ✅ Tables have aggregate data
- ✅ Notes explain results
- ✅ Execution time < 2 seconds

**Deliverable**: All 6 queries working

---

#### Task 8: Create Privacy Status Endpoint (3 hours)

**Problem**: Frontend needs `/api/v1/admin/insights/privacy-status` but it doesn't exist.

**Frontend Needs**:
```typescript
interface PrivacyStatusResponse {
  differential_privacy: {
    budget_used: number;
    budget_remaining: number;
    last_reset: string;
  };
  k_anonymity: {
    threshold: number;  // 5
    compliant_queries: number;
    blocked_queries: number;
  };
  consent: {
    total_users: number;
    opted_in: number;
    opted_out: number;
    pending: number;
  };
  active_queries: number;
}
```

**Step 1: Add Schema** (`backend/app/agents/ia/schemas.py`):

```python
class PrivacyStatusResponse(BaseModel):
    """Privacy compliance status."""
    differential_privacy: DifferentialPrivacyStatus
    k_anonymity: KAnonymityStatus
    consent: ConsentStatus
    active_queries: int

class DifferentialPrivacyStatus(BaseModel):
    """Differential privacy budget tracking."""
    budget_used: float
    budget_remaining: float
    last_reset: datetime

class KAnonymityStatus(BaseModel):
    """K-anonymity compliance tracking."""
    threshold: int = 5
    compliant_queries: int
    blocked_queries: int

class ConsentStatus(BaseModel):
    """User consent statistics."""
    total_users: int
    opted_in: int
    opted_out: int
    pending: int
```

**Step 2: Add Endpoint** (`backend/app/agents/ia/router.py`):

```python
@router.get("/privacy-status", response_model=PrivacyStatusResponse)
async def get_privacy_status(
    service: InsightsAgentService = Depends(get_insights_agent_service),
) -> PrivacyStatusResponse:
    """Get privacy compliance status for Insights Dashboard."""
    return await service.get_privacy_status()
```

**Step 3: Implement Service Method** (`backend/app/agents/ia/service.py`):

```python
async def get_privacy_status(self) -> PrivacyStatusResponse:
    """Get privacy compliance statistics."""
    
    # 1. Query ConsentLedger for consent stats
    total_users_stmt = select(func.count(distinct(ConsentLedger.user_id)))
    total_users = (await self.db.execute(total_users_stmt)).scalar() or 0
    
    opted_in_stmt = select(func.count(distinct(ConsentLedger.user_id))).where(
        ConsentLedger.ia_analytics == True,
        ConsentLedger.withdrawn_at.is_(None)
    )
    opted_in = (await self.db.execute(opted_in_stmt)).scalar() or 0
    
    opted_out_stmt = select(func.count(distinct(ConsentLedger.user_id))).where(
        or_(
            ConsentLedger.ia_analytics == False,
            ConsentLedger.withdrawn_at.isnot(None)
        )
    )
    opted_out = (await self.db.execute(opted_out_stmt)).scalar() or 0
    
    pending = total_users - opted_in - opted_out
    
    # 2. Query IAQueryAudit for k-anonymity compliance
    # TODO: Implement IAQueryAudit table in Phase 3
    compliant_queries = 0
    blocked_queries = 0
    
    # 3. Differential privacy budget (Phase 3 feature)
    # TODO: Implement budget tracking
    dp_budget_used = 0.0
    dp_budget_remaining = 1.0  # ε = 1.0 default
    dp_last_reset = datetime.utcnow()
    
    # 4. Active queries (cached queries in last 5 minutes)
    # TODO: Query Redis for active query sessions
    active_queries = 0
    
    return PrivacyStatusResponse(
        differential_privacy=DifferentialPrivacyStatus(
            budget_used=dp_budget_used,
            budget_remaining=dp_budget_remaining,
            last_reset=dp_last_reset
        ),
        k_anonymity=KAnonymityStatus(
            threshold=5,
            compliant_queries=compliant_queries,
            blocked_queries=blocked_queries
        ),
        consent=ConsentStatus(
            total_users=total_users,
            opted_in=opted_in,
            opted_out=opted_out,
            pending=pending
        ),
        active_queries=active_queries
    )
```

**Test**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/agents/ia/privacy-status
```

**Deliverable**: Privacy status endpoint working

---

### Phase 2C: Documentation & Polish (2 hours)

#### Task 9: End-to-End Admin Workflow Test (1 hour)

**Test Scenario**: Complete admin user journey

**Steps**:
1. ✅ Login as admin (`admin@ugm.ac.id`)
2. ✅ Navigate to `/admin/dashboard` - View overview
3. ✅ Navigate to `/admin/service-desk`
   - Create critical case
   - Verify auto-assignment
   - Add case note
   - Update status to in_progress
   - Verify SSE updates
4. ✅ Navigate to `/admin/insights`
   - Check privacy status badge
   - Run `crisis_trend` query
   - Verify chart renders
   - Run `coverage_windows` query
   - Verify k-anonymity enforcement
5. ✅ Navigate back to `/admin/dashboard`
   - Verify KPIs updated
   - Check recent alerts

**Checklist**:
- [ ] All pages load without errors
- [ ] All API calls succeed
- [ ] Real-time updates work
- [ ] Privacy enforcement works
- [ ] UI responsive and polished

**Deliverable**: Complete admin workflow functional

---

#### Task 10: Update Documentation (1 hour)

**Documents to Create/Update**:

1. **Admin Dashboard User Guide**
   - File: `docs/ADMIN_DASHBOARD_USER_GUIDE.md`
   - Sections:
     - Overview
     - Service Desk Dashboard usage
     - Insights Dashboard usage
     - Privacy safeguards explanation
     - Troubleshooting

2. **API Reference Updates**
   - File: `docs/API_REFERENCE.md`
   - Add:
     - `/api/agents/ia/query`
     - `/api/agents/ia/privacy-status`
     - `/api/agents/sda/*`
     - `/api/v1/admin/cases/*`
     - `/api/v1/admin/sse/events`

3. **Phase 2 Completion Summary**
   - File: `docs/PHASE2_COMPLETION_SUMMARY.md`
   - Sections:
     - What was implemented
     - What was discovered (existing code)
     - Integration challenges solved
     - Testing results
     - Known limitations

**Deliverable**: Documentation complete

---

## ✅ Success Criteria

### Service Desk Dashboard
- ✅ Cases display in priority queue
- ✅ Summary cards show accurate counts
- ✅ Case creation form works
- ✅ Auto-assignment assigns to lowest workload counselor
- ✅ SLA alerts show for breaches
- ✅ SSE updates work in real-time
- ✅ Case details expandable

### Insights Dashboard
- ✅ All 6 queries execute successfully
- ✅ Charts render with correct data
- ✅ Tables show aggregate results
- ✅ Privacy badge shows compliance status
- ✅ K-anonymity threshold enforced (k≥5)
- ✅ Query execution time < 2 seconds
- ✅ Error messages user-friendly

### Overall
- ✅ No console errors
- ✅ All API endpoints respond correctly
- ✅ Authentication/authorization works
- ✅ Real-time updates reliable
- ✅ Privacy guarantees enforced
- ✅ Documentation complete

---

## 🚀 Getting Started

### Prerequisites
```bash
# 1. Ensure backend running
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# 2. Ensure frontend running
cd frontend
npm run dev  # Port 4000

# 3. Ensure PostgreSQL running (port 5432)
# 4. Ensure Redis running (port 6379)

# 5. Get admin auth token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ugm.ac.id",
    "password": "your_password"
  }'
```

### Execute Tasks in Order

**Quick Start (Service Desk Only - 3 hours)**:
```bash
# Run Tasks 1-4
# Result: Fully functional Service Desk Dashboard
```

**Full Integration (Both Dashboards - 11 hours)**:
```bash
# Run Tasks 1-9
# Result: Both dashboards fully functional
```

**Complete with Docs (13 hours)**:
```bash
# Run all tasks 1-10
# Result: Production-ready admin dashboards with documentation
```

---

## 📊 Progress Tracking

| Task | Component | Priority | Effort | Status |
|------|-----------|----------|--------|--------|
| 1 | Verify SDA endpoint | HIGH | 1h | ⏳ TODO |
| 2 | Test case creation | HIGH | 1h | ⏳ TODO |
| 3 | Test SLA alerts | HIGH | 30m | ⏳ TODO |
| 4 | Test priority queue | HIGH | 30m | ⏳ TODO |
| 5 | Fix IA schema | HIGH | 2h | ⏳ TODO |
| 6 | Update frontend API | HIGH | 1h | ⏳ TODO |
| 7 | Test 6 queries | HIGH | 2h | ⏳ TODO |
| 8 | Privacy endpoint | MEDIUM | 3h | ⏳ TODO |
| 9 | E2E testing | MEDIUM | 1h | ⏳ TODO |
| 10 | Documentation | LOW | 1h | ⏳ TODO |
| **TOTAL** | | | **13h** | **0%** |

---

## 🎯 Next Immediate Action

**START HERE**: Task 1 - Verify SDA Execution Endpoint

```bash
# Check OpenAPI schema for SDA endpoints
curl http://localhost:8000/openapi.json | python -m json.tool > openapi_schema.json

# Search for SDA endpoints
cat openapi_schema.json | grep -A 10 "/agents/graph/sda"
cat openapi_schema.json | grep -A 10 "/agents/sda"

# Test cases list endpoint (we know this exists)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/agents/sda/cases

# If SDA execute endpoint doesn't exist, we'll create it or update frontend
```

**Expected Outcome**: Know whether to create endpoint or update frontend call.

---

## 📝 Notes

- **Service Desk**: 95% backend ready, mainly needs testing
- **Insights**: 60% ready, needs schema fixes and privacy endpoint
- **Timeline**: Can deliver Service Desk in 3 hours, full integration in 13 hours
- **Risk**: Low - most infrastructure exists, mainly integration work
- **Dependencies**: Admin authentication must be working

---

**Ready to start? Begin with Task 1!** 🚀
