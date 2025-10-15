# Admin Dashboard Implementation Plan
## UGM-AICare Unified Command Center

**Document Version:** 1.0  
**Date Created:** October 15, 2025  
**Status:** Phase 1-2 In Progress  
**Owner:** Development Team

---

## 🎯 Executive Summary

This document outlines the complete implementation plan for the Unified Admin Dashboard - a command center for mental health counselors and administrators to monitor, manage, and act on student well-being data through the Safety Agent Suite.

### Quick Status Overview
- ✅ **Foundation Exists:** Basic agent endpoints, database models, partial dashboard
- 🚧 **Phase 1-2 Active:** Database schema expansion + Case management enhancement
- ⏳ **Phases 3-7 Queued:** Real-time features, campaigns, system settings

---

## 📊 Current State Assessment

### ✅ What Already Exists

#### Database Models
- [x] `Case` - Case management with status, severity, assignments
- [x] `CaseNote` - Case notes with author tracking
- [x] `TriageAssessment` - Risk assessments with risk_factors
- [x] `InterventionCampaign` - Campaign model with execution tracking
- [x] `CampaignExecution` - Campaign execution records
- [x] `Appointment` - Appointment scheduling
- [x] `Conversation` - Chat history storage

#### Agent Infrastructure
- [x] **STA (Safety Triage Agent)** - `/api/agents/sta/classify`
- [x] **SDA (Safety Dispatch Agent)** - `/api/agents/sda/cases` (list/assign/close)
- [x] **SCA (Support Coach Agent)** - `/api/agents/sca/intervene` and `/followup`
- [x] **IA (Insights Agent)** - `/api/agents/ia/query`
- [x] APScheduler running for background jobs

#### Admin Dashboard (Partial)
- [x] `/api/v1/admin/dashboard/overview` - KPIs, trending topics, alerts
- [x] `/api/v1/admin/cases/{case_id}/notes` - Case notes CRUD
- [x] Basic KPIs: active_critical_cases, sentiment_trend, appointments_this_week
- [x] Trending topics from triage risk_factors
- [x] Recent alerts from high/critical cases

### ❌ Critical Gaps

#### Main Dashboard
- [ ] Real-time alerts feed (WebSocket/SSE)
- [ ] Live-updating case status
- [ ] IA report storage and display
- [ ] Historical insights tracking
- [ ] Direct link from alert to case detail

#### Case Management
- [ ] GET `/admin/cases` - Full case list with filtering
- [ ] GET `/admin/cases/{case_id}` - Detailed case view
- [ ] GET `/admin/cases/{case_id}/conversation` - View triggering conversation
- [ ] PUT `/admin/cases/{case_id}/status` - Status workflow
- [ ] Case assignment workflow UI
- [ ] SLA breach warnings
- [ ] Case timeline/audit log

#### Proactive Outreach (SCA Control)
- [ ] Campaign CRUD endpoints
- [ ] Trigger rules engine
- [ ] Message template system
- [ ] Target audience segmentation
- [ ] Campaign metrics dashboard
- [ ] IA → SCA integration

#### System Settings
- [ ] Agent health monitoring
- [ ] Configuration management UI
- [ ] STA threshold controls
- [ ] IA schedule management
- [ ] Counselor availability management

---

## 🏗️ Implementation Phases

### ✅ PHASE 0: Foundation Fix (COMPLETED)
**Duration:** Completed prior to this plan  
**Status:** ✅ Done

#### Completed Tasks
- [x] Fixed `cases` table schema (user_hash, session_id, etc.)
- [x] Fixed dashboard JSONB coercion error (risk_factors casting)
- [x] Resolved migration issues (23 migrations applied)
- [x] Backend running clean with no errors

---

### 🚧 PHASE 1: Core Data Infrastructure (IN PROGRESS)
**Duration:** 2-3 days  
**Priority:** CRITICAL  
**Status:** 🚧 Starting Now

#### Goals
- Establish missing database tables
- Create agent integration layer
- Enable agent-to-agent communication
- Persist critical data (IA reports, agent executions)

#### Tasks

