# Implementation Guide

## Getting Started

This guide provides step-by-step instructions for implementing the UGM-AICare three-agent framework. Follow this guide to set up the complete system from development to production.

## Prerequisites

### Development Environment Setup

#### Required Software

1. **Python 3.11+** with pip and virtual environment support
2. **Node.js 18+** with npm or yarn
3. **PostgreSQL 16+** with development tools
4. **Redis 7+** for caching and session management
5. **Docker and Docker Compose** for containerized development
6. **Git** for version control

#### Development Tools

- **Code Editor**: VS Code with Python and TypeScript extensions
- **Database Tool**: pgAdmin or DBeaver for database management
- **API Testing**: Postman or similar REST client
- **Process Manager**: PM2 for production process management

### External Service Accounts

#### Required API Keys

1. **Google Cloud Console**
   - Enable Google AI API for Gemini access
   - Create service account for OAuth authentication
   - Generate API key for Gemini 2.0 Flash

2. **INA17 Services**
   - Obtain API key for self-hosted Gemma model
   - Set up n8n workflow automation access
   - Configure webhook endpoints

3. **Email Service**
   - Gmail SMTP credentials for notification system
   - Configure app-specific passwords if using 2FA

## Phase 1: Backend Foundation

### Step 1: Project Structure Setup

```bash
# Clone the repository
git clone https://github.com/gigahidjrikaaa/UGM-AICare.git
cd UGM-AICare

# Set up Python virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Database Configuration

```bash
# Create PostgreSQL database
createdb ugm_aicare_dev

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials
```

#### Database Migration

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial database schema"

# Apply migrations
alembic upgrade head
```

### Step 3: Core API Implementation

#### Authentication System

```python
# app/core/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from google.oauth2 import id_token
from google.auth.transport import requests

class AuthManager:
    def __init__(self):
        self.security = HTTPBearer()
        self.google_client_id = os.getenv('GOOGLE_CLIENT_ID')
    
    async def verify_google_token(self, token: str):
        try:
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                self.google_client_id
            )
            return idinfo
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
```

#### LLM Integration

```python
# app/core/llm_router.py
import asyncio
from typing import Dict, Any

class LLMRouter:
    def __init__(self):
        self.providers = {
            'gemini': GeminiProvider(api_key=os.getenv('GOOGLE_GENAI_API_KEY')),
            'gemma': GemmaProvider(api_key=os.getenv('GEMMA_API_KEY'))
        }
    
    async def generate_response(self, 
                              messages: List[Dict], 
                              provider: str = None) -> str:
        if not provider:
            provider = self.select_optimal_provider(messages)
        
        try:
            return await self.providers[provider].generate(messages)
        except Exception as e:
            logger.error(f"LLM generation failed with {provider}: {e}")
            return await self.fallback_generate(messages, provider)
```

### Step 4: Agent Framework Implementation

#### Analytics Agent

```python
# app/agents/analytics_agent.py
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

class AnalyticsAgent:
    def __init__(self, db: Session):
        self.db = db
        self.analyzer = ConversationAnalyzer()
        self.report_generator = ReportGenerator()
    
    async def run_weekly_analysis(self):
        """Execute weekly analytics and generate insights"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        # Fetch conversation data
        conversations = self.fetch_conversations(start_date, end_date)
        
        # Analyze patterns
        insights = await self.analyzer.analyze_patterns(conversations)
        
        # Generate report
        report = self.report_generator.create_report(insights)
        
        # Store results
        self.store_analytics_report(report)
        
        # Trigger interventions if needed
        await self.trigger_interventions(insights)
        
        return report
```

#### Intervention Agent

```python
# app/agents/intervention_agent.py
import aiohttp
from typing import List, Dict

class InterventionAgent:
    def __init__(self):
        self.n8n_webhook_url = os.getenv('N8N_WEBHOOK_URL')
        self.campaign_manager = CampaignManager()
    
    async def execute_intervention(self, insight: Dict) -> Dict:
        """Execute intervention based on analytics insight"""
        # Determine intervention strategy
        strategy = self.determine_strategy(insight)
        
        # Create campaign
        campaign = self.campaign_manager.create_campaign(strategy, insight)
        
        # Execute via n8n workflow
        result = await self.execute_via_n8n(campaign)
        
        return result
    
    async def execute_via_n8n(self, campaign: Dict) -> Dict:
        """Send campaign to n8n for execution"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.n8n_webhook_url,
                json=campaign,
                headers={'Authorization': f'Bearer {os.getenv("N8N_API_KEY")}'}
            ) as response:
                return await response.json()
```

#### Triage Agent

