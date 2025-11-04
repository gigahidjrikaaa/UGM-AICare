# Phase 2: Admin Dashboard Frontend Integration Plan

**Date**: November 4, 2025  
**Status**: ⏳ **IN PROGRESS**

---

## Overview

Integrate the completed Phase 1 backend implementations (IA Analytics Queries, SDA Auto-Assignment, Redis Caching) with the existing frontend admin dashboards.

### Dashboards to Integrate:
1. **Insights Dashboard** (`/admin/insights`) - IA Analytics with 6 privacy-safe queries
2. **Service Desk Dashboard** (`/admin/service-desk`) - SDA case management

---

## Current State Analysis

### ✅ Already Exists (Frontend)

**Insights Dashboard** (`frontend/src/app/admin/(protected)/insights/`):
- ✅ Page layout with privacy badges
- ✅ `IAQuerySelector` component
- ✅ `IAQueryResults` component  
- ✅ `PrivacySafeguardsStatus` component
- ✅ `useIAExecution` hook
- ✅ `usePrivacyStatus` hook

**Service Desk Dashboard** (`frontend/src/app/admin/(protected)/service-desk/`):
- ✅ Main dashboard layout
- ✅ `CaseCreationForm` component
- ✅ `SummaryCards` component
- ✅ `PriorityQueue` component
- ✅ SSE integration for real-time updates

### ✅ Already Exists (Backend)

**IA Analytics**:
- ✅ 6 SQL queries implemented (`backend/app/agents/ia/queries.py`)
- ✅ IA service with query execution (`backend/app/agents/ia/service.py`)
- ✅ IA router (`/api/agents/ia/query`)
- ✅ IA schema with 6 question IDs

**SDA Auto-Assignment**:
- ✅ Auto-assignment algorithm in SDA graph
- ✅ Workload balancing logic
- ✅ CaseAssignment audit trail
- ✅ SDA router (`/api/agents/sda/*`)

---

## Integration Gaps

### 🔴 **Critical Issues**

#### 1. Frontend API Mismatch
**Problem**: Frontend calls `/agents/graph/ia/execute` but backend exposes `/api/agents/ia/query`

**Frontend Code** (`langGraphApi.ts:439`):
```typescript
export const executeIA = async (request: IAGraphRequest): Promise<IAGraphResponse> => {
  const response = await apiClient.post<IAGraphResponse>(
    '/agents/graph/ia/execute',  // ❌ This endpoint doesn't exist
    request
  );
  return response.data;
};
```

**Backend Endpoint** (`ia/router.py`):
```python
@router.post("/query", response_model=IAQueryResponse)  # ✅ /api/agents/ia/query
async def query(
    payload: IAQueryRequest,
    service: InsightsAgentService = Depends(get_insights_agent_service),
) -> IAQueryResponse:
    return await service.query(payload)
```

**Solution Options**:
- **Option A**: Update frontend to call `/api/agents/ia/query` ✅ **RECOMMENDED**
- **Option B**: Add `/agents/graph/ia/execute` alias endpoint
- **Option C**: Create middleware to route old paths to new

#### 2. Schema Mismatch
**Problem**: Frontend expects `IAGraphResponse` but backend returns `IAQueryResponse`

**Frontend Expected** (`langGraphApi.ts`):
```typescript
interface IAGraphResponse {
  success: boolean;
  question_id: string;
  result: {
    chart: any;
    table: any[];
    notes: string[];
    k_anonymity_satisfied: boolean;
    records_suppressed: number;
  };
  errors: string[];
  metadata: {
    execution_time_ms: number;
    privacy_budget_used: number;
  };
}
```

**Backend Actual** (`ia/schemas.py`):
```python
class IAQueryResponse(BaseModel):
    chart: dict[str, Any]
    table: list[dict[str, Any]]
    notes: list[str] = Field(default_factory=list)
```

**Missing Fields**:
- ❌ `success` boolean
- ❌ `k_anonymity_satisfied` boolean
- ❌ `records_suppressed` number
- ❌ `errors` array
- ❌ `metadata` object with timing/budget