##### 1.1 Database Schema Expansion
- [ ] **Create migration file:** `add_admin_infrastructure_tables.py`
  - [ ] `insights_reports` table
    ```sql
    - id (UUID, PK)
    - report_type (VARCHAR) - 'weekly', 'monthly', 'ad_hoc'
    - period_start (TIMESTAMP)
    - period_end (TIMESTAMP)
    - summary (TEXT) - Human-readable summary
    - trending_topics (JSONB) - Top topics with counts
    - sentiment_data (JSONB) - Sentiment metrics
    - high_risk_count (INT)
    - assessment_count (INT)
    - generated_at (TIMESTAMP)
    - generated_by (VARCHAR) - 'ia_agent'
    ```
  
  - [ ] `campaigns` table
    ```sql
    - id (UUID, PK)
    - name (VARCHAR)
    - description (TEXT)
    - trigger_rules (JSONB) - Condition definitions
    - message_template (TEXT)
    - target_audience (JSONB) - Segmentation rules
    - status (ENUM) - 'draft', 'active', 'paused', 'completed'
    - priority (ENUM) - 'low', 'medium', 'high'
    - created_by (INT FK → users.id)
    - created_at (TIMESTAMP)
    - updated_at (TIMESTAMP)
    - last_executed_at (TIMESTAMP)
    ```
  
  - [ ] `campaign_triggers` table
    ```sql
    - id (UUID, PK)
    - campaign_id (UUID FK → campaigns.id)
    - condition_type (VARCHAR) - 'ia_insight', 'manual', 'scheduled'
    - condition_value (JSONB) - Specific conditions
    - evaluation_frequency (VARCHAR) - 'daily', 'weekly'
    - last_evaluated_at (TIMESTAMP)
    - last_match_at (TIMESTAMP)
    - match_count (INT)
    ```
  
  - [ ] `campaign_metrics` table
    ```sql
    - id (UUID, PK)
    - campaign_id (UUID FK → campaigns.id)
    - execution_date (DATE)
    - messages_sent (INT)
    - users_targeted (INT)
    - users_engaged (INT) - Replied to message
    - success_rate (FLOAT)
    - avg_sentiment_before (FLOAT)
    - avg_sentiment_after (FLOAT)
    ```
  
  - [ ] `system_settings` table
    ```sql
    - key (VARCHAR, PK)
    - value (JSONB)
    - category (VARCHAR) - 'sta', 'sda', 'sca', 'ia', 'general'
    - description (TEXT)
    - updated_by (INT FK → users.id)
    - updated_at (TIMESTAMP)
    ```
  
  - [ ] `agent_health_logs` table
    ```sql
    - id (UUID, PK)
    - agent_name (VARCHAR) - 'sta', 'sda', 'sca', 'ia'
    - status (VARCHAR) - 'healthy', 'degraded', 'down'
    - last_run_at (TIMESTAMP)
    - last_success_at (TIMESTAMP)
    - error_count (INT)
    - performance_metrics (JSONB) - Response times, etc.
    - error_details (TEXT)
    - created_at (TIMESTAMP)
    ```
  
  - [ ] `case_assignments` table (audit trail)
    ```sql
    - id (UUID, PK)
    - case_id (UUID FK → cases.id)
    - assigned_to (VARCHAR)
    - assigned_by (INT FK → users.id)
    - assigned_at (TIMESTAMP)
    - reassignment_reason (TEXT)
    - previous_assignee (VARCHAR)
    ```

- [ ] **Alter existing tables:**
  - [ ] Add index on `cases.status`
  - [ ] Add index on `cases.severity`
  - [ ] Add index on `cases.created_at`
  - [ ] Add `conversation_id` (INT FK) to `cases` table
  - [ ] Add index on `triage_assessments.severity_level`

- [ ] **Create SQLAlchemy models** in `backend/app/models/`:
  - [ ] `insights.py` - InsightsReport model
  - [ ] `campaigns.py` - Campaign, CampaignTrigger, CampaignMetrics models
  - [ ] `system.py` - SystemSettings, AgentHealthLog models
  - [ ] Update `__init__.py` to export new models

##### 1.2 Agent Integration Layer
- [ ] **Create** `backend/app/services/agent_orchestrator.py`
  - [ ] `AgentOrchestrator` class
  - [ ] `handle_sta_classification()` method
    - [ ] Check severity level
    - [ ] If high/critical, auto-create SDA case
    - [ ] Link TriageAssessment → Case
    - [ ] Emit event for monitoring
  - [ ] `handle_ia_report_generated()` method
    - [ ] Store report in `insights_reports` table
    - [ ] Evaluate campaign triggers
    - [ ] Emit event for dashboard update

