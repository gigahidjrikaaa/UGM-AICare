# SDA Appointment Scheduling Implementation

## Overview

This document describes the complete implementation of LLM-powered appointment scheduling for the Service Desk Agent (SDA) in the UGM-AICare multi-agent mental health support system.

**Implementation Date**: November 13, 2025  
**Gemini Model**: Gemini 2.5 Flash (for LLM-powered scheduling logic)  
**Architecture**: LangGraph-based with tool calling integration

---

## 🎯 Feature Capabilities

### For Students (via Aika)
- **Natural Language Booking**: "I want to talk to a counselor tomorrow morning"
- **Counselor Discovery**: Browse available psychologists with specializations
- **Time Slot Selection**: View available appointment times
- **Smart Suggestions**: LLM analyzes preferences and suggests optimal times
- **Appointment Management**: Book, cancel, reschedule appointments
- **Preference Matching**: Language, specialization, availability-based matching

### For SDA (Case Management)
- **Auto-Scheduling**: Automatically book appointments for high/critical cases
- **Priority Booking**: Critical cases get earliest available slots
- **Counselor Integration**: Links appointments to assigned counselors
- **Context-Aware Scheduling**: Uses case severity and preferences for optimal matching

---

## 🏗️ Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AIKA META-AGENT                          │
│  (Student-facing conversational interface)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Uses scheduling tools via function calling
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               SCHEDULING TOOLS (6 tools)                    │
│  - get_available_counselors                                 │
│  - get_counselor_availability                               │
│  - suggest_appointment_times (LLM-powered)                  │
│  - book_appointment                                         │
│  - cancel_appointment                                       │
│  - reschedule_appointment                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Integrated into
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  SDA LANGGRAPH                              │
│  START → ingest → create_case → calculate_sla →            │
│  auto_assign → SCHEDULE_APPOINTMENT → notify → END          │
│                      (NEW NODE)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Uses LLM for intelligent scheduling
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            GEMINI 2.5 FLASH                                 │
│  - Psychologist selection based on case context            │
│  - Optimal time slot matching                               │
│  - Preference parsing (natural language → structured)       │
└─────────────────────────────────────────────────────────────┘
```

### Database Models

**Existing Models Used**:
- `Psychologist`: Counselor profiles with availability schedules
- `Appointment`: Appointment records
- `AppointmentType`: Types of appointments (Initial, Follow-up, Crisis)
- `User`: Student profiles
- `Case`: SDA case records

**Appointment Model Structure**:
```python
class Appointment:
    id: int
    user_id: int  # Student
    psychologist_id: int  # Counselor
    appointment_type_id: int  # 1=Initial, 2=Follow-up, 3=Crisis
    appointment_datetime: datetime
    notes: Optional[str]
    status: str  # "scheduled", "confirmed", "cancelled", "completed"
    created_at: datetime
    updated_at: datetime
