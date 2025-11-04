# Admin Dashboard Integration Status

**Last Updated**: November 4, 2025  
**Phase**: Phase 2 - Frontend Integration  
**Focus**: Service Desk Dashboard & Insights Dashboard

---

## 🎯 Executive Summary

**GOOD NEWS**: Most backend infrastructure already exists! The Service Desk and Insights dashboards have:

✅ **Service Desk Backend** - COMPLETE (95%)
- Case management endpoints exist (`/api/v1/admin/cases`)
- SSE real-time updates exist (`/api/v1/admin/sse/events`)
- Dashboard summary endpoint exists (`/api/v1/admin/dashboard/overview`)
- SLA tracking and auto-assignment working (Phase 1)

✅ **Insights Analytics Backend** - PARTIAL (60%)
- IA query engine complete (6 SQL queries from Phase 1)
- IA reports endpoint exists (`/api/v1/admin/insights/reports`)
- Dashboard overview endpoint exists (`/api/v1/admin/dashboard/overview`)

❌ **Integration Gaps** - Need to fix:
1. Frontend expects different endpoint pattern for IA queries
2. Need privacy status endpoint for Insights Dashboard
3. Schema mismatch between frontend and backend responses

---

## 📊 Service Desk Dashboard Status

### ✅ Backend Endpoints (ALREADY EXIST)

#### 1. Cases List - `/api/v1/admin/cases`
**File**: `backend/app/routes/admin/cases.py` (722 lines)

**Capabilities**:
- ✅ Comprehensive filtering (status, severity, assigned_to, unassigned, sla_breached)
- ✅ Text search (user_hash, summary)
- ✅ Pagination (page, page_size)
- ✅ Sorting (created_at, updated_at, severity, sla_breach_at)
- ✅ SLA breach status calculation with countdown
- ✅ Related counts (notes, assignments)

**Request Example**:
```bash
GET /api/v1/admin/cases?status=new&severity=critical&page=1&page_size=20
```

**Response Schema**:
```typescript
interface CaseListResponse {
  cases: CaseListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface CaseListItem {
  id: string;
  user_hash: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  severity: 'low' | 'med' | 'high' | 'critical';
  summary: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  sla_breach_at: string | null;
  sla_status: 'safe' | 'warning' | 'critical' | 'breached';
  minutes_until_breach: number | null;
  notes_count: number;
  assignments_count: number;
  latest_triage?: TriageAssessmentSummary;
}
```

**Status**: ✅ **FULLY FUNCTIONAL** - No changes needed

---

#### 2. Case Details - `/api/v1/admin/cases/{case_id}`
**File**: `backend/app/routes/admin/cases.py:200-300`

**Capabilities**:
- ✅ Full case details with all related data
- ✅ Conversation history with messages
- ✅ All triage assessments
- ✅ Case notes with author info
- ✅ Assignment history
- ✅ SLA tracking details

**Request Example**:
```bash
GET /api/v1/admin/cases/123e4567-e89b-12d3-a456-426614174000
```

**Status**: ✅ **FULLY FUNCTIONAL**

---

#### 3. Case Creation/Update
**File**: `backend/app/routes/admin/cases.py`

Available endpoints:
- ✅ `POST /api/v1/admin/cases/{case_id}/assign` - Assign case to counselor
- ✅ `PUT /api/v1/admin/cases/{case_id}/status` - Update case status
- ✅ `POST /api/v1/admin/cases/{case_id}/notes` - Add case note
- ✅ `GET /api/v1/admin/cases/{case_id}/notes` - List case notes

**Status**: ✅ **FULLY FUNCTIONAL**

---

#### 4. Dashboard Overview - `/api/v1/admin/dashboard/overview`
**File**: `backend/app/routes/admin/dashboard.py` (473 lines)