- [ ] **Create** `backend/app/services/event_bus.py`
  - [ ] Simple in-memory event dispatcher (Phase 1)
  - [ ] `EventBus` class with `publish()` and `subscribe()`
  - [ ] Event types enum: `CaseCreated`, `CaseAssigned`, `IAReportGenerated`
  - [ ] Future: Redis Pub/Sub integration (Phase 4)

- [ ] **Update** `backend/app/agents/sta/service.py`
  - [ ] Import `AgentOrchestrator`
  - [ ] After classification, call orchestrator
  - [ ] If severity >= high, trigger case creation
  - [ ] Log event to `agent_health_logs`

- [ ] **Update** `backend/app/agents/sda/service.py`
  - [ ] Add method: `create_case_from_triage()`
  - [ ] Link case to triage_assessment
  - [ ] Set initial SLA breach time
  - [ ] Create audit entry in `case_assignments`

##### 1.3 IA Report Storage
- [ ] **Create** `backend/app/services/insights_service.py`
  - [ ] `generate_weekly_report()` method
  - [ ] Query last 7 days of triage assessments
  - [ ] Calculate trending topics, sentiment, high-risk count
  - [ ] Store in `insights_reports` table
  - [ ] Return human-readable summary

- [ ] **Update** `backend/app/core/scheduler.py`
  - [ ] Add weekly IA report job
  - [ ] Schedule: Every Sunday at 2:00 AM
  - [ ] Call `insights_service.generate_weekly_report()`
  - [ ] Email report to distribution list

- [ ] **Create admin endpoint** in `backend/app/routes/admin/insights.py`
  - [ ] `GET /api/v1/admin/insights/reports` - List reports
  - [ ] `GET /api/v1/admin/insights/reports/{id}` - Get specific report
  - [ ] `POST /api/v1/admin/insights/reports/generate` - Manual trigger

#### Testing Checklist
- [ ] Run migration successfully
- [ ] Verify all new tables created
- [ ] Test STA → SDA case creation flow
- [ ] Verify IA report generation and storage
- [ ] Check agent health logs populated
- [ ] Confirm indexes improve query performance

#### Success Criteria
- ✅ All 7 new tables created and populated
- ✅ STA automatically creates cases for high/critical severity
- ✅ IA reports stored in database (not ephemeral)
- ✅ Agent orchestration layer functional
- ✅ Event bus handles inter-agent communication

---

### 🚧 PHASE 2: Case Management Enhancement (NEXT)
**Duration:** 3-4 days  
**Priority:** CRITICAL  
**Status:** ⏳ Queued after Phase 1

#### Goals
- Enable full case CRUD operations
- Link cases to conversations
- Implement case assignment workflow
- Build detailed case view
- Create case filtering and sorting

#### Tasks

##### 2.1 Case List Endpoint
- [ ] **Create/Update** `backend/app/routes/admin/cases.py`
  - [ ] `GET /api/v1/admin/cases`
    - [ ] Query parameters:
      - `status` (filter by CaseStatusEnum)
      - `severity` (filter by CaseSeverityEnum)
      - `assigned_to` (filter by counselor)
      - `date_from`, `date_to` (date range)
      - `page`, `limit` (pagination)
      - `sort_by` (created_at, updated_at, severity)
      - `sort_order` (asc, desc)
    - [ ] Return paginated case list
    - [ ] Include counts: total, filtered
    - [ ] Include summary stats: avg resolution time, SLA breaches

- [ ] **Create schema** `backend/app/schemas/admin/cases.py`
  - [ ] `CaseListItem` - Summary view of case
  - [ ] `CaseListResponse` - Paginated response with metadata
  - [ ] `CaseFilters` - Filter parameters

##### 2.2 Case Detail Endpoint
- [ ] **Extend** `backend/app/routes/admin/cases.py`
  - [ ] `GET /api/v1/admin/cases/{case_id}`
    - [ ] Retrieve full case details
    - [ ] Include: all fields, notes, assignments, status history
    - [ ] Calculate: time since creation, SLA status
    - [ ] Link to conversation (if conversation_id exists)

- [ ] **Create schema** `backend/app/schemas/admin/cases.py`
  - [ ] `CaseDetail` - Full case information
  - [ ] `CaseAssignmentHistory` - Assignment audit trail
  - [ ] `CaseStatusTransition` - Status change log