```

**Psychologist Availability Schedule (JSON)**:
```json
{
  "monday": {
    "available": true,
    "start": "09:00",
    "end": "17:00"
  },
  "tuesday": {
    "available": true,
    "start": "09:00",
    "end": "17:00"
  },
  // ... other days
}
```

---

## 🔧 Implementation Details

### 1. Scheduling Tools (`scheduling_tools.py`)

**Location**: `backend/app/agents/shared/tools/scheduling_tools.py`

**Tools Implemented**:

#### `get_available_counselors`
- **Purpose**: Find psychologists accepting appointments
- **Filters**: Specialization, language preference
- **Returns**: List of counselor profiles with ratings, experience, availability

#### `get_counselor_availability`
- **Purpose**: Get specific time slots for a counselor
- **Parameters**: psychologist_id, date range, time preference (morning/afternoon/evening)
- **Logic**: 
  - Parses counselor's availability_schedule JSON
  - Generates hourly time slots
  - Checks for conflicts with existing appointments
  - Returns up to 20 available slots

#### `suggest_appointment_times` ⭐ LLM-POWERED
- **Purpose**: Intelligently match student preferences with availability
- **LLM Model**: Gemini 2.5 Flash (temperature=0.3 for consistency)
- **Process**:
  1. Fetch all available slots
  2. Send student's natural language preferences to LLM
  3. LLM analyzes preferences (time, day, urgency)
  4. Returns top 3 slots with explanations
- **Example Prompt**:
  ```
  Student preferences: "I prefer mornings, as soon as possible"
  Available slots: [list of 20 slots]
  
  Task: Select TOP 3 slots matching preferences
  Consider: urgency keywords, time-of-day preferences, day preferences
  ```

#### `book_appointment`
- **Purpose**: Create appointment record
- **Validation**:
  - Psychologist exists and is available
  - Time slot not already booked (conflict check)
  - Valid appointment time (future date)
- **Returns**: Appointment confirmation with ID, datetime, counselor name

#### `cancel_appointment`
- **Purpose**: Cancel existing appointment
- **Validation**: Ownership check (user_id match)
- **Updates**: Sets status to "cancelled", appends cancellation reason to notes

#### `reschedule_appointment`
- **Purpose**: Move appointment to new time
- **Validation**: Conflict check for new time slot
- **Updates**: Updates datetime, appends reschedule history to notes

**Helper Functions**:
- `_generate_time_slots()`: Creates hourly slots from JSON schedule
- `_get_time_of_day()`: Categorizes hour into morning/afternoon/evening
- `_format_slots_for_llm()`: Formats slots for LLM context window

### 2. SDA Graph State Extension (`graph_state.py`)

**New Fields Added to `SDAState`**:

```python
class SDAState(SafetyAgentState):
    # ... existing fields ...
    
    # APPOINTMENT SCHEDULING FIELDS (NEW)
    schedule_appointment: NotRequired[bool]
    """Flag indicating if student wants to schedule appointment"""
    
    appointment_id: NotRequired[Optional[int]]
    """Database ID of created Appointment record"""
    
    appointment_datetime: NotRequired[Optional[str]]
    """ISO timestamp of scheduled appointment"""
    
    appointment_confirmed: NotRequired[bool]
    """Flag indicating if appointment was successfully booked"""
    
    psychologist_id: NotRequired[Optional[int]]
    """ID of psychologist/counselor for appointment"""
    
    preferred_time: NotRequired[Optional[str]]
    """Student's preferred time (natural language or structured)"""
    
    scheduling_context: NotRequired[Optional[Dict[str, Any]]]
    """Additional scheduling context (preferences, constraints, etc.)"""
```

### 3. SDA Scheduling Node (`sda_graph.py`)

**New Node**: `schedule_appointment_node`

**Workflow**:

```python
async def schedule_appointment_node(state: SDAState, db: AsyncSession) -> SDAState:
    """
    LLM-powered appointment scheduling for cases.
    
    Steps:
    1. Check if scheduling requested (state["schedule_appointment"])
    2. Determine psychologist:
       - Use assigned_counsellor_id if available
       - Otherwise, use LLM to select optimal match
    3. Find optimal time:
       - Generate available slots from schedule
       - Filter out conflicts
       - Use LLM to select best slot based on:
         * Case severity (critical → ASAP)
         * Student preferences
         * Optimal timing (avoid late evening)
    4. Create Appointment record
    5. Update state with confirmation
    """
