# Aika Tools Analysis & User Table Improvements

**Date:** November 5, 2025  
**Status:** Analysis & Recommendations  
**Author:** Architecture Review

---

## Part 1: Unimplemented Aika Tools

### Current Status
- **Implemented Tools:** 7 tools
- **Referenced in Prompt:** 17 tools
- **Missing:** 14 tools

### 🔴 Critical Missing Tools (Implement First)

#### 1. `log_mood_entry` - PRIORITY 1
**Purpose:** Record user mood check-ins for wellness tracking

**Why Critical:**
- Core feature for mental health journaling
- Enables mood trend analysis
- Required for wellness dashboard

**Implementation Complexity:** Low (DB insert)

**Tool Definition:**
```python
{
    "name": "log_mood_entry",
    "description": """Log user's mood entry with rating and optional notes.
    
    ✅ CALL WHEN:
    - User shares mood rating (e.g., "mood aku 7/10")
    - User describes how they're feeling today
    - User mentions emotional state explicitly
    
    Stores: mood_rating (1-10), timestamp, notes, context""",
    "parameters": {
        "type": "object",
        "properties": {
            "mood_rating": {
                "type": "integer",
                "description": "Mood rating from 1 (very bad) to 10 (excellent)",
                "minimum": 1,
                "maximum": 10
            },
            "mood_notes": {
                "type": "string",
                "description": "Optional notes about the mood or context"
            },
            "emotion_tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Emotion keywords: stress, anxiety, happy, sad, calm, overwhelmed"
            }
        },
        "required": ["mood_rating"]
    }
}
```

**Handler Implementation:**
```python
elif tool_name == "log_mood_entry":
    mood_rating = args.get("mood_rating")
    mood_notes = args.get("mood_notes", "")
    emotion_tags = args.get("emotion_tags", [])
    
    self.activity_logger.log_info("Database", f"📝 Logging mood entry: {mood_rating}/10")
    
    try:
        from app.domains.mental_health.models import MoodEntry
        from datetime import datetime
        
        # Create mood entry
        mood_entry = MoodEntry(
            user_id=user_id,
            mood_rating=mood_rating,
            notes=mood_notes,
            emotion_tags=emotion_tags,
            timestamp=datetime.now()
        )
        
        self.db.add(mood_entry)
        await self.db.commit()
        await self.db.refresh(mood_entry)
        
        return {
            "status": "completed",
            "mood_entry_id": mood_entry.id,
            "mood_rating": mood_rating,
            "logged_at": mood_entry.timestamp.isoformat()
        }
    
    except Exception as e:
        logger.error(f"❌ Failed to log mood: {e}")
        return {"status": "failed", "error": str(e)}
```

**Database Model Needed:**
```python
class MoodEntry(Base):
    __tablename__ = "mood_entries"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_rating = Column(Integer, nullable=False)  # 1-10
    notes = Column(Text, nullable=True)
    emotion_tags = Column(JSON, nullable=True)  # ["stress", "anxiety"]
    timestamp = Column(DateTime, default=datetime.now)
    
    user = relationship("User", back_populates="mood_entries")
```

---

#### 2. `get_user_progress` - PRIORITY 1
**Purpose:** Track user's mental health journey and achievements

**Why Critical:**
- Shows user their growth and improvement
- Motivates continued engagement
- Data for wellness dashboard

**Implementation Complexity:** Medium (aggregate queries)

**Tool Definition:**
```python
{
    "name": "get_user_progress",
    "description": """Get user's mental health journey progress and achievements.
    
    ✅ CALL WHEN:
    - User asks "bagaimana progress aku?"
    - User wants to see their journey
    - User asks about completed plans
    
    Returns: Completed plans, mood trends, conversation count, streak, achievements""",
    "parameters": {
        "type": "object",
        "properties": {
            "time_period": {
                "type": "string",
                "enum": ["week", "month", "all_time"],
                "description": "Time period for progress summary"
            }
        },
        "required": []
    }
}
```

