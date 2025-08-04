# API Integration Reference

## Internal Service Communication

### Frontend → Backend

```typescript
// Student endpoints
POST   /api/v1/chat              // AI chat interaction
GET    /api/v1/profile           // User profile
POST   /api/v1/journal           // Create journal entry
GET    /api/v1/resources         // Mental health resources
POST   /api/v1/appointments      // Book appointment

// Admin endpoints
GET    /api/v1/admin/analytics   // Dashboard data
GET    /api/v1/admin/users       // User management
POST   /api/v1/admin/reports     // Generate reports
GET    /api/v1/admin/alerts      // Intervention alerts
```

### Backend → AI Services

```python
# Gemma Integration
POST https://ina17.com/api/gemma/chat
Headers: 
  Authorization: Bearer {GEMMA_API_KEY}
Body:
  {
    "messages": [...],
    "temperature": 0.7,
    "max_tokens": 500
  }

# Gemini Integration  
POST https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-latest:generateContent
Headers:
  x-goog-api-key: {GOOGLE_GENAI_API_KEY}
```

### Backend → N8N Webhooks

```python
# Activity Tracking
POST https://ina17.com/n8n-webhook/activity
Body: {
  "user_id": "...",
  "event_type": "chat|journal|login",
  "timestamp": "...",
  "metadata": {}
}

# Crisis Detection
POST https://ina17.com/n8n-webhook/crisis
Body: {
  "user_id": "...",
  "severity": "low|medium|high",
  "keywords": [...],
  "context": "..."
}
```

## LangChain Agent Integration

### Agent Configuration

```python
from langchain.agents import initialize_agent
from langchain.tools import Tool

tools = [
    Tool(
        name="MentalHealthResources",
        func=search_resources,
        description="Search mental health resources"
    ),
    Tool(
        name="AppointmentScheduler",
        func=check_availability,
        description="Check counselor availability"
    )
]

agent = initialize_agent(
    tools=tools,
    llm=gemini_llm,
    agent="zero-shot-react-description",
    memory=redis_memory
)
```

## Authentication Flow

### Students (Google OAuth)

1. Frontend redirects to Google OAuth
2. Google returns to callback URL
3. Backend validates and syncs user
4. JWT token issued for session

### Admins (Credentials)

1. Username/password to `/api/auth/admin/login`
2. Backend validates against database
3. JWT token with admin role issued
4. Additional permissions checked per request