```

**LLM Functions**:

#### `_select_optimal_psychologist()` ⭐
- **Model**: Gemini 2.5 Flash (temperature=0.2)
- **Selection Criteria**:
  - Critical cases: Prioritize experience and high ratings
  - Match specialization to case context
  - Consider language preferences
  - Prefer counselors with defined schedules
- **Fallback**: First available psychologist if LLM fails

#### `_find_optimal_appointment_time()` ⭐
- **Model**: Gemini 2.5 Flash (temperature=0.2)
- **Time Selection Logic**:
  - Critical cases: Select earliest slot (within 24-48 hours)
  - High priority: Prefer slots within 3-5 days
  - Student preferences: Honor time-of-day preferences
  - Avoid late evening slots unless necessary
- **Fallback**: First available slot if LLM fails

**Appointment Type Mapping**:
```python
# Based on case severity
appointment_type_id = 3 if severity == "critical" else 1
# 1 = Initial Consultation (normal/high severity)
# 3 = Crisis Intervention (critical severity)
```

### 4. SDA Graph Integration

**Updated Graph Flow**:

```python
def create_sda_graph(db: AsyncSession) -> StateGraph:
    workflow = StateGraph(SDAState)
    
    # Nodes
    workflow.add_node("ingest_escalation", ingest_escalation_node)
    workflow.add_node("create_case", lambda state: create_case_node(state, db))
    workflow.add_node("calculate_sla", lambda state: calculate_sla_node(state, db))
    workflow.add_node("auto_assign", lambda state: auto_assign_node(state, db))
    workflow.add_node("schedule_appointment", lambda state: schedule_appointment_node(state, db))  # NEW
    workflow.add_node("notify_counsellor", notify_counsellor_node)
    
    # Flow
    workflow.set_entry_point("ingest_escalation")
    workflow.add_edge("ingest_escalation", "create_case")
    workflow.add_edge("create_case", "calculate_sla")
    workflow.add_edge("calculate_sla", "auto_assign")
    workflow.add_edge("auto_assign", "schedule_appointment")  # NEW EDGE
    workflow.add_edge("schedule_appointment", "notify_counsellor")
    workflow.add_edge("notify_counsellor", END)
    
    return workflow.compile()
```

**Conditional Execution**:
- The `schedule_appointment_node` is **always** in the flow
- It checks `state["schedule_appointment"]` flag
- If `False`, it passes through without creating appointment
- If `True`, it executes full scheduling logic

### 5. Aika Integration

**Tool Category Added**: `"scheduling"`

**File**: `backend/app/agents/aika/tools.py`

```python
def get_aika_tools() -> List[Dict[str, Any]]:
    aika_categories = [
        "user_context",
        "progress_tracking",
        "conversation",
        "safety",
        "intervention",
        "external_context",
        "analytics",
        "scheduling"  # NEW: Appointment scheduling tools
    ]
    
    schemas = tool_registry.get_schemas(categories=aika_categories)
    return schemas