**Capabilities**:
- ✅ Active critical cases count
- ✅ Cases opened/closed this week
- ✅ Appointments this week
- ✅ Average case resolution time
- ✅ SLA breach count
- ✅ Overall sentiment with delta
- ✅ Trending topics (from IA reports)
- ✅ Latest insights summary
- ✅ Critical alerts list

**Request Example**:
```bash
GET /api/v1/admin/dashboard/overview?time_range=7
```

**Response Schema**:
```typescript
interface DashboardOverview {
  kpis: {
    active_critical_cases: number;
    overall_sentiment: number | null;
    sentiment_delta: number | null;
    appointments_this_week: number;
    cases_opened_this_week: number;
    cases_closed_this_week: number;
    avg_case_resolution_time: number | null;
    sla_breach_count: number;
    active_campaigns_count: number;
  };
  insights: {
    summary: string;
    trending_topics: TrendingTopic[];
    generated_at: string;
  };
  alerts: AlertItem[];
}
```

**Status**: ✅ **FULLY FUNCTIONAL** - Perfect for SummaryCards component

---

#### 5. SSE Real-Time Updates - `/api/v1/admin/sse/events`
**File**: `backend/app/routes/admin/sse.py` (112 lines)

**Capabilities**:
- ✅ Persistent SSE connection
- ✅ Event types: `alert_created`, `case_updated`, `sla_breach`, `ia_report_generated`, `ping`
- ✅ Automatic disconnection handling
- ✅ Connection statistics endpoint

**Event Format**:
```
event: case_updated
data: {"case_id": "123...", "status": "in_progress", "assigned_to": "counselor@ugm.ac.id"}

event: sla_breach
data: {"case_id": "456...", "severity": "critical", "minutes_overdue": 15}

event: ping
data: {"timestamp": "2025-11-04T12:00:00Z"}
```

**Frontend Integration**:
```typescript
// frontend/src/app/admin/(protected)/service-desk/ServiceDeskClient.tsx
const { isConnected } = useSSE({
  url: '/api/v1/admin/sse/events',  // ✅ Correct endpoint
  onEvent: handleSSEEvent,
  eventTypes: ['case_created', 'case_updated', 'sla_breach', 'ping']
});
```

**Status**: ✅ **FULLY FUNCTIONAL** - Frontend already uses correct endpoint!

---

### 🔄 Service Desk Integration TODO

**Minor Fixes Needed**:

1. ✅ **Verify SDA execution endpoint** for case creation
   - Frontend calls: `langGraphApi.executeSDA(request)`
   - Expected: `/agents/graph/sda/execute`
   - Need to check: Does this endpoint exist?

2. ✅ **Test case creation flow** end-to-end
   - Create case from Service Desk form
   - Verify auto-assignment triggers (Phase 1 implementation)
   - Confirm SSE event fires (`case_created`)

3. ✅ **Test SLA breach alerts**
   - Create case with short SLA
   - Wait for breach
   - Verify SSE event fires (`sla_breach`)
   - Check toast notification appears

**Estimated Time**: 2-3 hours

---

## 📈 Insights Dashboard Status

### ⚠️ Backend Endpoints (PARTIAL)

#### 1. IA Query Execution - **MISMATCH DETECTED**

**Frontend Expects**: `/agents/graph/ia/execute`
```typescript
// frontend/src/services/langGraphApi.ts:439
export const executeIA = async (request: IAGraphRequest): Promise<IAGraphResponse> => {
  const response = await apiClient.post<IAGraphResponse>(
    '/agents/graph/ia/execute',  // ❌ This endpoint doesn't exist
    request
  );
  return response.data;
};
```

**Backend Has**: `/api/agents/ia/query`
```python
# backend/app/agents/ia/router.py:15
@router.post("/query", response_model=IAQueryResponse)
async def query(
    payload: IAQueryRequest,
    service: InsightsAgentService = Depends(get_insights_agent_service),
) -> IAQueryResponse:
    return await service.query(payload)
```

**Schema Mismatch**:

Frontend expects:
```typescript
interface IAGraphResponse {
  success: boolean;
  question_id: string;
  result: {
    chart: any;
    table: any[];
    notes: string[];
    k_anonymity_satisfied: boolean;  // ❌ Missing in backend
    records_suppressed: number;       // ❌ Missing in backend
  };
  errors: string[];                   // ❌ Missing in backend
  metadata: {                          // ❌ Missing in backend
    execution_time_ms: number;
    privacy_budget_used: number;
  };
}
```

Backend returns:
```python
class IAQueryResponse(BaseModel):
    chart: dict[str, Any]
    table: list[dict[str, Any]]
    notes: list[str] = Field(default_factory=list)
    # ❌ Missing: success, k_anonymity_satisfied, records_suppressed, errors, metadata
```

**Status**: ❌ **NEEDS FIXING** - Schema enhancement required

---

#### 2. IA Reports List - `/api/v1/admin/insights/reports`
**File**: `backend/app/routes/admin/insights.py:100`

**Capabilities**:
- ✅ List IA-generated reports (weekly, monthly, ad_hoc)
- ✅ Pagination support
- ✅ Filter by report type
- ✅ Includes trending topics and sentiment data

**Request Example**:
```bash
GET /api/v1/admin/insights/reports?report_type=weekly&limit=10&offset=0
```

**Response Schema**:
```typescript
interface ReportsListResponse {
  reports: InsightsReportSchema[];
  total: number;
  limit: number;
  offset: number;
}

interface InsightsReportSchema {
  id: string;
  report_type: 'weekly' | 'monthly' | 'ad_hoc';
  period_start: string;
  period_end: string;
  summary: string | null;
  trending_topics: any;
  sentiment_data: any;
  high_risk_count: number;
  assessment_count: number;
  generated_at: string;
}
```

**Status**: ✅ **FULLY FUNCTIONAL**

---

#### 3. Privacy Status Endpoint - **MISSING**

**Frontend Needs**: `/api/v1/admin/insights/privacy-status`
```typescript
// frontend/src/app/admin/(protected)/insights/hooks/usePrivacyStatus.ts
// Expected endpoint for PrivacySafeguardsStatus component
```

**Expected Response**:
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

**Status**: ❌ **NOT IMPLEMENTED** - Needs creation

---

### 🔧 Insights Dashboard Integration TODO

**Critical Fixes**:

**1. Fix IA Query Schema** (HIGH PRIORITY)

Update `backend/app/agents/ia/schemas.py`:
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
    query_timestamp: datetime = Field(default_factory=datetime.utcnow)
```

Update `backend/app/agents/ia/service.py` to populate these fields.

**2. Update Frontend API Call** (HIGH PRIORITY)

Option A - Change frontend endpoint:
```typescript
// frontend/src/services/langGraphApi.ts
export const executeIA = async (request: IAGraphRequest) => {
  const response = await apiClient.post<IAGraphResponse>(
    '/api/agents/ia/query',  // Changed from /agents/graph/ia/execute
    request
  );
  return response.data;
};
```

Option B - Add backend alias:
```python
# backend/app/agents/ia/router.py
@router.post("/execute", response_model=IAQueryResponse)  # Add alias
async def execute_graph(payload: IAQueryRequest, ...):
    return await query(payload, service)
```

**Recommendation**: **Option A** (simpler, one file change)

**3. Create Privacy Status Endpoint** (MEDIUM PRIORITY)

Add to `backend/app/agents/ia/router.py`:
```python
@router.get("/privacy-status", response_model=PrivacyStatusResponse)
async def get_privacy_status(
    service: InsightsAgentService = Depends(get_insights_agent_service),
) -> PrivacyStatusResponse:
    return await service.get_privacy_status()
```

Implement in `backend/app/agents/ia/service.py`:
```python
async def get_privacy_status(self) -> PrivacyStatusResponse:
    # Query ConsentLedger for consent stats
    # Query IAQueryAudit for k-anonymity compliance
    # Calculate differential privacy budget (if tracked)
    # Return consolidated status