**Handler Implementation:**
```python
elif tool_name == "get_user_progress":
    time_period = args.get("time_period", "all_time")
    
    self.activity_logger.log_info("Database", f"📈 Fetching user progress: {time_period}")
    
    try:
        from app.domains.mental_health.models import (
            InterventionPlan, MoodEntry, Conversation
        )
        from sqlalchemy import select, func
        from datetime import datetime, timedelta
        
        # Calculate date range
        if time_period == "week":
            since = datetime.now() - timedelta(days=7)
        elif time_period == "month":
            since = datetime.now() - timedelta(days=30)
        else:
            since = None  # All time
        
        # Count completed plans
        query = select(func.count(InterventionPlan.id)).where(
            InterventionPlan.user_id == user_id,
            InterventionPlan.status == "completed"
        )
        if since:
            query = query.where(InterventionPlan.completed_at >= since)
        
        result = await self.db.execute(query)
        completed_plans = result.scalar() or 0
        
        # Count mood entries
        query = select(func.count(MoodEntry.id)).where(
            MoodEntry.user_id == user_id
        )
        if since:
            query = query.where(MoodEntry.timestamp >= since)
        
        result = await self.db.execute(query)
        mood_entries_count = result.scalar() or 0
        
        # Get average mood
        query = select(func.avg(MoodEntry.mood_rating)).where(
            MoodEntry.user_id == user_id
        )
        if since:
            query = query.where(MoodEntry.timestamp >= since)
        
        result = await self.db.execute(query)
        avg_mood = result.scalar() or 0.0
        
        # Get user streak
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        return {
            "status": "completed",
            "time_period": time_period,
            "completed_plans": completed_plans,
            "mood_entries_logged": mood_entries_count,
            "average_mood": round(avg_mood, 1),
            "current_streak": user.current_streak if user else 0,
            "longest_streak": user.longest_streak if user else 0
        }
    
    except Exception as e:
        logger.error(f"❌ Failed to fetch progress: {e}")
        return {"status": "failed", "error": str(e)}
```

---

#### 3. `get_recent_conversations` - PRIORITY 2
**Purpose:** Retrieve conversation history for context

**Why Important:**
- Helps Aika understand context
- Enables continuity in support
- Useful for "what did we discuss?" queries

**Implementation Complexity:** Low (DB query)

**Tool Definition:**
```python
{
    "name": "get_recent_conversations",
    "description": """Get user's recent conversation summaries.
    
    ✅ CALL WHEN:
    - User asks "apa yang kita bahas kemarin?"
    - User wants to review past conversations
    - Need context from previous sessions
    
    Returns: Last 5 conversations with titles and timestamps""",
    "parameters": {
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Number of recent conversations to retrieve (default: 5)",
                "minimum": 1,
                "maximum": 20
            }
        },
        "required": []
    }
}
```

---

### 🟡 Service Desk Tools (Counselor/Admin)

#### 4. `find_available_counselors` - PRIORITY 2
**Purpose:** Search for available counselors for referral

**For:** Crisis escalation, booking requests

**Implementation:**
```python
{
    "name": "find_available_counselors",
    "description": """Find available counselors for user referral.
    
    ✅ CALL WHEN:
    - User asks for counselor
    - Crisis escalation needed
    - User wants to book session
    
    Returns: List of available counselors with specializations""",
    "parameters": {
        "type": "object",
        "properties": {
            "specialization": {
                "type": "string",
                "enum": ["anxiety", "depression", "trauma", "general"],
                "description": "Preferred counselor specialization"
            },
            "urgency": {
                "type": "string",
                "enum": ["routine", "urgent", "emergency"],
                "description": "Urgency level"
            }
        },
        "required": []
    }
}
```

#### 5. `get_counselor_cases` - PRIORITY 3 (Admin/Counselor)
**Purpose:** List cases assigned to counselor

**For:** Case management dashboard

#### 6. `get_case_notes` - PRIORITY 3 (Admin/Counselor)
**Purpose:** Retrieve clinical notes for a case

**For:** Counselor reviewing case history

---

### 🟢 Analytics Tools (Admin)

#### 7. `get_platform_analytics` - PRIORITY 3
**Purpose:** Dashboard metrics for admin

**Metrics:**
- Total users, active users
- Crisis cases resolved
- Average response time
- User engagement metrics

#### 8. `analyze_patient_trends` - PRIORITY 4
**Purpose:** Aggregate insights (IA agent)

**Examples:**
- "What are the most common concerns this month?"
- "Which interventions have highest completion rate?"

#### 9. `generate_report` - PRIORITY 4
**Purpose:** Export analytics reports

**Types:**
- Weekly summary
- Monthly engagement
- Crisis intervention outcomes

#### 10. `search_users` - PRIORITY 4 (Admin)
**Purpose:** Admin user search and management

---

### ❌ Tools to Remove from Prompt (False References)

#### 11. `appropriate` - REMOVE
**Reason:** Not a real tool, likely parsing artifact

