# Aika Activity Logging - Real-Time Agent Monitoring

## Overview

The Activity Logging system provides real-time visibility into what Aika's agents are doing during message processing. This helps with:

- **Debugging**: See exactly which agents are invoked and what they're doing
- **Monitoring**: Track agent performance and execution paths
- **User Experience**: Show users what's happening behind the scenes
- **Development**: Understand agent workflows and identify bottlenecks

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Aika Orchestrator                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Activity Logger                          │  │
│  │  - Captures agent activities                          │  │
│  │  - Broadcasts via callback                            │  │
│  │  - Stores activity history                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ↓                                  │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │  STA   │  │  SCA   │  │  SDA   │  │   IA   │           │
│  │ Agent  │  │ Agent  │  │ Agent  │  │ Agent  │           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ↓                    ↓                    ↓
    WebSocket API      REST API Response    Activity Logs
```

## Activity Event Types

| Event Type | Description | Example |
|------------|-------------|---------|
| `agent_start` | Agent begins execution | "STA: Analyzing message for safety concerns" |
| `agent_complete` | Agent finishes execution | "STA: Risk assessment complete: low" |
| `agent_error` | Agent encounters error | "SCA: Coaching generation failed" |
| `node_start` | LangGraph node starts | "STA: Executing node: assess_risk" |
| `node_complete` | LangGraph node completes | "STA: Node complete: assess_risk" |
| `routing_decision` | Orchestrator makes routing decision | "Routing decision: student_coaching" |
| `risk_assessment` | STA completes risk assessment | "Risk assessed: high (score: 0.85)" |
| `intervention_created` | SCA creates intervention plan | "Intervention plan created: CBT" |
| `case_created` | SDA creates crisis case | "Crisis case created: #123 (SLA: 2h)" |
| `llm_call` | Agent calls LLM | "LLM call: Risk classification" |
| `info` | General information | "Processing message from user" |
| `warning` | Warning message | "Case creation failed, using fallback" |

## Usage

### 1. REST API (Get activity logs after processing)

```python
from app.agents.aika.orchestrator import AikaOrchestrator

# Create orchestrator
orchestrator = AikaOrchestrator(db)

# Process message
result = await orchestrator.process_message(
    user_id=1,
    user_role="user",
    message="I'm feeling stressed",
)

# Activity logs are included in response
activity_logs = result["activity_logs"]

for activity in activity_logs:
    print(f"[{activity['agent']}] {activity['message']}")
    # Output: [STA] Analyzing message for safety concerns
    #         [STA] Risk assessment complete: low
    #         [SCA] Generating personalized support
    #         [SCA] Coaching response generated
```

### 2. WebSocket (Real-time streaming)

```python
from app.agents.aika.orchestrator import AikaOrchestrator

# Create orchestrator
orchestrator = AikaOrchestrator(db)

# Set callback to send to WebSocket
async def send_to_websocket(activity_data):
    await websocket.send_json(activity_data)

orchestrator.set_activity_callback(send_to_websocket)

# Process message - activities will be broadcast in real-time
result = await orchestrator.process_message(
    user_id=1,
    user_role="user",
    message="I'm feeling stressed",
)
```

### 3. Custom Callback

```python
# Store activities in database
async def store_activity(activity_data):
    event = activity_data["data"]
    await db.execute(
        insert(ActivityLog).values(
            timestamp=event["timestamp"],
            agent=event["agent"],
            message=event["message"],
            details=event["details"],
        )
    )

orchestrator.set_activity_callback(store_activity)
```

## Frontend Integration

### Display Activity Log Panel

```typescript
// React component for activity log
interface ActivityLogProps {
  activities: Activity[];
}