##### 2.3 Conversation Integration
- [ ] **Create** `backend/app/services/case_conversation_service.py`
  - [ ] `get_conversation_for_case(case_id)` method
  - [ ] Query conversation by session_id
  - [ ] Retrieve messages (limit last 50)
  - [ ] Redact sensitive information (PII)
  - [ ] Format for admin display

- [ ] **Create endpoint** in `backend/app/routes/admin/cases.py`
  - [ ] `GET /api/v1/admin/cases/{case_id}/conversation`
    - [ ] Return anonymized conversation
    - [ ] Include: timestamp, role (user/assistant), content (redacted)
    - [ ] Highlight messages that triggered triage alert

- [ ] **Update** `Case` model in `backend/app/models/cases.py`
  - [ ] Add `conversation_id` (INT FK → conversations.id)
  - [ ] Add relationship: `conversation = relationship("Conversation")`

- [ ] **Create schema** `backend/app/schemas/admin/cases.py`
  - [ ] `ConversationMessage` - Single message view
  - [ ] `ConversationHistory` - Full conversation with metadata

##### 2.4 Case Status Workflow
- [ ] **Create endpoint** in `backend/app/routes/admin/cases.py`
  - [ ] `PUT /api/v1/admin/cases/{case_id}/status`
    - [ ] Accept: new_status, reason (optional)
    - [ ] Validate state transitions:
      - `new` → `in_progress`, `waiting`, `closed`
      - `in_progress` → `waiting`, `closed`
      - `waiting` → `in_progress`, `closed`
      - `closed` → (no transitions)
    - [ ] Auto-log status change in `case_notes`
    - [ ] Update `updated_at` timestamp
    - [ ] Emit event for dashboard update

- [ ] **Create** `backend/app/services/case_workflow_service.py`
  - [ ] State machine validation
  - [ ] `transition_status(case, new_status, admin_user)` method
  - [ ] Auto-generate status change note
  - [ ] Check SLA breach on status change

##### 2.5 Case Assignment Workflow
- [ ] **Update** `backend/app/routes/admin/cases.py`
  - [ ] `POST /api/v1/admin/cases/{case_id}/assign`
    - [ ] Accept: assignee_id, assignment_reason
    - [ ] Check if reassignment (already assigned)
    - [ ] Store in `case_assignments` audit table
    - [ ] Update case.assigned_to
    - [ ] Auto-transition status to `in_progress` if `new`
    - [ ] Send email notification to counselor
    - [ ] Emit event

- [ ] **Create** `backend/app/services/case_assignment_service.py`
  - [ ] `assign_case(case_id, assignee_id, admin_user)` method
  - [ ] Validate assignee exists and is counselor
  - [ ] Check counselor workload (max active cases)
  - [ ] Create audit record in `case_assignments`

- [ ] **Create email template** `backend/app/templates/emails/case_assigned.html`
  - [ ] Subject: "New case assigned: {severity} - {case_id}"
  - [ ] Body: Case summary, link to admin panel, SLA deadline

##### 2.6 SLA Tracking
- [ ] **Update** `Case` model
  - [ ] Ensure `sla_breach_at` is calculated on creation
  - [ ] SLA = 15 minutes for critical, 1 hour for high (from settings)

- [ ] **Create scheduled job** in `backend/app/core/scheduler.py`
  - [ ] Every 5 minutes: Check for SLA breaches
  - [ ] Query cases where `sla_breach_at < now()` and `status != closed`
  - [ ] Send urgent email to assigned counselor + admins
  - [ ] Mark case with breach flag

- [ ] **Create endpoint** in `backend/app/routes/admin/cases.py`
  - [ ] `GET /api/v1/admin/cases/sla-breaches`
    - [ ] List all cases that breached SLA
    - [ ] Include: case details, breach time, assigned counselor

##### 2.7 Case Notes Enhancement
- [ ] **Already exists:** `GET /api/v1/admin/cases/{case_id}/notes`
- [ ] **Already exists:** `POST /api/v1/admin/cases/{case_id}/notes`
- [ ] **Enhance:** Add note types
  - [ ] `manual` - Counselor note
  - [ ] `system` - Auto-generated (status change, assignment)
  - [ ] `alert` - SLA breach, escalation