#### 12. `suggest_interventions` - REMOVE
**Reason:** Duplicate of `create_intervention_plan`

#### 13. `search_mental_health_resources` - IMPLEMENTED AS `get_mental_health_resources`
**Action:** Update prompt to use correct name

#### 14. `get_patient_history` - MERGE WITH `get_user_progress`
**Reason:** Overlapping functionality

---

## Implementation Roadmap

### Phase 1: Core User Features (Week 1)
**Goal:** Enable mood tracking and progress monitoring

1. ✅ `log_mood_entry` - Mood journaling
2. ✅ `get_user_progress` - Progress tracking
3. ✅ `get_recent_conversations` - Conversation history

**Deliverable:** Users can track mood and see their journey

---

### Phase 2: Counselor Features (Week 2)
**Goal:** Enable professional referrals

4. ✅ `find_available_counselors` - Search counselors
5. ✅ `get_counselor_cases` - Case management
6. ✅ `get_case_notes` - Clinical notes

**Deliverable:** Seamless crisis escalation and case management

---

### Phase 3: Admin Analytics (Week 3)
**Goal:** Platform monitoring and insights

7. ✅ `get_platform_analytics` - Dashboard metrics
8. ✅ `analyze_patient_trends` - Trend analysis
9. ✅ `generate_report` - Report generation

**Deliverable:** Data-driven decision making for admin

---

### Phase 4: Cleanup (Week 3)
**Goal:** Prompt-code alignment

10. ✅ Remove false tool references from identity.py
11. ✅ Update tool names to match implementation
12. ✅ Add usage examples to docs

**Deliverable:** 100% tool sync validation

---

## Part 2: User Table Design Improvements

### Current Issues

#### 1. **Normalization Problems**
- Too many optional fields (80% nullable)
- Mixed concerns (auth + profile + clinical + preferences)
- JSON columns for structured data (`interface_preferences`, `communication_preferences`)

#### 2. **Clinical Data Exposed**
- `clinical_summary`, `therapy_notes` in main User table
- Security risk: Clinical data not isolated
- HIPAA/privacy concerns

#### 3. **Redundant Fields**
- `name` vs `first_name + last_name` vs `preferred_name`
- `phone` vs `alternate_phone`
- `emergency_contact_*` should be separate table

#### 4. **Missing Audit Trail**
- No `updated_by` field
- Consent changes not tracked
- Profile edits not logged

#### 5. **Poor Indexing**
- Missing composite indexes for common queries
- No full-text search on clinical notes

---

### Recommended Design: Multi-Table Normalization

```
users (Core Identity)
├── user_profiles (Extended Profile)
├── user_clinical_records (Clinical Data - RESTRICTED ACCESS)
├── user_preferences (Settings & Preferences)
├── user_emergency_contacts (Emergency Contacts)
├── user_consent_ledger (Consent History - Append-Only)
└── user_audit_log (Change History)
```

---

### Improved Schema

#### **Table 1: `users` (Core Identity & Auth)**
```python
class User(Base):
    """Core user identity and authentication - MINIMAL FIELDS ONLY"""
    __tablename__ = "users"
    
    # Identity
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    google_sub: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    twitter_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    
    # Auth
    password_hash: Mapped[Optional[str]] = mapped_column(String)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String)
    password_reset_expires: Mapped[Optional[datetime]] = mapped_column(DateTime)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Role & Access
    role: Mapped[str] = mapped_column(String, default="user", index=True)
    wallet_address: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relationships
    profile: Mapped["UserProfile"] = relationship("UserProfile", back_populates="user", uselist=False)
    clinical_record: Mapped[Optional["UserClinicalRecord"]] = relationship(
        "UserClinicalRecord", 
        back_populates="user", 
        uselist=False
    )
    preferences: Mapped["UserPreferences"] = relationship(
        "UserPreferences", 
        back_populates="user", 
        uselist=False
    )
    emergency_contacts: Mapped[List["UserEmergencyContact"]] = relationship(
        "UserEmergencyContact", 
        back_populates="user"
    )
    consent_history: Mapped[List["UserConsentLedger"]] = relationship(
        "UserConsentLedger", 
        back_populates="user"
    )
    audit_logs: Mapped[List["UserAuditLog"]] = relationship(
        "UserAuditLog", 
        back_populates="user"
    )
    
    # Existing relationships
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user")
    journal_entries: Mapped[List["JournalEntry"]] = relationship("JournalEntry", back_populates="user")
    mood_entries: Mapped[List["MoodEntry"]] = relationship("MoodEntry", back_populates="user")
```