```

**Estimated Time**: 6-8 hours

---

## 📋 Complete Integration Checklist

### Service Desk Dashboard

- [ ] **1. Verify SDA endpoint** (`/agents/graph/sda/execute`)
  - Check if endpoint exists
  - If not, create it or update frontend
  - Time: 1 hour

- [ ] **2. Test case creation flow**
  - Create case from form
  - Verify auto-assignment
  - Confirm SSE event
  - Time: 1 hour

- [ ] **3. Test SLA breach alerts**
  - Create test case
  - Wait for breach
  - Verify SSE notification
  - Time: 30 minutes

- [ ] **4. Test priority queue display**
  - Filter by severity
  - Sort by SLA urgency
  - Verify data accuracy
  - Time: 30 minutes

### Insights Dashboard

- [ ] **5. Fix IA query schema**
  - Update IAQueryResponse
  - Add IAQueryResult, IAQueryMetadata
  - Update service to populate fields
  - Time: 2 hours

- [ ] **6. Update frontend API call**
  - Change endpoint to `/api/agents/ia/query`
  - Test with all 6 query types
  - Time: 1 hour

- [ ] **7. Create privacy status endpoint**
  - Add schema
  - Implement service method
  - Add router endpoint
  - Time: 3 hours

- [ ] **8. Test query execution**
  - Execute all 6 query types
  - Verify k-anonymity enforcement
  - Check chart/table rendering
  - Time: 2 hours

- [ ] **9. Test privacy safeguards**
  - Verify privacy badge displays correctly
  - Test blocked queries (k<5)
  - Verify consent enforcement
  - Time: 1 hour

### Documentation & Testing

- [ ] **10. End-to-end admin workflow test**
  - Login as admin
  - Navigate both dashboards
  - Create case, run query
  - Verify real-time updates
  - Time: 1 hour

- [ ] **11. Update documentation**
  - Document endpoint changes
  - Update API reference
  - Create user guide
  - Time: 1 hour

---

## ⏱️ Time Estimates

| Component | Tasks | Time |
|-----------|-------|------|
| **Service Desk** | Verify SDA, test creation, SLA, queue | 3 hours |
| **Insights** | Fix schema, update frontend, privacy endpoint, tests | 8 hours |
| **Documentation** | E2E testing, docs, user guide | 2 hours |
| **TOTAL** | | **13 hours** |

---

## 🎯 Recommended Approach

### Phase 2A: Service Desk (Quick Win)
1. Verify SDA endpoint (1 hour)
2. Test case creation (1 hour)
3. Test SLA alerts (30 min)
4. **Result**: Fully functional Service Desk Dashboard

### Phase 2B: Insights (More Work)
1. Fix IA schema (2 hours)
2. Update frontend API (1 hour)
3. Test queries (2 hours)
4. Add privacy endpoint (3 hours)
5. **Result**: Fully functional Insights Dashboard

### Phase 2C: Polish & Document
1. E2E testing (1 hour)
2. Documentation (1 hour)
3. **Result**: Production-ready admin dashboards

---

## 🚀 Next Immediate Action

**START HERE**: Verify SDA endpoint and test Service Desk dashboard

```bash
# 1. Check if SDA execute endpoint exists
curl http://localhost:8000/openapi.json | grep "/agents/graph/sda"
curl http://localhost:8000/openapi.json | grep "/agents/sda"

# 2. Test case list endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/cases?status=new&limit=5

# 3. Test SSE connection
curl -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  http://localhost:8000/api/v1/admin/sse/events

# 4. Test dashboard overview
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/dashboard/overview?time_range=7
```

**Expected Outcome**: All Service Desk backend endpoints working, just need to verify SDA execution endpoint and test frontend integration.

---

**Summary**: Service Desk Dashboard is 95% ready (just needs testing), Insights Dashboard needs schema fix and privacy endpoint (60% ready). Total work: ~13 hours.
