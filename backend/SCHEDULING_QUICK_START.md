# Quick Start: Using SDA Scheduling

## For Frontend Developers

### Booking Appointments via Aika

Aika now has 6 new tools for appointment scheduling. Students can book appointments conversationally:

**Example Conversation**:

```
Student: "I want to book an appointment with a counselor"

Aika: "I can help you with that! Let me find available counselors for you."
      [Calls: get_available_counselors]
      "I found 3 available counselors:
       1. Dr. Sarah Johnson - Anxiety & Stress (4.8★, 8 years)
       2. Dr. Michael Chen - Depression & CBT (4.9★, 12 years)
       3. Dr. Amira Hassan - Academic Stress (4.7★, 5 years)
       
       Who would you prefer, or would you like more details?"

Student: "Dr. Sarah sounds good. What times is she available?"

Aika: [Calls: get_counselor_availability(psychologist_id=5)]
      "Dr. Sarah has these slots available:
       - Monday, Nov 18 at 9:00 AM
       - Monday, Nov 18 at 2:00 PM
       - Tuesday, Nov 19 at 10:00 AM
       ...
       
       Which time works for you?"

Student: "Monday at 9 AM"

Aika: [Calls: book_appointment(user_id=42, psychologist_id=5, datetime="2025-11-18T09:00:00")]
      "✅ Done! Your appointment with Dr. Sarah Johnson is confirmed for:
       📅 Monday, November 18, 2025
       ⏰ 9:00 AM - 10:00 AM
       
       You'll receive a reminder. See you then! 💙"
```

### Natural Language Preferences

Students can express preferences naturally:

```
Student: "I need to talk to someone ASAP, mornings are better for me"

Aika: [Calls: suggest_appointment_times with preferences_text="ASAP, mornings are better"]
      "Based on your urgency and morning preference, here are the best options:
       1. Tomorrow, Nov 14 at 9:00 AM (earliest available)
       2. Tomorrow, Nov 14 at 10:30 AM (alternative morning slot)
       3. Friday, Nov 15 at 8:00 AM (start of weekend)
       
       Shall I book tomorrow at 9 AM?"
```

### API Endpoints (if building custom UI)

**Get Available Counselors**:
```http
GET /api/v1/appointments/psychologists?available_only=true
```

**Get Counselor Availability**:
```http
GET /api/v1/appointments/psychologists/{psychologist_id}/availability
    ?start_date=2025-11-13
    &end_date=2025-11-27
    &preferred_time=morning
```

**Book Appointment**:
```http
POST /api/v1/appointments
Content-Type: application/json

{
  "psychologist_id": 5,
  "appointment_datetime": "2025-11-18T09:00:00",
  "appointment_type_id": 1,
  "notes": "Anxiety concerns"
}
```

**Cancel Appointment**:
```http
DELETE /api/v1/appointments/{appointment_id}
Content-Type: application/json

{
  "reason": "Schedule conflict"
}
```

**Reschedule Appointment**:
```http
PATCH /api/v1/appointments/{appointment_id}
Content-Type: application/json

{
  "new_datetime": "2025-11-20T14:00:00"
}
```

---

## For Backend Developers

### Using Scheduling Tools in Code

```python
from app.agents.shared.tools import tool_registry
from app.database import get_async_db

async with get_async_db() as db:
    # Get available counselors
    result = await tool_registry.execute(
        "get_available_counselors",
        db=db,
        specialization="anxiety"
    )
    print(result["counselors"])
    
    # Get availability
    result = await tool_registry.execute(
        "get_counselor_availability",
        db=db,
        psychologist_id=5,
        preferred_time="morning"
    )
    print(result["available_slots"])
    
    # Book appointment
    result = await tool_registry.execute(
        "book_appointment",
        db=db,
        user_id=42,
        psychologist_id=5,
        appointment_datetime="2025-11-18T09:00:00"
    )
    print(result["appointment_id"])
```

### Triggering SDA Auto-Scheduling