**Benefits:**
- Minimal core table (fast queries)
- Clear separation of concerns
- Better security (auth isolated)

---

#### **Table 2: `user_profiles` (Public Profile Info)**
```python
class UserProfile(Base):
    """User profile information - NON-SENSITIVE"""
    __tablename__ = "user_profiles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, index=True)
    
    # Names
    first_name: Mapped[Optional[str]] = mapped_column(String)
    last_name: Mapped[Optional[str]] = mapped_column(String)
    preferred_name: Mapped[Optional[str]] = mapped_column(String)
    pronouns: Mapped[Optional[str]] = mapped_column(String)
    
    # Contact
    phone: Mapped[Optional[str]] = mapped_column(String)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String)
    
    # Demographics
    date_of_birth: Mapped[Optional[Date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String)
    city: Mapped[Optional[str]] = mapped_column(String)
    
    # Academic (UGM-specific)
    university: Mapped[Optional[str]] = mapped_column(String, default="Universitas Gadjah Mada")
    faculty: Mapped[Optional[str]] = mapped_column(String)  # NEW: Faculty
    major: Mapped[Optional[str]] = mapped_column(String)
    year_of_study: Mapped[Optional[str]] = mapped_column(String)
    student_id: Mapped[Optional[str]] = mapped_column(String, unique=True)  # NEW: NIM
    
    # Appearance
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String)
    
    # Gamification
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[Optional[Date]] = mapped_column(Date)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="profile")
```

**Benefits:**
- All profile data in one place
- Safe to cache (non-sensitive)
- Easy to display

---

#### **Table 3: `user_clinical_records` (RESTRICTED ACCESS)**
```python
class UserClinicalRecord(Base):
    """Clinical and therapeutic data - RESTRICTED ACCESS ONLY"""
    __tablename__ = "user_clinical_records"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, index=True)
    
    # Risk Assessment
    current_risk_level: Mapped[Optional[str]] = mapped_column(
        String, 
        index=True
    )  # low, moderate, high, critical
    last_risk_assessment_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Clinical Summary (Counselor notes)
    clinical_summary: Mapped[Optional[str]] = mapped_column(Text)
    primary_concerns: Mapped[Optional[List[str]]] = mapped_column(JSON)  # ["anxiety", "depression"]
    diagnosed_conditions: Mapped[Optional[List[str]]] = mapped_column(JSON)  # From licensed professional
    
    # Safety Planning
    safety_plan_active: Mapped[bool] = mapped_column(Boolean, default=False)
    safety_plan_notes: Mapped[Optional[str]] = mapped_column(Text)
    safety_plan_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    safety_plan_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Current Therapy
    is_in_external_therapy: Mapped[bool] = mapped_column(Boolean, default=False)
    external_therapist_name: Mapped[Optional[str]] = mapped_column(String)
    external_therapist_contact: Mapped[Optional[str]] = mapped_column(String)
    therapy_modality: Mapped[Optional[str]] = mapped_column(String)  # CBT, DBT, etc.
    therapy_frequency: Mapped[Optional[str]] = mapped_column(String)  # weekly, biweekly
    therapy_start_date: Mapped[Optional[Date]] = mapped_column(Date)
    
    # Medication (if disclosed)
    is_on_medication: Mapped[bool] = mapped_column(Boolean, default=False)
    medication_notes: Mapped[Optional[str]] = mapped_column(Text)  # General notes (not prescription data)
    
    # Internal Notes (UGM-AICare team only)
    aicare_team_notes: Mapped[Optional[str]] = mapped_column(Text)
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    flagged_reason: Mapped[Optional[str]] = mapped_column(String)
    
    # Access Control
    access_level: Mapped[str] = mapped_column(
        String, 
        default="counselor_only"
    )  # counselor_only, clinical_team, research_anonymized
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    updated_by_user_id: Mapped[Optional[int]] = mapped_column(Integer)  # Who made the edit
    
    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="clinical_record")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_risk_level_date', 'current_risk_level', 'last_risk_assessment_date'),
        Index('idx_flagged_review', 'flagged_for_review', 'updated_at'),
    )
```

**Security Features:**
- Separate table = separate access control
- `access_level` field for granular permissions
- `updated_by_user_id` for audit trail
- Indexed for counselor dashboard queries

---

