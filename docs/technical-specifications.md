# Technical Specifications

## System Requirements

### Infrastructure Requirements

#### Backend System (FastAPI)

- **Python Version**: 3.11+
- **Memory**: Minimum 4GB RAM, Recommended 8GB
- **Storage**: 50GB+ for database and logs
- **CPU**: Multi-core processor for concurrent request handling
- **Network**: Stable internet connection for LLM API calls

#### Database (PostgreSQL)

- **Version**: PostgreSQL 16+
- **Storage**: SSD recommended for optimal performance
- **Backup**: Automated daily backups with point-in-time recovery
- **Replication**: Master-slave setup for production environments

#### Orchestration (n8n)

- **Self-hosted Instance**: Required for custom workflow management
- **Integration APIs**: Access to email services, database connections
- **Scheduling**: Cron-based execution for Analytics Agent
- **Monitoring**: Workflow execution logging and error tracking

#### Frontend (Next.js)

- **Node.js Version**: 18+
- **Memory**: 2GB RAM minimum
- **Browser Support**: Modern browsers with JavaScript enabled
- **SSL/TLS**: HTTPS required for production deployment

### External Service Dependencies

#### LLM Providers

1. **Google Gemini 2.0 Flash**
   - API Key management
   - Rate limiting: 60 requests/minute (free tier)
   - Fallback strategy implementation
   - Cost monitoring and optimization

2. **Self-hosted Gemma (INA17)**
   - Bearer token authentication
   - Rate limiting: 100 requests/minute
   - Endpoint availability monitoring
   - Performance benchmarking

#### Authentication Services

- **Google OAuth 2.0**: For student authentication
- **JWT Token Management**: Secure session handling
- **Multi-factor Authentication**: Planned for admin accounts

## Data Architecture

### Database Schema Design

#### Core Tables

```sql
-- Users and Authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    username VARCHAR(100),
    role VARCHAR(50) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    preferences JSONB,
    is_active BOOLEAN DEFAULT true
);

-- Conversation Management
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    metadata JSONB
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(50), -- 'text', 'system', 'intervention'
    metadata JSONB
);

-- Journal System
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255),
    content TEXT NOT NULL,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags TEXT[],
    is_private BOOLEAN DEFAULT true,
    ai_analysis JSONB
);

-- Agent System Tables
CREATE TABLE analytics_reports (
    id SERIAL PRIMARY KEY,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_period VARCHAR(50), -- 'weekly', 'monthly', etc.
    insights JSONB NOT NULL,
    trends JSONB,
    recommendations JSONB,
    triggered_interventions INTEGER[]
);

CREATE TABLE intervention_campaigns (
    id SERIAL PRIMARY KEY,
    triggered_by_report_id INTEGER REFERENCES analytics_reports(id),
    campaign_name VARCHAR(255),
    campaign_type VARCHAR(100),
    target_criteria JSONB,
    content JSONB,
    scheduled_at TIMESTAMP,
    executed_at TIMESTAMP,
    status VARCHAR(50), -- 'scheduled', 'executing', 'completed', 'failed'
    metrics JSONB
);

CREATE TABLE triage_logs (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    message_id INTEGER REFERENCES messages(id),
    classification VARCHAR(50), -- 'low', 'medium', 'high', 'crisis'
    confidence_score FLOAT,
    detected_keywords TEXT[],
    recommended_actions JSONB,
    escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Indexing Strategy

```sql
-- Performance optimization indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at);
CREATE INDEX idx_triage_logs_classification ON triage_logs(classification);
CREATE INDEX idx_analytics_reports_generated_at ON analytics_reports(generated_at);
```

### Data Security and Privacy

#### Encryption Standards

- **Data at Rest**: AES-256 encryption for sensitive fields
- **Data in Transit**: TLS 1.3 for all API communications
- **Database Encryption**: PostgreSQL transparent data encryption
- **Backup Encryption**: Encrypted backup storage with key rotation

#### Anonymization Procedures

```python
class DataAnonymizer:
    @staticmethod
    def anonymize_conversation_data(conversations):
        """Remove personally identifiable information from conversations"""
        anonymized = []
        for conv in conversations:
            anonymized.append({
                'user_hash': hashlib.sha256(str(conv.user_id).encode()).hexdigest(),
                'content_tokens': TokenProcessor.extract_sentiment_tokens(conv.content),
                'timestamp': conv.timestamp,
                'metadata': {
                    'mood_indicators': conv.extract_mood_indicators(),
                    'topic_categories': conv.categorize_topics()
                }
            })
        return anonymized
```

## API Architecture

### RESTful API Design

#### Authentication Endpoints

```python
# Student authentication
POST /api/auth/google/login
POST /api/auth/google/callback
POST /api/auth/refresh-token
POST /api/auth/logout

# Admin authentication
POST /api/auth/admin/login
POST /api/auth/admin/logout
POST /api/auth/admin/change-password
```

#### Core Application Endpoints

```python
# Chat system
GET /api/chat/conversations
POST /api/chat/conversations
GET /api/chat/conversations/{conversation_id}
POST /api/chat/conversations/{conversation_id}/messages
DELETE /api/chat/conversations/{conversation_id}

# Journaling
GET /api/journal/entries
POST /api/journal/entries
GET /api/journal/entries/{entry_id}
PUT /api/journal/entries/{entry_id}
DELETE /api/journal/entries/{entry_id}