**Solution**: Enhance `IAQueryResponse` schema to match frontend expectations

#### 3. Query Parameter Format
**Problem**: Frontend sends different parameter format than backend expects

**Frontend Sends**:
```typescript
interface IAGraphRequest {
  question_id: string;
  params: {
    from: string;  // ISO date string
    to: string;    // ISO date string
  };
}
```

**Backend Expects** (`ia/schemas.py`):
```python
class IAQueryParams(BaseModel):
    start: datetime = Field(..., alias="from")  # ✅ Uses alias
    end: datetime = Field(..., alias="to")      # ✅ Uses alias
```

**Status**: ✅ **Already compatible** (Pydantic aliases handle this)

---

### 🟡 **Missing Features**

#### 4. Privacy Status Endpoint
**Frontend Hook** (`usePrivacyStatus.ts`):
```typescript
// Fetches privacy compliance status
// Expected endpoint: /api/v1/admin/insights/privacy-status
```

**Backend**: ❌ **Not implemented**

**Needs**:
- Differential privacy budget tracking
- Consent statistics
- K-anonymity compliance stats
- Active query count

#### 5. SDA Case List Endpoint
**Frontend Component** (`PriorityQueue.tsx`):
```typescript
// Fetches list of cases sorted by priority
// Expected endpoint: /api/v1/admin/service-desk/cases
```

**Backend**: ⚠️ **Partially exists** (needs enhancement)

**Needs**:
- Filter by status (new, in_progress, resolved)
- Filter by severity (critical, high, moderate, low)
- Sort by SLA urgency
- Pagination

#### 6. Case Summary Statistics
**Frontend Component** (`SummaryCards.tsx`):
```typescript
// Fetches aggregate statistics
// Expected endpoint: /api/v1/admin/service-desk/summary
```

**Backend**: ❌ **Not implemented**

**Needs**:
- Total cases by status
- SLA breach count/alerts
- Average assignment time
- Counselor workload distribution

---

## Implementation Plan

### **Step 1: Fix IA Query Integration** (HIGH PRIORITY)

**1.1. Update IAQueryResponse Schema**

File: `backend/app/agents/ia/schemas.py`

```python
class IAQueryResponse(BaseModel):
    success: bool = True
    question_id: QuestionId
    result: IAQueryResult
    errors: list[str] = Field(default_factory=list)
    metadata: IAQueryMetadata

class IAQueryResult(BaseModel):
    chart: dict[str, Any]
    table: list[dict[str, Any]]
    notes: list[str] = Field(default_factory=list)
    k_anonymity_satisfied: bool = True
    records_suppressed: int = 0

class IAQueryMetadata(BaseModel):
    execution_time_ms: float
    privacy_budget_used: float = 0.0
    query_timestamp: datetime = Field(default_factory=datetime.now)
```

**1.2. Update IA Service**

File: `backend/app/agents/ia/service.py`

Add timing, k-anonymity checking, and proper response formatting.

**1.3. Update Frontend API Call**

File: `frontend/src/services/langGraphApi.ts`

Change endpoint from `/agents/graph/ia/execute` to `/api/agents/ia/query`.

---

### **Step 2: Create Privacy Status Endpoint** (HIGH PRIORITY)

**2.1. Add Privacy Status Schema**

File: `backend/app/agents/ia/schemas.py`

```python
class PrivacyStatusResponse(BaseModel):
    differential_privacy: DifferentialPrivacyStatus
    k_anonymity: KAnonymityStatus
    consent: ConsentStatus
    active_queries: int

class DifferentialPrivacyStatus(BaseModel):
    budget_used: float
    budget_remaining: float
    last_reset: datetime

class KAnonymityStatus(BaseModel):
    threshold: int = 5
    compliant_queries: int
    blocked_queries: int

class ConsentStatus(BaseModel):
    total_users: int
    opted_in: int
    opted_out: int
    pending: int
```

**2.2. Add Endpoint to IA Router**