```python
# app/agents/triage_agent.py
from app.core.classification import CrisisDetector, SeverityClassifier

class TriageAgent:
    def __init__(self):
        self.crisis_detector = CrisisDetector()
        self.severity_classifier = SeverityClassifier()
        self.resource_matcher = ResourceMatcher()
    
    async def classify_conversation(self, 
                                  messages: List[Dict],
                                  user_context: Dict) -> Dict:
        """Classify conversation and recommend appropriate response"""
        
        # Check for crisis indicators
        crisis_level = await self.crisis_detector.assess(messages)
        
        if crisis_level == "IMMEDIATE":
            return self.emergency_response()
        
        # Classify severity
        severity = await self.severity_classifier.classify(messages, user_context)
        
        # Match resources
        resources = self.resource_matcher.find_appropriate_resources(
            severity, user_context
        )
        
        # Log classification
        await self.log_classification(messages, severity, resources)
        
        return {
            "severity": severity,
            "resources": resources,
            "follow_up_required": severity in ["high", "crisis"],
            "escalation_needed": crisis_level != "none"
        }
```

## Phase 2: Frontend Development

### Step 1: Next.js Setup

```bash
cd frontend
npm install

# Set up environment variables
cp .env.example .env.local
# Configure API endpoints and authentication
```

### Step 2: Core Components

#### Authentication Integration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: 'ugm.ac.id' // Restrict to UGM domain
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    }
  }
}
```

#### Chat Interface

```typescript
// src/components/ChatInterface.tsx
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function ChatInterface() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const sendMessage = async (content: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({ message: content })
      })
      
      const result = await response.json()
      setMessages(prev => [...prev, result.message])
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="chat-interface">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </div>
  )
}
```

#### Admin Dashboard

```typescript
// src/components/AdminDashboard.tsx
import { useEffect, useState } from 'react'
import { AnalyticsChart } from './AnalyticsChart'
import { InterventionPanel } from './InterventionPanel'