When creating a high/critical case, set the scheduling flag:

```python
from app.agents.sda.sda_graph_service import SDAGraphService

sda_service = SDAGraphService(db)

result = await sda_service.execute(
    user_id=42,
    session_id="abc123",
    user_hash="hash456",
    message="I'm having suicidal thoughts",
    conversation_id=789,
    severity="critical",
    schedule_appointment=True,  # AUTO-SCHEDULE
    preferred_time="as soon as possible",
    scheduling_context={
        "urgency": "immediate",
        "reason": "crisis_intervention"
    }
)

# Result contains:
# - case_id: Created case ID
# - appointment_id: Auto-booked appointment ID
# - appointment_datetime: When appointment is scheduled
# - appointment_confirmed: True/False
```

### Adding Custom Scheduling Logic

**Example: Priority Booking for VIP Students**

```python
# In scheduling_tools.py

async def book_priority_appointment(
    db: AsyncSession,
    user_id: int,
    psychologist_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Book appointment with priority (skips conflict check for VIPs)."""
    
    # Check if user is VIP
    user = await db.get(User, user_id)
    if not user.is_vip:
        return await book_appointment(db, user_id, psychologist_id, **kwargs)
    
    # VIP logic: Force booking even if slot appears taken
    # (assumes counselor can handle one extra urgent case)
    ...
```

Register the new tool:

```python
# At end of scheduling_tools.py

def register_scheduling_tools():
    # ... existing tools ...
    
    tool_registry.register(
        name="book_priority_appointment",
        func=book_priority_appointment,
        schema=BOOK_PRIORITY_APPOINTMENT_SCHEMA,
        category="scheduling"
    )
```

---

## For Data Scientists / LLM Engineers

### Understanding LLM Usage

**Two LLM Calls in Scheduling**:

1. **Psychologist Selection** (`_select_optimal_psychologist`)
   - Model: Gemini 2.5 Flash
   - Temperature: 0.2
   - Purpose: Match psychologist to case context
   - Criteria: Experience, specialization, ratings, availability

2. **Time Slot Selection** (`_find_optimal_appointment_time`)
   - Model: Gemini 2.5 Flash
   - Temperature: 0.2
   - Purpose: Select best time from available slots
   - Criteria: Urgency, student preferences, optimal timing

### Prompt Engineering

**Key Techniques**:

- **Few-shot examples**: Not used (zero-shot performs well)
- **Structured output**: JSON format with strict schema
- **Constraint highlighting**: Use ⚠️ for critical cases
- **Fallback instructions**: "If no perfect match, select best available"
- **Token efficiency**: Limit to 20-30 slots per prompt

**Temperature Settings**:

```python
# Low temperature for consistent decisions
generation_config = {
    "temperature": 0.2,  # More deterministic
    "max_output_tokens": 50  # Just need slot datetime
}
```

### Monitoring LLM Performance

**Key Metrics to Track**:

1. **Selection Accuracy**: Does LLM select appropriate slot?
2. **Preference Matching**: How well do selections match stated preferences?
3. **Fallback Rate**: How often does LLM fail and fallback is used?
4. **Latency**: Time from LLM call to response

**Logging LLM Decisions**:

```python
# In _find_optimal_appointment_time

logger.info(
    f"LLM Scheduling Decision",
    extra={
        "psychologist_id": psychologist_id,
        "severity": severity,
        "preferences": preferred_time,
        "available_slots_count": len(available_slots),
        "selected_slot": selected_datetime_str,
        "latency_ms": (time.time() - start_time) * 1000
    }
)
```

### A/B Testing LLM vs Rule-Based

**Experiment Setup**:

```python
import random

async def _find_optimal_appointment_time(
    db: AsyncSession,
    psychologist: Psychologist,
    preferred_time: str | None,
    severity: str,
    scheduling_context: dict
) -> datetime | None:
    
    # A/B test: 50% LLM, 50% rule-based
    use_llm = random.random() < 0.5
    
    if use_llm:
        result = await _llm_select_slot(...)
        method = "llm"
    else:
        result = _rule_based_select_slot(...)
        method = "rule_based"
    
    # Log for analysis
    logger.info(f"Slot selection: {method}, result: {result}")
    
    return result
```