```

**How Aika Uses Scheduling Tools**:

1. **Student Request**: "I want to talk to a counselor tomorrow morning"
2. **Aika Detects Intent**: Uses Gemini to recognize scheduling intent
3. **Tool Invocation**: Calls `get_available_counselors` or `suggest_appointment_times`
4. **Conversational Booking**: Multi-turn conversation to confirm details
5. **Final Booking**: Calls `book_appointment` with confirmed details
6. **Confirmation**: Returns friendly confirmation message

---

## 📊 Usage Examples

### Example 1: Student Books Appointment via Aika

**Student**: "I need to talk to someone about my anxiety. Can I book an appointment?"

**Aika** (calls `get_available_counselors`):
```json
{
  "success": true,
  "counselors": [
    {
      "id": 5,
      "name": "Dr. Sarah Johnson",
      "specialization": "Anxiety and Stress Management",
      "experience_years": 8,
      "rating": 4.8,
      "languages": ["English", "Indonesian"]
    },
    // ... more counselors
  ]
}
```

**Aika**: "I found 3 counselors who specialize in anxiety. Dr. Sarah Johnson has great reviews (4.8 stars) and 8 years of experience. Would you like to see her available times?"

**Student**: "Yes, I prefer mornings next week"

**Aika** (calls `suggest_appointment_times`):
```json
{
  "success": true,
  "suggested_slots": [
    {
      "datetime": "2025-11-18T09:00:00",
      "reason": "Monday morning, earliest available matching your preference"
    },
    {
      "datetime": "2025-11-19T10:00:00",
      "reason": "Tuesday morning, alternative option"
    },
    {
      "datetime": "2025-11-20T09:30:00",
      "reason": "Wednesday morning, mid-week timing"
    }
  ]
}
```

**Aika**: "Perfect! I found these morning slots:
1. Monday, Nov 18 at 9:00 AM (earliest available)
2. Tuesday, Nov 19 at 10:00 AM
3. Wednesday, Nov 20 at 9:30 AM

Which works best for you?"

**Student**: "Monday at 9 AM"

**Aika** (calls `book_appointment`):
```json
{
  "success": true,
  "appointment_id": 127,
  "psychologist_name": "Dr. Sarah Johnson",
  "appointment_datetime": "2025-11-18 09:00",
  "duration_minutes": 60,
  "message": "✅ Appointment booked successfully with Dr. Sarah Johnson on Monday, November 18 at 09:00 AM"
}
```

**Aika**: "✅ All set! Your appointment with Dr. Sarah Johnson is confirmed for Monday, November 18 at 9:00 AM. You'll receive a reminder. Is there anything else I can help with?"

### Example 2: SDA Auto-Schedules for Critical Case

**Trigger**: STA detects critical risk, escalates to SDA

**SDA State**:
```python
{
    "severity": "critical",
    "user_id": 42,
    "schedule_appointment": True,  # Set by escalation logic
    "assigned_counsellor_id": 15,
    "preferred_time": None,  # No student preference (emergency)
    "scheduling_context": {
        "urgency": "immediate",
        "reason": "crisis_intervention"
    }
}
```

**SDA Execution**:

1. **Ingest Escalation**: Validates critical severity ✓
2. **Create Case**: Creates Case #893 ✓
3. **Calculate SLA**: Sets 2-hour breach deadline ✓
4. **Auto-Assign**: Assigns to counselor #15 (lowest workload) ✓
5. **Schedule Appointment** (NEW):
   - Finds psychologist profile for counselor #15
   - Calls `_find_optimal_appointment_time()` with LLM
   - **LLM Prompt**:
     ```
     Case Severity: critical
     ⚠️ CRITICAL CASE: Select the EARLIEST available slot (within next 24-48 hours).
     
     Available Slots:
     1. Today, November 13 at 02:00 PM (2025-11-13T14:00:00)
     2. Today, November 13 at 03:00 PM (2025-11-13T15:00:00)
     3. Tomorrow, November 14 at 09:00 AM (2025-11-14T09:00:00)
     ...
     ```
   - **LLM Response**: `2025-11-13T14:00:00` (earliest slot, 2 PM today)
   - Creates Appointment #128 (type=3, Crisis Intervention)
   - Updates state: `appointment_id=128`, `appointment_confirmed=True`
6. **Notify Counselor**: Sends notification with appointment details ✓

**Result**: Case created, counselor assigned, **appointment automatically booked for 2 PM today** (within 2 hours)

### Example 3: Rescheduling Appointment

**Student**: "I need to reschedule my appointment with Dr. Sarah"

**Aika** (retrieves student's appointments, identifies ID 127):
"You have an appointment with Dr. Sarah Johnson on Monday, Nov 18 at 9:00 AM. When would you like to reschedule?"

**Student**: "Can we do Wednesday afternoon instead?"

**Aika** (calls `get_counselor_availability`):
```json
{
  "success": true,
  "available_slots": [
    {"datetime": "2025-11-20T13:00:00", "display": "Wednesday, Nov 20 at 01:00 PM"},
    {"datetime": "2025-11-20T14:00:00", "display": "Wednesday, Nov 20 at 02:00 PM"},
    {"datetime": "2025-11-20T15:00:00", "display": "Wednesday, Nov 20 at 03:00 PM"}
  ]
}
```

**Aika**: "Dr. Sarah is available Wednesday afternoon at:
- 1:00 PM
- 2:00 PM
- 3:00 PM

Which time works best?"

**Student**: "2 PM"

**Aika** (calls `reschedule_appointment`):
```json
{
  "success": true,
  "appointment_id": 127,
  "old_datetime": "2025-11-18 09:00",
  "new_datetime": "2025-11-20 14:00",
  "message": "Appointment rescheduled successfully to Wednesday, November 20 at 02:00 PM"
}
```

**Aika**: "✅ Done! Your appointment has been moved to Wednesday, November 20 at 2:00 PM. You'll get an updated reminder."

---

## 🧠 LLM Decision Making

### Why Gemini 2.5 Flash for Scheduling?

**Model Choice Rationale**:
- **Fast**: Sub-second response times for scheduling logic
- **Cost-Effective**: Lower cost than Pro, suitable for frequent scheduling operations
- **Sufficient Reasoning**: Complex enough for preference matching and optimization
- **Consistent**: Temperature=0.2-0.3 for deterministic scheduling decisions

**Not Using Gemini 2.5 Pro** because:
- Scheduling doesn't require deep reasoning or complex analysis
- Flash provides adequate performance for this use case
- Pro would add unnecessary latency and cost

### LLM Prompt Engineering

**Key Techniques Used**:

1. **Structured Output**: Request JSON format for consistent parsing
2. **Clear Constraints**: Explicit criteria (urgency, preferences, timing)
3. **Fallback Instructions**: "If no perfect match, select best available"
4. **Context Limiting**: Limit to 20-30 slots to stay within token budget
5. **Temperature Tuning**: Low temp (0.2-0.3) for consistent decisions

**Example Prompt Pattern**:
```
Task: [Clear objective]