#### **Table 4: `user_preferences`**
```python
class UserPreferences(Base):
    """User preferences and settings"""
    __tablename__ = "user_preferences"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, index=True)
    
    # Language & Localization
    preferred_language: Mapped[str] = mapped_column(String, default="id")  # id, en
    preferred_timezone: Mapped[str] = mapped_column(String, default="Asia/Jakarta")
    
    # Communication
    allow_email_checkins: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_sms_reminders: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_push_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    notification_quiet_hours_start: Mapped[Optional[int]] = mapped_column(Integer)  # 22 (10 PM)
    notification_quiet_hours_end: Mapped[Optional[int]] = mapped_column(Integer)  # 7 (7 AM)
    
    # Interface
    theme: Mapped[str] = mapped_column(String, default="auto")  # light, dark, auto
    font_size: Mapped[str] = mapped_column(String, default="medium")  # small, medium, large
    high_contrast_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    reduce_animations: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Accessibility
    screen_reader_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    accessibility_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Check-in Settings
    check_in_code: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    check_in_frequency: Mapped[str] = mapped_column(String, default="daily")  # daily, weekly, custom
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="preferences")
```

---

#### **Table 5: `user_emergency_contacts`**
```python
class UserEmergencyContact(Base):
    """Emergency contacts - separate table for multiple contacts"""
    __tablename__ = "user_emergency_contacts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    
    # Contact Info
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    relationship: Mapped[str] = mapped_column(String)  # parent, sibling, friend, partner
    phone: Mapped[str] = mapped_column(String, nullable=False)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String)
    email: Mapped[Optional[str]] = mapped_column(String)
    
    # Priority
    priority: Mapped[int] = mapped_column(Integer, default=1)  # 1 = primary, 2 = secondary
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Consent
    consent_to_contact: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_granted_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="emergency_contacts")
    
    # Ensure priority is unique per user
    __table_args__ = (
        Index('idx_user_priority', 'user_id', 'priority', unique=True),
    )
```

**Benefits:**
- Support multiple contacts (not just one)
- Clear priority system
- Consent tracking per contact

---

#### **Table 6: `user_consent_ledger` (Append-Only)**
```python
class UserConsentLedger(Base):
    """Consent history - APPEND-ONLY, never delete"""
    __tablename__ = "user_consent_ledger"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    
    # Consent Type
    consent_type: Mapped[str] = mapped_column(String, index=True)
    # Types: data_sharing, research, emergency_contact, marketing, clinical_access
    
    # Consent Decision
    granted: Mapped[bool] = mapped_column(Boolean)  # True = granted, False = revoked
    
    # Context
    consent_version: Mapped[str] = mapped_column(String)  # e.g., "v2.1_2025-11"
    ip_address: Mapped[Optional[str]] = mapped_column(String)
    user_agent: Mapped[Optional[str]] = mapped_column(String)
    
    # Timestamps
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    
    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="consent_history")
    
    # Indexes for compliance queries
    __table_args__ = (
        Index('idx_consent_type_time', 'user_id', 'consent_type', 'timestamp'),
    )
```

**Compliance Features:**
- Complete audit trail (GDPR/HIPAA)
- Never delete (append-only)
- Track consent version changes
- Query: "When did user consent to research?"

**Current Consent Status Query:**
```python
async def get_current_consents(user_id: int) -> Dict[str, bool]:
    """Get user's current consent status for all types"""
    query = select(
        UserConsentLedger.consent_type,
        UserConsentLedger.granted
    ).where(
        UserConsentLedger.user_id == user_id
    ).order_by(
        UserConsentLedger.consent_type,
        UserConsentLedger.timestamp.desc()
    ).distinct(UserConsentLedger.consent_type)
    
    result = await db.execute(query)
    return {row.consent_type: row.granted for row in result}
```

---

#### **Table 7: `user_audit_log`**
```python
class UserAuditLog(Base):
    """Audit trail for all user table changes"""
    __tablename__ = "user_audit_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    
    # Change Details
    action: Mapped[str] = mapped_column(String, index=True)  # created, updated, deleted
    table_name: Mapped[str] = mapped_column(String, index=True)  # users, user_profiles, etc.
    changed_fields: Mapped[Dict] = mapped_column(JSON)  # {"email": {"old": "...", "new": "..."}}
    
    # Actor
    changed_by_user_id: Mapped[Optional[int]] = mapped_column(Integer)  # Who made the change
    changed_by_role: Mapped[Optional[str]] = mapped_column(String)  # user, counselor, admin
    
    # Context
    ip_address: Mapped[Optional[str]] = mapped_column(String)
    user_agent: Mapped[Optional[str]] = mapped_column(String)
    
    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    
    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="audit_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_audit_timestamp', 'user_id', 'timestamp'),
        Index('idx_audit_action', 'action', 'timestamp'),
    )
```

