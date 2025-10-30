# 🚀 AIKA META-AGENT - PHASE 3 IMPLEMENTATION PLAN

**Phase**: Frontend Integration  
**Status**: Ready to Start  
**Prerequisites**: ✅ Phase 1 & 2 Complete

---

## Overview

Phase 3 brings Aika to life in the user interface. Students, admins, and counselors will interact with the unified Meta-Agent through their respective interfaces. This phase focuses on:

1. **Chat Interface Updates** - Replace direct agent calls with Aika orchestration
2. **Aika Branding** - Unified personality across all touchpoints
3. **Admin Command Center** - Natural language admin operations
4. **Counselor Dashboard** - Real-time case management

---

## Phase 3 Milestones

### Milestone 1: Chat Interface (Week 1)
**Goal**: Students can chat with Aika instead of individual agents

**Tasks**:
- [ ] Update chat API calls to use `/api/v1/aika`
- [ ] Display "Powered by Aika 💙" branding
- [ ] Show agent activity indicators
- [ ] Display risk level badges
- [ ] Implement escalation notifications

### Milestone 2: Admin Dashboard (Week 2)
**Goal**: Admins can issue natural language commands

**Tasks**:
- [ ] Create admin command center UI
- [ ] Natural language input field
- [ ] System analytics display
- [ ] Action confirmation modals
- [ ] Command history log

### Milestone 3: Counselor Dashboard (Week 3)
**Goal**: Counselors see real-time case assignments

**Tasks**:
- [ ] Integrate case list with Aika
- [ ] Real-time case updates
- [ ] Severity filtering
- [ ] Case timeline visualization
- [ ] Quick action buttons

### Milestone 4: Polish & Testing (Week 4)
**Goal**: Production-ready user experience

**Tasks**:
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] UI/UX refinements
- [ ] Documentation updates
- [ ] User acceptance testing

---

## Technical Requirements

### Frontend Stack
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- React Hook Form + Zod validation
- React Hot Toast (notifications)

### API Integration
- Endpoint: `POST /api/v1/aika`
- Authentication: JWT in headers
- Request/Response format (see below)

### State Management
- Custom React hooks (`useChat`, `useCases`)
- No global state library needed
- Server state via React Query (optional)

---

## API Contract

### Request Format
```typescript
interface AikaRequest {
  user_id: number;
  role: "student" | "admin" | "counselor";
  message: string;
  conversation_history?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
  }>;
}
```

### Response Format
```typescript
interface AikaResponse {
  success: boolean;
  response: string;
  metadata: {
    session_id: string;
    user_role: "student" | "admin" | "counselor";
    intent: string;
    agents_invoked: string[];  // e.g., ["STA", "SCA"]
    actions_taken: string[];   // e.g., ["assess_risk", "provide_cbt_support"]
    agents_involved: string[]; // Same as agents_invoked
    processing_time_ms: number;
    risk_assessment?: {
      risk_level: "low" | "moderate" | "high" | "critical";
      risk_score: number;
      confidence: number;
      risk_factors: string[];
    };
    escalation_triggered: boolean;
    case_id?: string;  // If case created
  };
  error?: string;
}
```

---

## Implementation Details

### 1. Chat Interface Updates

#### File: `frontend/src/app/(main)/chat/page.tsx`

**Changes Needed**:
1. Replace agent-specific API calls with single Aika endpoint
2. Update message rendering to show agent activity
3. Add risk level indicators
4. Show escalation notifications

**Example Code**:
```typescript
const sendMessage = async (message: string) => {
  const response = await fetch('/api/v1/aika', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: currentUser.id,
      role: 'student',
      message,
      conversation_history: messages.slice(-10), // Last 10 messages
    }),
  });
  
  const data: AikaResponse = await response.json();
  
  // Show agent activity
  if (data.metadata.agents_invoked.length > 1) {
    toast.info(`Aika consulted: ${data.metadata.agents_invoked.join(', ')}`);
  }
  
  // Show risk assessment
  if (data.metadata.risk_assessment?.risk_level === 'high') {
    toast.warning('⚠️ Your safety is important. Consider reaching out to support.');
  }
  
  // Show escalation
  if (data.metadata.escalation_triggered) {
    toast.success('✅ Your case has been escalated to professional support.');
  }
  
  return data.response;
};
```