Context:
- [Key factors]
- [Constraints]

Data: [Structured list]

Selection Criteria:
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

Return: [Exact format expected]
```

### Error Handling

**LLM Failures Handled**:
- Invalid JSON response → Parse fallback
- Selected slot not in available list → Use first available
- Timeout or API error → Deterministic fallback (earliest slot)
- No psychologists available → Return error to Aika for user notification

**Deterministic Fallbacks**:
- Psychologist selection: First available with highest rating
- Time selection: Earliest available slot
- Always log LLM failures for monitoring

---

## 🔒 Validation & Safety

### Conflict Prevention

**Double-Booking Prevention**:
```python
# Check for conflicts before booking
conflict_result = await db.execute(
    select(Appointment).where(
        and_(
            Appointment.psychologist_id == psychologist_id,
            Appointment.appointment_datetime == apt_time,
            Appointment.status.in_(["scheduled", "confirmed"])
        )
    )
)
conflict = conflict_result.scalar_one_or_none()

if conflict:
    return {
        "success": False,
        "error": "This time slot is no longer available",
        "conflict": True
    }
```

### Ownership Verification

**Only Student Can Cancel/Reschedule Their Own Appointments**:
```python
result = await db.execute(
    select(Appointment).where(
        and_(
            Appointment.id == appointment_id,
            Appointment.user_id == user_id  # Ownership check
        )
    )
)
```

### Data Validation

**Time Validation**:
- Only future appointments allowed
- Must be within psychologist's working hours
- Must be within next 30 days (prevents far-future booking errors)

**Psychologist Validation**:
- Must exist in database
- Must have `is_available = True`
- Must have availability_schedule defined

---

## 📈 Performance Considerations

### Optimization Strategies

1. **Slot Generation Caching**: (Future enhancement)
   - Cache generated slots for 5-10 minutes
   - Reduce database queries for frequently requested counselors

2. **LLM Result Caching**: (Future enhancement)
   - Cache LLM selections for similar preferences
   - Key: `{psychologist_id}:{preferences_hash}`
   - TTL: 1 hour

3. **Batch Conflict Checking**:
   - Single query to fetch all conflicts in date range
   - Filter in Python rather than multiple queries

4. **Token Efficiency**:
   - Limit slots to 20-30 per LLM call
   - Use concise slot formatting
   - Pre-filter by time preferences before LLM

### Expected Performance

**Typical Latencies** (estimated):
- `get_available_counselors`: 50-100ms (database query)
- `get_counselor_availability`: 100-200ms (schedule parsing + conflict check)
- `suggest_appointment_times`: 800-1500ms (includes LLM call)
- `book_appointment`: 100-150ms (database insert + conflict check)
- **Total conversational booking**: 2-3 seconds (multi-turn)

**SDA Auto-Scheduling**:
- Full node execution: 1-2 seconds (including LLM calls)
- Acceptable for background case processing

---

## 🚀 Future Enhancements

### Phase 2 Improvements

1. **Video Call Integration**
   - Embed video session links in appointment records
   - Auto-generate meeting rooms via Zoom/Google Meet API

2. **Reminder System**
   - Email reminders 24 hours before appointment
   - SMS reminders 1 hour before
   - In-app notifications

3. **Availability Sync**
   - Real-time calendar integration (Google Calendar, Outlook)
   - Auto-block booked slots across platforms

4. **Student Preferences Persistence**
   - Save preferred counselors
   - Remember time-of-day preferences
   - Language preference in user profile

5. **Waitlist System**
   - Join waitlist if no slots available
   - Auto-notify when slot opens up
   - Priority based on case severity

6. **Counselor Dashboard**
   - View upcoming appointments
   - Block/unblock time slots
   - Appointment notes and history

7. **Analytics**
   - Booking conversion rate
   - No-show tracking
   - Popular time slots
   - Counselor utilization metrics

### Phase 3: Advanced Features

1. **Multi-Counselor Sessions**
   - Group therapy appointments
   - Co-facilitated sessions

2. **Recurring Appointments**
   - Weekly/bi-weekly patterns
   - Series booking

3. **AI-Powered Rescheduling**
   - Proactive rescheduling suggestions when conflicts arise
   - Smart slot recommendations based on past booking patterns

---

## 🧪 Testing Guide

### Unit Tests Needed

```python
# test_scheduling_tools.py