# User management
GET /api/users/profile
PUT /api/users/profile
GET /api/users/activity-stats
POST /api/users/feedback

# Admin endpoints
GET /api/admin/analytics/dashboard
GET /api/admin/analytics/reports
GET /api/admin/users/overview
GET /api/admin/interventions/campaigns
POST /api/admin/interventions/manual-trigger
```

#### Agent-Specific Endpoints

```python
# Analytics Agent
POST /api/agents/analytics/trigger-analysis
GET /api/agents/analytics/reports/{report_id}
GET /api/agents/analytics/trends

# Intervention Agent
POST /api/agents/intervention/create-campaign
GET /api/agents/intervention/campaigns/{campaign_id}
PUT /api/agents/intervention/campaigns/{campaign_id}/status

# Triage Agent
POST /api/agents/triage/classify-message
GET /api/agents/triage/classifications/{user_id}
GET /api/agents/triage/crisis-alerts
```

### API Security

#### Rate Limiting

```python
# Rate limiting configuration
RATE_LIMITS = {
    'chat_endpoints': '100/hour',
    'journal_endpoints': '50/hour',
    'analytics_endpoints': '20/hour',
    'admin_endpoints': '200/hour'
}

# Implementation with Redis
@limiter.limit("100/hour")
@require_auth
async def create_chat_message(request: ChatRequest):
    # Endpoint implementation
    pass
```

#### Input Validation

```python
from pydantic import BaseModel, validator

class ChatMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    
    @validator('message')
    def validate_message_length(cls, v):
        if len(v) > 5000:
            raise ValueError('Message too long')
        if len(v.strip()) == 0:
            raise ValueError('Message cannot be empty')
        return v.strip()

    @validator('message')
    def sanitize_input(cls, v):
        # Remove potentially harmful content
        return sanitize_html_input(v)
```

## Integration Specifications

### n8n Workflow Integration

#### Webhook Endpoints

```json
{
  "webhooks": {
    "analytics_trigger": {
      "url": "https://ina17.com/webhook/analytics-trigger",
      "method": "POST",
      "authentication": "bearer_token",
      "payload_schema": {
        "trigger_type": "scheduled|manual",
        "analysis_period": "weekly|monthly",
        "additional_filters": "object"
      }
    },
    "intervention_execution": {
      "url": "https://ina17.com/webhook/intervention-execute",
      "method": "POST",
      "authentication": "bearer_token",
      "payload_schema": {
        "campaign_id": "integer",
        "target_users": "array",
        "content": "object",
        "delivery_method": "email|notification|dashboard"
      }
    }
  }
}
```

#### Workflow Templates

```javascript
// Weekly Analytics Trigger Workflow
{
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "cron",
      "parameters": {
        "cronExpression": "0 9 * * 1" // Every Monday at 9 AM
      }
    },
    {
      "name": "Call Analytics API",
      "type": "http-request",
      "parameters": {
        "url": "{{process.env.BACKEND_URL}}/api/agents/analytics/trigger-analysis",
        "method": "POST",
        "authentication": "bearer_token"
      }
    },
    {
      "name": "Process Results",
      "type": "function",
      "parameters": {
        "code": "// Process analytics results and trigger interventions"
      }
    }
  ]
}
```

### LLM Provider Integration

#### Provider Router Implementation

```python
class LLMRouter:
    def __init__(self):
        self.providers = {
            'gemini': GeminiProvider(),
            'gemma': GemmaProvider()
        }
        self.fallback_chain = ['gemma', 'gemini']
    
    async def generate_response(self, request: ChatRequest) -> str:
        # Select provider based on request characteristics
        provider = self.select_provider(request)
        
        try:
            return await self.providers[provider].generate(request)
        except Exception as e:
            # Fallback to next available provider
            return await self.handle_fallback(request, e)
    
    def select_provider(self, request: ChatRequest) -> str:
        # Decision logic based on:
        # - Request complexity
        # - User tier
        # - Provider availability
        # - Cost optimization
        
        if request.is_crisis_situation():
            return 'gemini'  # Use more capable model for crisis
        elif request.is_simple_query():
            return 'gemma'   # Use cost-effective model for simple queries
        else:
            return self.get_best_available_provider()
```

## Deployment Architecture

### Development Environment

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/ugm_aicare
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
  
  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=ugm_aicare
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  postgres_data:
  n8n_data:
```

### Production Deployment

#### Environment Configuration

```bash
# Production environment variables
DATABASE_URL=postgresql://prod_user:secure_password@prod_db:5432/ugm_aicare_prod
REDIS_URL=redis://prod_redis:6379
GOOGLE_GENAI_API_KEY=your_secure_api_key
GEMMA_API_KEY=your_secure_api_key
JWT_SECRET_KEY=your_super_secure_jwt_secret
ADMIN_EMAIL=admin@ugm.ac.id
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=your_email@ugm.ac.id
EMAIL_PASSWORD=your_app_password
```

#### Monitoring and Logging

```python
# Logging configuration
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'detailed': {
            'format': '%(asctime)s %(name)s:%(lineno)d %(levelname)s %(message)s'
        }
    },
    'handlers': {
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/ugm_aicare.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'detailed'
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'detailed'
        }
    },
    'loggers': {
        'ugm_aicare': {
            'handlers': ['file', 'console'],
            'level': 'INFO'
        }
    }
}
```

---

*This technical specification provides the foundation for implementing the UGM-AICare three-agent framework with robust security, scalability, and maintainability.*