#### Testing Checklist
- [ ] Test case list with all filter combinations
- [ ] Verify pagination works correctly
- [ ] Test case detail retrieval
- [ ] Verify conversation display (with redaction)
- [ ] Test status transitions (valid and invalid)
- [ ] Test case assignment (new and reassignment)
- [ ] Verify SLA breach detection and alerts
- [ ] Test note creation with different types

#### Success Criteria
- ✅ Counselors can list and filter cases efficiently
- ✅ Case detail view shows all relevant information
- ✅ Conversation history accessible with proper redaction
- ✅ Status workflow validated with state machine
- ✅ Case assignment functional with email notifications
- ✅ SLA tracking and breach alerts working
- ✅ Full case management workflow operational

---

### ⏳ PHASE 3: Dashboard KPIs & Insights (PLANNED)
**Duration:** 2-3 days  
**Priority:** HIGH  
**Status:** ⏳ Planned after Phase 2

#### Goals
- Display stored IA reports (not placeholders)
- Add more actionable KPIs
- Historical trend charts
- Enhanced insights panel

#### Tasks
- [ ] Update `/api/v1/admin/dashboard/overview` endpoint
  - [ ] Retrieve latest IA report from database
  - [ ] Add KPIs: cases_opened_this_week, cases_closed_this_week
  - [ ] Add KPI: avg_case_resolution_time
  - [ ] Add KPI: sla_breach_count, active_campaigns_count
- [ ] Create `/api/v1/admin/dashboard/trends` endpoint
  - [ ] Historical sentiment data (last 4 weeks)
  - [ ] Case volume trends
  - [ ] Top topics over time
- [ ] Enhance insights panel
  - [ ] Display IA summary from stored report
  - [ ] Show report generation timestamp
  - [ ] Link to full report view
- [ ] Add dashboard configuration
  - [ ] Customizable KPI widgets
  - [ ] Time range selection (7d, 30d, 90d)

---

### ⏳ PHASE 4: Real-Time Alerts (PLANNED)
**Duration:** 3-4 days  
**Priority:** HIGH  
**Status:** ⏳ Planned after Phase 3

#### Goals
- Enable live dashboard updates
- Real-time case status propagation
- Instant critical alert notifications

#### Tasks
- [ ] Implement Server-Sent Events (SSE)
  - [ ] `GET /api/v1/admin/ws/alerts` - SSE endpoint
  - [ ] Push new critical cases as created
  - [ ] Push case status changes
  - [ ] Push SLA breach alerts
- [ ] Create `backend/app/services/alert_broadcaster.py`
  - [ ] Maintain SSE connections
  - [ ] Broadcast on events (case created, assigned, closed)
  - [ ] Handle connection management
- [ ] Update event bus to trigger broadcasts
- [ ] Create `/api/v1/admin/alerts` endpoint
  - [ ] Recent alerts (last 24 hours)
  - [ ] Filter by severity
  - [ ] Mark alerts as "seen" by admin
- [ ] Frontend integration (if applicable)
  - [ ] Connect to SSE endpoint
  - [ ] Update UI on events
  - [ ] Toast notifications for critical alerts

---

### ⏳ PHASE 5: Proactive Outreach (SCA Control) (PLANNED)
**Duration:** 4-5 days  
**Priority:** MEDIUM-HIGH  
**Status:** ⏳ Planned after Phase 4

#### Goals
- Enable campaign creation and management
- Build trigger rules engine
- Automate campaign execution
- Track campaign performance

#### Tasks
- [ ] Campaign Management CRUD
  - [ ] `POST /api/v1/admin/campaigns` - Create campaign
  - [ ] `GET /api/v1/admin/campaigns` - List campaigns
  - [ ] `GET /api/v1/admin/campaigns/{id}` - Campaign details
  - [ ] `PUT /api/v1/admin/campaigns/{id}` - Update campaign
  - [ ] `DELETE /api/v1/admin/campaigns/{id}` - Deactivate
  - [ ] `POST /api/v1/admin/campaigns/{id}/launch` - Activate
- [ ] Trigger Rules Engine
  - [ ] Create `backend/app/services/campaign_trigger_evaluator.py`
  - [ ] Parse JSON DSL for conditions
  - [ ] Evaluate against IA reports
  - [ ] Scheduled job: Check triggers daily