function ActivityLogPanel({ activities }: ActivityLogProps) {
  return (
    <div className="activity-log-panel">
      <h3>Agent Activity</h3>
      {activities.map((activity, index) => (
        <div key={index} className={`activity-item ${activity.activity_type}`}>
          <div className="activity-header">
            <span className="agent-badge">{activity.agent}</span>
            <span className="timestamp">{activity.timestamp}</span>
          </div>
          <div className="activity-message">{activity.message}</div>
          {activity.duration_ms && (
            <div className="activity-duration">{activity.duration_ms}ms</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### WebSocket Integration

```typescript
// Connect to WebSocket and listen for activities
const ws = new WebSocket('ws://localhost:8000/chat/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'activity_log') {
    const activity = data.data;
    setActivities(prev => [...prev, activity]);
  }
};
```

## Example Activity Flow

### Student with Low Risk
```
[Aika] Processing message from user
[STA] Analyzing message for safety concerns
[STA] Executing node: apply_redaction (15ms)
[STA] Executing node: assess_risk (234ms)
[STA] Risk assessed: low (score: 0.15)
[STA] Risk assessment complete (249ms)
[SCA] Generating personalized support
[SCA] Executing node: determine_intervention_type (45ms)
[SCA] Executing node: generate_plan (312ms)
[SCA] Intervention plan created: #456 (type: mindfulness)
[SCA] Coaching response generated (357ms)
```

### Crisis Escalation
```
[Aika] Processing message from user
[STA] Analyzing message for safety concerns
[STA] Executing node: apply_redaction (12ms)
[STA] Executing node: assess_risk (289ms)
[STA] Risk assessed: critical (score: 0.92)
[STA] Risk assessment complete (301ms)
[SDA] Creating crisis case and assigning counselor
[SDA] Executing node: create_case (56ms)
[SDA] Executing node: calculate_sla (12ms)
[SDA] Executing node: auto_assign (34ms)
[SDA] Crisis case created: #789 (SLA: 2h)
[SDA] Executing node: notify_counsellor (23ms)
[SDA] Crisis escalation complete (125ms)
```

## Configuration

### Enable/Disable Activity Logging

```python
# Disable for production (performance)
if settings.ENVIRONMENT == "production":
    orchestrator.activity_logger.callback = None

# Enable for development
if settings.ENVIRONMENT == "development":
    orchestrator.set_activity_callback(console_logger)
```

### Filter Activity Types

```python
def filtered_callback(activity_data):
    event = activity_data["data"]
    
    # Only log errors and warnings
    if event["activity_type"] in ["agent_error", "warning"]:
        await send_to_monitoring(event)

orchestrator.set_activity_callback(filtered_callback)
```

## Performance Considerations

1. **Callback Overhead**: Activity callbacks are called synchronously. Keep callbacks lightweight.
2. **Storage**: Activity logs are stored in memory. Clear after each session.
3. **WebSocket**: Use throttling if sending many activities rapidly.

## Testing

Run the test script:

```bash
cd backend
python test_activity_logging.py
```

## API Response Example

```json
{
  "success": true,
  "response": "Aku mendengar kamu merasa tertekan...",
  "metadata": {
    "agents_invoked": ["STA", "SCA"],
    "risk_level": "low",
    "processing_time_ms": 623.45
  },
  "activity_logs": [
    {
      "timestamp": "2025-10-31T12:34:56.789Z",
      "activity_type": "agent_start",
      "agent": "STA",
      "message": "Analyzing message for safety concerns",
      "details": {},
      "duration_ms": null
    },
    {
      "timestamp": "2025-10-31T12:34:57.038Z",
      "activity_type": "risk_assessment",
      "agent": "STA",
      "message": "Risk assessed: low (score: 0.15)",
      "details": {
        "risk_level": "low",
        "risk_score": 0.15,
        "risk_factors": []
      },
      "duration_ms": null
    },
    {
      "timestamp": "2025-10-31T12:34:57.040Z",
      "activity_type": "agent_complete",
      "agent": "STA",
      "message": "Risk assessment complete: low",
      "details": {
        "intent": "emotional_support",
        "execution_path": ["ingest_message", "apply_redaction", "assess_risk"]
      },
      "duration_ms": 249.12
    }
  ]
}
```

## Future Enhancements

- [ ] Activity log persistence to database
- [ ] Activity log filtering by time range
- [ ] Performance metrics dashboard
- [ ] Agent health monitoring
- [ ] Anomaly detection
- [ ] Export activity logs to CSV/JSON