Compare:
- User satisfaction ratings
- Booking completion rate
- Time to book
- User feedback sentiment

---

## For DevOps / SRE

### Deployment Checklist

**Before Deploying**:

- [ ] Database has psychologist profiles with `availability_schedule` populated
- [ ] At least one psychologist has `is_available=True`
- [ ] Gemini API key configured (`GEMINI_API_KEY`)
- [ ] Database migrations applied (Appointment, AppointmentType tables)
- [ ] Redis cache configured for tool registry

**Environment Variables**:

```bash
# .env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://localhost:6379
```

### Monitoring

**Key Metrics**:

1. **Booking Success Rate**: `(successful_bookings / total_attempts) * 100`
2. **Average Booking Time**: Time from first tool call to confirmation
3. **LLM Latency**: Time for Gemini API calls
4. **Conflict Rate**: `(conflicts_detected / total_bookings) * 100`
5. **SDA Auto-Schedule Rate**: `(auto_scheduled / critical_cases) * 100`

**Alerts**:

```yaml
alerts:
  - name: High Booking Failure Rate
    condition: booking_success_rate < 90
    action: Notify on-call engineer
    
  - name: LLM Latency Spike
    condition: llm_latency_p95 > 3000ms
    action: Check Gemini API status
    
  - name: No Available Psychologists
    condition: available_psychologist_count == 0
    action: Notify admin to update psychologist availability
```

### Database Indexes

**Recommended Indexes**:

```sql
-- Appointments table
CREATE INDEX idx_appointments_psychologist_datetime 
ON appointments(psychologist_id, appointment_datetime);

CREATE INDEX idx_appointments_user_status 
ON appointments(user_id, status);

CREATE INDEX idx_appointments_status_datetime 
ON appointments(status, appointment_datetime);

-- Psychologists table
CREATE INDEX idx_psychologists_available 
ON psychologists(is_available);

CREATE INDEX idx_psychologists_specialization 
ON psychologists(specialization);
```

### Backup Strategy

**Critical Data**:

- `appointments` table (all bookings)
- `psychologists` table (counselor profiles)
- `appointment_types` table (appointment configurations)

**Backup Schedule**:

- Full backup: Daily at 2 AM
- Incremental: Every 6 hours
- Retention: 30 days

---

## For QA / Testers

### Test Scenarios

**Happy Path Tests**:

1. Student books appointment → Success
2. Student reschedules appointment → Success
3. Student cancels appointment → Success
4. SDA auto-schedules critical case → Appointment created

**Edge Cases**:

1. All slots booked → Error message "No availability"
2. Double-booking attempt → Conflict detected
3. Invalid time (past date) → Validation error
4. Non-existent psychologist → Error "Psychologist not found"
5. User tries to cancel another user's appointment → Permission denied

**LLM Edge Cases**:

1. LLM returns invalid slot → Fallback to first available
2. LLM API timeout → Fallback to rule-based selection
3. Student preferences impossible to satisfy → LLM explains and suggests alternatives

**Race Conditions**:

1. Two users book same slot simultaneously → Only one succeeds
2. Psychologist marks unavailable during booking → Transaction fails gracefully

### Test Data Setup

```sql
-- Create test psychologists
INSERT INTO psychologists (name, specialization, is_available, availability_schedule) VALUES
('Dr. Test One', 'Anxiety', true, '{"monday": {"available": true, "start": "09:00", "end": "17:00"}}'),
('Dr. Test Two', 'Depression', true, '{"tuesday": {"available": true, "start": "10:00", "end": "16:00"}}'),
('Dr. Test Three', 'Stress', false, '{}');  -- Unavailable for testing error cases

-- Create test appointment types
INSERT INTO appointment_types (name, duration_minutes, description) VALUES
('Initial Consultation', 60, 'First session'),
('Follow-up', 45, 'Regular session'),
('Crisis Intervention', 90, 'Emergency session');
```