- [ ] Campaign Execution
  - [ ] Target audience segmentation
  - [ ] Batch message sending via SCA
  - [ ] Track metrics (sent, engaged, replied)
- [ ] Campaign Metrics Dashboard
  - [ ] `GET /api/v1/admin/campaigns/{id}/metrics`
  - [ ] Engagement rate, sentiment delta
  - [ ] Historical performance

---

### ⏳ PHASE 6: System Settings (PLANNED)
**Duration:** 2-3 days  
**Priority:** MEDIUM  
**Status:** ⏳ Planned after Phase 5

#### Goals
- Provide admin configuration controls
- Agent health monitoring
- System settings management

#### Tasks
- [ ] System Settings CRUD
  - [ ] `GET /api/v1/admin/settings` - All settings
  - [ ] `PUT /api/v1/admin/settings/{key}` - Update setting
  - [ ] Categories: STA, SDA, SCA, IA, General
- [ ] Agent Health Monitoring
  - [ ] `GET /api/v1/admin/agents/health` - All agents status
  - [ ] `GET /api/v1/admin/agents/{name}/logs` - Execution logs
  - [ ] Display: last run, error rate, performance
- [ ] Configuration Management
  - [ ] IA schedule configuration
  - [ ] STA threshold adjustment (with safeguards)
  - [ ] SDA SLA time configuration
  - [ ] Email distribution lists

---

### ⏳ PHASE 7: Integration & Hardening (PLANNED)
**Duration:** 3-5 days  
**Priority:** MEDIUM  
**Status:** ⏳ Planned after Phase 6

#### Goals
- End-to-end testing
- Performance optimization
- Security hardening
- Documentation

#### Tasks
- [ ] End-to-End Testing
  - [ ] Test full STA → SDA → Admin workflow
  - [ ] Test IA → Campaign trigger workflow
  - [ ] Test all dashboard features
- [ ] Performance Optimization
  - [ ] Load testing for dashboard endpoints
  - [ ] Query optimization (add indexes)
  - [ ] Caching strategy (Redis)
- [ ] Security Audit
  - [ ] Admin authentication enforcement
  - [ ] Data anonymization validation
  - [ ] PII protection in conversation logs
  - [ ] Rate limiting on admin endpoints
- [ ] Documentation
  - [ ] Admin user guide (counselor manual)
  - [ ] API documentation (OpenAPI)
  - [ ] System architecture diagrams
  - [ ] Deployment guide

---

## 🔧 Technical Decisions

### ✅ Confirmed Decisions

1. **MVP Scope:** Phase 1-2 (Foundation + Case Management) - CONFIRMED
2. **Real-Time Tech:** Server-Sent Events (SSE) for Phase 4 - Simple, effective
3. **Agent Integration:** Direct API calls + Event Bus (in-memory → Redis later)
4. **IA Storage:** Database table (`insights_reports`) - Queryable, reliable
5. **Phased Rollout:** 
   - Sprint 1: Phase 1-2 (Foundation + Cases) - **ACTIVE**
   - Sprint 2: Phase 3-4 (Dashboard + Real-time)
   - Sprint 3: Phase 5 (Campaigns)
   - Sprint 4: Phase 6-7 (Settings + Hardening)

### ⏳ Pending Decisions

1. **Campaign Trigger DSL:** JSON structure vs Python expressions
2. **Email Service:** Current SMTP vs SendGrid/AWS SES
3. **Frontend Framework:** Next.js admin panel vs Existing UI
4. **Caching Strategy:** Redis configuration and cache keys
5. **Monitoring:** Application Insights vs Prometheus/Grafana

---

## 📝 Progress Tracking

### Sprint 1: Foundation & Case Management (Current)

#### Week 1 Progress
- [x] Phase 0: Foundation fixes (COMPLETED)
- [ ] Phase 1.1: Database schema expansion (IN PROGRESS)
  - [ ] Migration file created: 0/1
  - [ ] New tables: 0/7
  - [ ] Models created: 0/3
  - [ ] Indexes added: 0/5
- [ ] Phase 1.2: Agent integration layer (PENDING)
- [ ] Phase 1.3: IA report storage (PENDING)

#### Week 2 Goals
- [ ] Complete Phase 1 (all tasks)
- [ ] Start Phase 2.1-2.3 (Case list, detail, conversation)