---

### Migration Strategy

#### Phase 1: Create New Tables (Non-Breaking)
```bash
# Create new tables alongside old ones
alembic revision --autogenerate -m "add_user_profile_tables"
alembic upgrade head
```

#### Phase 2: Data Migration Script
```python
async def migrate_user_data():
    """Migrate data from users table to new normalized tables"""
    
    users = await db.execute(select(User))
    
    for user in users.scalars():
        # Create profile
        profile = UserProfile(
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            preferred_name=user.preferred_name,
            # ... map all profile fields
        )
        db.add(profile)
        
        # Create clinical record (if has clinical data)
        if user.clinical_summary or user.risk_level:
            clinical = UserClinicalRecord(
                user_id=user.id,
                current_risk_level=user.risk_level,
                clinical_summary=user.clinical_summary,
                # ... map clinical fields
            )
            db.add(clinical)
        
        # Create preferences
        prefs = UserPreferences(
            user_id=user.id,
            preferred_language=user.preferred_language or "id",
            # ... map preference fields
        )
        db.add(prefs)
        
        # Create emergency contacts
        if user.emergency_contact_name:
            contact = UserEmergencyContact(
                user_id=user.id,
                full_name=user.emergency_contact_name,
                relationship=user.emergency_contact_relationship,
                phone=user.emergency_contact_phone,
                email=user.emergency_contact_email,
                priority=1,
                consent_to_contact=user.consent_emergency_contact
            )
            db.add(contact)
        
        # Create consent ledger entries
        for consent_type, value in [
            ("data_sharing", user.consent_data_sharing),
            ("research", user.consent_research),
            ("emergency_contact", user.consent_emergency_contact),
            ("marketing", user.consent_marketing),
        ]:
            ledger = UserConsentLedger(
                user_id=user.id,
                consent_type=consent_type,
                granted=value,
                consent_version="v1.0_migration"
            )
            db.add(ledger)
    
    await db.commit()
```

#### Phase 3: Update Code to Use New Tables
```python
# OLD CODE:
user = await db.execute(select(User).where(User.id == user_id))

# NEW CODE:
user = await db.execute(
    select(User)
    .options(
        joinedload(User.profile),
        joinedload(User.preferences)
    )
    .where(User.id == user_id)
)
```

#### Phase 4: Remove Old Columns
```bash
# After validation period (2-4 weeks)
alembic revision -m "remove_old_user_columns"
# Drop redundant columns from users table
```

---

## Summary

### Tools Implementation Priority

**Week 1 (Critical):**
1. ✅ `log_mood_entry` - Core mental health feature
2. ✅ `get_user_progress` - Motivational feature
3. ✅ `get_recent_conversations` - Context continuity

**Week 2 (Important):**
4. ✅ `find_available_counselors` - Crisis support
5. ✅ Update identity.py to remove false references

**Week 3 (Admin):**
6. ✅ `get_platform_analytics` - Admin dashboard
7. ✅ `get_counselor_cases` - Counselor dashboard

**Week 4 (Polish):**
8. ✅ Complete tool sync validation
9. ✅ Add usage examples to docs

---

### User Table Improvements Priority

**Phase 1 (Week 1):**
1. ✅ Create new normalized tables
2. ✅ Run migration script
3. ✅ Validate data integrity

**Phase 2 (Week 2):**
4. ✅ Update all queries to use new tables
5. ✅ Add access control for clinical records
6. ✅ Test consent ledger queries

**Phase 3 (Week 3):**
7. ✅ Deploy to staging
8. ✅ Monitor performance
9. ✅ Remove old columns

**Benefits:**
- **Security:** Clinical data isolated
- **Compliance:** Complete audit trail
- **Performance:** Better indexes, smaller core table
- **Maintainability:** Clear separation of concerns
- **Scalability:** Normalized structure

---

**Next Steps:**
1. Review this document with team
2. Prioritize tools based on user feedback
3. Create Alembic migration for new tables
4. Implement Phase 1 tools (mood + progress)

**Questions to Answer:**
- Which tools are most requested by users?
- What clinical data should counselors NOT see?
- Should we implement all tools or simplify prompt?
