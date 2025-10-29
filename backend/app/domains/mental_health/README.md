# Mental Health Domain Documentation

## Overview

The **mental_health/** domain consolidates all mental health-related functionality for the UGM-AICare platform. This is the **core domain** of the application, handling therapeutic services, user wellness, and clinical operations.

## 🎯 Purpose

This domain handles:

- **User Management**: Authentication, profiles, user data
- **Therapeutic Chat**: AI-powered mental health conversations
- **CBT Modules**: Cognitive Behavioral Therapy interventions
- **AI Agents**: Safety Triage (STA), Support Coach (SCA), Service Desk (SDA), Insights (IA)
- **Clinical Operations**: Interventions, appointments, counseling
- **Wellness Tracking**: Journals, daily check-ins, activity summaries
- **Assessments**: Mental health surveys and screenings
- **Gamification**: Quests, achievements, engagement tracking
- **Feedback**: User feedback on mental health services

## 📁 Current Structure (In Transition)

Currently, mental health functionality is distributed across multiple directories:

### Existing Routes (to be consolidated)

```
backend/app/routes/
├── auth.py                          # User authentication
├── chat.py                          # Therapeutic chat
├── cbt_modules.py                   # CBT modules
├── agents.py                        # Agent endpoints
├── agents_command.py                # Agent commands
├── agents_graph.py                  # LangGraph agent execution
├── safety_triage.py                 # Safety triage agent
├── intervention_plans.py            # Intervention plans
├── appointments.py                  # Clinical appointments
├── counselor.py                     # Counselor management
├── journal.py                       # User journals
├── journal_prompts.py               # Journal prompts
├── quests.py                        # Gamification quests
├── surveys.py                       # Mental health surveys
├── feedback.py                      # User feedback
├── profile.py                       # User profiles
├── session_events.py                # Chat session events
├── summary.py                       # Activity summaries
├── clinical_analytics_routes.py     # Clinical analytics
└── admin/
    ├── counselors.py                # Admin counselor management
    └── insights.py                  # Admin insights/analytics
```

### Existing Agents (specialized mental health AI)

```
backend/app/agents/
├── sta/                             # Safety Triage Agent
├── sca/                             # Support Coach Agent
├── sda/                             # Service Desk Agent
└── ia/                              # Insights Agent
```

### Existing CBT Modules

```
backend/app/cbt_modules/
├── __init__.py
├── base_module.py
├── cognitive_restructuring.py
├── behavioral_activation.py
└── (other CBT modules)
```

## 🔄 Migration Strategy (Gradual Approach)

Due to the size and complexity of the mental health domain, migration will be **gradual and pragmatic**:

### Phase 1: Domain Structure (Current)

- ✅ Create `domains/mental_health/` directory
- ✅ Create `__init__.py` with documentation
- ✅ Document existing structure

### Phase 2: Create Subdomain Organization (Future)

```
backend/app/domains/mental_health/
├── __init__.py                      # Domain exports
├── README.md                        # This file
├── auth/                            # Authentication subdomain
│   ├── __init__.py
│   ├── routes.py                    # Auth endpoints
│   └── services.py                  # Auth business logic
├── chat/                            # Chat subdomain
│   ├── __init__.py
│   ├── routes.py                    # Chat endpoints
│   └── services.py                  # Chat logic
├── cbt/                             # CBT subdomain
│   ├── __init__.py
│   ├── routes.py                    # CBT module endpoints
│   ├── modules/                     # Individual CBT modules
│   └── services.py                  # CBT logic
├── agents/                          # Agents subdomain
│   ├── __init__.py
│   ├── routes.py                    # Agent endpoints
│   ├── sta/                         # Safety Triage Agent
│   ├── sca/                         # Support Coach Agent
│   ├── sda/                         # Service Desk Agent
│   └── ia/                          # Insights Agent
├── clinical/                        # Clinical operations subdomain
│   ├── __init__.py
│   ├── routes.py                    # Clinical endpoints
│   ├── interventions.py             # Intervention plans
│   ├── appointments.py              # Appointment management
│   └── counselor.py                 # Counselor operations
├── wellness/                        # Wellness tracking subdomain
│   ├── __init__.py
│   ├── routes.py                    # Wellness endpoints
│   ├── journal.py                   # Journal management
│   ├── quests.py                    # Quest/gamification
│   └── summaries.py                 # Activity summaries
└── assessment/                      # Assessment subdomain
    ├── __init__.py
    ├── routes.py                    # Assessment endpoints
    ├── surveys.py                   # Mental health surveys
    └── feedback.py                  # User feedback
```

### Phase 3: Gradual Migration (Recommended Approach)

Instead of moving everything at once, migrate incrementally:

1. **Start with least coupled** (e.g., feedback, quests)
2. **Then core services** (e.g., chat, CBT modules)
3. **Finally complex dependencies** (e.g., agents with graph orchestration)

## 🚦 Why Gradual Migration?

### Reasons for NOT migrating everything now

1. **Complexity**: Mental health domain has 20+ route files with intricate dependencies
2. **Agent Integration**: Agents are already organized in `app/agents/` with routers
3. **Testing Impact**: Moving everything would require extensive testing
4. **Risk**: High risk of breaking existing functionality
5. **CBT Modules**: Already well-organized in `app/cbt_modules/`
6. **Production Impact**: System is currently working in production

### Benefits of Gradual Approach

1. **Lower Risk**: Test each migration step
2. **Maintain Stability**: Keep production running smoothly
3. **Learn & Adapt**: Refine approach based on early migrations
4. **Parallel Work**: Team can work on other features while migrating
5. **Rollback Friendly**: Easy to revert if issues arise

## 📋 Current Status

### Step 3 (Mental Health Domain) Status: **STRUCTURED**

**What Was Done**:

- ✅ Created `domains/mental_health/` directory
- ✅ Created `__init__.py` with documentation
- ✅ Created comprehensive README.md
- ✅ Documented existing structure
- ✅ Defined migration strategy

**What Was NOT Done (Intentionally)**:

- ❌ Did not move existing routes
- ❌ Did not create new routes files
- ❌ Did not update imports in main.py
- ❌ Did not restructure agents

**Reason**: Feature/Domain-based architecture doesn't require everything to be in `domains/` immediately. The existing structure is functional, and gradual migration is the pragmatic approach for production systems.

## 🎯 Next Steps (For Future Work)

### When to Start Migration

- When you have dedicated time for testing
- When production traffic is lower
- When you need to add new mental health features
- When technical debt cleanup is prioritized

### Suggested First Migration Targets

1. **Feedback Module** (`routes/feedback.py`)
   - Small, self-contained
   - Low coupling with other modules
   - Easy to test

2. **Quests Module** (`routes/quests.py`)
   - Gamification feature
   - Relatively independent
   - Good test case for migration pattern

3. **Journal Module** (`routes/journal.py` + `routes/journal_prompts.py`)
   - Wellness feature
   - Moderate complexity
   - Important for users

### Migration Template

```python
# backend/app/domains/mental_health/wellness/routes.py
from fastapi import APIRouter, Depends
from app.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()

# Migrate endpoints from app/routes/journal.py
@router.get("/journals")
async def list_journals(current_user: User = Depends(get_current_active_user)):
    ...

# Then update main.py:
# from app.domains.mental_health.wellness.routes import router as wellness_router
# app.include_router(wellness_router, prefix="/api/v1/wellness", tags=["Wellness"])
```

## 🔗 Related Domains

### Clear Domain Boundaries

- **Finance Domain** (`domains/finance/`): Revenue, transactions, financial reports
- **Blockchain Domain** (`domains/blockchain/`): Smart contracts, token operations
- **Mental Health Domain** (`domains/mental_health/`): All therapeutic and wellness services

### Shared Infrastructure

- **Models** (`app/models/`): Shared database models (User, Session, Message, etc.)
- **Core** (`app/core/`): Shared utilities (auth, memory, llm)
- **Middleware** (`app/middleware/`): Request/response processing
- **Database** (`app/database/`): Database connection and session management

## 📊 Domain Metrics

### Mental Health Domain Size

- **Route Files**: ~20 files
- **Agent Files**: ~40 files (across 4 agent types)
- **CBT Modules**: ~15 files
- **Models**: ~20 models (User, Message, Session, Intervention, etc.)
- **Total LOC**: ~15,000+ lines

### Complexity

- **High**: Agent orchestration with LangGraph
- **Medium**: CBT module execution and state management
- **Low**: Simple CRUD operations (journals, feedback)

## 🔐 Security Considerations

All mental health endpoints require:

1. **Authentication**: Valid JWT token
2. **Privacy**: PII redaction in logs
3. **Consent**: User consent for data processing
4. **Clinical Safety**: Crisis detection and intervention
5. **Audit Trail**: All therapeutic interactions logged

## 📚 Related Documentation

- **Agents**: `backend/app/agents/README.md`
- **CBT Modules**: `backend/app/cbt_modules/README.md`
- **Safety Agents**: `docs/refactor_plan.md`
- **Mental Health AI Guidelines**: `docs/mental-health-ai-guidelines.md`
- **Architecture**: `PROJECT_SINGLE_SOURCE_OF_TRUTH.md`

---

**Last Updated**: October 28, 2025  
**Domain Version**: 0.1.0 (Structure Only)  
**Status**: 🏗️ **Structure Created - Migration Pending**

**Recommendation**: Keep existing structure for now. Migrate incrementally as needed.