#### UI Components Needed
- `<AikaAvatar />` - Unified Aika branding
- `<AgentActivityBadge />` - Shows which agents are working
- `<RiskLevelIndicator />` - Visual risk assessment
- `<EscalationNotification />` - Case escalation alert

---

### 2. Admin Command Center

#### File: `frontend/src/app/(admin)/command-center/page.tsx` (NEW)

**Features**:
- Natural language command input
- Command history
- System analytics display
- Action confirmation modals
- Real-time status updates

**Example UI**:
```typescript
const AdminCommandCenter = () => {
  const [command, setCommand] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const sendCommand = async () => {
    setProcessing(true);
    const response = await fetch('/api/v1/aika', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        user_id: currentAdmin.id,
        role: 'admin',
        message: command,
        conversation_history: [],
      }),
    });
    
    const data: AikaResponse = await response.json();
    
    // Show confirmation if action needed
    if (data.metadata.actions_taken.includes('system_action')) {
      const confirmed = await confirmAction(data.response);
      if (confirmed) {
        // Send confirmation
        await sendMessage('yes, proceed');
      }
    }
    
    setProcessing(false);
  };
  
  return (
    <div className="command-center">
      <h1>Admin Command Center - Powered by Aika 💙</h1>
      
      <div className="command-input">
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Ask Aika anything: 'Show me today's crisis cases' or 'Generate weekly report'"
        />
        <button onClick={sendCommand} disabled={processing}>
          {processing ? 'Processing...' : 'Send Command'}
        </button>
      </div>
      
      <div className="analytics-display">
        {/* Analytics from Aika's IA agent */}
      </div>
    </div>
  );
};
```

#### UI Components Needed
- `<CommandInput />` - Natural language textarea
- `<CommandHistory />` - Previous commands list
- `<AnalyticsCard />` - System metrics
- `<ConfirmationModal />` - Action confirmation
- `<StatusIndicator />` - System status

---

### 3. Counselor Dashboard Updates

#### File: `frontend/src/app/(protected)/counselor/dashboard/page.tsx`

**Changes Needed**:
1. Replace case query with Aika endpoint
2. Add real-time updates
3. Show severity filtering
4. Case timeline visualization