### Automated Test Suite

```python
# tests/test_scheduling_integration.py

import pytest
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_aika_conversational_booking(test_client, test_db):
    """Test complete booking flow through Aika"""
    # Step 1: Request appointment
    response = await test_client.post("/api/v1/chat", json={
        "message": "I need to book an appointment"
    })
    assert "available counselors" in response.json()["response"].lower()
    
    # Step 2: Select counselor
    response = await test_client.post("/api/v1/chat", json={
        "message": "Dr. Test One please"
    })
    assert "available times" in response.json()["response"].lower()
    
    # Step 3: Confirm time
    response = await test_client.post("/api/v1/chat", json={
        "message": "Monday at 9 AM"
    })
    assert "appointment confirmed" in response.json()["response"].lower()
    assert response.json()["metadata"]["appointment_id"] is not None

@pytest.mark.asyncio
async def test_double_booking_prevention(test_db):
    """Test conflict detection"""
    from app.agents.shared.tools import tool_registry
    
    # Book first appointment
    result1 = await tool_registry.execute(
        "book_appointment",
        db=test_db,
        user_id=1,
        psychologist_id=1,
        appointment_datetime="2025-11-18T09:00:00"
    )
    assert result1["success"] == True
    
    # Try to book same slot
    result2 = await tool_registry.execute(
        "book_appointment",
        db=test_db,
        user_id=2,
        psychologist_id=1,
        appointment_datetime="2025-11-18T09:00:00"
    )
    assert result2["success"] == False
    assert "conflict" in result2.get("error", "").lower()

@pytest.mark.asyncio
async def test_sda_auto_scheduling_critical_case(test_db):
    """Test SDA automatically books appointment for critical case"""
    from app.agents.sda.sda_graph_service import SDAGraphService
    
    sda = SDAGraphService(test_db)
    result = await sda.execute(
        user_id=42,
        session_id="test123",
        user_hash="hash123",
        message="I'm having suicidal thoughts",
        conversation_id=1,
        severity="critical",
        schedule_appointment=True
    )
    
    assert result["case_created"] == True
    assert result["appointment_confirmed"] == True
    assert result["appointment_id"] is not None
    
    # Verify appointment is within 48 hours (critical priority)
    apt_time = datetime.fromisoformat(result["appointment_datetime"])
    assert apt_time < datetime.now() + timedelta(hours=48)
```

---

## Troubleshooting

### Common Issues

**"No available psychologists found"**

```bash
# Check database
psql -d ugm_aicare -c "SELECT id, name, is_available FROM psychologists;"

# If all false, update one:
psql -d ugm_aicare -c "UPDATE psychologists SET is_available = true WHERE id = 1;"
```

**"LLM returning invalid slots"**

```python
# Enable debug logging
import logging
logging.getLogger("app.agents.shared.tools.scheduling_tools").setLevel(logging.DEBUG)

# Check prompts in logs
tail -f backend/logs/app.log | grep "LLM Scheduling"
```

**"Appointments not showing in dashboard"**

```sql
-- Verify appointment created
SELECT * FROM appointments WHERE user_id = 42 ORDER BY created_at DESC LIMIT 5;

-- Check status
SELECT status, COUNT(*) FROM appointments GROUP BY status;
```

---

## Next Steps

1. **Run Tests**: `pytest backend/tests/test_scheduling*.py -v`
2. **Seed Database**: Populate psychologists with realistic availability
3. **Monitor Logs**: Watch for LLM decisions and errors
4. **Gather Feedback**: Track user satisfaction with bookings
5. **Iterate**: Improve LLM prompts based on real usage patterns

---

**Questions?** See full documentation: `SDA_SCHEDULING_IMPLEMENTATION.md`
