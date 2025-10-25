# Safety Agent Tools - Quick Reference

## 🛡️ STA (Safety Triage Agent) Tools

### 1. get_recent_risk_history
**When to use:** Detect escalating risk patterns before crisis  
**Returns:** Recent TriageAssessment records with escalation flag  
**Key params:** `limit` (default: 5), `days_ago` (default: 7), `severity_filter` (optional)

### 2. get_user_consent_status  
**When to use:** Before escalating to SDA or enabling analytics  
**Returns:** Consent status for ops/followup/research scopes  
**Key params:** `scope` (optional: 'ops', 'followup', 'research')

### 3. get_active_cases_for_user
**When to use:** Before creating new case (prevent duplicates)  
**Returns:** Active cases (new/in_progress/waiting)  
**Key params:** `status_filter` (optional)

### 4. get_crisis_resources
**When to use:** Display crisis banner with emergency contacts  
**Returns:** Crisis hotlines and emergency resources  
**Key params:** `severity` (required: 'high' or 'critical'), `limit` (default: 3)  
**Fallback:** Hardcoded resources (UGM Crisis Line, SEJIWA, 112)

---

## 💬 SCA (Support Coach Agent) Tools

### 5. get_intervention_history
**When to use:** Before generating new intervention (avoid repetition)  
**Returns:** Past InterventionPlanRecord with completion rates  
**Key params:** `limit` (default: 5), `days_ago` (optional)

### 6. get_user_preferences
**When to use:** Personalize coaching approach and tone  
**Returns:** User profile + preferences (name, university, major)  
**Key params:** None (uses user_id)

### 7. search_therapeutic_exercises
**When to use:** Find exercises matching user's current emotional state  
**Returns:** ContentResource exercises by intent  
**Key params:** `intent` (required: 'anxiety', 'stress', 'breathing', 'grounding'), `limit` (default: 5)

---

## 🗂️ SDA (Service Desk Agent) Tools

### 8. get_case_assignment_recommendations
**When to use:** Auto-assign cases to counselors  
**Returns:** Counselors ranked by availability_score  
**Key params:** `case_severity` (optional), `limit` (default: 5)

### 9. get_sla_breach_predictions
**When to use:** Proactive alerts before deadlines missed  
**Returns:** Cases at risk of SLA breach (ordered by urgency)  
**Key params:** `hours_threshold` (default: 24), `limit` (default: 10)

### 10. get_case_notes_summary
**When to use:** Counselor needs case context before responding  
**Returns:** CaseNote records in chronological order  
**Key params:** `case_id` (required UUID), `limit` (default: 10)

### 11. get_counselor_workload
**When to use:** Load balancing and capacity planning  
**Returns:** Active case counts per counselor  
**Key params:** `include_waiting` (default: False)

---

## Usage in LLM Tool Calling

### Example Tool Call (Gemini Format)
```json
{
  "function_call": {
    "name": "get_recent_risk_history",
    "args": {
      "limit": 5,
      "days_ago": 7,
      "severity_filter": "high"
    }
  }
}
```

### Example Tool Response
```json
{
  "success": true,
  "assessments": [
    {
      "id": 123,
      "risk_score": 0.85,
      "severity_level": "high",
      "confidence_score": 0.92,
      "recommended_action": "escalate_manual_review",
      "created_at": "2025-10-26T10:30:00Z",
      "risk_factors": ["self_harm_mention", "hopelessness"]
    }
  ],
  "count": 1,
  "high_risk_count": 1,
  "escalation_detected": false,
  "timeframe_days": 7
}
```

---

## Tool Chaining Patterns

### Pattern 1: Safe Escalation
```
get_recent_risk_history → get_active_cases_for_user → get_user_consent_status → CREATE_CASE
```

### Pattern 2: Personalized Intervention
```
get_user_preferences → get_intervention_history → search_therapeutic_exercises → GENERATE_PLAN
```

### Pattern 3: Intelligent Assignment
```
get_counselor_workload → get_case_assignment_recommendations → ASSIGN_CASE
```

### Pattern 4: Proactive Monitoring
```
get_sla_breach_predictions → get_case_notes_summary → PRIORITIZE_RESPONSE
```

---

## Error Handling

All tools return consistent error structure:
```json
{
  "success": false,
  "error": "User-friendly error message",
  "data_field": [],  // Empty list/dict for failed queries
  "count": 0
}
```

**Never crash on tool failures** - Always check `success` field before using data.

---

## Performance Considerations

- ✅ All tools have rate limits (MAX_* constants)
- ✅ Content truncation for long text fields
- ✅ Database query optimization with indexes
- ⚠️ Use `limit` parameters wisely (defaults are conservative)
- ⚠️ Expensive tools: `search_therapeutic_exercises`, `get_intervention_history`

---

## TODO Items for Production

1. **User Hash Alignment** - Standardize user_id → user_hash conversion
2. **ContentResource Classification** - Add severity field for better crisis resource filtering
3. **User Preferences Schema** - Add dedicated preference fields to User model
4. **Database Indexes** - Add indexes for frequently queried fields
5. **Unit Tests** - Comprehensive test coverage for all 11 tools