async def test_get_available_counselors():
    """Test counselor retrieval with filters"""
    # Setup: Create psychologists with different specializations
    # Test: Call with specialization="anxiety"
    # Assert: Only anxiety specialists returned
    
async def test_conflict_detection():
    """Test double-booking prevention"""
    # Setup: Create existing appointment
    # Test: Try to book same time slot
    # Assert: Returns conflict error
    
async def test_llm_time_selection_critical_case():
    """Test LLM prioritizes earliest slot for critical cases"""
    # Setup: Mock slots (one today, one next week)
    # Test: Call with severity="critical"
    # Assert: Selects today's slot
    
async def test_ownership_verification():
    """Test user can only cancel own appointments"""
    # Setup: Create appointment for user A
    # Test: User B tries to cancel
    # Assert: Returns permission error
```

### Integration Tests

```python
# test_sda_scheduling_integration.py

async def test_sda_auto_schedules_critical_case():
    """Test SDA automatically books appointment for critical case"""
    # Setup: Create psychologist with availability
    # Test: Run SDA graph with schedule_appointment=True
    # Assert: Appointment created, linked to case
    
async def test_aika_scheduling_flow():
    """Test complete Aika conversation for booking"""
    # Setup: Mock user session
    # Test: Send messages: "I need an appointment" → "Dr. Sarah" → "Monday 9 AM"
    # Assert: Appointment created, confirmation returned
```

### Manual Testing Scenarios

1. **Happy Path**: Student books appointment successfully
2. **No Availability**: All slots booked, waitlist option
3. **Conflict Handling**: Slot booked by another user during selection
4. **Rescheduling**: Change existing appointment time
5. **Cancellation**: Cancel with reason
6. **Critical Auto-Schedule**: SDA creates emergency appointment
7. **LLM Failure**: Gemini API down, fallback to first available
8. **Invalid Preferences**: Student asks for "midnight" appointment

---

## 📝 Configuration

### Environment Variables

```bash
# Already configured for Gemini
GEMINI_API_KEY=<your_key>
GEMINI_MODEL=gemini-2.5-flash  # Used for scheduling

