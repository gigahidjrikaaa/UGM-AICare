# UGM-AICare AI Coding Agent Instructions

## Overview
UGM-AICare is a sophisticated mental health AI platform that provides personalized cognitive behavioral therapy (CBT) through an AI companion named "Aika". This is an enterprise-grade application with complex therapeutic modules, multi-provider LLM integration, and comprehensive user management.

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15+ with TypeScript, Tailwind CSS 4, Framer Motion, NextAuth.js
- **Backend**: FastAPI with Python 3.9+, SQLAlchemy 2+, Alembic migrations
- **Database**: PostgreSQL with Redis for caching and session state
- **AI Integration**: Google Generative AI SDK, Together.ai for Llama models
- **Blockchain**: Hardhat with Solidity contracts for NFT achievement system
- **Deployment**: Docker Compose with multi-service architecture

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Backend       │───▶│   Database      │
│   (Next.js)     │    │   (FastAPI)     │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────▶│     Redis       │◀─────────────┘
                        │   (Sessions)    │
                        └─────────────────┘
```

## Critical Domain Knowledge

### Mental Health & Therapeutic Context
- **Primary Purpose**: AI-powered mental health companion providing CBT-based therapy
- **Target Users**: Indonesian university students (UGM) requiring mental health support
- **Regulatory Considerations**: Handle sensitive mental health data with extreme care
- **Privacy Requirements**: All user conversations are confidential and must remain secure

### CBT Module System (Core Feature)
The application's most sophisticated feature is the guided CBT module system located in `backend/app/cbt_modules/`:

#### Module Architecture
```python
# Core CBT modules with step-based progression:
- cognitive_restructuring_module.py  # Challenge negative thoughts
- problem_solving_module.py         # Structured problem resolution
- express_feelings_module.py        # Emotional expression guidance  
- deal_with_guilt_module.py        # Guilt processing therapy
```

#### Module Pattern
```python
class CBTModule:
    async def get_step_prompt(self, step: int, state: Dict) -> str:
        """Generate dynamic prompts based on user progress"""
    
    async def process_response(self, user_input: str, step: int, state: Dict) -> ProcessingResult:
        """Process user responses and determine next actions"""
    
    async def should_complete(self, state: Dict) -> bool:
        """Determine if module should complete based on progress"""
```

#### State Management
- **Redis Integration**: Module state persisted in Redis with keys like `module_state:{user_id}:{session_id}`
- **Step Progression**: Each module tracks current step, collected responses, and completion status
- **Dynamic Routing**: Chat system routes to appropriate module based on user needs and state

## Authentication & Security

### NextAuth.js Implementation
- **Primary Auth**: Google OAuth with UGM email domain restriction (`@ugm.ac.id`) at `/signin-ugm`
- **Regular Auth**: Email/password authentication for general users at `/signin`
- **Admin Auth**: Separate credentials provider for admin dashboard access
- **Token Management**: JWT tokens with backend synchronization via `/internal/sync-user`
- **Session Persistence**: 24-hour sessions with automatic refresh

### Security Patterns
```typescript
// Frontend auth flow
useSession() → NextAuth → Backend sync → Database user creation/update

// Backend protection
@router.get("/protected", dependencies=[Depends(get_current_active_user)])

// Role-based access
if (session?.user?.role === "admin") { /* admin logic */ }

// Multiple authentication providers
- "google": UGM students via Google OAuth
- "credentials": Regular users via email/password
- "admin-login": Admin users via credentials
```

### Authentication Routes
- `/signin` - Regular email/password authentication
- `/signin-ugm` - UGM students Google OAuth
- `/signup` - New user registration
- `/forgot-password` - Password reset flow
- `/admin` - Admin login page

## Development Patterns

### Frontend Development
- **File Structure**: App Router with grouped routes `(main)`, `(admin)`, `(protected)`
- **State Management**: React hooks with custom `useChat` for complex chat state
- **Error Handling**: Toast notifications via `react-hot-toast` with user-friendly messages
- **Loading States**: Comprehensive loading indicators and skeleton components
- **Responsive Design**: Mobile-first with Tailwind CSS breakpoints

### Backend Development
- **Route Organization**: Feature-based routing in `app/routes/` (chat.py, auth.py, internal.py)
- **Database Patterns**: SQLAlchemy models with Alembic migrations
- **LLM Integration**: Multi-provider abstraction in `core/llm.py` supporting Google Gemini and Together.ai
- **Memory Management**: Conversation history and context management via Redis
- **Background Tasks**: FastAPI BackgroundTasks for async operations

### Database Schema Essentials
```sql
-- Core user table
users: id, google_sub, email, wallet_address, allow_email_checkins, role