```python
@router.get("/privacy-status", response_model=PrivacyStatusResponse)
async def get_privacy_status(
    service: InsightsAgentService = Depends(get_insights_agent_service),
) -> PrivacyStatusResponse:
    return await service.get_privacy_status()
```

---

### **Step 3: Create SDA Dashboard Endpoints** (MEDIUM PRIORITY)

**3.1. Cases List Endpoint**

File: `backend/app/agents/sda/router.py`

```python
@router.get("/cases", response_model=CasesListResponse)
async def list_cases(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    assigned_to: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    service: ServiceDeskService = Depends(get_service_desk_service),
) -> CasesListResponse:
    return await service.list_cases(...)
```

**3.2. Summary Statistics Endpoint**

```python
@router.get("/summary", response_model=SummaryStat sResponse)
async def get_summary(
    service: ServiceDeskService = Depends(get_service_desk_service),
) -> SummaryStatsResponse:
    return await service.get_summary_stats()
```

**3.3. SSE Events Endpoint**

Already exists at `/api/v1/admin/sse/events` but needs to emit:
- `case_created` events
- `case_updated` events
- `sla_breach` events

---

### **Step 4: Test Integration** (CRITICAL)

**4.1. IA Query Test**

```bash
# Test crisis_trend query
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

**4.2. SDA Case Creation Test**

```bash
# Test case creation with auto-assignment
curl -X POST http://localhost:8000/api/agents/sda/escalate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_hash": "test_user",
    "session_id": "test_session",
    "severity": "high",
    "reason": "Test escalation"
  }'
```

**4.3. Frontend E2E Test**

1. Login as admin user
2. Navigate to `/admin/insights`
3. Select "Crisis Trend" query
4. Set date range (last 30 days)
5. Click "Execute Query"
6. Verify chart and table display
7. Check privacy badge shows "k-anonymity satisfied"

---

## Success Criteria

### Insights Dashboard
- ✅ All 6 queries execute successfully
- ✅ Charts render with correct data
- ✅ Tables show aggregate results
- ✅ Privacy badge shows compliance status
- ✅ K-anonymity threshold enforced (k≥5)
- ✅ Query execution time < 2 seconds
- ✅ Error messages user-friendly

### Service Desk Dashboard
- ✅ Cases display in priority queue
- ✅ Summary cards show accurate counts
- ✅ Case creation form works
- ✅ Auto-assignment assigns to lowest workload counselor
- ✅ SLA alerts show for breaches
- ✅ SSE updates work in real-time
- ✅ Case details expandable

---

## Timeline Estimate

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Fix IA schema mismatch | HIGH | 2 hours | ⏳ TODO |
| Update frontend API calls | HIGH | 1 hour | ⏳ TODO |
| Add privacy status endpoint | HIGH | 3 hours | ⏳ TODO |
| Test IA queries E2E | HIGH | 2 hours | ⏳ TODO |
| Add SDA cases list endpoint | MEDIUM | 2 hours | ⏳ TODO |
| Add SDA summary endpoint | MEDIUM | 2 hours | ⏳ TODO |
| Test SDA dashboard E2E | MEDIUM | 2 hours | ⏳ TODO |
| **TOTAL** | | **14 hours** | **0% Complete** |

---

## Next Actions

1. **Start with IA Integration** (Highest impact)
   - Fix schema mismatch
   - Update frontend API call
   - Test with one query (crisis_trend)

2. **Add Privacy Status**
   - Implement endpoint
   - Connect to frontend hook
   - Test privacy badge display

3. **SDA Dashboard Enhancement**
   - Add list/summary endpoints
   - Test case creation flow
   - Verify auto-assignment

4. **End-to-End Testing**
   - Run through complete admin workflows
   - Document any issues
   - Create user guide

---

## Dependencies

- ✅ Phase 1 Complete (IA Queries, SDA Auto-Assignment, Redis Caching)
- ✅ Backend running and healthy
- ✅ Frontend dashboards exist
- ⏳ Admin user authentication working
- ⏳ Database populated with test data

---

**Next Step**: Fix IA schema mismatch and update frontend API calls