# Database (already configured)
DATABASE_URL=postgresql+asyncpg://...
```

### Feature Flags (Optional)

```python
# app/core/settings.py

class Settings(BaseSettings):
    # ...existing settings...
    
    # Scheduling features
    SCHEDULING_ENABLED: bool = True
    AUTO_SCHEDULE_CRITICAL_CASES: bool = True
    MAX_APPOINTMENT_LOOKAHEAD_DAYS: int = 30
    SCHEDULING_LLM_TEMPERATURE: float = 0.3
    MAX_SUGGESTED_SLOTS: int = 3
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "No available psychologists found"
- **Cause**: All psychologists have `is_available=False`
- **Solution**: Ensure at least one psychologist profile with `is_available=True` in database

**Issue**: "This time slot is no longer available"
- **Cause**: Race condition - slot booked between retrieval and confirmation
- **Solution**: Implement optimistic locking or refresh availability before final booking

**Issue**: LLM returns invalid datetime
- **Cause**: LLM hallucinated a time not in the available list
- **Solution**: Validation catches this, falls back to first available slot

**Issue**: Appointment not linked to case
- **Cause**: SDA state missing `case_id` when scheduling
- **Solution**: Ensure `create_case_node` completes before `schedule_appointment_node`

### Debugging Tips

**Enable Detailed Logging**:
```python
import logging
logging.getLogger("app.agents.shared.tools.scheduling_tools").setLevel(logging.DEBUG)
logging.getLogger("app.agents.sda.sda_graph").setLevel(logging.DEBUG)
```

**Check LLM Prompts**:
- Log full prompts sent to Gemini
- Verify slot formatting is correct
- Check preference parsing logic

**Inspect State**:
```python
# In SDA graph execution
logger.info(f"SDA State at scheduling node: {json.dumps(state, indent=2)}")
```

---

## 📚 References

### Files Modified/Created

**New Files**:
- `backend/app/agents/shared/tools/scheduling_tools.py` (740 lines)

**Modified Files**:
- `backend/app/agents/shared/tools/__init__.py` (+4 lines, import scheduling_tools)
- `backend/app/agents/aika/tools.py` (+1 line, add "scheduling" category)
- `backend/app/agents/graph_state.py` (+25 lines, SDAState scheduling fields)
- `backend/app/agents/sda/sda_graph.py` (+300 lines, schedule_appointment_node + helpers)

**Documentation**:
- `SDA_SCHEDULING_IMPLEMENTATION.md` (this file)

### Related Documentation

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Gemini Function Calling Guide](https://ai.google.dev/docs/function_calling)
- [UGM-AICare Multi-Agent Architecture](./PROJECT_SINGLE_SOURCE_OF_TRUTH.md)

---

## ✅ Implementation Checklist

- [x] Create scheduling tools with 6 functions
- [x] Implement LLM-powered suggestion and selection logic
- [x] Add scheduling fields to SDAState
- [x] Create schedule_appointment_node for SDA
- [x] Integrate scheduling node into SDA graph
- [x] Add scheduling category to Aika's tools
- [x] Implement conflict detection and prevention
- [x] Add ownership verification for cancellation/rescheduling
- [x] Create comprehensive documentation
- [ ] Write unit tests for scheduling tools
- [ ] Write integration tests for SDA auto-scheduling
- [ ] Test Aika conversational booking flow
- [ ] Add logging and monitoring
- [ ] Deploy to staging environment
- [ ] User acceptance testing
- [ ] Production deployment

---

## 📞 Support

For questions or issues with this implementation:

1. Check troubleshooting section above
2. Review logs: `backend/logs/` directory
3. Inspect SDA execution tracker for node failures
4. Verify database state (psychologist availability, existing appointments)

**Key Contacts**:
- Backend Lead: [Your Name]
- AI/LLM Integration: [Your Name]
- Database: [DBA Name]

---

**Last Updated**: November 13, 2025  
**Version**: 1.0.0  
**Status**: ✅ Implementation Complete - Testing Pending