#### Week 3 Goals
- [ ] Complete Phase 2 (all tasks)
- [ ] Testing and bug fixes
- [ ] Documentation for counselors

### Success Metrics
- **Phase 1 Complete:** All 7 tables created, STA→SDA auto-case creation working
- **Phase 2 Complete:** Full case management operational, counselors can act on alerts
- **Sprint 1 Complete:** End-to-end workflow from student alert to counselor action

---

## 🚀 Quick Start Guide

### For Developers

1. **Review Current State:**
   ```bash
   # Check database tables
   docker exec ugm_aicare_db psql -U giga -d aicare_db -c "\dt"
   
   # Check agent endpoints
   curl http://localhost:8000/api/agents/sta/classify
   curl http://localhost:8000/api/agents/sda/cases
   
   # Check admin dashboard
   curl http://localhost:8000/api/v1/admin/dashboard/overview
   ```

2. **Start Phase 1 Development:**
   ```bash
   # Create migration
   cd backend
   alembic revision -m "add_admin_infrastructure_tables"
   
   # Edit migration file (see Phase 1.1 tasks)
   # Run migration
   alembic upgrade head
   ```

3. **Test Changes:**
   ```bash
   # Run backend tests
   pytest backend/tests/
   
   # Check logs
   docker logs ugm_aicare_backend --tail 100
   ```

### For Project Managers

- **Current Focus:** Phase 1-2 (Foundation + Case Management)
- **Timeline:** 2-3 weeks for Sprint 1
- **Deliverable:** Functional case management system for counselors
- **Blocker Check:** Review this document weekly, update task statuses

### For Counselors/Admins

- **What's Coming:** You'll soon have a complete command center to:
  - View all active cases in one place
  - See student conversations that triggered alerts (anonymized)
  - Assign cases to counselors
  - Track case resolution and SLA compliance
  - Monitor system-wide mental health trends

- **Timeline:** Initial features ready in ~3 weeks

---

## 📚 Reference Documentation

### Related Documents
- [Technical Implementation Guide](./technical-implementation-guide.md)
- [API Integration Reference](./api-integration-reference.md)
- [Mental Health AI Guidelines](./mental-health-ai-guidelines.md)
- [Development Workflow](./development-workflow.md)

### Database Schema
- [Cases Table Schema](../backend/app/models/cases.py)
- [Triage Assessments Schema](../backend/app/models/assessments.py)
- [Intervention Campaigns Schema](../backend/app/models/interventions.py)

### API Endpoints
- Admin Dashboard: `/api/v1/admin/dashboard/*`
- Agent Endpoints: `/api/agents/{sta,sda,sca,ia}/*`
- Case Management: `/api/v1/admin/cases/*`

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **No Real-Time Updates:** Dashboard requires manual refresh (Phase 4 will fix)
2. **IA Reports Not Stored:** Reports are generated but ephemeral (Phase 1 fixes)
3. **Manual Campaign Execution:** No automated triggers yet (Phase 5 adds this)
4. **Limited Case Filtering:** Basic filtering only (Phase 2 enhances)

### Technical Debt
1. Risk_factors column is `json` type, should be `jsonb` (performance)
2. No caching strategy for dashboard queries (Phase 7)
3. Agent health not monitored (Phase 6)

---

## 📞 Contact & Support

**Development Team Lead:** [Your Name]  
**Product Owner:** [PM Name]  
**Technical Questions:** Check #dev-aicare Slack channel  
**Document Updates:** Submit PR to update this file

---

## 📊 Appendix: Architecture Diagrams

### Agent Communication Flow (Phase 1)
```
Student Chat → STA Classify → [High/Critical] → AgentOrchestrator → SDA Create Case → Case in Dashboard
                                                                    ↓
                                                                EventBus → Broadcast
```

### Case Management Workflow (Phase 2)
```
Admin Dashboard → View Case List → Filter/Sort → Select Case → View Details
                                                              ↓
                                                    → View Conversation
                                                    → Assign Counselor
                                                    → Update Status
                                                    → Add Notes
```

### Campaign Trigger Flow (Phase 5)
```
IA Weekly Report → Store in DB → TriggerEvaluator → Check Conditions → Match Found → Execute Campaign
                                                                                    ↓
                                                                          SCA Send Messages → Track Metrics
```

---

**Last Updated:** October 15, 2025  
**Next Review:** Weekly during Sprint 1  
**Version:** 1.0