**Example Code**:
```typescript
const CounselorDashboard = () => {
  const [cases, setCases] = useState<Case[]>([]);
  
  const fetchCases = async () => {
    const response = await fetch('/api/v1/aika', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${counselorToken}`,
      },
      body: JSON.stringify({
        user_id: currentCounselor.id,
        role: 'counselor',
        message: 'Show me my assigned cases',
        conversation_history: [],
      }),
    });
    
    const data: AikaResponse = await response.json();
    
    // Parse case data from response
    const caseData = parseCaseData(data.response);
    setCases(caseData);
  };
  
  useEffect(() => {
    fetchCases();
    
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchCases, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="counselor-dashboard">
      <h1>Case Management - Powered by Aika 💙</h1>
      
      <div className="case-filters">
        <button>Critical ({cases.filter(c => c.severity === 'critical').length})</button>
        <button>High ({cases.filter(c => c.severity === 'high').length})</button>
        <button>Medium ({cases.filter(c => c.severity === 'medium').length})</button>
        <button>Low ({cases.filter(c => c.severity === 'low').length})</button>
      </div>
      
      <div className="case-list">
        {cases.map(caseItem => (
          <CaseCard key={caseItem.id} case={caseItem} />
        ))}
      </div>
    </div>
  );
};
```

#### UI Components Needed
- `<CaseCard />` - Individual case display
- `<SeverityBadge />` - Visual severity indicator
- `<CaseTimeline />` - Case event history
- `<QuickActions />` - Assign, close, escalate buttons
- `<RealTimeIndicator />` - Shows last update time

---

## UI/UX Design Guidelines

### Aika Branding
- **Color**: Primary brand color (blue/purple)
- **Logo**: Aika avatar/icon in chat bubbles
- **Tagline**: "Powered by Aika 💙" (optional emoji)
- **Tone**: Supportive, professional, empathetic

### Visual Indicators
- **Risk Levels**:
  - Low: Green badge
  - Moderate: Yellow badge
  - High: Orange badge
  - Critical: Red badge with pulse animation
  
- **Agent Activity**:
  - Single agent: Simple response
  - Multiple agents: "Aika consulted STA + SCA" badge
  - Escalation: Special notification with action items

### Accessibility
- All indicators have text alternatives
- Color is not the only differentiator
- Keyboard navigation supported
- Screen reader friendly

---

## Testing Strategy

### Unit Tests
- Component rendering tests
- API call mocking
- State management tests

### Integration Tests
- Full chat flow (user → Aika → response)
- Admin command execution
- Counselor case retrieval

### E2E Tests
- Student crisis scenario
- Admin analytics query
- Counselor case management

### User Acceptance Testing
- Student feedback sessions
- Counselor workflow validation
- Admin command usability

---

## Performance Considerations

### Optimization Targets
- Chat response time: < 2 seconds
- Case list load: < 1 second
- Real-time updates: Every 30 seconds

### Caching Strategy
- Cache conversation history (last 10 messages)
- Cache case list (invalidate on update)
- Cache analytics (5 minute TTL)

### Bundle Size
- Lazy load admin dashboard
- Code-split counselor components
- Optimize images and assets

---

## Security Considerations

### Authentication
- JWT validation on all Aika API calls
- Role verification before rendering role-specific UI
- Token refresh before expiry

### Data Protection
- No PII in client-side logs
- Sanitize all user inputs
- Validate all API responses

### Rate Limiting
- Client-side debouncing (500ms)
- Server-side rate limits respected
- Graceful degradation on quota exceeded

---

## Rollout Plan

### Phase 3.1: Chat Interface (Week 1)
1. Day 1-2: Update API integration
2. Day 3-4: Implement UI components
3. Day 5: Testing and bug fixes

### Phase 3.2: Admin Dashboard (Week 2)
1. Day 1-2: Create command center UI
2. Day 3: Implement analytics display
3. Day 4-5: Testing and refinement

### Phase 3.3: Counselor Dashboard (Week 3)
1. Day 1-2: Update case management integration
2. Day 3: Real-time updates
3. Day 4-5: Testing and user feedback

### Phase 3.4: Polish (Week 4)
1. Day 1-2: E2E testing
2. Day 3: Performance optimization
3. Day 4: Documentation
4. Day 5: Deployment preparation

---

## Success Criteria

### Must Have
- ✅ Students can chat with Aika
- ✅ Risk assessments visible in UI
- ✅ Escalations trigger notifications
- ✅ Admins can issue natural language commands
- ✅ Counselors see assigned cases
- ✅ All role-specific features working

### Nice to Have
- Real-time WebSocket updates
- Advanced analytics visualizations
- Conversation export
- Multi-language support (Indonesian + English)

### Not in Scope (Phase 4)
- Email notifications
- SMS alerts
- Mobile app
- Voice interface

---

## Next Steps

**IMMEDIATE**: Start Milestone 1 - Chat Interface Updates

1. **Read existing chat implementation**:
   ```bash
   frontend/src/app/(main)/chat/page.tsx
   frontend/src/components/chat/
   ```

2. **Create Aika API hook**:
   ```typescript
   // frontend/src/hooks/useAika.ts
   export const useAika = () => {
     const sendMessage = async (message: string, role: string) => {
       // Call /api/v1/aika
     };
     return { sendMessage, loading, error };
   };
   ```

3. **Update chat page**:
   - Replace agent calls with `useAika()`
   - Add agent activity indicators
   - Show risk level badges

4. **Test with real conversations**:
   - Low risk: "I'm feeling stressed about exams"
   - High risk: "I don't want to live anymore"
   - Admin: "Show me today's analytics"

---

## Resources

### Documentation
- [Aika Architecture](./AIKA_META_AGENT_ARCHITECTURE.md)
- [Phase 1 Summary](./AIKA_IMPLEMENTATION_SUMMARY.md)
- [Phase 2 Completion](./AIKA_PHASE2_COMPLETE.md)
- [API Specification](./AIKA_API_SPEC.md) (to be created)

### Code References
- Backend: `backend/app/agents/aika/`
- API Endpoint: `backend/app/domains/mental_health/routes/chat.py`
- Frontend: `frontend/src/app/`

### Design Assets
- Aika logo (to be created)
- Brand colors (to be defined)
- UI mockups (to be created)

---

**Ready to Start Phase 3?** Let's bring Aika to life in the frontend! 🚀