-- Chat history
chat_messages: id, user_id, session_id, conversation_id, role, content, timestamp

-- Module state (stored in Redis)
module_state:{user_id}:{session_id} → JSON state object
```

## Key Workflows

### Chat Flow with Guided Therapy
1. **Message Receipt**: `frontend/hooks/useChat.tsx` → `backend/routes/chat.py`
2. **Context Building**: Retrieve conversation history and module state from Redis
3. **Module Detection**: Determine if user needs guided therapy vs. general chat
4. **Response Generation**: Route through appropriate CBT module or general LLM
5. **State Update**: Persist updated module state and conversation history
6. **Response Delivery**: Stream response with typing indicators and delays

### Module Completion & Progression
```python
# Module completion logic
if await module.should_complete(module_state):
    # Complete current module
    await complete_module(module_state)
    # Suggest next module or return to general chat
    response = await suggest_next_steps(user_context)
```

### User Journey Integration
- **Onboarding**: Profile setup with mental health preferences
- **Chat Interface**: Primary therapeutic interaction with Aika
- **Progress Tracking**: Activity streaks and completion badges via blockchain NFTs
- **Admin Dashboard**: Therapist oversight and user management

## Code Quality Standards

### TypeScript/React Standards
- **Strict Types**: Use TypeScript strict mode with proper type definitions
- **Component Architecture**: Functional components with hooks, avoid class components
- **Error Boundaries**: Wrap components with error handling for graceful failures
- **Accessibility**: ARIA labels, keyboard navigation, screen reader compatibility
- **Performance**: Use React.memo, useMemo, and useCallback for optimization

### Python/FastAPI Standards
- **Type Hints**: Full type annotations for all functions and classes
- **Error Handling**: Structured HTTP exceptions with user-friendly messages
- **Async/Await**: Use async patterns for all I/O operations
- **Input Validation**: Pydantic models for request validation
- **Logging**: Structured logging for debugging and monitoring

### Environment & Configuration
- **Environment Variables**: Never hardcode secrets, use `.env` files
- **Docker Integration**: All services containerized with health checks
- **Database Migrations**: Use Alembic for schema changes
- **API Keys**: Secure handling of LLM provider keys and internal API keys

## Testing Considerations

### Frontend Testing
- **Component Testing**: Test chat interactions and module progressions
- **Auth Testing**: Verify Google OAuth flow and admin access
- **Error States**: Test network failures and invalid responses
- **Accessibility**: Screen reader and keyboard navigation testing

### Backend Testing
- **API Testing**: Test all endpoints with proper authentication
- **Module Testing**: Verify CBT module step progressions and state transitions
- **Integration Testing**: Test LLM provider failover and response handling
- **Database Testing**: Test user creation, conversation storage, and state persistence

## Deployment & Operations

### Development Environment
```bash
# Start all services
docker-compose up -d

# Services available:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Database: postgresql://localhost:5432
# Redis: redis://localhost:6379
```

### Production Considerations
- **Health Checks**: All containers have health check endpoints
- **Scaling**: Redis for session state allows horizontal scaling
- **Monitoring**: Structured logging for application monitoring
- **Backups**: Database backup strategy for user data protection

## Mental Health AI Best Practices

### Therapeutic Interaction Guidelines
- **Empathetic Responses**: Always maintain supportive, non-judgmental tone
- **Crisis Detection**: Monitor for crisis indicators and provide appropriate resources
- **Boundary Setting**: Clearly communicate AI limitations and encourage professional help
- **Cultural Sensitivity**: Consider Indonesian cultural context in responses

### Privacy & Ethics
- **Data Minimization**: Collect only necessary therapeutic data
- **Consent Management**: Clear consent for data usage and storage
- **Confidentiality**: Never log or expose sensitive therapeutic content
- **Professional Standards**: Align with mental health professional guidelines

## Common Integration Points

### Adding New CBT Modules
1. Create module class in `backend/app/cbt_modules/new_module.py`
2. Implement required methods: `get_step_prompt`, `process_response`, `should_complete`
3. Register module in chat routing logic
4. Add module completion tracking
5. Update frontend to handle new module states

### LLM Provider Integration
1. Add provider configuration in `backend/app/core/llm.py`
2. Implement provider-specific response handling
3. Update environment variables for API keys
4. Test provider failover scenarios

### Authentication Extensions
1. Update NextAuth configuration in `frontend/src/lib/auth.ts`
2. Modify JWT callback for additional user properties
3. Update backend user sync in `backend/app/routes/internal.py`
4. Test authentication flow end-to-end

This platform represents sophisticated therapeutic AI with complex state management, multi-provider integrations, and comprehensive user journeys. Always prioritize user safety, data privacy, and therapeutic effectiveness when making changes.