export function AdminDashboard() {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  
  useEffect(() => {
    fetchDashboardData()
  }, [])
  
  const fetchDashboardData = async () => {
    try {
      const [analytics, interventions] = await Promise.all([
        fetch('/api/admin/analytics/dashboard').then(r => r.json()),
        fetch('/api/admin/interventions/campaigns').then(r => r.json())
      ])
      
      setAnalyticsData(analytics)
      setCampaigns(interventions)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }
  
  return (
    <div className="admin-dashboard">
      <div className="dashboard-grid">
        <AnalyticsChart data={analyticsData} />
        <InterventionPanel campaigns={campaigns} />
        <TrendAnalysis />
        <AlertsPanel />
      </div>
    </div>
  )
}
```

## Phase 3: n8n Workflow Setup

### Step 1: n8n Installation and Configuration

```bash
# Using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your_password \
  n8nio/n8n
```

### Step 2: Workflow Templates

#### Weekly Analytics Workflow

```json
{
  "name": "Weekly Analytics Trigger",
  "nodes": [
    {
      "parameters": {
        "cronExpression": "0 9 * * 1"
      },
      "name": "Every Monday 9AM",
      "type": "n8n-nodes-base.cron",
      "position": [240, 300]
    },
    {
      "parameters": {
        "url": "{{$env.BACKEND_URL}}/api/agents/analytics/trigger-analysis",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpBearerAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        }
      },
      "name": "Trigger Analytics",
      "type": "n8n-nodes-base.httpRequest",
      "position": [440, 300]
    }
  ],
  "connections": {
    "Every Monday 9AM": {
      "main": [
        [
          {
            "node": "Trigger Analytics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

#### Intervention Campaign Workflow

```json
{
  "name": "Execute Intervention Campaign",
  "nodes": [
    {
      "parameters": {},
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "webhookId": "intervention-trigger",
      "position": [240, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT email FROM users WHERE {{$json.target_criteria}}"
      },
      "name": "Get Target Users",
      "type": "n8n-nodes-base.postgres",
      "position": [440, 300]
    },
    {
      "parameters": {
        "resource": "{{$json.email}}",
        "operation": "send",
        "subject": "{{$node['Webhook'].json['content']['subject']}}",
        "emailFormat": "html",
        "message": "{{$node['Webhook'].json['content']['body']}}"
      },
      "name": "Send Email",
      "type": "n8n-nodes-base.gmail",
      "position": [640, 300]
    }
  ]
}
```

## Phase 4: Integration and Testing

### Step 1: End-to-End Testing

#### Backend API Testing

```python
# tests/test_agents.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestAnalyticsAgent:
    def test_trigger_weekly_analysis(self):
        response = client.post("/api/agents/analytics/trigger-analysis")
        assert response.status_code == 200
        assert "report_id" in response.json()
    
    def test_get_analytics_report(self):
        # Create test report first
        create_response = client.post("/api/agents/analytics/trigger-analysis")
        report_id = create_response.json()["report_id"]
        
        # Fetch report
        response = client.get(f"/api/agents/analytics/reports/{report_id}")
        assert response.status_code == 200
        assert "insights" in response.json()

class TestTriageAgent:
    def test_classify_normal_conversation(self):
        test_messages = [
            {"role": "user", "content": "I'm feeling a bit stressed about exams"},
            {"role": "assistant", "content": "I understand exam stress can be overwhelming"}
        ]
        
        response = client.post("/api/agents/triage/classify-message", json={
            "messages": test_messages,
            "user_context": {"user_id": 1}
        })
        
        assert response.status_code == 200
        result = response.json()
        assert result["severity"] in ["low", "medium", "high"]
        assert "resources" in result
    
    def test_crisis_detection(self):
        crisis_messages = [
            {"role": "user", "content": "I don't want to live anymore"}
        ]
        
        response = client.post("/api/agents/triage/classify-message", json={
            "messages": crisis_messages,
            "user_context": {"user_id": 1}
        })
        
        assert response.status_code == 200
        result = response.json()
        assert result["severity"] == "crisis"
        assert result["escalation_needed"] == True
```

#### Frontend Testing

```typescript
// __tests__/ChatInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatInterface } from '@/components/ChatInterface'
import { SessionProvider } from 'next-auth/react'

const mockSession = {
  user: { email: 'test@ugm.ac.id' },
  accessToken: 'mock-token'
}

describe('ChatInterface', () => {
  it('sends message and displays response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        message: { role: 'assistant', content: 'Test response' }
      })
    })
    
    render(
      <SessionProvider session={mockSession}>
        <ChatInterface />
      </SessionProvider>
    )
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument()
    })
  })
})
```

### Step 2: Performance Testing

#### Load Testing with k6

```javascript
// load_test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 }
  ]
}

export default function() {
  // Test chat endpoint
  let chatResponse = http.post('http://localhost:8000/api/chat/send', {
    message: 'Hello, I need help with stress management'
  }, {
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    }
  })
  
  check(chatResponse, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000
  })
  
  sleep(1)
}
```

## Phase 5: Production Deployment

### Step 1: Environment Setup

#### Production Docker Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
  
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
    depends_on:
      - backend
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

### Step 2: Monitoring and Alerting

#### Application Monitoring

```python
# app/monitoring.py
import time
import psutil
from prometheus_client import Counter, Histogram, Gauge

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ACTIVE_USERS = Gauge('active_users_total', 'Number of active users')

class MonitoringMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = time.time()
            
            # Process request
            await self.app(scope, receive, send)
            
            # Record metrics
            duration = time.time() - start_time
            REQUEST_DURATION.observe(duration)
            REQUEST_COUNT.labels(
                method=scope["method"],
                endpoint=scope["path"]
            ).inc()
```

#### Health Checks

```python
# app/health.py
from fastapi import APIRouter
from sqlalchemy import text
import redis

router = APIRouter()

@router.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Database check
    try:
        db.execute(text("SELECT 1"))
        status["services"]["database"] = "healthy"
    except Exception as e:
        status["services"]["database"] = f"unhealthy: {str(e)}"
        status["status"] = "unhealthy"
    
    # Redis check
    try:
        redis_client.ping()
        status["services"]["redis"] = "healthy"
    except Exception as e:
        status["services"]["redis"] = f"unhealthy: {str(e)}"
        status["status"] = "unhealthy"
    
    return status
```

### Step 3: Backup and Recovery

#### Database Backup Strategy

```bash
#!/bin/bash
# backup_database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgresql"
BACKUP_FILE="ugm_aicare_backup_$DATE.sql"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d ugm_aicare > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" s3://ugm-aicare-backups/
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Database Connection Issues

```python
# Troubleshooting database connections
import logging

logger = logging.getLogger(__name__)

async def test_database_connection():
    try:
        # Test basic connection
        result = await db.execute(text("SELECT version()"))
        logger.info(f"Database connection successful: {result.scalar()}")
        
        # Test agent-specific tables
        analytics_count = await db.execute(text("SELECT COUNT(*) FROM analytics_reports"))
        logger.info(f"Analytics reports count: {analytics_count.scalar()}")
        
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
```

#### LLM Provider Issues

```python
# LLM provider fallback handling
class LLMProvider:
    async def generate_with_retry(self, messages, max_retries=3):
        for attempt in range(max_retries):
            try:
                return await self.generate(messages)
            except Exception as e:
                logger.warning(f"LLM generation attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    # Use fallback response
                    return self.get_fallback_response()
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

### Performance Optimization

#### Database Query Optimization

```sql
-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_messages_user_timestamp 
ON messages(user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_triage_logs_classification_timestamp 
ON triage_logs(classification, created_at);

-- Optimize analytics queries
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT 
    user_id,
    DATE(created_at) as activity_date,
    COUNT(*) as message_count,
    AVG(CASE WHEN role = 'user' THEN LENGTH(content) END) as avg_message_length
FROM messages
GROUP BY user_id, DATE(created_at);

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_user_activity_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
END;
$$ LANGUAGE plpgsql;
```

#### Caching Strategy

```python
# Redis caching for frequent queries
import redis
import json
from functools import wraps

redis_client = redis.Redis.from_url(os.getenv('REDIS_URL'))

def cache_result(expiry=3600):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            redis_client.setex(cache_key, expiry, json.dumps(result))
            
            return result
        return wrapper
    return decorator
```

---

*This implementation guide provides a comprehensive roadmap for building and deploying the UGM-AICare three-agent framework. Follow each phase systematically to ensure a robust and scalable mental health support system.*
